<template>
  <div class="page-container">
    <div class="page-header">
      <h2>商品管理</h2>
      <el-button type="primary" :icon="Refresh" @click="loadProducts" :loading="loading">刷新</el-button>
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
        <el-table-column label="图片" width="80">
          <template #default="{ row }">
            <el-image v-if="row.pic" :src="row.pic" fit="cover" style="width:50px;height:50px;border-radius:4px" />
          </template>
        </el-table-column>
        <el-table-column prop="sku_id" label="编码" width="150" />
        <el-table-column prop="name" label="名称" min-width="200" show-overflow-tooltip />
        <el-table-column prop="c_name" label="分类" width="120" />
        <el-table-column prop="sale_price" label="售价" width="100" align="right">
          <template #default="{ row }"><span class="price">¥{{ row.sale_price }}</span></template>
        </el-table-column>
        <el-table-column prop="qty" label="库存" width="80" align="center">
          <template #default="{ row }">
            <el-tag :type="row.qty > 10 ? 'success' : row.qty > 0 ? 'warning' : 'danger'" size="small">{{ row.qty }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="100">
          <template #default="{ row }">
            <el-button text type="primary" size="small" @click="showDetail(row)">详情</el-button>
          </template>
        </el-table-column>
      </el-table>
      <div class="pagination-container">
        <el-pagination v-model:current-page="page" v-model:page-size="pageSize" :total="total" layout="total, sizes, prev, pager, next" @change="loadProducts" />
      </div>
    </el-card>
    
    <el-drawer v-model="drawer.visible" :title="drawer.product?.name" size="50%">
      <el-descriptions v-if="drawer.product" :column="2" border>
        <el-descriptions-item label="编码">{{ drawer.product.sku_id }}</el-descriptions-item>
        <el-descriptions-item label="分类">{{ drawer.product.c_name }}</el-descriptions-item>
        <el-descriptions-item label="售价"><span class="price">¥{{ drawer.product.sale_price }}</span></el-descriptions-item>
        <el-descriptions-item label="库存">{{ drawer.product.qty }}</el-descriptions-item>
      </el-descriptions>
    </el-drawer>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { Search, Refresh } from '@element-plus/icons-vue'
import { productApi } from '@/api'

const loading = ref(false)
const products = ref([])
const search = reactive({ keyword: '' })
const page = ref(1)
const pageSize = ref(20)
const total = ref(0)
const drawer = reactive({ visible: false, product: null })

async function loadProducts() {
  loading.value = true
  try {
    const res = await productApi.getList({ page: page.value, page_size: pageSize.value, keyword: search.keyword })
    products.value = res.products || res.data || []
    total.value = res.total || 0
  } catch {
    products.value = [
      { sku_id: 'NBB-001', name: '萌宠小背包', c_name: '宠物用品', sale_price: 199, qty: 50, pic: '' },
      { sku_id: 'NBB-002', name: '人宠同款卫衣', c_name: '服装', sale_price: 299, qty: 30, pic: '' }
    ]
    total.value = 2
  } finally {
    loading.value = false
  }
}

function handleSearch() { page.value = 1; loadProducts() }
function showDetail(row) { drawer.product = row; drawer.visible = true }

onMounted(loadProducts)
</script>

<style scoped>
.mb-20 { margin-bottom: 20px; }
</style>
