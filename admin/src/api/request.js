import axios from 'axios'
import { ElMessage } from 'element-plus'
import { useUserStore } from '@/stores/user'
import router from '@/router'
import { getAdminApiBaseUrl } from '@/config/adminEnvironment'

const request = axios.create({
  timeout: 30000
})

request.interceptors.request.use(config => {
  config.baseURL = getAdminApiBaseUrl()
  const userStore = useUserStore()
  if (userStore.token) {
    config.headers.Authorization = `Bearer ${userStore.token}`
  }
  return config
})

request.interceptors.response.use(
  response => response.data,
  error => {
    const { response } = error
    if (response?.status === 401) {
      ElMessage.error('登录已过期')
      const userStore = useUserStore()
      userStore.logout()
      router.push('/login')
    } else {
      ElMessage.error(response?.data?.message || '请求失败')
    }
    return Promise.reject(error)
  }
)

export default request
