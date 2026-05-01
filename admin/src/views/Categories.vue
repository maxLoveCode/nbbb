<template>
  <div class="page-container">
    <div class="page-header">
      <h2>分类管理</h2>
    </div>
    
    <!-- Tab 切换 -->
    <el-tabs v-model="activeTab" type="card" @tab-change="onTabChange">
      <el-tab-pane label="目录页" name="catalog" />
      <el-tab-pane label="即刻选购" name="shopping" />
    </el-tabs>
    <div class="tab-desc">
      {{ activeTab === 'catalog' 
        ? '数据源：category_page_categories + category_page_products' 
        : '数据源：category_management（二级分类 + 商品编码）' }}
    </div>

    <!-- 目录页管理 -->
    <div v-if="activeTab === 'catalog'">
      <div class="toolbar">
        <el-button type="primary" :icon="Plus" @click="showAddCatalog">添加分类</el-button>
      </div>
      
      <el-row :gutter="20">
        <el-col :xs="24" :lg="8">
          <el-card shadow="hover">
            <template #header>分类列表</template>
            <div v-loading="catalog.loading">
              <div v-for="cat in catalog.categories" :key="cat.id" 
                   :class="['cat-item', { active: catalog.selected?.id === cat.id }]" 
                   @click="selectCatalog(cat)">
                <div>
                  <div class="cat-name">{{ cat.name }}</div>
                  <div class="cat-meta">
                    <el-tag size="small" :type="cat.type === 'products' ? 'primary' : 'success'">
                      {{ cat.type === 'products' ? '商品' : '卡片' }}
                    </el-tag>
                    <span>{{ cat.product_count || 0 }} 个商品</span>
                  </div>
                </div>
                <div>
                  <el-button text :icon="Edit" size="small" @click.stop="editCatalog(cat)" />
                  <el-popconfirm title="确定删除？" @confirm="delCatalog(cat.id)">
                    <template #reference>
                      <el-button text :icon="Delete" type="danger" size="small" @click.stop />
                    </template>
                  </el-popconfirm>
                </div>
              </div>
              <el-empty v-if="!catalog.categories.length" description="暂无分类" />
            </div>
          </el-card>
        </el-col>
        
        <el-col :xs="24" :lg="16">
          <el-card shadow="hover">
            <template #header>
              <div style="display:flex;justify-content:space-between;align-items:center">
                <span>{{ catalog.selected?.name || '请选择分类' }} - 商品列表</span>
                <el-button v-if="catalog.selected" type="primary" size="small" :icon="Plus" 
                           @click="catalog.addProductDialog = true">添加商品</el-button>
              </div>
            </template>
            <div v-if="catalog.selected" v-loading="catalog.prodLoading" ref="catalogTableWrap">
              <el-table :data="catalog.products" stripe size="small" max-height="500" row-key="product_code">
                <el-table-column width="36">
                  <template #header><span style="color:#aaa">⠿</span></template>
                  <template #default><span class="drag-handle" style="cursor:grab;color:#bbb;font-size:16px;user-select:none">⠿</span></template>
                </el-table-column>
                <el-table-column label="#" width="45" align="center">
                  <template #default="{ $index }">{{ $index + 1 }}</template>
                </el-table-column>
                <el-table-column prop="product_code" label="商品编码" width="150" />
                <el-table-column prop="name" label="名称" />
                <el-table-column label="排序" width="160" align="center">
                  <template #default="{ $index }">
                    <el-button-group size="small">
                      <el-button text :disabled="$index === 0" @click="moveCatalogProdTop($index)">置顶</el-button>
                      <el-button text :disabled="$index === 0" @click="moveCatalogProd($index, -1)">↑</el-button>
                      <el-button text :disabled="$index === catalog.products.length - 1" @click="moveCatalogProd($index, 1)">↓</el-button>
                    </el-button-group>
                  </template>
                </el-table-column>
                <el-table-column label="操作" width="80" align="center">
                  <template #default="{ row }">
                    <el-popconfirm title="确定移除？" @confirm="removeCatalogProd(row.product_code)">
                      <template #reference>
                        <el-button text type="danger" size="small">移除</el-button>
                      </template>
                    </el-popconfirm>
                  </template>
                </el-table-column>
              </el-table>
            </div>
            <el-empty v-else description="请选择分类" />
          </el-card>
        </el-col>
      </el-row>
    </div>

    <!-- 即刻选购管理 -->
    <div v-if="activeTab === 'shopping'">
      <div class="toolbar">
        <el-button type="primary" :icon="Plus" @click="showAddLevel1">添加一级分类</el-button>
      </div>
      
      <el-row :gutter="20">
        <!-- 一级分类 -->
        <el-col :xs="24" :lg="6">
          <el-card shadow="hover">
            <template #header>一级分类</template>
            <div v-loading="shopping.loading">
              <div v-for="cat in shopping.level1" :key="cat.id" 
                   :class="['cat-item', { active: shopping.selectedLevel1?.id === cat.id }]" 
                   @click="selectLevel1(cat)">
                <div class="cat-name">{{ cat.name }}</div>
                <div>
                  <el-button text :icon="Edit" size="small" @click.stop="editLevel1(cat)" />
                  <el-popconfirm title="确定删除？" @confirm="delCategory(cat.id)">
                    <template #reference>
                      <el-button text :icon="Delete" type="danger" size="small" @click.stop />
                    </template>
                  </el-popconfirm>
                </div>
              </div>
              <el-empty v-if="!shopping.level1.length" description="暂无分类" />
            </div>
          </el-card>
        </el-col>
        
        <!-- 二级分类 -->
        <el-col :xs="24" :lg="6">
          <el-card shadow="hover">
            <template #header>
              <div style="display:flex;justify-content:space-between;align-items:center">
                <span>{{ shopping.selectedLevel1?.name || '二级分类' }}</span>
                <el-button v-if="shopping.selectedLevel1" type="primary" size="small" :icon="Plus" 
                           @click="showAddLevel2">添加</el-button>
              </div>
            </template>
            <div v-loading="shopping.level2Loading">
              <div v-for="cat in shopping.level2" :key="cat.id" 
                   :class="['cat-item', { active: shopping.selectedLevel2?.id === cat.id }]" 
                   @click="selectLevel2(cat)">
                <div>
                  <div class="cat-name">{{ cat.name }}</div>
                  <div class="cat-meta">
                    <span>{{ cat.product_codes?.length || 0 }} 个商品</span>
                  </div>
                </div>
                <div>
                  <el-button text :icon="Edit" size="small" @click.stop="editLevel2(cat)" />
                  <el-popconfirm title="确定删除？" @confirm="delCategory(cat.id)">
                    <template #reference>
                      <el-button text :icon="Delete" type="danger" size="small" @click.stop />
                    </template>
                  </el-popconfirm>
                </div>
              </div>
              <el-empty v-if="shopping.selectedLevel1 && !shopping.level2.length" description="暂无二级分类" />
              <el-empty v-if="!shopping.selectedLevel1" description="请先选择一级分类" />
            </div>
          </el-card>
        </el-col>
        
        <!-- 商品编码管理 -->
        <el-col :xs="24" :lg="12">
          <el-card shadow="hover">
            <template #header>
              <div style="display:flex;justify-content:space-between;align-items:center">
                <span>{{ shopping.selectedLevel2?.name || '商品列表' }} 
                  <el-tag v-if="shopping.selectedLevel2" size="small" type="info">
                    {{ shopping.selectedLevel2.product_codes?.length || 0 }} 个
                  </el-tag>
                </span>
                <el-button v-if="shopping.selectedLevel2" type="primary" size="small" :icon="Plus" 
                           @click="shopping.addProductDialog = true">添加商品</el-button>
              </div>
            </template>
            <div v-if="shopping.selectedLevel2" ref="shoppingTableWrap">
              <el-table :data="shoppingProductsList" stripe size="small" max-height="400">
                <el-table-column width="36">
                  <template #header><span style="color:#aaa">⠿</span></template>
                  <template #default><span class="drag-handle" style="cursor:grab;color:#bbb;font-size:16px;user-select:none">⠿</span></template>
                </el-table-column>
                <el-table-column label="#" width="45" align="center">
                  <template #default="{ $index }">{{ $index + 1 }}</template>
                </el-table-column>
                <el-table-column prop="code" label="商品编码" min-width="140" />
                <el-table-column label="排序" width="160" align="center">
                  <template #default="{ $index }">
                    <el-button-group size="small">
                      <el-button text :disabled="$index === 0" @click="moveShoppingProdTop($index)">置顶</el-button>
                      <el-button text :disabled="$index === 0" @click="moveShoppingProd($index, -1)">↑</el-button>
                      <el-button text :disabled="$index === shoppingProductsList.length - 1" @click="moveShoppingProd($index, 1)">↓</el-button>
                    </el-button-group>
                  </template>
                </el-table-column>
                <el-table-column label="操作" width="80" align="center">
                  <template #default="{ $index }">
                    <el-popconfirm title="确定移除？" @confirm="removeShoppingProd($index)">
                      <template #reference>
                        <el-button text type="danger" size="small">移除</el-button>
                      </template>
                    </el-popconfirm>
                  </template>
                </el-table-column>
              </el-table>
              <el-empty v-if="!shopping.selectedLevel2.product_codes?.length" description="暂无商品" />
            </div>
            <el-empty v-else description="请选择二级分类" />
          </el-card>
        </el-col>
      </el-row>
    </div>

    <!-- 目录页分类弹窗 -->
    <el-dialog v-model="catalog.dialog.visible" :title="catalog.dialog.isEdit ? '编辑分类' : '添加分类'" width="500px">
      <el-form :model="catalog.dialog.form" label-width="100px">
        <el-form-item label="名称"><el-input v-model="catalog.dialog.form.name" /></el-form-item>
        <el-form-item label="类型">
          <el-radio-group v-model="catalog.dialog.form.type">
            <el-radio value="products">商品</el-radio>
            <el-radio value="cards">卡片</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="排序"><el-input-number v-model="catalog.dialog.form.sort_order" :min="0" /></el-form-item>
        <el-form-item label="启用"><el-switch v-model="catalog.dialog.form.is_active" /></el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="catalog.dialog.visible = false">取消</el-button>
        <el-button type="primary" @click="saveCatalog" :loading="catalog.dialog.saving">保存</el-button>
      </template>
    </el-dialog>
    
    <!-- 目录页添加商品弹窗 -->
    <el-dialog v-model="catalog.addProductDialog" title="添加商品" width="400px">
      <el-input v-model="catalog.newProductCode" placeholder="输入商品编码，多个用逗号分隔" type="textarea" :rows="3" />
      <template #footer>
        <el-button @click="catalog.addProductDialog = false">取消</el-button>
        <el-button type="primary" @click="addCatalogProd">添加</el-button>
      </template>
    </el-dialog>

    <!-- 即刻选购一级分类弹窗 -->
    <el-dialog v-model="shopping.level1Dialog.visible" :title="shopping.level1Dialog.isEdit ? '编辑一级分类' : '添加一级分类'" width="400px">
      <el-form :model="shopping.level1Dialog.form" label-width="80px">
        <el-form-item label="名称"><el-input v-model="shopping.level1Dialog.form.name" /></el-form-item>
        <el-form-item label="排序"><el-input-number v-model="shopping.level1Dialog.form.sort_order" :min="0" /></el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="shopping.level1Dialog.visible = false">取消</el-button>
        <el-button type="primary" @click="saveLevel1" :loading="shopping.level1Dialog.saving">保存</el-button>
      </template>
    </el-dialog>

    <!-- 即刻选购二级分类弹窗 -->
    <el-dialog v-model="shopping.level2Dialog.visible" :title="shopping.level2Dialog.isEdit ? '编辑二级分类' : '添加二级分类'" width="400px">
      <el-form :model="shopping.level2Dialog.form" label-width="80px">
        <el-form-item label="名称"><el-input v-model="shopping.level2Dialog.form.name" /></el-form-item>
        <el-form-item label="排序"><el-input-number v-model="shopping.level2Dialog.form.sort_order" :min="0" /></el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="shopping.level2Dialog.visible = false">取消</el-button>
        <el-button type="primary" @click="saveLevel2" :loading="shopping.level2Dialog.saving">保存</el-button>
      </template>
    </el-dialog>

    <!-- 即刻选购添加商品弹窗 -->
    <el-dialog v-model="shopping.addProductDialog" title="添加商品编码" width="400px">
      <el-input v-model="shopping.newProductCode" placeholder="输入商品编码，多个用逗号或分号分隔" type="textarea" :rows="3" />
      <template #footer>
        <el-button @click="shopping.addProductDialog = false">取消</el-button>
        <el-button type="primary" @click="addShoppingProd">添加</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, nextTick } from 'vue'
