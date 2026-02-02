<template>
  <div class="page-container">
    <div class="page-header">
      <h2>会员管理</h2>
      <el-button :icon="Refresh" @click="loadUsers" :loading="loading">刷新</el-button>
    </div>
    
    <el-card shadow="hover" class="mb-20">
      <el-form :model="search" inline>
        <el-form-item label="关键词">
          <el-input v-model="search.keyword" placeholder="昵称/手机号" clearable @keyup.enter="handleSearch" />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="handleSearch">搜索</el-button>
          <el-button @click="search.keyword = ''; handleSearch()">重置</el-button>
        </el-form-item>
      </el-form>
    </el-card>
    
    <el-card shadow="hover">
      <el-table v-loading="loading" :data="users" stripe>
        <el-table-column prop="id" label="ID" width="80" />
        <el-table-column label="用户" width="180">
          <template #default="{ row }">
            <div style="display:flex;align-items:center;gap:8px">
              <el-avatar :size="36">{{ row.nickname?.[0] || 'U' }}</el-avatar>
              <span>{{ row.nickname || '未设置' }}</span>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="phone" label="手机号" width="130">
          <template #default="{ row }">{{ row.phone || '-' }}</template>
        </el-table-column>
        <el-table-column prop="order_count" label="订单数" width="80" align="center" />
        <el-table-column prop="total_spent" label="累计消费" width="120" align="right">
          <template #default="{ row }"><span class="price">¥{{ row.total_spent || '0.00' }}</span></template>
        </el-table-column>
        <el-table-column prop="created_at" label="注册时间">
          <template #default="{ row }">{{ formatDate(row.created_at) }}</template>
        </el-table-column>
        <el-table-column prop="is_active" label="状态" width="80">
          <template #default="{ row }">
            <el-switch :model-value="row.is_active" @change="(v) => toggleStatus(row, v)" />
          </template>
        </el-table-column>
        <el-table-column label="操作" width="80">
          <template #default="{ row }">
            <el-button text type="primary" size="small" @click="showDetail(row)">详情</el-button>
          </template>
        </el-table-column>
      </el-table>
      <div class="pagination-container">
        <el-pagination v-model:current-page="page" v-model:page-size="pageSize" :total="total" layout="total, prev, pager, next" @change="loadUsers" />
      </div>
    </el-card>
    
    <el-drawer v-model="drawer.visible" title="会员详情" size="400px">
      <div v-if="drawer.user" class="user-detail">
        <div class="user-header">
          <el-avatar :size="64">{{ drawer.user.nickname?.[0] || 'U' }}</el-avatar>
          <h3>{{ drawer.user.nickname || '未设置' }}</h3>
        </div>
        <el-descriptions :column="1" border>
          <el-descriptions-item label="ID">{{ drawer.user.id }}</el-descriptions-item>
          <el-descriptions-item label="手机号">{{ drawer.user.phone || '未绑定' }}</el-descriptions-item>
          <el-descriptions-item label="订单数">{{ drawer.user.order_count || 0 }}</el-descriptions-item>
          <el-descriptions-item label="累计消费">¥{{ drawer.user.total_spent || '0.00' }}</el-descriptions-item>
          <el-descriptions-item label="注册时间">{{ formatDate(drawer.user.created_at) }}</el-descriptions-item>
        </el-descriptions>
      </div>
    </el-drawer>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { Refresh } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { userApi } from '@/api'
import dayjs from 'dayjs'

const loading = ref(false)
const users = ref([])
const search = reactive({ keyword: '' })
const page = ref(1)
const pageSize = ref(20)
const total = ref(0)
const drawer = reactive({ visible: false, user: null })

const formatDate = (d) => dayjs(d).format('YYYY-MM-DD HH:mm')

async function loadUsers() {
  loading.value = true
  try {
    const res = await userApi.getList({ page: page.value, page_size: pageSize.value, keyword: search.keyword })
    users.value = res.users || res.data || []
    total.value = res.total || 0
  } catch {
    users.value = [
      { id: 1, nickname: '小明', phone: '138****1234', order_count: 15, total_spent: 2580, is_active: true, created_at: new Date() },
      { id: 2, nickname: '小红', phone: '139****5678', order_count: 28, total_spent: 5680, is_active: true, created_at: new Date() }
    ]
    total.value = 2
  } finally {
    loading.value = false
  }
}

function handleSearch() { page.value = 1; loadUsers() }
function showDetail(row) { drawer.user = row; drawer.visible = true }

async function toggleStatus(row, value) {
  try {
    await ElMessageBox.confirm(`确定${value ? '启用' : '禁用'}该用户？`, '提示', { type: 'warning' })
    await userApi.updateStatus(row.id, value)
    row.is_active = value
    ElMessage.success('更新成功')
  } catch (e) { if (e !== 'cancel') ElMessage.error('更新失败') }
}

onMounted(loadUsers)
</script>

<style scoped>
.mb-20 { margin-bottom: 20px; }
.user-detail .user-header { text-align: center; margin-bottom: 20px; }
.user-detail .user-header h3 { margin: 12px 0 0; }
</style>
