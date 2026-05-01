<template>
  <div class="environment-selector">
    <span v-if="showLabel" class="environment-label">API</span>
    <el-select
      v-model="selectedKey"
      size="small"
      class="environment-select"
      :teleported="false"
      @change="handleChange"
    >
      <el-option
        v-for="env in ADMIN_ENVIRONMENTS"
        :key="env.key"
        :label="env.shortLabel"
        :value="env.key"
        :disabled="!isAdminEnvironmentConfigured(env)"
      >
        <div class="environment-option">
          <el-tag :type="env.tagType" size="small">{{ env.shortLabel }}</el-tag>
          <span>{{ env.description }}</span>
        </div>
      </el-option>
    </el-select>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useUserStore } from '@/stores/user'
import {
  ADMIN_ENVIRONMENTS,
  getCurrentAdminEnvironment,
  getAdminEnvironmentByKey,
  isAdminEnvironmentConfigured,
  setCurrentAdminEnvironment
} from '@/config/adminEnvironment'

defineProps({
  showLabel: {
    type: Boolean,
    default: true
  }
})

const router = useRouter()
const route = useRoute()
const userStore = useUserStore()
const selectedKey = ref(getCurrentAdminEnvironment().key)

async function handleChange(nextKey) {
  const previousKey = getCurrentAdminEnvironment().key
  const nextEnv = getAdminEnvironmentByKey(nextKey)

  if (!nextEnv || !isAdminEnvironmentConfigured(nextEnv)) {
    selectedKey.value = previousKey
    ElMessage.warning('该环境还没有配置 API 地址')
    return
  }

  if (nextKey === previousKey) {
    return
  }

  try {
    await ElMessageBox.confirm(
      `切换到 ${nextEnv.label} 后会退出当前登录，避免不同环境的 token 混用。`,
      '切换后台环境',
      {
        type: nextEnv.key === 'production' ? 'warning' : 'info',
        confirmButtonText: '确认切换',
        cancelButtonText: '取消'
      }
    )

    setCurrentAdminEnvironment(nextKey)
    userStore.logout()
    selectedKey.value = nextKey
    ElMessage.success(`已切换到 ${nextEnv.label}`)

    if (route.path !== '/login') {
      router.push('/login')
    }
  } catch {
    selectedKey.value = previousKey
  }
}
</script>

<style lang="scss" scoped>
.environment-selector {
  display: flex;
  align-items: center;
  gap: 8px;
}

.environment-label {
  color: var(--text-muted);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 1px;
  text-transform: uppercase;
}

.environment-select {
  width: 96px;
}

.environment-option {
  display: flex;
  align-items: center;
  gap: 8px;
}
</style>