import { Plus, Edit, Delete } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { categoryApi, shoppingCategoryApi } from '@/api'
import Sortable from 'sortablejs'

const activeTab = ref('catalog')
const catalogTableWrap = ref(null)
const shoppingTableWrap = ref(null)
let catalogSortable = null
let shoppingSortable = null

/**
 * 通用拖拽初始化
 * @param {Ref} wrapRef  - 表格外层容器的 ref
 * @param {Sortable|null} instance - 当前 Sortable 实例（用于销毁旧的）
 * @param {Function} onDrop - 拖拽结束回调 ({ oldIndex, newIndex })
 * @returns {Sortable} 新实例
 */
function initSortable(wrapRef, instance, onDrop) {
  if (instance) instance.destroy()
  const tbody = wrapRef.value?.querySelector('.el-table__body tbody')
  if (!tbody) return null
  return Sortable.create(tbody, {
    handle: '.drag-handle',
    animation: 150,
    ghostClass: 'sortable-ghost',
    onEnd: ({ oldIndex, newIndex }) => {
      if (oldIndex !== newIndex) onDrop({ oldIndex, newIndex })
    }
  })
}

function parseUniqueCodes(input, separatorRegex) {
  return [...new Set(
    String(input || '')
      .split(separatorRegex)
      .map(s => s.trim())
      .filter(Boolean)
  )]
}

