import request from './request'
import axios from 'axios'

// 创建不带 /admin 前缀的请求实例（用于非 admin 路由的 API）
const apiRequest = axios.create({
  baseURL: '/api',
  timeout: 30000
})
apiRequest.interceptors.response.use(response => response.data)

export const authApi = {
  login: (data) => request.post('/auth/login', data),
  logout: () => request.post('/auth/logout')
}

export const dashboardApi = {
  getStats: () => request.get('/dashboard/stats'),
  getRecentOrders: () => request.get('/dashboard/recent-orders')
}

export const productApi = {
  getList: (params) => request.get('/products', { params }),
  getDetail: (code) => request.get(`/products/${code}`),
  updateDescription: (code, data) => request.put(`/products/${code}/description`, data)
}

// 目录页分类管理 (category_page_categories + category_page_products)
// 使用 /api/category-page 路由（不是 /api/admin）
export const categoryApi = {
  getCategories: () => apiRequest.get('/category-page/categories'),
  createCategory: (data) => apiRequest.post('/category-page/categories', data),
  updateCategory: (id, data) => apiRequest.put(`/category-page/categories/${id}`, data),
  deleteCategory: (id) => apiRequest.delete(`/category-page/categories/${id}`),
  getCategoryProducts: (id, params) => apiRequest.get(`/category-page/categories/${id}/products`, { params }),
  addProductToCategory: (id, code) => apiRequest.post(`/category-page/categories/${id}/products`, { product_code: code }),
  removeProductFromCategory: (id, code) => apiRequest.delete(`/category-page/categories/${id}/products/${code}`)
}

// 即刻选购分类管理 (category_management)
// 使用 /api/category-management 路由（不是 /api/admin）
export const shoppingCategoryApi = {
  getTree: () => apiRequest.get('/category-management/tree'),
  getLevel1: () => apiRequest.get('/category-management/level1'),
  getLevel2: (parentId) => apiRequest.get(`/category-management/level2/${parentId}`),
  createLevel1: (data) => apiRequest.post('/category-management/level1', data),
  createLevel2: (data) => apiRequest.post('/category-management/level2', data),
  update: (id, data) => apiRequest.put(`/category-management/${id}`, data),
  delete: (id) => apiRequest.delete(`/category-management/${id}`),
  updateProductCodes: (id, codes) => apiRequest.put(`/category-management/${id}/product-codes`, { product_codes: codes })
}

export const orderApi = {
  getList: (params) => request.get('/orders', { params }),
  getDetail: (id) => request.get(`/orders/${id}`),
  updateStatus: (id, status) => request.put(`/orders/${id}/status`, { status })
}

export const userApi = {
  getList: (params) => request.get('/users', { params }),
  getDetail: (id) => request.get(`/users/${id}`),
  updateStatus: (id, isActive) => request.put(`/users/${id}/status`, { is_active: isActive }),
  getUserOrders: (id, params) => request.get(`/users/${id}/orders`, { params })
}

export const homepageApi = {
  getBanners: () => request.get('/homepage/banners'),
  createBanner: (data) => request.post('/homepage/banners', data),
  updateBanner: (id, data) => request.put(`/homepage/banners/${id}`, data),
  deleteBanner: (id) => request.delete(`/homepage/banners/${id}`),
  getLowerSwiper: () => request.get('/homepage/lower-swiper'),
  createLowerSwiper: (data) => request.post('/homepage/lower-swiper', data),
  updateLowerSwiper: (id, data) => request.put(`/homepage/lower-swiper/${id}`, data),
  deleteLowerSwiper: (id) => request.delete(`/homepage/lower-swiper/${id}`),
  getThreeImages: () => request.get('/homepage/three-images'),
  createThreeImages: (data) => request.post('/homepage/three-images', data),
  updateThreeImages: (id, data) => request.put(`/homepage/three-images/${id}`, data),
  deleteThreeImages: (id) => request.delete(`/homepage/three-images/${id}`)
}

export const mediaApi = {
  upload: (formData, onProgress) => request.post('/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress: onProgress
  }),
  getList: (params) => request.get('/upload/list', { params }),
  delete: (key) => request.delete('/upload', { data: { key } })
}
