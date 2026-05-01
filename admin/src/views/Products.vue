<template>
  <div class="page-container">
    <div class="page-header">
      <h2>商品管理</h2>
      <el-button :icon="Refresh" @click="loadProducts" :loading="loading">刷新</el-button>
    </div>

    <el-card shadow="hover" class="mb-20">
      <el-form :model="search" inline>
        <el-form-item label="关键词">
          <el-input v-model="search.keyword" placeholder="商品名称/编码" clearable @keyup.enter="handleSearch" />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :icon="Search" @click="handleSearch">搜索</el-button>
          <el-button @click="search.keyword = ''; handleSearch()">重置</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <el-card shadow="hover">
      <el-table v-loading="loading" :data="products" stripe>
        <el-table-column label="图片" width="70">
          <template #default="{ row }">
            <el-image v-if="row.mainImage" :src="row.mainImage" fit="cover"
              style="width:46px;height:46px;border-radius:4px" />
          </template>
        </el-table-column>
        <el-table-column prop="code" label="编码" width="140" />
        <el-table-column prop="name" label="名称" min-width="180" show-overflow-tooltip />
        <el-table-column prop="category" label="分类" width="110" show-overflow-tooltip />
        <el-table-column label="售价" width="150" align="right">
          <template #default="{ row }">
            <div class="price-cell">
              <span class="price-main">¥{{ (row.price / 100).toFixed(2) }}</span>
              <!-- 有本地改价时显示聚水潭原价和标记 -->
              <template v-if="row.hasPriceOverride">
                <el-tag type="warning" size="small" style="margin-left:4px">改价</el-tag>
                <div v-if="row.jstPrice && row.jstPrice !== row.price" class="price-jst">
                  聚水潭: ¥{{ (row.jstPrice / 100).toFixed(2) }}
                </div>
              </template>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="库存" width="75" align="center">
          <template #default="{ row }">
            <el-tag :type="row.stock > 10 ? 'success' : row.stock > 0 ? 'warning' : 'danger'" size="small">
              {{ row.stock }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="150">
          <template #default="{ row }">
            <el-button text type="primary" size="small" @click="showDetail(row)">详情</el-button>
            <el-button text type="warning" size="small" @click="showPricingDialog(row)">改价</el-button>
          </template>
        </el-table-column>
      </el-table>
      <div class="pagination-container">
        <el-pagination v-model:current-page="page" v-model:page-size="pageSize"
          :total="total" layout="total, sizes, prev, pager, next" @change="loadProducts" />
      </div>
    </el-card>

    <!-- 商品详情抽屉 -->
    <el-drawer v-model="drawer.visible" :title="drawer.product?.name" size="50%">
      <el-descriptions v-if="drawer.product" :column="2" border>
        <el-descriptions-item label="编码">{{ drawer.product.code }}</el-descriptions-item>
        <el-descriptions-item label="分类">{{ drawer.product.category }}</el-descriptions-item>
        <el-descriptions-item label="当前售价">
          <span class="price">¥{{ (drawer.product.price / 100).toFixed(2) }}</span>
          <el-tag v-if="drawer.product.hasPriceOverride" type="warning" size="small" style="margin-left:6px">本地改价</el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="聚水潭标价">
          ¥{{ drawer.product.jstPrice ? (drawer.product.jstPrice / 100).toFixed(2) : '-' }}
        </el-descriptions-item>
        <el-descriptions-item v-if="drawer.product.originalPrice" label="划线价">
          ¥{{ (drawer.product.originalPrice / 100).toFixed(2) }}
        </el-descriptions-item>
        <el-descriptions-item v-if="drawer.product.priceNote" label="价格备注">
          {{ drawer.product.priceNote }}
        </el-descriptions-item>
        <el-descriptions-item label="库存">{{ drawer.product.stock }}</el-descriptions-item>
        <el-descriptions-item label="品牌">{{ drawer.product.brand || '-' }}</el-descriptions-item>
        <el-descriptions-item label="上架状态">
          <el-tag :type="drawer.product.onsale ? 'success' : 'info'" size="small">
            {{ drawer.product.onsale ? '上架中' : '已下架' }}
          </el-tag>
        </el-descriptions-item>
      </el-descriptions>
      <div style="margin-top:16px;text-align:right">
        <el-button type="warning" @click="showPricingDialog(drawer.product)">修改定价</el-button>
      </div>
    </el-drawer>

    <!-- 定价编辑弹窗 -->
    <el-dialog v-model="pricingDialog.visible" title="修改定价" width="480px" :close-on-click-modal="false">
      <div class="pricing-product-info">
        <strong>{{ pricingDialog.product?.name }}</strong>
        <span class="code">{{ pricingDialog.product?.code }}</span>
        <div class="jst-price">
          聚水潭标价：¥{{ pricingDialog.product?.jstPrice ? (pricingDialog.product.jstPrice / 100).toFixed(2) : '-' }}
        </div>
      </div>

      <el-form :model="pricingDialog.form" label-width="90px" style="margin-top:20px">
        <el-form-item label="本地售价">
          <div style="display:flex;gap:8px;align-items:center;width:100%">
            <el-input-number
              v-model="pricingDialog.form.sale_price_yuan"
              :precision="2" :step="10" :min="0"
              placeholder="留空则使用聚水潭价"
              style="flex:1"
              :controls="false"
            />
            <span>元</span>
            <el-button size="small" @click="pricingDialog.form.sale_price_yuan = null" link type="danger">清除</el-button>
          </div>
          <div class="field-tip">设置后覆盖聚水潭标价，清除后恢复用聚水潭价</div>
        </el-form-item>

        <el-form-item label="划线原价">
          <div style="display:flex;gap:8px;align-items:center;width:100%">
            <el-input-number
              v-model="pricingDialog.form.original_price_yuan"
              :precision="2" :step="10" :min="0"
              placeholder="留空则不显示划线"
              style="flex:1"
              :controls="false"
            />
            <span>元</span>
            <el-button size="small" @click="pricingDialog.form.original_price_yuan = null" link type="danger">清除</el-button>
          </div>
          <div class="field-tip">前端显示删除线价格，如"¥299 <s>¥599</s>"</div>
        </el-form-item>

        <el-form-item label="价格备注">
          <el-input v-model="pricingDialog.form.price_note" placeholder="如：限时特惠、会员价（可留空）" clearable />
        </el-form-item>
      </el-form>

      <!-- 实时预览 -->
      <div class="pricing-preview">
        <span class="preview-label">预览效果：</span>
        <span class="preview-price">
          ¥{{ previewPrice }}
        </span>
        <s v-if="pricingDialog.form.original_price_yuan" class="preview-original">
          ¥{{ pricingDialog.form.original_price_yuan.toFixed(2) }}
        </s>
        <el-tag v-if="pricingDialog.form.price_note" size="small" type="danger" style="margin-left:6px">
          {{ pricingDialog.form.price_note }}
        </el-tag>
      </div>

      <template #footer>
        <el-button @click="pricingDialog.visible = false">取消</el-button>
        <el-button type="primary" @click="savePricing" :loading="pricingDialog.saving">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { Search, Refresh } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { productApi } from '@/api'

const loading = ref(false)
const products = ref([])
const search = reactive({ keyword: '' })
const page = ref(1)
const pageSize = ref(20)
const total = ref(0)
const drawer = reactive({ visible: false, product: null })

const pricingDialog = reactive({
  visible: false,
  saving: false,
  product: null,
  form: { sale_price_yuan: null, original_price_yuan: null, price_note: '' }
})

const previewPrice = computed(() => {
  const p = pricingDialog.form
  if (p.sale_price_yuan != null) return p.sale_price_yuan.toFixed(2)
  if (pricingDialog.product?.jstPrice) return (pricingDialog.product.jstPrice / 100).toFixed(2)
  return '-'
})

async function loadProducts() {
  loading.value = true
  try {
    const res = await productApi.getList({ page: page.value, pageSize: pageSize.value, keyword: search.keyword })
    if (res.success && res.data) {
      products.value = res.data.items || []
      total.value = res.data.pagination?.total || 0
    } else {
      products.value = []
      total.value = 0
    }
  } catch (error) {
    console.error('加载商品失败:', error)
    products.value = []
  } finally {
    loading.value = false
  }
}

function handleSearch() { page.value = 1; loadProducts() }
function showDetail(row) { drawer.product = row; drawer.visible = true }

function showPricingDialog(product) {
  pricingDialog.product = product
  pricingDialog.form = {
    sale_price_yuan: product.hasPriceOverride && product.price !== product.jstPrice
      ? product.price / 100
      : null,
    original_price_yuan: product.originalPrice ? product.originalPrice / 100 : null,
    price_note: product.priceNote || ''
  }
  pricingDialog.visible = true
}

async function savePricing() {
  pricingDialog.saving = true
  const f = pricingDialog.form
  try {
    await productApi.updatePricing(pricingDialog.product.code, {
      sale_price:     f.sale_price_yuan     != null ? Math.round(f.sale_price_yuan * 100)     : null,
      original_price: f.original_price_yuan != null ? Math.round(f.original_price_yuan * 100) : null,
      price_note:     f.price_note || null
    })
    ElMessage.success('定价已更新')
    pricingDialog.visible = false
    loadProducts()
  } catch {
    ElMessage.error('保存失败')
  } finally {
    pricingDialog.saving = false
  }
}

onMounted(loadProducts)
</script>

<style scoped>
.mb-20 { margin-bottom: 20px; }

.price-cell { display: flex; flex-direction: column; align-items: flex-end; }
.price-main { font-weight: 600; color: #e6311a; font-size: 14px; }
.price-jst  { font-size: 11px; color: #999; }

.pricing-product-info {
  background: #f5f7fa;
  border-radius: 6px;
  padding: 12px 16px;
}
.pricing-product-info strong { font-size: 15px; display: block; margin-bottom: 4px; }
.pricing-product-info .code  { font-size: 12px; color: #909399; }
.pricing-product-info .jst-price { margin-top: 6px; font-size: 13px; color: #606266; }

.field-tip { font-size: 12px; color: #909399; margin-top: 4px; }

.pricing-preview {
  margin: 16px 0 4px;
  padding: 12px 16px;
  background: #fff7e6;
  border-radius: 6px;
  display: flex;
  align-items: center;
  gap: 8px;
}
.preview-label   { font-size: 13px; color: #909399; }
.preview-price   { font-size: 20px; font-weight: 700; color: #e6311a; }
.preview-original { font-size: 14px; color: #bbb; }
</style>