function formatListedSyncMessage(summary) {
  if (!summary) return ''

  const parts = []
  if (summary.inserted) parts.push(`新入商品池 ${summary.inserted} 个`)
  if (summary.reactivated) parts.push(`重新上架 ${summary.reactivated} 个`)
  if (summary.already_active) parts.push(`已在商品池 ${summary.already_active} 个`)

  return parts.length ? `，已同步到商品列表（${parts.join('，')}）` : ''
}

// 商品列表（将编码数组转为对象数组便于表格展示）
const shoppingProductsList = computed(() => {
  if (!shopping.selectedLevel2?.product_codes) return []
  return shopping.selectedLevel2.product_codes.map(code => ({ code }))
})

// ==================== 目录页数据 ====================
const catalog = reactive({
  loading: false,
  prodLoading: false,
  categories: [],
  products: [],
  selected: null,
  addProductDialog: false,
  newProductCode: '',
  dialog: {
    visible: false,
    isEdit: false,
    saving: false,
    form: { id: null, name: '', type: 'products', sort_order: 0, is_active: true }
  }
})

// ==================== 即刻选购数据 ====================
const shopping = reactive({
  loading: false,
  level2Loading: false,
  level1: [],
  level2: [],
  selectedLevel1: null,
  selectedLevel2: null,
  addProductDialog: false,
  newProductCode: '',
  level1Dialog: {
    visible: false,
    isEdit: false,
    saving: false,
    form: { id: null, name: '', sort_order: 0 }
  },
  level2Dialog: {
    visible: false,
    isEdit: false,
    saving: false,
    form: { id: null, name: '', sort_order: 0 }
  }
})

