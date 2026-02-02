<template>
  <div class="page-container">
    <div class="page-header">
      <h2>首页配置</h2>
      <el-button :icon="Refresh" @click="loadAll" :loading="loading">刷新</el-button>
    </div>
    
    <!-- Banners -->
    <el-card shadow="hover" class="mb-20">
      <template #header>
        <div style="display:flex;justify-content:space-between;align-items:center">
          <span>🎠 主视觉轮播</span>
          <el-button type="primary" size="small" :icon="Plus" @click="showBannerModal()">添加</el-button>
        </div>
      </template>
      <el-table :data="banners" v-loading="loading" stripe>
        <el-table-column label="图片" width="100">
          <template #default="{ row }">
            <el-image v-if="row.image" :src="row.image" fit="cover" style="width:60px;height:40px;border-radius:4px" />
          </template>
        </el-table-column>
        <el-table-column prop="title" label="标题" />
        <el-table-column prop="sort_order" label="排序" width="80" />
        <el-table-column prop="is_active" label="状态" width="80">
          <template #default="{ row }">
            <el-tag :type="row.is_active ? 'success' : 'info'" size="small">{{ row.is_active ? '启用' : '禁用' }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="150">
          <template #default="{ row }">
            <el-button text type="primary" size="small" @click="showBannerModal(row)">编辑</el-button>
            <el-popconfirm title="确定删除？" @confirm="delBanner(row.id)">
              <template #reference><el-button text type="danger" size="small">删除</el-button></template>
            </el-popconfirm>
          </template>
        </el-table-column>
      </el-table>
    </el-card>
    
    <!-- Lower Swiper -->
    <el-card shadow="hover" class="mb-20">
      <template #header>
        <div style="display:flex;justify-content:space-between;align-items:center">
          <span>📷 横向轮播</span>
          <el-button type="primary" size="small" :icon="Plus" @click="showSwiperModal()">添加</el-button>
        </div>
      </template>
      <el-table :data="lowerSwiper" v-loading="loading" stripe>
        <el-table-column label="图片" width="100">
          <template #default="{ row }">
            <el-image v-if="row.image" :src="row.image" fit="cover" style="width:60px;height:40px;border-radius:4px" />
          </template>
        </el-table-column>
        <el-table-column prop="title" label="标题" />
        <el-table-column prop="link" label="链接" />
        <el-table-column prop="sort_order" label="排序" width="80" />
        <el-table-column label="操作" width="150">
          <template #default="{ row }">
            <el-button text type="primary" size="small" @click="showSwiperModal(row)">编辑</el-button>
            <el-popconfirm title="确定删除？" @confirm="delSwiper(row.id)">
              <template #reference><el-button text type="danger" size="small">删除</el-button></template>
            </el-popconfirm>
          </template>
        </el-table-column>
      </el-table>
    </el-card>
    
    <!-- Three Images -->
    <el-card shadow="hover">
      <template #header>
        <div style="display:flex;justify-content:space-between;align-items:center">
          <span>🖼️ 三图展示</span>
          <el-button type="primary" size="small" :icon="Plus" @click="showThreeModal()">添加</el-button>
        </div>
      </template>
      <el-table :data="threeImages" v-loading="loading" stripe>
        <el-table-column label="图片" width="100">
          <template #default="{ row }">
            <el-image v-if="row.image" :src="row.image" fit="cover" style="width:60px;height:40px;border-radius:4px" />
          </template>
        </el-table-column>
        <el-table-column prop="link" label="链接" />
        <el-table-column prop="sort_order" label="排序" width="80" />
        <el-table-column label="操作" width="150">
          <template #default="{ row }">
            <el-button text type="primary" size="small" @click="showThreeModal(row)">编辑</el-button>
            <el-popconfirm title="确定删除？" @confirm="delThree(row.id)">
              <template #reference><el-button text type="danger" size="small">删除</el-button></template>
            </el-popconfirm>
          </template>
        </el-table-column>
      </el-table>
    </el-card>
    
    <!-- Banner Dialog -->
    <el-dialog v-model="bannerDialog.visible" :title="bannerDialog.isEdit ? '编辑' : '添加'" width="500px">
      <el-form :model="bannerDialog.form" label-width="80px">
        <el-form-item label="图片URL"><el-input v-model="bannerDialog.form.image" /></el-form-item>
        <el-form-item label="标题"><el-input v-model="bannerDialog.form.title" /></el-form-item>
        <el-form-item label="链接"><el-input v-model="bannerDialog.form.link" /></el-form-item>
        <el-form-item label="排序"><el-input-number v-model="bannerDialog.form.sort_order" :min="0" /></el-form-item>
        <el-form-item label="启用"><el-switch v-model="bannerDialog.form.is_active" /></el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="bannerDialog.visible = false">取消</el-button>
        <el-button type="primary" @click="saveBanner" :loading="bannerDialog.saving">保存</el-button>
      </template>
    </el-dialog>
    
    <!-- Swiper Dialog -->
    <el-dialog v-model="swiperDialog.visible" :title="swiperDialog.isEdit ? '编辑' : '添加'" width="500px">
      <el-form :model="swiperDialog.form" label-width="80px">
        <el-form-item label="图片URL"><el-input v-model="swiperDialog.form.image" /></el-form-item>
        <el-form-item label="标题"><el-input v-model="swiperDialog.form.title" /></el-form-item>
        <el-form-item label="链接"><el-input v-model="swiperDialog.form.link" /></el-form-item>
        <el-form-item label="排序"><el-input-number v-model="swiperDialog.form.sort_order" :min="0" /></el-form-item>
        <el-form-item label="启用"><el-switch v-model="swiperDialog.form.is_active" /></el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="swiperDialog.visible = false">取消</el-button>
        <el-button type="primary" @click="saveSwiper" :loading="swiperDialog.saving">保存</el-button>
      </template>
    </el-dialog>
    
    <!-- Three Dialog -->
    <el-dialog v-model="threeDialog.visible" :title="threeDialog.isEdit ? '编辑' : '添加'" width="500px">
      <el-form :model="threeDialog.form" label-width="80px">
        <el-form-item label="图片URL"><el-input v-model="threeDialog.form.image" /></el-form-item>
        <el-form-item label="链接"><el-input v-model="threeDialog.form.link" /></el-form-item>
        <el-form-item label="排序"><el-input-number v-model="threeDialog.form.sort_order" :min="0" /></el-form-item>
        <el-form-item label="启用"><el-switch v-model="threeDialog.form.is_active" /></el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="threeDialog.visible = false">取消</el-button>
        <el-button type="primary" @click="saveThree" :loading="threeDialog.saving">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { Refresh, Plus } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { homepageApi } from '@/api'

const loading = ref(false)
const banners = ref([])
const lowerSwiper = ref([])
const threeImages = ref([])

const bannerDialog = reactive({ visible: false, isEdit: false, saving: false, form: {} })
const swiperDialog = reactive({ visible: false, isEdit: false, saving: false, form: {} })
const threeDialog = reactive({ visible: false, isEdit: false, saving: false, form: {} })

async function loadAll() {
  loading.value = true
  try {
    const [b, s, t] = await Promise.all([
      homepageApi.getBanners().catch(() => ({})),
      homepageApi.getLowerSwiper().catch(() => ({})),
      homepageApi.getThreeImages().catch(() => ({}))
    ])
    banners.value = b.banners || b || []
    lowerSwiper.value = s.items || s || []
    threeImages.value = t.items || t || []
  } finally { loading.value = false }
}

function showBannerModal(row = null) {
  bannerDialog.isEdit = !!row
  bannerDialog.form = row ? { ...row } : { image: '', title: '', link: '', sort_order: 0, is_active: true }
  bannerDialog.visible = true
}

async function saveBanner() {
  bannerDialog.saving = true
  try {
    if (bannerDialog.isEdit) await homepageApi.updateBanner(bannerDialog.form.id, bannerDialog.form)
    else await homepageApi.createBanner(bannerDialog.form)
    ElMessage.success('保存成功')
    bannerDialog.visible = false
    loadAll()
  } catch { ElMessage.error('保存失败') }
  finally { bannerDialog.saving = false }
}

async function delBanner(id) {
  try { await homepageApi.deleteBanner(id); ElMessage.success('删除成功'); loadAll() }
  catch { ElMessage.error('删除失败') }
}

function showSwiperModal(row = null) {
  swiperDialog.isEdit = !!row
  swiperDialog.form = row ? { ...row } : { image: '', title: '', link: '', sort_order: 0, is_active: true }
  swiperDialog.visible = true
}

async function saveSwiper() {
  swiperDialog.saving = true
  try {
    if (swiperDialog.isEdit) await homepageApi.updateLowerSwiper(swiperDialog.form.id, swiperDialog.form)
    else await homepageApi.createLowerSwiper(swiperDialog.form)
    ElMessage.success('保存成功')
    swiperDialog.visible = false
    loadAll()
  } catch { ElMessage.error('保存失败') }
  finally { swiperDialog.saving = false }
}

async function delSwiper(id) {
  try { await homepageApi.deleteLowerSwiper(id); ElMessage.success('删除成功'); loadAll() }
  catch { ElMessage.error('删除失败') }
}

function showThreeModal(row = null) {
  threeDialog.isEdit = !!row
  threeDialog.form = row ? { ...row } : { image: '', link: '', sort_order: 0, is_active: true }
  threeDialog.visible = true
}

async function saveThree() {
  threeDialog.saving = true
  try {
    if (threeDialog.isEdit) await homepageApi.updateThreeImages(threeDialog.form.id, threeDialog.form)
    else await homepageApi.createThreeImages(threeDialog.form)
    ElMessage.success('保存成功')
    threeDialog.visible = false
    loadAll()
  } catch { ElMessage.error('保存失败') }
  finally { threeDialog.saving = false }
}

async function delThree(id) {
  try { await homepageApi.deleteThreeImages(id); ElMessage.success('删除成功'); loadAll() }
  catch { ElMessage.error('删除失败') }
}

onMounted(loadAll)
</script>

<style scoped>
.mb-20 { margin-bottom: 20px; }
</style>
