import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useUserStore = defineStore('user', () => {
  const token = ref(localStorage.getItem('admin_token') || '')
  const userInfo = ref(JSON.parse(localStorage.getItem('admin_user') || 'null'))

  const isLoggedIn = computed(() => !!token.value)

  function login(adminToken, admin) {
    token.value = adminToken
    userInfo.value = admin
    localStorage.setItem('admin_token', adminToken)
    localStorage.setItem('admin_user', JSON.stringify(admin))
  }

  function logout() {
    token.value = ''
    userInfo.value = null
    localStorage.removeItem('admin_token')
    localStorage.removeItem('admin_user')
  }

  return { token, userInfo, isLoggedIn, login, logout }
})