// ==================== Tab 切换 ====================
function onTabChange(tab) {
  if (tab === 'catalog') {
    loadCatalogCategories()
  } else {
    loadShoppingLevel1()
  }
}

// ==================== 目录页方法 ====================
async function loadCatalogCategories() {
  catalog.loading = true
  try {
    const res = await categoryApi.getCategories()
    catalog.categories = res.categories || res || []
  } catch {
    catalog.categories = []
  } finally {
    catalog.loading = false
  }
}

async function loadCatalogProducts(id) {
  catalog.prodLoading = true
  try {
    const res = await categoryApi.getCategoryProducts(id)
    catalog.products = res.products || res || []
  } catch {
    catalog.products = []
  } finally {
    catalog.prodLoading = false
  }
  await nextTick()
  catalogSortable = initSortable(catalogTableWrap, catalogSortable, async ({ oldIndex, newIndex }) => {
    const moved = catalog.products.splice(oldIndex, 1)[0]
    catalog.products.splice(newIndex, 0, moved)
    try {
      await categoryApi.reorderProducts(catalog.selected.id, catalog.products.map(p => p.product_code))
      ElMessage.success('排序已保存')
    } catch {
      ElMessage.error('排序保存失败')
      loadCatalogProducts(catalog.selected.id)
    }
  })
}

