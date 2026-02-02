import request from './request'

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

export const categoryApi = {
  getCategories: () => request.get('/category-page/categories'),
  createCategory: (data) => request.post('/category-page/categories', data),
  updateCategory: (id, data) => request.put(`/category-page/categories/${id}`, data),
  deleteCategory: (id) => request.delete(`/category-page/categories/${id}`),
  getCategoryProducts: (id, params) => request.get(`/category-page/categories/${id}/products`, { params }),
  addProductToCategory: (id, code) => request.post(`/category-page/categories/${id}/products`, { product_code: code }),
  removeProductFromCategory: (id, code) => request.delete(`/category-page/categories/${id}/products/${code}`)
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
