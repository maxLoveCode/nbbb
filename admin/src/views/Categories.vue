<template>
  <div class="page-container">
    <div class="page-header">
      <h2>分类页管理</h2>
      <el-button type="primary" :icon="Plus" @click="showAdd">添加分类</el-button>
    </div>
    
    <el-row :gutter="20">
      <el-col :xs="24" :lg="8">
        <el-card shadow="hover">
          <template #header>分类列表</template>
          <div v-loading="loading">
            <div v-for="cat in categories" :key="cat.id" :class="['cat-item', { active: selected?.id === cat.id }]" @click="select(cat)">
              <div>
                <div class="cat-name">{{ cat.name }}</div>
                <div class="cat-meta">
                  <el-tag size="small" :type="cat.type === 'products' ? 'primary' : 'success'">{{ cat.type === 'products' ? '商品' : '卡片' }}</el-tag>
                  <span>{{ cat.product_count || 0 }} 个商品</span>
                </div>
              </div>
              <div>
                <el-button text :icon="Edit" size="small" @click.stop="editCat(cat)" />
                <el-popconfirm title="确定删除？" @confirm="delCat(cat.id)">
                  <template #reference><el-button text :icon="Delete" type="danger" size="small" @click.stop /></template>
                </el-popconfirm>
              </div>
            </div>
            <el-empty v-if="!categories.length" description="暂无分类" />
          </div>
        </el-card>
      </el-col>
      
      <el-col :xs="24" :lg="16">
        <el-card shadow="hover">
          <template #header>
            <div style="display:flex;justify-content:space-between;align-items:center">
              <span>{{ selected?.name || '请选择分类' }} - 商品列表</span>
              <el-button v-if="selected" type="primary" size="small" :icon="Plus" @click="addProductDialog = true">添加商品</el-button>
            </div>
          </template>
          <el-table v-if="selected" :data="products" v-loading="prodLoading" stripe>
            <el-table-column prop="product_code" label="商品编码" width="150" />
            <el-table-column prop="name" label="名称" />
            <el-table-column label="操作" width="80">
              <template #default="{ row }">
                <el-popconfirm title="确定移除？" @confirm="removeProd(row.product_code)">
                  <template #reference><el-button text type="danger" size="small">移除</el-button></template>
                </el-popconfirm>
              </template>
            </el-table-column>
          </el-table>
          <el-empty v-else description="请选择分类" />
        </el-card>
      </el-col>
    </el-row>
    
    <el-dialog v-model="dialog.visible" :title="dialog.isEdit ? '编辑分类' : '添加分类'" width="500px">
      <el-form :model="dialog.form" label-width="100px">
        <el-form-item label="名称"><el-input v-model="dialog.form.name" /></el-form-item>
        <el-form-item label="类型">
          <el-radio-group v-model="dialog.form.type">
            <el-radio value="products">商品</el-radio>
            <el-radio value="cards">卡片</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="排序"><el-input-number v-model="dialog.form.sort_order" :min="0" /></el-form-item>
        <el-form-item label="启用"><el-switch v-model="dialog.form.is_active" /></el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialog.visible = false">取消</el-button>
        <el-button type="primary" @click="saveCat" :loading="dialog.saving">保存</el-button>
      </template>
    </el-dialog>
    
    <el-dialog v-model="addProductDialog" title="添加商品" width="400px">
      <el-input v-model="newProductCode" placeholder="输入商品编码，多个用逗号分隔" />
      <template #footer>
        <el-button @click="addProductDialog = false">取消</el-button>
        <el-button type="primary" @click="addProd">添加</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { Plus, Edit, Delete } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { categoryApi } from '@/api'

const loading = ref(false)
const prodLoading = ref(false)
const categories = ref([])
const products = ref([])
const selected = ref(null)
const addProductDialog = ref(false)
const newProductCode = ref('')

const dialog = reactive({
  visible: false,
  isEdit: false,
  saving: false,
  form: { id: null, name: '', type: 'products', sort_order: 0, is_active: true }
})

async function loadCategories() {
  loading.value = true
  try {
    const res = await categoryApi.getCategories()
    categories.value = res.categories || res || []
  } catch {
    categories.value = [
      { id: 1, name: '博主甄选', type: 'products', product_count: 25 },
      { id: 2, name: '人宠同款', type: 'products', product_count: 18 }
    ]
  } finally {
    loading.value = false
  }
}

async function loadProducts(id) {
  prodLoading.value = true
  try {
    const res = await categoryApi.getCategoryProducts(id)
    products.value = res.products || res || []
  } catch {
    products.value = []
  } finally {
    prodLoading.value = false
  }
}

function select(cat) { selected.value = cat; loadProducts(cat.id) }
function showAdd() { dialog.isEdit = false; dialog.form = { id: null, name: '', type: 'products', sort_order: 0, is_active: true }; dialog.visible = true }
function editCat(cat) { dialog.isEdit = true; dialog.form = { ...cat }; dialog.visible = true }

async function saveCat() {
  dialog.saving = true
  try {
    if (dialog.isEdit) await categoryApi.updateCategory(dialog.form.id, dialog.form)
    else await categoryApi.createCategory(dialog.form)
    ElMessage.success('保存成功')
    dialog.visible = false
    loadCategories()
  } catch { ElMessage.error('保存失败') }
  finally { dialog.saving = false }
}

async function delCat(id) {
  try {
    await categoryApi.deleteCategory(id)
    ElMessage.success('删除成功')
    if (selected.value?.id === id) { selected.value = null; products.value = [] }
    loadCategories()
  } catch { ElMessage.error('删除失败') }
}

async function addProd() {
  const codes = newProductCode.value.split(/[,，]/).map(s => s.trim()).filter(Boolean)
  for (const code of codes) {
    try { await categoryApi.addProductToCategory(selected.value.id, code) } catch {}
  }
  ElMessage.success('添加完成')
  addProductDialog.value = false
  newProductCode.value = ''
  loadProducts(selected.value.id)
  loadCategories()
}

async function removeProd(code) {
  try {
    await categoryApi.removeProductFromCategory(selected.value.id, code)
    ElMessage.success('移除成功')
    loadProducts(selected.value.id)
    loadCategories()
  } catch { ElMessage.error('移除失败') }
}

onMounted(loadCategories)
</script>

<style scoped>
.cat-item {
  display: flex; justify-content: space-between; align-items: center;
  padding: 12px; border-bottom: 1px solid #f0f0f0; cursor: pointer;
}
.cat-item:hover { background: #f5f7fa; }
.cat-item.active { background: #ecf5ff; border-left: 3px solid #409eff; }
.cat-name { font-weight: 500; margin-bottom: 4px; }
.cat-meta { display: flex; gap: 8px; align-items: center; font-size: 12px; color: #999; }
</style>