async function moveCatalogProd(idx, direction) {
  const newIdx = idx + direction
  const arr = catalog.products
  const temp = arr[idx]
  arr[idx] = arr[newIdx]
  arr[newIdx] = temp
  try {
    await categoryApi.reorderProducts(
      catalog.selected.id,
      catalog.products.map(p => p.product_code)
    )
  } catch {
    ElMessage.error('排序保存失败')
    loadCatalogProducts(catalog.selected.id)
  }
}

async function moveCatalogProdTop(idx) {
  if (idx <= 0) return
  const moved = catalog.products.splice(idx, 1)[0]
  catalog.products.unshift(moved)
  try {
    await categoryApi.reorderProducts(
      catalog.selected.id,
      catalog.products.map(p => p.product_code)
    )
  } catch {
    ElMessage.error('排序保存失败')
    loadCatalogProducts(catalog.selected.id)
  }
}

function selectCatalog(cat) { 
  catalog.selected = cat
  loadCatalogProducts(cat.id) 
}

function showAddCatalog() { 
  catalog.dialog.isEdit = false
  catalog.dialog.form = { id: null, name: '', type: 'products', sort_order: 0, is_active: true }
  catalog.dialog.visible = true 
}

function editCatalog(cat) { 
  catalog.dialog.isEdit = true
  catalog.dialog.form = { ...cat }
  catalog.dialog.visible = true 
}

async function saveCatalog() {
  catalog.dialog.saving = true
  try {
    if (catalog.dialog.isEdit) {
      await categoryApi.updateCategory(catalog.dialog.form.id, catalog.dialog.form)
    } else {
      await categoryApi.createCategory(catalog.dialog.form)
    }
    ElMessage.success('保存成功')
    catalog.dialog.visible = false
    loadCatalogCategories()
  } catch { 
    ElMessage.error('保存失败') 
  } finally { 
    catalog.dialog.saving = false 
  }
}

async function delCatalog(id) {
  try {
    await categoryApi.deleteCategory(id)
    ElMessage.success('删除成功')
    if (catalog.selected?.id === id) { 
      catalog.selected = null
      catalog.products = [] 
    }
    loadCatalogCategories()
  } catch { 
    ElMessage.error('删除失败') 
  }
}

async function addCatalogProd() {
  const codes = parseUniqueCodes(catalog.newProductCode, /[,，]/)
  if (!codes.length) {
    ElMessage.warning('请先输入商品编码')
    return
  }

  try {
    const res = await categoryApi.addProductToCategory(catalog.selected.id, codes)
    const addedCount = res.data?.length || 0
    const suffix = formatListedSyncMessage(res.listed_sync)

    if (addedCount > 0) {
      ElMessage.success(`已添加 ${addedCount} 个商品${suffix}`)
    } else {
      ElMessage.warning(`未新增商品，可能已存在于当前分类${suffix}`)
    }

    catalog.addProductDialog = false
    catalog.newProductCode = ''
    loadCatalogProducts(catalog.selected.id)
    loadCatalogCategories()
  } catch (err) {
    ElMessage.error(err.response?.data?.message || '添加失败')
  }
}

