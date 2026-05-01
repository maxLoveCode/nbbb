<template>
  <div class="page-container">
    <div class="page-header">
      <h2>媒体库</h2>
      <el-button type="primary" :icon="Upload" @click="uploadDialog = true">上传文件</el-button>
    </div>
    
    <el-card shadow="hover" class="mb-20">
      <el-form inline>
        <el-form-item label="目录">
          <el-select v-model="filter.prefix" placeholder="全部" clearable @change="loadList">
            <el-option label="images" value="images" />
            <el-option label="videos" value="videos" />
            <el-option label="banners" value="banners" />
            <el-option label="products" value="products" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button :icon="Refresh" @click="loadList" :loading="loading">刷新</el-button>
        </el-form-item>
      </el-form>
    </el-card>
    
    <el-card shadow="hover">
      <div v-loading="loading" class="media-grid">
        <div v-for="item in mediaList" :key="item.name" class="media-item" @click="preview(item)">
          <div class="media-preview">
            <el-image v-if="item.type === 'image'" :src="item.url" fit="cover" style="width:100%;height:100%" />
            <video
              v-else-if="item.type === 'video'"
              :src="`${item.url}#t=0.1`"
              class="media-video-preview"
              muted
              playsinline
              preload="metadata"
            />
            <div v-else class="video-icon">文件</div>
          </div>
          <div class="media-info">
            <div class="media-name" :title="item.name">{{ item.name }}</div>
            <div class="media-meta">{{ formatSize(item.size) }}</div>
          </div>
          <div class="media-actions">
            <el-button size="small" @click.stop="copyUrl(item.url)">复制链接</el-button>
            <el-popconfirm title="确定删除？" @confirm="delFile(item.name)">
              <template #reference><el-button size="small" type="danger" @click.stop>删除</el-button></template>
            </el-popconfirm>
          </div>
        </div>
        <el-empty v-if="!mediaList.length && !loading" description="暂无文件" />
      </div>
    </el-card>
    
    <el-dialog v-model="uploadDialog" title="上传文件" width="500px" :close-on-click-modal="!uploading">
      <el-form label-width="80px">
        <el-form-item label="目录">
          <el-select v-model="uploadFolder" style="width:100%">
            <el-option label="images" value="images" />
            <el-option label="videos" value="videos" />
            <el-option label="banners" value="banners" />
            <el-option label="products" value="products" />
          </el-select>
        </el-form-item>
        <el-form-item label="文件">
          <el-upload ref="uploadRef" v-model:file-list="fileList" :auto-upload="false" drag multiple accept="image/*,video/*">
            <el-icon :size="32"><UploadFilled /></el-icon>
            <div>拖拽或点击上传</div>
          </el-upload>
        </el-form-item>
      </el-form>
      <!-- 上传进度 -->
      <div v-if="uploading" style="margin-top:12px">
        <div v-if="fileList.length > 1" style="font-size:13px;color:#666;margin-bottom:6px">
          总进度：{{ uploadDone }}/{{ fileList.length }}
          <el-progress :percentage="uploadProgress" style="margin-top:4px" />
        </div>
        <div style="font-size:13px;color:#666;margin-top:6px">正在上传：{{ uploadingName }}</div>
        <el-progress :percentage="fileUploadProgress" :format="(p) => p + '%'" style="margin-top:4px" />
      </div>
      <template #footer>
        <el-button @click="uploadDialog = false" :disabled="uploading">取消</el-button>
        <el-button type="primary" @click="handleUpload" :loading="uploading" :disabled="!fileList.length">上传</el-button>
      </template>
    </el-dialog>
    
    <el-dialog v-model="previewDialog.visible" :title="previewDialog.item?.name" width="700px">
      <div style="text-align:center">
        <el-image v-if="previewDialog.item && previewDialog.item.type === 'image'" :src="previewDialog.item.url" fit="contain" style="max-height:400px" />
        <video v-else-if="previewDialog.item" :src="previewDialog.item.url" controls style="max-width:100%;max-height:400px" />
      </div>
      <el-input :value="previewDialog.item?.url" readonly style="margin-top:16px">
        <template #append><el-button @click="copyUrl(previewDialog.item?.url)">复制</el-button></template>
      </el-input>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { Upload, Refresh, UploadFilled } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { mediaApi } from '@/api'

const loading = ref(false)
const uploading = ref(false)
const uploadDone = ref(0)
const uploadingName = ref('')
const fileUploadProgress = ref(0)  // 当前单文件进度 0-100
const mediaList = ref([])
const filter = reactive({ prefix: '' })
const uploadDialog = ref(false)
const uploadFolder = ref('images')
const fileList = ref([])
const previewDialog = reactive({ visible: false, item: null })

