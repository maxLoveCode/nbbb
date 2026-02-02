<template>
  <div class="page-container">
    <div class="page-header">
      <h2>Dashboard</h2>
      <el-button @click="loadData" :loading="loading">
        <el-icon><Refresh /></el-icon>
        Refresh
      </el-button>
    </div>
    
    <!-- 统计卡片 -->
    <div class="stats-grid">
      <div v-for="(stat, idx) in statCards" :key="idx" class="stat-card">
        <div class="stat-icon" :style="{ background: stat.gradient }">
          <el-icon><component :is="stat.icon" /></el-icon>
        </div>
        <div class="stat-content">
          <div class="stat-value">{{ stat.prefix || '' }}{{ stat.value }}</div>
          <div class="stat-label">{{ stat.label }}</div>
        </div>
        <div class="stat-trend" :class="stat.trend > 0 ? 'up' : 'down'">
          <el-icon><component :is="stat.trend > 0 ? 'Top' : 'Bottom'" /></el-icon>
          {{ Math.abs(stat.trend) }}%
        </div>
      </div>
    </div>
    
    <el-row :gutter="24" class="charts-row">
      <!-- 销售趋势 -->
      <el-col :xs="24" :lg="16">
        <el-card shadow="hover">
          <template #header>
            <div class="card-header">
              <span>Sales Trend</span>
              <el-radio-group v-model="chartPeriod" size="small">
                <el-radio-button value="7d">7D</el-radio-button>
                <el-radio-button value="30d">30D</el-radio-button>
                <el-radio-button value="90d">90D</el-radio-button>
              </el-radio-group>
            </div>
          </template>
          <div class="chart-container" ref="salesChartRef"></div>
        </el-card>
      </el-col>
      
      <!-- 订单分布 -->
      <el-col :xs="24" :lg="8">
        <el-card shadow="hover">
          <template #header>Order Status</template>
          <div class="chart-container" ref="orderChartRef"></div>
        </el-card>
      </el-col>
    </el-row>
    
    <!-- 最近订单 -->
    <el-card shadow="hover" class="recent-card">
      <template #header>
        <div class="card-header">
          <span>Recent Orders</span>
          <el-button text type="primary" @click="$router.push('/orders')">
            View All <el-icon><ArrowRight /></el-icon>
          </el-button>
        </div>
      </template>
      
      <el-table :data="recentOrders" stripe>
        <el-table-column prop="order_no" label="ORDER ID" width="180">
          <template #default="{ row }">
            <span class="order-id">#{{ row.order_no.slice(-8) }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="user_nickname" label="CUSTOMER" width="140" />
        <el-table-column prop="total_amount" label="AMOUNT" width="120" align="right">
          <template #default="{ row }">
            <span class="price">¥{{ row.total_amount }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="status" label="STATUS" width="120">
          <template #default="{ row }">
            <el-tag :type="statusMap[row.status]?.type" size="small">
              {{ statusMap[row.status]?.text }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="created_at" label="DATE">
          <template #default="{ row }">
            {{ formatDate(row.created_at) }}
          </template>
        </el-table-column>
      </el-table>
    </el-card>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onUnmounted } from 'vue'
import { Refresh, ArrowRight, Goods, ShoppingCart, User, Wallet, Top, Bottom } from '@element-plus/icons-vue'
import { dashboardApi } from '@/api'
import * as echarts from 'echarts'
import dayjs from 'dayjs'

const loading = ref(false)
const stats = reactive({ totalProducts: 156, totalOrders: 1280, totalUsers: 523, totalRevenue: 258600 })
const recentOrders = ref([])
const chartPeriod = ref('7d')

const salesChartRef = ref()
const orderChartRef = ref()
let salesChart = null
let orderChart = null

const statusMap = {
  pending: { text: 'Pending', type: 'warning' },
  paid: { text: 'Paid', type: 'primary' },
  shipped: { text: 'Shipped', type: 'info' },
  completed: { text: 'Completed', type: 'success' },
  cancelled: { text: 'Cancelled', type: 'danger' }
}

const statCards = computed(() => [
  { icon: Goods, label: 'Total Products', value: stats.totalProducts, trend: 12, gradient: 'linear-gradient(135deg, #c9a962, #e5d4a1)' },
  { icon: ShoppingCart, label: 'Total Orders', value: stats.totalOrders.toLocaleString(), trend: 8, gradient: 'linear-gradient(135deg, #4ade80, #22c55e)' },
  { icon: User, label: 'Total Members', value: stats.totalUsers.toLocaleString(), trend: 15, gradient: 'linear-gradient(135deg, #60a5fa, #3b82f6)' },
  { icon: Wallet, label: 'Total Revenue', value: stats.totalRevenue.toLocaleString(), prefix: '¥', trend: -3, gradient: 'linear-gradient(135deg, #f87171, #ef4444)' }
])

const formatDate = (d) => dayjs(d).format('MMM DD, HH:mm')

async function loadData() {
  loading.value = true
  try {
    const [statsRes, ordersRes] = await Promise.all([
      dashboardApi.getStats().catch(() => null),
      dashboardApi.getRecentOrders().catch(() => null)
    ])
    if (statsRes) Object.assign(stats, statsRes)
    recentOrders.value = ordersRes?.orders || [
      { order_no: 'ORD20260131001', user_nickname: 'Michael', total_amount: 299, status: 'paid', created_at: new Date() },
      { order_no: 'ORD20260131002', user_nickname: 'Sarah', total_amount: 599, status: 'shipped', created_at: new Date() },
      { order_no: 'ORD20260130003', user_nickname: 'David', total_amount: 199, status: 'completed', created_at: new Date() }
    ]
    initCharts()
  } finally {
    loading.value = false
  }
}

function initCharts() {
  initSalesChart()
  initOrderChart()
}

function initSalesChart() {
  if (!salesChartRef.value) return
  if (!salesChart) salesChart = echarts.init(salesChartRef.value)
  
  const days = chartPeriod.value === '7d' ? 7 : chartPeriod.value === '30d' ? 30 : 90
  const dates = [], sales = []
  for (let i = days - 1; i >= 0; i--) {
    dates.push(dayjs().subtract(i, 'day').format('MM/DD'))
    sales.push(Math.floor(Math.random() * 8000) + 2000)
  }
  
  salesChart.setOption({
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      backgroundColor: '#1a1a1a',
      borderColor: '#2a2a2a',
      textStyle: { color: '#fff' }
    },
    grid: { left: 50, right: 20, top: 20, bottom: 30 },
    xAxis: {
      type: 'category',
      data: dates,
      axisLine: { lineStyle: { color: '#2a2a2a' } },
      axisLabel: { color: '#666' }
    },
    yAxis: {
      type: 'value',
      splitLine: { lineStyle: { color: '#1a1a1a' } },
      axisLabel: { color: '#666' }
    },
    series: [{
      type: 'line',
      data: sales,
      smooth: true,
      symbol: 'none',
      lineStyle: { color: '#c9a962', width: 3 },
      areaStyle: {
        color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
          { offset: 0, color: 'rgba(201, 169, 98, 0.3)' },
          { offset: 1, color: 'rgba(201, 169, 98, 0)' }
        ])
      }
    }]
  })
}