async function removeCatalogProd(code) {
  try {
    await categoryApi.removeProductFromCategory(catalog.selected.id, code)
    ElMessage.success('移除成功')
    loadCatalogProducts(catalog.selected.id)
    loadCatalogCategories()
  } catch { 
    ElMessage.error('移除失败') 
  }
}

// ==================== 即刻选购方法 ====================
async function loadShoppingLevel1() {
  shopping.loading = true
  try {
    const res = await shoppingCategoryApi.getLevel1()
    shopping.level1 = res.data || []
  } catch {
    shopping.level1 = []
  } finally {
    shopping.loading = false
  }
}

async function loadShoppingLevel2(parentId) {
  shopping.level2Loading = true
  try {
    const res = await shoppingCategoryApi.getLevel2(parentId)
    shopping.level2 = res.data || []
  } catch {
    shopping.level2 = []
  } finally {
    shopping.level2Loading = false
  }
}

function selectLevel1(cat) {
  shopping.selectedLevel1 = cat
  shopping.selectedLevel2 = null
  loadShoppingLevel2(cat.id)
}

async function selectLevel2(cat) {
  shopping.selectedLevel2 = cat
  await nextTick()
  shoppingSortable = initSortable(shoppingTableWrap, shoppingSortable, async ({ oldIndex, newIndex }) => {
    const codes = [...shopping.selectedLevel2.product_codes]
    const moved = codes.splice(oldIndex, 1)[0]
    codes.splice(newIndex, 0, moved)
    try {
      await shoppingCategoryApi.updateProductCodes(shopping.selectedLevel2.id, codes)
      shopping.selectedLevel2.product_codes = codes
      ElMessage.success('排序已保存')
    } catch {
      ElMessage.error('排序保存失败')
    }
  })
}

function showAddLevel1() {
  shopping.level1Dialog.isEdit = false
  shopping.level1Dialog.form = { id: null, name: '', sort_order: 0 }
  shopping.level1Dialog.visible = true
}

function editLevel1(cat) {
  shopping.level1Dialog.isEdit = true
  shopping.level1Dialog.form = { ...cat }
  shopping.level1Dialog.visible = true
}

function showAddLevel2() {
  shopping.level2Dialog.isEdit = false
  shopping.level2Dialog.form = { id: null, name: '', sort_order: 0 }
  shopping.level2Dialog.visible = true
}

function editLevel2(cat) {
  shopping.level2Dialog.isEdit = true
  shopping.level2Dialog.form = { ...cat }
  shopping.level2Dialog.visible = true
}

async function saveLevel1() {
  shopping.level1Dialog.saving = true
  try {
    if (shopping.level1Dialog.isEdit) {
      await shoppingCategoryApi.update(shopping.level1Dialog.form.id, shopping.level1Dialog.form)
    } else {
      await shoppingCategoryApi.createLevel1(shopping.level1Dialog.form)
    }
    ElMessage.success('保存成功')
    shopping.level1Dialog.visible = false
    loadShoppingLevel1()
  } catch { 
    ElMessage.error('保存失败') 
  } finally { 
    shopping.level1Dialog.saving = false 
  }
}

async function saveLevel2() {
  shopping.level2Dialog.saving = true
  try {
    if (shopping.level2Dialog.isEdit) {
      await shoppingCategoryApi.update(shopping.level2Dialog.form.id, shopping.level2Dialog.form)
    } else {
      await shoppingCategoryApi.createLevel2({
        ...shopping.level2Dialog.form,
        parent_id: shopping.selectedLevel1.id
      })
    }
    ElMessage.success('保存成功')
    shopping.level2Dialog.visible = false
    loadShoppingLevel2(shopping.selectedLevel1.id)
  } catch { 
    ElMessage.error('保存失败') 
  } finally { 
    shopping.level2Dialog.saving = false 
  }
}

