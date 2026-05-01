<template>
  <div class="page-container">
    <div class="page-header">
      <h2>会员管理</h2>
      <el-button :icon="Refresh" @click="loadUsers" :loading="loading">刷新</el-button>
    </div>

    <el-card shadow="hover" class="mb-20">
      <el-form :model="search" inline>
        <el-form-item label="关键词">
          <el-input v-model="search.keyword" placeholder="昵称/手机号/邮箱" clearable @keyup.enter="handleSearch" />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="handleSearch">搜索</el-button>
          <el-button @click="resetSearch">重置</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <el-card shadow="hover">
      <el-table v-loading="loading" :data="users" stripe>
        <el-table-column prop="id" label="ID" width="80" />
        <el-table-column label="用户" min-width="220">
          <template #default="{ row }">
            <div class="user-cell">
              <el-avatar :size="36">{{ row.nickname?.[0] || row.username?.[0] || 'U' }}</el-avatar>
              <div class="user-copy">
                <strong>{{ row.nickname || row.username || '未设置' }}</strong>
                <span>{{ row.email || '-' }}</span>
              </div>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="mobile" label="手机号" width="150">
          <template #default="{ row }">{{ row.mobile || '-' }}</template>
        </el-table-column>
        <el-table-column label="价格身份" width="150">
          <template #default="{ row }">
            <el-tag :type="row.isWhitelistPrice ? 'danger' : 'info'">
              {{ row.isWhitelistPrice ? '白名单三折' : '公开价' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="折扣系数" width="120" align="center">
          <template #default="{ row }">{{ row.pricingDiscountRate ?? '-' }}</template>
        </el-table-column>
        <el-table-column label="注册时间" min-width="180">
          <template #default="{ row }">{{ formatDate(row.createdAt || row.created_at) }}</template>
        </el-table-column>
        <el-table-column label="白名单" width="120" align="center">
          <template #default="{ row }">
            <el-switch :model-value="row.isWhitelistPrice" @change="(value) => toggleWhitelist(row, value)" />
          </template>
        </el-table-column>
        <el-table-column label="操作" width="80">
          <template #default="{ row }">
            <el-button text type="primary" size="small" @click="showDetail(row)">详情</el-button>
          </template>
        </el-table-column>
      </el-table>
      <div class="pagination-container">
        <el-pagination
          v-model:current-page="page"
          v-model:page-size="pageSize"
          :total="total"
          layout="total, prev, pager, next"
          @change="loadUsers"
        />
      </div>
    </el-card>

    <el-drawer v-model="drawer.visible" title="会员详情" size="420px">
      <div v-if="drawer.user" class="user-detail">
        <div class="user-header">
          <el-avatar :size="64">{{ drawer.user.nickname?.[0] || drawer.user.username?.[0] || 'U' }}</el-avatar>
          <h3>{{ drawer.user.nickname || drawer.user.username || '未设置' }}</h3>
          <p>{{ drawer.user.email || '未绑定邮箱' }}</p>
        </div>
        <el-descriptions :column="1" border>
          <el-descriptions-item label="ID">{{ drawer.user.id }}</el-descriptions-item>
          <el-descriptions-item label="手机号">{{ drawer.user.mobile || '未绑定' }}</el-descriptions-item>
          <el-descriptions-item label="价格身份">
            {{ drawer.user.isWhitelistPrice ? '白名单三折' : '公开价' }}
          </el-descriptions-item>
          <el-descriptions-item label="折扣系数">
            {{ drawer.user.pricingDiscountRate ?? '-' }}
          </el-descriptions-item>
          <el-descriptions-item label="注册时间">
            {{ formatDate(drawer.user.createdAt || drawer.user.created_at) }}
          </el-descriptions-item>
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

const formatDate = (value) => value ? dayjs(value).format('YYYY-MM-DD HH:mm') : '-'

function normalizeUser(row = {}) {
  return {
    ...row,
    mobile: row.mobile || row.phone || '',
    isWhitelistPrice: row.isWhitelistPrice ?? row.pricingTier === 'whitelist'
  }
}

async function loadUsers() {
  loading.value = true
  try {
    const res = await userApi.getList({
      page: page.value,
      pageSize: pageSize.value,
      keyword: search.keyword
    })
    users.value = (res?.data?.items || []).map(normalizeUser)
    total.value = res?.data?.pagination?.total || 0
  } catch {
    users.value = []
    total.value = 0
  } finally {
    loading.value = false
  }
}

function handleSearch() {
  page.value = 1
  loadUsers()
}

function resetSearch() {
  search.keyword = ''
  handleSearch()
}

function showDetail(row) {
  drawer.user = normalizeUser(row)
  drawer.visible = true
}

async function toggleWhitelist(row, value) {
  try {
    await ElMessageBox.confirm(`确定${value ? '开启' : '关闭'}该用户白名单三折？`, '提示', { type: 'warning' })
    const res = await userApi.updatePricing(row.id, value)
    const updated = normalizeUser(res?.data || {})
    Object.assign(row, updated)
    if (drawer.user?.id === row.id) {
      Object.assign(drawer.user, updated)
    }
    ElMessage.success('更新成功')
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('更新失败')
    }
  }
}

onMounted(loadUsers)
</script>

<style scoped>
.mb-20 { margin-bottom: 20px; }
.user-cell { display: flex; align-items: center; gap: 10px; }
.user-copy { display: grid; gap: 2px; }
.user-copy strong { font-size: 14px; }
.user-copy span { color: var(--el-text-color-secondary); font-size: 12px; }
.user-detail .user-header { text-align: center; margin-bottom: 20px; }
.user-detail .user-header h3 { margin: 12px 0 6px; }
.user-detail .user-header p { margin: 0; color: var(--el-text-color-secondary); }
</style>