function initOrderChart() {
  if (!orderChartRef.value) return
  if (!orderChart) orderChart = echarts.init(orderChartRef.value)
  
  orderChart.setOption({
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'item',
      backgroundColor: '#1a1a1a',
      borderColor: '#2a2a2a',
      textStyle: { color: '#fff' }
    },
    series: [{
      type: 'pie',
      radius: ['50%', '75%'],
      center: ['50%', '50%'],
      itemStyle: { borderRadius: 6, borderColor: '#141414', borderWidth: 3 },
      label: { show: false },
      data: [
        { value: 35, name: 'Pending', itemStyle: { color: '#fbbf24' } },
        { value: 120, name: 'Paid', itemStyle: { color: '#c9a962' } },
        { value: 85, name: 'Shipped', itemStyle: { color: '#60a5fa' } },
        { value: 280, name: 'Completed', itemStyle: { color: '#4ade80' } },
        { value: 15, name: 'Cancelled', itemStyle: { color: '#f87171' } }
      ]
    }]
  })
}

function handleResize() {
  salesChart?.resize()
  orderChart?.resize()
}

onMounted(() => {
  loadData()
  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
  salesChart?.dispose()
  orderChart?.dispose()
})
</script>

<style lang="scss" scoped>
.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 24px;
  margin-bottom: 24px;
  
  @media (max-width: 1200px) {
    grid-template-columns: repeat(2, 1fr);
  }
  
  @media (max-width: 600px) {
    grid-template-columns: 1fr;
  }
}

.stat-card {
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: 16px;
  padding: 24px;
  display: flex;
  align-items: flex-start;
  gap: 16px;
  transition: all 0.3s;
  position: relative;
  overflow: hidden;
  
  &:hover {
    border-color: var(--primary);
    transform: translateY(-4px);
    box-shadow: 0 16px 48px rgba(201, 169, 98, 0.15);
  }
  
  .stat-icon {
    width: 48px;
    height: 48px;
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    
    .el-icon {
      font-size: 22px;
      color: #0a0a0a;
    }
  }
  
  .stat-content {
    flex: 1;
    
    .stat-value {
      font-size: 28px;
      font-weight: 700;
      color: var(--text-primary);
      letter-spacing: -1px;
      line-height: 1;
    }
    
    .stat-label {
      font-size: 12px;
      color: var(--text-muted);
      margin-top: 8px;
      text-transform: uppercase;
      letter-spacing: 1px;
    }
  }
  
  .stat-trend {
    position: absolute;
    top: 16px;
    right: 16px;
    font-size: 12px;
    font-weight: 600;
    display: flex;
    align-items: center;
    gap: 2px;
    
    &.up {
      color: var(--success);
    }
    
    &.down {
      color: var(--danger);
    }
  }
}

.charts-row {
  margin-bottom: 24px;
  
  .el-col {
    margin-bottom: 24px;
  }
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.chart-container {
  height: 280px;
}

.recent-card {
  .order-id {
    font-family: 'SF Mono', monospace;
    font-size: 13px;
    color: var(--primary);
  }
}

:deep(.el-radio-group) {
  .el-radio-button__inner {
    background: var(--bg-elevated);
    border-color: var(--border-color);
    color: var(--text-secondary);
    
    &:hover {
      color: var(--primary);
    }
  }
  
  .el-radio-button__original-radio:checked + .el-radio-button__inner {
    background: var(--primary);
    border-color: var(--primary);
    color: #0a0a0a;
  }
}
</style>
