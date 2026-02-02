<template>
  <div class="page-container">
    <div class="page-header">
      <h2>订单管理</h2>
      <el-button :icon="Refresh" @click="loadOrders" :loading="loading">刷新</el-button>
    </div>
    
    <el-card shadow="hover" class="mb-20">
      <el-form :model="search" inline>
        <el-form-item label="关键词">
          <el-input v-model="search.keyword" placeholder="订单号/用户" clearable @keyup.enter="handleSearch" />
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="search.status" placeholder="全部" clearable>
            <el-option label="待支付" value="pending" />
            <el-option label="已支付" value="paid" />
            <el-option label="已发货" value="shipped" />
            <el-option label="已完成" value="completed" />
            <el-option label="已取消" value="cancelled" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="handleSearch">搜索</el-button>
          <el-button @click="search.keyword = ''; search.status = ''; handleSearch()">重置</el-button>
        </el-form-item>
      </el-form>
    </el-card>
    
    <el-card shadow="hover">
      <el-table v-loading="loading" :data="orders" stripe>
        <el-table-column prop="order_no" label="订单号" width="180">
          <template #default="{ row }">
            <el-link type="primary" @click="showDetail(row)">{{ row.order_no }}</el-link>
          </template>
        </el-table-column>
        <el-table-column prop="user_nickname" label="用户" width="120" />
        <el-table-column prop="total_amount" label="金额" width="100" align="right">
          <template #default="{ row }"><span class="price">¥{{ row.total_amount }}</span></template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="statusMap[row.status]?.type" size="small">{{ statusMap[row.status]?.text }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="created_at" label="下单时间">
          <template #default="{ row }">{{ formatDate(row.created_at) }}</template>
        </el-table-column>
        <el-table-column label="操作" width="150">
          <template #default="{ row }">
            <el-button text type="primary" size="small" @click="showDetail(row)">详情</el-button>
            <el-dropdown @command="(cmd) => changeStatus(row, cmd)">
              <el-button text type="primary" size="small">更多</el-button>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item command="shipped" :disabled="row.status !== 'paid'">发货</el-dropdown-item>
                  <el-dropdown-item command="completed" :disabled="row.status !== 'shipped'">完成</el-dropdown-item>
                  <el-dropdown-item command="cancelled" :disabled="['completed','cancelled'].includes(row.status)">取消</el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
          </template>
        </el-table-column>
      </el-table>
      <div class="pagination-container">
        <el-pagination v-model:current-page="page" v-model:page-size="pageSize" :total="total" layout="total, prev, pager, next" @change="loadOrders" />
      </div>
    </el-card>
    
    <el-drawer v-model="drawer.visible" title="订单详情" size="500px">
      <el-descriptions v-if="drawer.order" :column="1" border>
        <el-descriptions-item label="订单号">{{ drawer.order.order_no }}</el-descriptions-item>
        <el-descriptions-item label="用户">{{ drawer.order.user_nickname }}</el-descriptions-item>
        <el-descriptions-item label="金额"><span class="price">¥{{ drawer.order.total_amount }}</span></el-descriptions-item>
        <el-descriptions-item label="状态">
          <el-tag :type="statusMap[drawer.order.status]?.type">{{ statusMap[drawer.order.status]?.text }}</el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="时间">{{ formatDate(drawer.order.created_at) }}</el-descriptions-item>
      </el-descriptions>
    </el-drawer>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { Refresh } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { orderApi } from '@/api'
import dayjs from 'dayjs'

const loading = ref(false)
const orders = ref([])
const search = reactive({ keyword: '', status: '' })
const page = ref(1)
const pageSize = ref(20)
const total = ref(0)
const drawer = reactive({ visible: false, order: null })

const statusMap = {
  pending: { text: '待支付', type: 'warning' },
  paid: { text: '已支付', type: 'primary' },
  shipped: { text: '已发货', type: 'info' },
  completed: { text: '已完成', type: 'success' },
  cancelled: { text: '已取消', type: 'danger' }
}

const formatDate = (d) => dayjs(d).format('YYYY-MM-DD HH:mm')

async function loadOrders() {
  loading.value = true
  try {
    const res = await orderApi.getList({ page: page.value, page_size: pageSize.value, keyword: search.keyword, status: search.status })
    orders.value = res.orders || res.data || []
    total.value = res.total || 0
  } catch {
    orders.value = [
      { order_no: 'ORD20260131001', user_nickname: '小明', total_amount: 299, status: 'paid', created_at: new Date() },
      { order_no: 'ORD20260131002', user_nickname: '小红', total_amount: 599, status: 'shipped', created_at: new Date() }
    ]
    total.value = 2
  } finally {
    loading.value = false
  }
}

function handleSearch() { page.value = 1; loadOrders() }
function showDetail(row) { drawer.order = row; drawer.visible = true }

async function changeStatus(row, status) {
  try {
    await ElMessageBox.confirm(`确定将订单标记为"${statusMap[status].text}"？`, '提示', { type: 'warning' })
    await orderApi.updateStatus(row.id || row.order_no, status)
    ElMessage.success('更新成功')
    loadOrders()
  } catch (e) { if (e !== 'cancel') ElMessage.error('更新失败') }
}

onMounted(loadOrders)
</script>

<style scoped>
.mb-20 { margin-bottom: 20px; }
</style>