const uploadProgress = computed(() =>
  fileList.value.length ? Math.round((uploadDone.value / fileList.value.length) * 100) : 0
)

const formatSize = (bytes) => {
  if (!bytes) return '-'
  const units = ['B', 'KB', 'MB', 'GB']
  let i = 0, size = bytes
  while (size >= 1024 && i < 3) { size /= 1024; i++ }
  return `${size.toFixed(1)} ${units[i]}`
}

async function loadList() {
  loading.value = true
  try {
    const res = await mediaApi.getList({ prefix: filter.prefix })
    mediaList.value = res.data?.files || []
  } catch { mediaList.value = [] }
  finally { loading.value = false }
}

// 直传单个文件到 OSS（前端直接 POST，不经过服务器）
async function uploadOneToOSS(file) {
  const rawFile = file.raw || file
  const mimeType = rawFile.type || file.type || 'application/octet-stream'
  const isVideo = mimeType.startsWith('video/')
  const folder = isVideo ? 'videos' : uploadFolder.value

  // 1. 从后端取签名
  const signRes = await mediaApi.getUploadSign({
    folder,
    filename: file.name,
    mimeType
  })
  const { host, objectName, accessKeyId, policy, signature, url } = signRes.data

  // 2. 构造 FormData，直接 POST 到 OSS
  const form = new FormData()
  form.append('key', objectName)
  form.append('OSSAccessKeyId', accessKeyId)
  form.append('policy', policy)
  form.append('Signature', signature)
  form.append('Content-Type', mimeType)
  form.append('success_action_status', '200')
  form.append('file', rawFile)

  await new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('POST', host)
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) {
        fileUploadProgress.value = Math.round((e.loaded / e.total) * 100)
      }
    }
    xhr.onload = () => {
      if (xhr.status === 200 || xhr.status === 204) resolve(url)
      else reject(new Error(`OSS 返回 ${xhr.status}: ${xhr.responseText}`))
    }
    xhr.onerror = () => reject(new Error('网络错误'))
    xhr.send(form)
  })

  return url
}

async function handleUpload() {
  uploading.value = true
  uploadDone.value = 0
  fileUploadProgress.value = 0
  let successCount = 0
  let failCount = 0

  for (const f of fileList.value) {
    uploadingName.value = f.name
    fileUploadProgress.value = 0
    try {
      await uploadOneToOSS(f)
      successCount++
    } catch (e) {
      failCount++
      console.error('上传失败:', f.name, e)
    }
    uploadDone.value++
  }

  uploading.value = false
  uploadingName.value = ''
  fileUploadProgress.value = 0

  if (failCount === 0) {
    ElMessage.success(`${successCount} 个文件上传成功`)
  } else if (successCount === 0) {
    ElMessage.error('上传失败，请检查网络或重试')
  } else {
    ElMessage.warning(`${successCount} 个成功，${failCount} 个失败`)
  }

  uploadDialog.value = false
  fileList.value = []
  loadList()
}

function preview(item) { previewDialog.item = item; previewDialog.visible = true }

function copyUrl(url) {
  navigator.clipboard.writeText(url).then(() => ElMessage.success('已复制')).catch(() => ElMessage.error('复制失败'))
}

async function delFile(key) {
  try { await mediaApi.delete(key); ElMessage.success('删除成功'); loadList() }
  catch { ElMessage.error('删除失败') }
}

onMounted(loadList)
</script>

<style scoped>
.mb-20 { margin-bottom: 20px; }
.media-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 16px;
  min-height: 200px;
}
.media-item {
  background: #fff;
  border: 1px solid #e4e7ed;
  border-radius: 8px;
  overflow: hidden;
  cursor: pointer;
  transition: all 0.2s;
}
.media-item:hover { box-shadow: 0 4px 12px rgba(0,0,0,0.1); transform: translateY(-2px); }
.media-preview {
  height: 120px;
  background: #f5f7fa;
  display: flex;
  align-items: center;
  justify-content: center;
}
.media-video-preview {
  width: 100%;
  height: 100%;
  object-fit: cover;
  background: #000;
  pointer-events: none;
}
.video-icon { color: #909399; font-size: 13px; }
.media-info { padding: 8px 12px; }
.media-name { font-size: 13px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.media-meta { font-size: 12px; color: #999; margin-top: 4px; }
.media-actions { padding: 8px 12px; display: flex; gap: 8px; }
</style>
