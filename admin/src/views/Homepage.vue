<template>
  <div class="page-container">
    <div class="page-header">
      <h2>首页配置</h2>
      <el-button :icon="Refresh" @click="loadAll" :loading="loading">刷新</el-button>
    </div>

    <!-- 主视觉轮播 -->
    <el-card shadow="hover" class="mb-20">
      <template #header>
        <div class="card-header">
          <span>🎠 主视觉轮播</span>
          <el-button type="primary" size="small" :icon="Plus" @click="showBannerModal()">添加</el-button>
        </div>
      </template>
      <el-table :data="banners" v-loading="loading" stripe>
        <el-table-column label="预览" width="90">
          <template #default="{ row }">
            <el-image v-if="row.image" :src="row.image" fit="cover"
              style="width:60px;height:40px;border-radius:4px" :preview-src-list="[row.image]" />
            <el-tag v-else-if="row.type === 'video'" size="small" type="info">视频</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="类型" width="70">
          <template #default="{ row }">
            <el-tag size="small" :type="row.type === 'video' ? 'warning' : 'primary'">
              {{ row.type === 'video' ? '视频' : '图片' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="title" label="标题" />
        <el-table-column prop="subtitle" label="副标题" show-overflow-tooltip />
        <el-table-column prop="button_text" label="按钮文字" width="90" />
        <el-table-column prop="sort_order" label="排序" width="60" />
        <el-table-column label="状态" width="70">
          <template #default="{ row }">
            <el-tag :type="row.is_active ? 'success' : 'info'" size="small">
              {{ row.is_active ? '启用' : '禁用' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="120">
          <template #default="{ row }">
            <el-button text type="primary" size="small" @click="showBannerModal(row)">编辑</el-button>
            <el-popconfirm title="确定删除？" @confirm="delBanner(row.id)">
              <template #reference>
                <el-button text type="danger" size="small">删除</el-button>
              </template>
            </el-popconfirm>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- 横向轮播 -->
    <el-card shadow="hover" class="mb-20">
      <template #header>
        <div class="card-header">
          <span>📷 横向轮播</span>
          <el-button type="primary" size="small" :icon="Plus" @click="showSwiperModal()">添加</el-button>
        </div>
      </template>
      <el-table :data="lowerSwiper" v-loading="loading" stripe>
        <el-table-column label="预览" width="90">
          <template #default="{ row }">
            <el-image v-if="row.image" :src="row.image" fit="cover"
              style="width:60px;height:40px;border-radius:4px" :preview-src-list="[row.image]" />
          </template>
        </el-table-column>
        <el-table-column prop="title" label="标题" />
        <el-table-column prop="link" label="链接" show-overflow-tooltip />
        <el-table-column prop="sort_order" label="排序" width="60" />
        <el-table-column label="状态" width="70">
          <template #default="{ row }">
            <el-tag :type="row.is_active ? 'success' : 'info'" size="small">
              {{ row.is_active ? '启用' : '禁用' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="120">
          <template #default="{ row }">
            <el-button text type="primary" size="small" @click="showSwiperModal(row)">编辑</el-button>
            <el-popconfirm title="确定删除？" @confirm="delSwiper(row.id)">
              <template #reference>
                <el-button text type="danger" size="small">删除</el-button>
              </template>
            </el-popconfirm>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- 三图展示 -->
    <el-card shadow="hover">
      <template #header>
        <div class="card-header">
          <span>🖼️ 三图展示</span>
          <el-button type="primary" size="small" :icon="Plus" @click="showThreeModal()">添加</el-button>
        </div>
      </template>
      <el-table :data="threeImages" v-loading="loading" stripe>
        <el-table-column label="预览" width="90">
          <template #default="{ row }">
            <el-image v-if="row.image" :src="row.image" fit="cover"
              style="width:60px;height:40px;border-radius:4px" :preview-src-list="[row.image]" />
          </template>
        </el-table-column>
        <el-table-column prop="link" label="链接" show-overflow-tooltip />
        <el-table-column prop="sort_order" label="排序" width="60" />
        <el-table-column label="状态" width="70">
          <template #default="{ row }">
            <el-tag :type="row.is_active ? 'success' : 'info'" size="small">
              {{ row.is_active ? '启用' : '禁用' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="120">
          <template #default="{ row }">
            <el-button text type="primary" size="small" @click="showThreeModal(row)">编辑</el-button>
            <el-popconfirm title="确定删除？" @confirm="delThree(row.id)">
              <template #reference>
                <el-button text type="danger" size="small">删除</el-button>
              </template>
            </el-popconfirm>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- ===== Banner 编辑弹窗 ===== -->
    <el-dialog v-model="bannerDialog.visible" :title="bannerDialog.isEdit ? '编辑主视觉轮播' : '添加主视觉轮播'"
      width="560px" :close-on-click-modal="false">
      <el-form :model="bannerDialog.form" label-width="90px" style="padding-right:10px">
        <el-form-item label="类型" required>
          <el-radio-group v-model="bannerDialog.form.type">
            <el-radio value="image">图片</el-radio>
            <el-radio value="video">视频</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item v-if="bannerDialog.form.type === 'image'" label="图片" required>
          <div class="url-row">
            <el-input v-model="bannerDialog.form.image" placeholder="图片 URL" />
            <el-button @click="openMediaPicker('bannerImage')">选择</el-button>
          </div>
          <el-image v-if="bannerDialog.form.image" :src="bannerDialog.form.image"
            fit="cover" class="preview-img" />
        </el-form-item>
        <el-form-item v-if="bannerDialog.form.type === 'video'" label="视频 URL" required>
          <el-input v-model="bannerDialog.form.video" placeholder="视频 URL" />
        </el-form-item>
        <el-form-item label="标题">
          <el-input v-model="bannerDialog.form.title" placeholder="可选" />
        </el-form-item>
        <el-form-item label="副标题">
          <el-input v-model="bannerDialog.form.subtitle" placeholder="可选" />
        </el-form-item>
        <el-form-item label="品牌名">
          <el-input v-model="bannerDialog.form.brand_name" placeholder="默认 NOT-BORING BOREBOI" />
        </el-form-item>
        <el-form-item label="按钮文字">
          <el-input v-model="bannerDialog.form.button_text" placeholder="如：立即购买" />
        </el-form-item>
        <el-form-item label="按钮动作">
          <el-input v-model="bannerDialog.form.button_action" placeholder="如：navigate" />
        </el-form-item>
        <el-form-item label="跳转链接">
          <el-input v-model="bannerDialog.form.link" placeholder="可选" />
        </el-form-item>
        <el-form-item label="排序">
          <el-input-number v-model="bannerDialog.form.sort_order" :min="0" />
        </el-form-item>
        <el-form-item label="启用">
          <el-switch v-model="bannerDialog.form.is_active" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="bannerDialog.visible = false">取消</el-button>
        <el-button type="primary" @click="saveBanner" :loading="bannerDialog.saving">保存</el-button>
      </template>
    </el-dialog>

    <!-- ===== 横向轮播 编辑弹窗 ===== -->
    <el-dialog v-model="swiperDialog.visible" :title="swiperDialog.isEdit ? '编辑横向轮播' : '添加横向轮播'"
      width="500px" :close-on-click-modal="false">
      <el-form :model="swiperDialog.form" label-width="80px" style="padding-right:10px">
        <el-form-item label="图片" required>
          <div class="url-row">
            <el-input v-model="swiperDialog.form.image" placeholder="图片 URL" />
            <el-button @click="openMediaPicker('swiperImage')">选择</el-button>
          </div>
          <el-image v-if="swiperDialog.form.image" :src="swiperDialog.form.image"
            fit="cover" class="preview-img" />
        </el-form-item>
        <el-form-item label="标题">
          <el-input v-model="swiperDialog.form.title" placeholder="可选" />
        </el-form-item>
        <el-form-item label="链接">
          <el-input v-model="swiperDialog.form.link" placeholder="可选" />
        </el-form-item>
        <el-form-item label="排序">
          <el-input-number v-model="swiperDialog.form.sort_order" :min="0" />
        </el-form-item>
        <el-form-item label="启用">
          <el-switch v-model="swiperDialog.form.is_active" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="swiperDialog.visible = false">取消</el-button>
        <el-button type="primary" @click="saveSwiper" :loading="swiperDialog.saving">保存</el-button>
      </template>
    </el-dialog>

    <!-- ===== 三图展示 编辑弹窗 ===== -->
    <el-dialog v-model="threeDialog.visible" :title="threeDialog.isEdit ? '编辑三图展示' : '添加三图展示'"
      width="500px" :close-on-click-modal="false">
      <el-form :model="threeDialog.form" label-width="80px" style="padding-right:10px">
        <el-form-item label="图片" required>
          <div class="url-row">
            <el-input v-model="threeDialog.form.image" placeholder="图片 URL" />
            <el-button @click="openMediaPicker('threeImage')">选择</el-button>
          </div>
          <el-image v-if="threeDialog.form.image" :src="threeDialog.form.image"
            fit="cover" class="preview-img" />
        </el-form-item>
        <el-form-item label="链接">
          <el-input v-model="threeDialog.form.link" placeholder="可选" />
        </el-form-item>
        <el-form-item label="排序">
          <el-input-number v-model="threeDialog.form.sort_order" :min="0" />
        </el-form-item>
        <el-form-item label="启用">
          <el-switch v-model="threeDialog.form.is_active" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="threeDialog.visible = false">取消</el-button>
        <el-button type="primary" @click="saveThree" :loading="threeDialog.saving">保存</el-button>
      </template>
    </el-dialog>

    <!-- ===== 媒体库选择器 ===== -->
    <el-dialog v-model="mediaPicker.visible" title="选择图片" width="760px" :close-on-click-modal="false">
      <div style="margin-bottom:12px;display:flex;gap:8px;align-items:center">
        <el-select v-model="mediaPicker.prefix" placeholder="全部目录" clearable style="width:140px"
          @change="loadMediaList">
          <el-option label="images" value="images" />
          <el-option label="banners" value="banners" />
          <el-option label="products" value="products" />
          <el-option label="videos" value="videos" />
        </el-select>
        <el-button :icon="Refresh" @click="loadMediaList" :loading="mediaPicker.loading" circle />
      </div>
      <div v-loading="mediaPicker.loading" class="picker-grid">
        <div v-for="f in mediaPicker.files" :key="f.name"
          class="picker-item" :class="{ selected: mediaPicker.selected === f.url }"
          @click="mediaPicker.selected = f.url">
          <el-image :src="f.url" fit="cover" style="width:100%;height:80px" />
          <div class="picker-name">{{ f.name.split('/').pop() }}</div>
        </div>
        <el-empty v-if="!mediaPicker.loading && !mediaPicker.files.length" description="暂无图片" />
      </div>
      <template #footer>
        <el-button @click="mediaPicker.visible = false">取消</el-button>
        <el-button type="primary" :disabled="!mediaPicker.selected" @click="confirmMediaPick">确认</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { Refresh, Plus } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { homepageApi, mediaApi } from '@/api'

const loading = ref(false)
const banners = ref([])
const lowerSwiper = ref([])
const threeImages = ref([])

const bannerDialog = reactive({ visible: false, isEdit: false, saving: false, form: {} })
const swiperDialog = reactive({ visible: false, isEdit: false, saving: false, form: {} })
const threeDialog  = reactive({ visible: false, isEdit: false, saving: false, form: {} })

// 媒体库选择器状态
const mediaPicker = reactive({
  visible: false,
  loading: false,
  files: [],
  selected: '',
  prefix: '',
  target: ''   // 'bannerImage' | 'swiperImage' | 'threeImage'
})

// ── 加载数据 ──────────────────────────────────────────────
async function loadAll() {
  loading.value = true
  try {
    const [b, s, t] = await Promise.all([
      homepageApi.getBanners().catch(() => ({})),
      homepageApi.getLowerSwiper().catch(() => ({})),
      homepageApi.getThreeImages().catch(() => ({}))
    ])
    banners.value     = b.data || []
    lowerSwiper.value = s.data || []
    threeImages.value = t.data || []
  } finally {
    loading.value = false
  }
}

// ── 媒体库选择器 ──────────────────────────────────────────
async function loadMediaList() {
  mediaPicker.loading = true
  try {
    const res = await mediaApi.getList({ prefix: mediaPicker.prefix })
    mediaPicker.files = (res.data?.files || []).filter(f => f.type === 'image')
  } catch {
    mediaPicker.files = []
  } finally {
    mediaPicker.loading = false
  }
}

function openMediaPicker(target) {
  mediaPicker.target   = target
  mediaPicker.selected = ''
  mediaPicker.visible  = true
  loadMediaList()
}

function confirmMediaPick() {
  const url = mediaPicker.selected
  if (mediaPicker.target === 'bannerImage')  bannerDialog.form.image = url
  if (mediaPicker.target === 'swiperImage')  swiperDialog.form.image = url
  if (mediaPicker.target === 'threeImage')   threeDialog.form.image  = url
  mediaPicker.visible = false
}

// ── Banner ────────────────────────────────────────────────
function showBannerModal(row = null) {
  bannerDialog.isEdit = !!row
  bannerDialog.form = row
    ? { ...row }
    : { type: 'image', image: '', video: '', title: '', subtitle: '',
        brand_name: '', button_text: '', button_action: '', link: '',
        sort_order: 0, is_active: true }
  bannerDialog.visible = true
}

async function saveBanner() {
  const f = bannerDialog.form
  if (!f.type) return ElMessage.warning('请选择类型')
  if (f.type === 'image' && !f.image) return ElMessage.warning('请填写图片 URL')
  if (f.type === 'video' && !f.video) return ElMessage.warning('请填写视频 URL')
  bannerDialog.saving = true
  try {
    if (bannerDialog.isEdit) await homepageApi.updateBanner(f.id, f)
    else await homepageApi.createBanner(f)
    ElMessage.success('保存成功')
    bannerDialog.visible = false
    loadAll()
  } catch {
    ElMessage.error('保存失败')
  } finally {
    bannerDialog.saving = false
  }
}

async function delBanner(id) {
  try { await homepageApi.deleteBanner(id); ElMessage.success('删除成功'); loadAll() }
  catch { ElMessage.error('删除失败') }
}

// ── 横向轮播 ──────────────────────────────────────────────
function showSwiperModal(row = null) {
  swiperDialog.isEdit = !!row
  swiperDialog.form = row
    ? { ...row }
    : { image: '', title: '', link: '', sort_order: 0, is_active: true }
  swiperDialog.visible = true
}

async function saveSwiper() {
  if (!swiperDialog.form.image) return ElMessage.warning('请填写图片 URL')
  swiperDialog.saving = true
  try {
    if (swiperDialog.isEdit) await homepageApi.updateLowerSwiper(swiperDialog.form.id, swiperDialog.form)
    else await homepageApi.createLowerSwiper(swiperDialog.form)
    ElMessage.success('保存成功')
    swiperDialog.visible = false
    loadAll()
  } catch {
    ElMessage.error('保存失败')
  } finally {
    swiperDialog.saving = false
  }
}

async function delSwiper(id) {
  try { await homepageApi.deleteLowerSwiper(id); ElMessage.success('删除成功'); loadAll() }
  catch { ElMessage.error('删除失败') }
}

// ── 三图展示 ──────────────────────────────────────────────
function showThreeModal(row = null) {
  threeDialog.isEdit = !!row
  threeDialog.form = row
    ? { ...row }
    : { image: '', link: '', sort_order: 0, is_active: true }
  threeDialog.visible = true
}

async function saveThree() {
  if (!threeDialog.form.image) return ElMessage.warning('请填写图片 URL')
  threeDialog.saving = true
  try {
    if (threeDialog.isEdit) await homepageApi.updateThreeImages(threeDialog.form.id, threeDialog.form)
    else await homepageApi.createThreeImages(threeDialog.form)
    ElMessage.success('保存成功')
    threeDialog.visible = false
    loadAll()
  } catch {
    ElMessage.error('保存失败')
  } finally {
    threeDialog.saving = false
  }
}

async function delThree(id) {
  try { await homepageApi.deleteThreeImages(id); ElMessage.success('删除成功'); loadAll() }
  catch { ElMessage.error('删除失败') }
}

onMounted(loadAll)
</script>

<style scoped>
.mb-20 { margin-bottom: 20px; }
.card-header { display: flex; justify-content: space-between; align-items: center; }

.url-row { display: flex; gap: 8px; align-items: center; width: 100%; }
.url-row .el-input { flex: 1; }

.preview-img {
  width: 120px;
  height: 72px;
  margin-top: 8px;
  border-radius: 4px;
  border: 1px solid #e4e7ed;
}

.picker-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
  gap: 10px;
  max-height: 400px;
  overflow-y: auto;
  padding: 4px;
}
.picker-item {
  border: 2px solid #e4e7ed;
  border-radius: 6px;
  overflow: hidden;
  cursor: pointer;
  transition: border-color .2s;
}
.picker-item:hover { border-color: #409eff; }
.picker-item.selected { border-color: #409eff; box-shadow: 0 0 0 2px rgba(64,158,255,.3); }
.picker-name {
  font-size: 11px;
  color: #666;
  padding: 4px 6px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  background: #fafafa;
}
</style>