async function delCategory(id) {
  try {
    await shoppingCategoryApi.delete(id)
    ElMessage.success('删除成功')
    
    // 刷新数据
    if (shopping.selectedLevel1?.id === id) {
      shopping.selectedLevel1 = null
      shopping.selectedLevel2 = null
      shopping.level2 = []
    } else if (shopping.selectedLevel2?.id === id) {
      shopping.selectedLevel2 = null
    }
    
    loadShoppingLevel1()
    if (shopping.selectedLevel1) {
      loadShoppingLevel2(shopping.selectedLevel1.id)
    }
  } catch (err) { 
    ElMessage.error(err.response?.data?.message || '删除失败') 
  }
}

async function addShoppingProd() {
  const codes = parseUniqueCodes(shopping.newProductCode, /[,，;；]/)
  if (!codes.length) {
    ElMessage.warning('请先输入商品编码')
    return
  }

  const existingCodes = shopping.selectedLevel2.product_codes || []
  const newCodes = [...new Set([...existingCodes, ...codes])]

  if (newCodes.length === existingCodes.length) {
    ElMessage.warning('输入的商品编码都已存在')
    return
  }
  
  try {
    const res = await shoppingCategoryApi.updateProductCodes(shopping.selectedLevel2.id, newCodes)
    ElMessage.success(`添加成功${formatListedSyncMessage(res.listed_sync)}`)
    shopping.addProductDialog = false
    shopping.newProductCode = ''
    // 更新本地数据
    shopping.selectedLevel2.product_codes = newCodes
    loadShoppingLevel2(shopping.selectedLevel1.id)
  } catch (err) {
    ElMessage.error(err.response?.data?.message || '添加失败')
  }
}

async function removeShoppingProd(idx) {
  const codes = [...shopping.selectedLevel2.product_codes]
  codes.splice(idx, 1)
  
  try {
    await shoppingCategoryApi.updateProductCodes(shopping.selectedLevel2.id, codes)
    ElMessage.success('移除成功')
    shopping.selectedLevel2.product_codes = codes
  } catch {
    ElMessage.error('移除失败')
  }
}

// 移动商品位置（排序）
async function moveShoppingProd(idx, direction) {
  const codes = [...shopping.selectedLevel2.product_codes]
  const newIdx = idx + direction
  
  // 交换位置
  const temp = codes[idx]
  codes[idx] = codes[newIdx]
  codes[newIdx] = temp
  
  try {
    await shoppingCategoryApi.updateProductCodes(shopping.selectedLevel2.id, codes)
    shopping.selectedLevel2.product_codes = codes
  } catch {
    ElMessage.error('移动失败')
  }
}

async function moveShoppingProdTop(idx) {
  if (idx <= 0) return
  const codes = [...shopping.selectedLevel2.product_codes]
  const moved = codes.splice(idx, 1)[0]
  codes.unshift(moved)

  try {
    await shoppingCategoryApi.updateProductCodes(shopping.selectedLevel2.id, codes)
    shopping.selectedLevel2.product_codes = codes
  } catch {
    ElMessage.error('移动失败')
  }
}

onMounted(() => {
  loadCatalogCategories()
})
</script>

<style scoped>
.drag-handle {
  cursor: grab !important;
}

.drag-handle:active {
  cursor: grabbing !important;
}

:deep(.sortable-ghost) {
  opacity: 0.5;
  background: var(--bg-elevated) !important;
}

.page-header {
  margin-bottom: 20px;
}

.tab-desc {
  color: var(--text-muted);
  font-size: 12px;
  margin-bottom: 20px;
  padding: 8px 12px;
  background: var(--bg-elevated);
  border-radius: 6px;
  border-left: 3px solid var(--primary);
}

.toolbar {
  margin-bottom: 16px;
}

.product-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.product-tag {
  font-size: 13px;
}

:deep(.el-tabs__item) {
  color: var(--text-secondary);
}

:deep(.el-tabs__item.is-active) {
  color: var(--primary);
}

:deep(.el-tabs__nav) {
  border-color: var(--border-color) !important;
}

:deep(.el-tabs__item:hover) {
  color: var(--primary);
}
</style>
