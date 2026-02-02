// ============================================
// NOT-BORING Admin - Vue 3 Application with Real API
// ============================================

const { createApp, ref, reactive, computed, watch, onMounted, nextTick } = Vue;

// Element Plus Icons
const Icons = ElementPlusIconsVue;

// API Configuration
const API_BASE = '/api/admin';
const API_ROOT = '/api';

// HTTP Request Helper
async function request(method, url, data = null, useRoot = false) {
  const token = localStorage.getItem('admin_token');
  const config = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    }
  };
  if (data && method !== 'GET') {
    config.body = JSON.stringify(data);
  }
  
  const base = useRoot ? API_ROOT : API_BASE;
  let fullUrl = base + url;
  if (data && method === 'GET') {
    const params = new URLSearchParams(data).toString();
    if (params) fullUrl += '?' + params;
  }
  
  const response = await fetch(fullUrl, config);
  const result = await response.json();
  
  if (!response.ok) {
    if (response.status === 401) {
      localStorage.removeItem('admin_token');
      localStorage.removeItem('admin_username');
      window.location.reload();
    }
    throw new Error(result.message || 'Request failed');
  }
  return result;
}

const api = {
  // Auth
  login: (data) => request('POST', '/auth/login', data),
  
  // Dashboard
  getStats: () => request('GET', '/dashboard'),
  getRecentOrders: () => request('GET', '/orders', { page: 1, page_size: 5 }),
  
  // Products
  getProducts: (params) => request('GET', '/products', params),
  getProduct: (code) => request('GET', `/products/${code}`),
  
  // Orders
  getOrders: (params) => request('GET', '/orders', params),
  updateOrderStatus: (id, status) => request('PUT', `/orders/${id}/status`, { status }),
  
  // Users
  getUsers: (params) => request('GET', '/users', params),
  updateUserStatus: (id, isActive) => request('PUT', `/users/${id}/status`, { is_active: isActive }),
  
  // Categories (uses /api/category-page, not /api/admin)
  getCategories: () => request('GET', '/category-page', null, true),
  createCategory: (data) => request('POST', '/category-management/categories', data, true),
  updateCategory: (id, data) => request('PUT', `/category-management/categories/${id}`, data, true),
  deleteCategory: (id) => request('DELETE', `/category-management/categories/${id}`, null, true),
  getCategoryProducts: (id) => request('GET', `/category-page/${id}/products`, null, true),
  addProductToCategory: (id, code) => request('POST', `/category-page/${id}/products`, { product_code: code }, true),
  removeProductFromCategory: (id, code) => request('DELETE', `/category-page/${id}/products/${code}`, null, true),
  
  // Homepage
  getBanners: () => request('GET', '/homepage/banners'),
  createBanner: (data) => request('POST', '/homepage/banners', data),
  updateBanner: (id, data) => request('PUT', `/homepage/banners/${id}`, data),
  deleteBanner: (id) => request('DELETE', `/homepage/banners/${id}`),
  getLowerSwiper: () => request('GET', '/homepage/lower-swiper'),
  createLowerSwiper: (data) => request('POST', '/homepage/lower-swiper', data),
  updateLowerSwiper: (id, data) => request('PUT', `/homepage/lower-swiper/${id}`, data),
  deleteLowerSwiper: (id) => request('DELETE', `/homepage/lower-swiper/${id}`),
  getThreeImages: () => request('GET', '/homepage/three-images'),
  createThreeImages: (data) => request('POST', '/homepage/three-images', data),
  updateThreeImages: (id, data) => request('PUT', `/homepage/three-images/${id}`, data),
  deleteThreeImages: (id) => request('DELETE', `/homepage/three-images/${id}`),
  
  // Media
  getMediaList: (params) => request('GET', '/upload/list', params),
  deleteMedia: (key) => request('DELETE', '/upload/image', { key })
};

// Upload helper (uses FormData, not JSON)
async function uploadFile(file, folder) {
  const token = localStorage.getItem('admin_token');
  const formData = new FormData();
  formData.append('file', file);
  formData.append('folder', folder);
  
  const response = await fetch(API_BASE + '/upload/file', {
    method: 'POST',
    headers: {
      ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    },
    body: formData
  });
  
  const result = await response.json();
  if (!response.ok) throw new Error(result.message || 'Upload failed');
  return result;
}

const app = createApp({
  setup() {
    // ============================================
    // Auth State
    // ============================================
    const isLoggedIn = ref(!!localStorage.getItem('admin_token'));
    const userInfo = reactive({
      username: localStorage.getItem('admin_username') || 'Admin'
    });
    
    const loginForm = reactive({ username: '', password: '' });
    const loginRules = {
      username: [{ required: true, message: '请输入用户名', trigger: 'blur' }],
      password: [{ required: true, message: '请输入密码', trigger: 'blur' }]
    };
    const loginLoading = ref(false);
    
    async function handleLogin() {
      if (!loginForm.username || !loginForm.password) {
        ElementPlus.ElMessage.warning('请输入用户名和密码');
        return;
      }
      
      loginLoading.value = true;
      try {
        const res = await api.login({
          username: loginForm.username,
          password: loginForm.password
        });
        
        localStorage.setItem('admin_token', res.token);
        localStorage.setItem('admin_username', loginForm.username);
        userInfo.username = loginForm.username;
        isLoggedIn.value = true;
        ElementPlus.ElMessage.success('登录成功！');
        nextTick(() => {
          loadDashboard();
          initCharts();
        });
      } catch (err) {
        ElementPlus.ElMessage.error(err.message || '登录失败');
      } finally {
        loginLoading.value = false;
      }
    }
    
    function handleUserCommand(cmd) {
      if (cmd === 'logout') {
        ElementPlus.ElMessageBox.confirm('确定要退出登录吗？', '提示', {
          type: 'warning',
          confirmButtonText: '退出',
          cancelButtonText: '取消'
        }).then(() => {
          localStorage.removeItem('admin_token');
          localStorage.removeItem('admin_username');
          isLoggedIn.value = false;
          loginForm.username = '';
          loginForm.password = '';
        });
      }
    }
    
    // ============================================
    // Navigation
    // ============================================
    const sidebarCollapsed = ref(false);
    const currentPage = ref('dashboard');
    
    const menuItems = [
      { key: 'dashboard', label: '仪表板', icon: 'Odometer' },
      { key: 'products', label: '商品管理', icon: 'Goods' },
      { key: 'orders', label: '订单管理', icon: 'List' },
      { key: 'users', label: '会员管理', icon: 'UserFilled' },
      { key: 'categories', label: '分类管理', icon: 'Menu' },
      { key: 'homepage', label: '首页配置', icon: 'House' },
      { key: 'media', label: '媒体库', icon: 'Picture' }
    ];
    
    const currentPageTitle = computed(() => {
      const item = menuItems.find(m => m.key === currentPage.value);
      return item ? item.label : '仪表板';
    });
    
    // Page change handler
    watch(currentPage, (page) => {
      if (page === 'dashboard') loadDashboard();
      else if (page === 'products') loadProducts();
      else if (page === 'orders') loadOrders();
      else if (page === 'users') loadUsers();
      else if (page === 'categories') loadCategories();
      else if (page === 'homepage') loadHomepage();
      else if (page === 'media') loadMedia();
    });
    
    // ============================================
    // Dashboard
    // ============================================
    const dashboardLoading = ref(false);
    const chartPeriod = ref('7d');
    const salesChartRef = ref(null);
    const orderChartRef = ref(null);
    let salesChart = null;
    let orderChart = null;
    
    const dashboardStats = ref([
      { icon: 'Goods', label: '总商品数', value: '0', trend: 0 },
      { icon: 'ShoppingCart', label: '总订单数', value: '0', trend: 0 },
      { icon: 'UserFilled', label: '总会员数', value: '0', trend: 0 },
      { icon: 'Wallet', label: '总收入', value: '¥0', trend: 0 }
    ]);
    
    const recentOrders = ref([]);
    
    async function loadDashboard() {
      dashboardLoading.value = true;
      try {
        const [statsRes, ordersRes] = await Promise.all([
          api.getStats().catch(() => null),
          api.getRecentOrders().catch(() => null)
        ]);
        
        if (statsRes?.data) {
          const stats = statsRes.data;
          dashboardStats.value = [
            { icon: 'Goods', label: '总商品数', value: String(stats.totalProducts || 0), trend: 12 },
            { icon: 'ShoppingCart', label: '总订单数', value: String(stats.totalOrders || 0), trend: 8 },
            { icon: 'UserFilled', label: '总会员数', value: String(stats.totalUsers || 0), trend: 15 },
            { icon: 'Wallet', label: '分类数', value: String(stats.totalCategories || 0), trend: 5 }
          ];
        }
        
        const orders = ordersRes?.data?.items || [];
        if (orders.length) {
          recentOrders.value = orders.slice(0, 5).map(o => ({
            order_no: o.order_no,
            customer: o.user_nickname || '未知用户',
            amount: o.total_amount,
            status: getStatusText(o.status),
            date: formatDate(o.created_at)
          }));
        }
        
        nextTick(() => initCharts());
      } catch (err) {
        console.error('Dashboard load error:', err);
      } finally {
        dashboardLoading.value = false;
      }
    }
    
    function getStatusText(status) {
      const map = { pending: '待支付', paid: '已支付', shipped: '已发货', completed: '已完成', cancelled: '已取消' };
      return map[status] || status;
    }
    
    function getStatusType(status) {
      const map = {
        '待支付': 'warning', 'pending': 'warning',
        '已支付': 'primary', 'paid': 'primary',
        '已发货': 'info', 'shipped': 'info',
        '已完成': 'success', 'completed': 'success',
        '已取消': 'danger', 'cancelled': 'danger'
      };
      return map[status] || 'info';
    }
    
    function formatDate(d) {
      if (!d) return '-';
      const date = new Date(d);
      return `${date.getMonth() + 1}/${date.getDate()} ${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`;
    }
    
    function initCharts() {
      initSalesChart();
      initOrderChart();
    }
    
    function initSalesChart() {
      if (!salesChartRef.value) return;
      if (!salesChart) salesChart = echarts.init(salesChartRef.value);
      
      const days = chartPeriod.value === '7d' ? 7 : 30;
      const dates = [], sales = [];
      for (let i = days - 1; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        dates.push(`${d.getMonth() + 1}/${d.getDate()}`);
        sales.push(Math.floor(Math.random() * 8000) + 2000);
      }
      
      salesChart.setOption({
        backgroundColor: 'transparent',
        tooltip: {
          trigger: 'axis',
          backgroundColor: '#18181b',
          borderColor: '#27272a',
          textStyle: { color: '#fafafa', fontSize: 12 }
        },
        grid: { left: 50, right: 20, top: 20, bottom: 30 },
        xAxis: {
          type: 'category',
          data: dates,
          axisLine: { lineStyle: { color: '#27272a' } },
          axisLabel: { color: '#71717a', fontSize: 11 }
        },
        yAxis: {
          type: 'value',
          splitLine: { lineStyle: { color: '#27272a', type: 'dashed' } },
          axisLabel: { color: '#71717a', fontSize: 11 }
        },
        series: [{
          type: 'line',
          data: sales,
          smooth: true,
          symbol: 'none',
          lineStyle: { color: '#f59e0b', width: 3 },
          areaStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: 'rgba(245, 158, 11, 0.3)' },
              { offset: 1, color: 'rgba(245, 158, 11, 0)' }
            ])
          }
        }]
      });
    }
    
    function initOrderChart() {
      if (!orderChartRef.value) return;
      if (!orderChart) orderChart = echarts.init(orderChartRef.value);
      
      orderChart.setOption({
        backgroundColor: 'transparent',
        tooltip: { trigger: 'item', backgroundColor: '#18181b', borderColor: '#27272a', textStyle: { color: '#fafafa' } },
        series: [{
          type: 'pie',
          radius: ['45%', '70%'],
          itemStyle: { borderRadius: 6, borderColor: '#18181b', borderWidth: 3 },
          label: { show: false },
          data: [
            { value: 35, name: '待支付', itemStyle: { color: '#f59e0b' } },
            { value: 120, name: '已支付', itemStyle: { color: '#3b82f6' } },
            { value: 85, name: '已发货', itemStyle: { color: '#8b5cf6' } },
            { value: 280, name: '已完成', itemStyle: { color: '#22c55e' } },
            { value: 15, name: '已取消', itemStyle: { color: '#ef4444' } }
          ]
        }]
      });
    }
    
    watch(chartPeriod, () => initSalesChart());
    
    // ============================================
    // Products
    // ============================================
    const productsLoading = ref(false);
    const productSearch = ref('');
    const productPage = ref(1);
    const productPageSize = ref(20);
    const productTotal = ref(0);
    const products = ref([]);
    const productDrawer = reactive({ visible: false, product: null });
    
    async function loadProducts() {
      productsLoading.value = true;
      try {
        const res = await api.getProducts({
          page: productPage.value,
          page_size: productPageSize.value,
          keyword: productSearch.value
        });
        // API returns: { data: { items: [...], pagination: { total } } }
        const items = res.data?.items || res.products || [];
        // Map API fields to template expected fields
        products.value = items.map(p => ({
          ...p,
          sku_id: p.code || p.id,
          pic: p.mainImage,
          c_name: p.category,
          sale_price: (p.price / 100).toFixed(2),
          qty: p.stock || 0
        }));
        productTotal.value = res.data?.pagination?.total || res.total || 0;
      } catch (err) {
        console.error('Load products error:', err);
        ElementPlus.ElMessage.error('加载商品失败');
      } finally {
        productsLoading.value = false;
      }
    }
    
    function handleProductSearch() {
      productPage.value = 1;
      loadProducts();
    }
    
    function showProductDetail(row) {
      productDrawer.product = row;
      productDrawer.visible = true;
    }
    
    // ============================================
    // Orders
    // ============================================
    const ordersLoading = ref(false);
    const orderSearch = ref('');
    const orderStatusFilter = ref('');
    const orderPage = ref(1);
    const orderPageSize = ref(20);
    const orderTotal = ref(0);
    const orders = ref([]);
    const orderDrawer = reactive({ visible: false, order: null });
    
    async function loadOrders() {
      ordersLoading.value = true;
      try {
        const res = await api.getOrders({
          page: orderPage.value,
          page_size: orderPageSize.value,
          keyword: orderSearch.value,
          status: orderStatusFilter.value
        });
        const items = res.data?.items || res.orders || [];
        // Map camelCase API fields to snake_case template fields
        orders.value = items.map(o => ({
          ...o,
          order_no: o.orderNo || o.order_no,
          total_amount: o.totalAmount || o.total_amount,
          created_at: o.createdAt || o.created_at,
          user_nickname: o.receiver?.name || o.user_nickname || '未知'
        }));
        orderTotal.value = res.data?.pagination?.total || res.total || 0;
      } catch (err) {
        console.error('Load orders error:', err);
        ElementPlus.ElMessage.error('加载订单失败');
      } finally {
        ordersLoading.value = false;
      }
    }
    
    function handleOrderSearch() {
      orderPage.value = 1;
      loadOrders();
    }
    
    function showOrderDetail(row) {
      orderDrawer.order = row;
      orderDrawer.visible = true;
    }
    
    async function changeOrderStatus(row, status) {
      try {
        await ElementPlus.ElMessageBox.confirm(`确定将订单标记为"${getStatusText(status)}"？`, '提示', { type: 'warning' });
        await api.updateOrderStatus(row.id || row.order_no, status);
        ElementPlus.ElMessage.success('更新成功');
        loadOrders();
      } catch (e) {
        if (e !== 'cancel') ElementPlus.ElMessage.error('更新失败');
      }
    }
    
    // ============================================
    // Users
    // ============================================
    const usersLoading = ref(false);
    const userSearch = ref('');
    const userPage = ref(1);
    const userPageSize = ref(20);
    const userTotal = ref(0);
    const users = ref([]);
    const userDrawer = reactive({ visible: false, user: null });
    
    async function loadUsers() {
      usersLoading.value = true;
      try {
        const res = await api.getUsers({
          page: userPage.value,
          page_size: userPageSize.value,
          keyword: userSearch.value
        });
        const items = res.data?.items || res.users || [];
        // Map camelCase API fields to snake_case template fields
        users.value = items.map(u => ({
          ...u,
          created_at: u.createdAt || u.created_at,
          is_active: u.isActive ?? u.is_active ?? true,
          order_count: u.orderCount || u.order_count || 0,
          total_spent: u.totalSpent || u.total_spent || 0
        }));
        userTotal.value = res.data?.pagination?.total || res.total || 0;
      } catch (err) {
        console.error('Load users error:', err);
        ElementPlus.ElMessage.error('加载会员失败');
      } finally {
        usersLoading.value = false;
      }
    }
    
    function handleUserSearch() {
      userPage.value = 1;
      loadUsers();
    }
    
    function showUserDetail(row) {
      userDrawer.user = row;
      userDrawer.visible = true;
    }
    
    async function toggleUserStatus(row, value) {
      try {
        await ElementPlus.ElMessageBox.confirm(`确定${value ? '启用' : '禁用'}该用户？`, '提示', { type: 'warning' });
        await api.updateUserStatus(row.id, value);
        row.is_active = value;
        ElementPlus.ElMessage.success('更新成功');
      } catch (e) {
        if (e !== 'cancel') ElementPlus.ElMessage.error('更新失败');
      }
    }
    
    // ============================================
    // Categories
    // ============================================
    const categoriesLoading = ref(false);
    const categories = ref([]);
    const selectedCategory = ref(null);
    const categoryProducts = ref([]);
    const categoryProductsLoading = ref(false);
    
    const categoryDialog = reactive({
      visible: false,
      isEdit: false,
      saving: false,
      form: { id: null, name: '', type: 'products', sort_order: 0, is_active: true }
    });
    
    const addProductDialog = ref(false);
    const newProductCode = ref('');
    
    async function loadCategories() {
      categoriesLoading.value = true;
      try {
        const res = await api.getCategories();
        categories.value = res.data?.categories || res.categories || [];
      } catch (err) {
        console.error('Load categories error:', err);
        ElementPlus.ElMessage.error('加载分类失败');
      } finally {
        categoriesLoading.value = false;
      }
    }
    
    async function selectCategory(cat) {
      selectedCategory.value = cat;
      categoryProductsLoading.value = true;
      try {
        const res = await api.getCategoryProducts(cat.id);
        categoryProducts.value = res.data?.products || res.products || [];
      } catch (err) {
        console.error('Load category products error:', err);
        categoryProducts.value = [];
      } finally {
        categoryProductsLoading.value = false;
      }
    }
    
    function showCategoryDialog(cat = null) {
      categoryDialog.isEdit = !!cat;
      categoryDialog.form = cat 
        ? { ...cat }
        : { id: null, name: '', type: 'products', sort_order: 0, is_active: true };
      categoryDialog.visible = true;
    }
    
    async function saveCategory() {
      categoryDialog.saving = true;
      try {
        if (categoryDialog.isEdit) {
          await api.updateCategory(categoryDialog.form.id, categoryDialog.form);
        } else {
          await api.createCategory(categoryDialog.form);
        }
        ElementPlus.ElMessage.success('保存成功');
        categoryDialog.visible = false;
        loadCategories();
      } catch (err) {
        ElementPlus.ElMessage.error('保存失败');
      } finally {
        categoryDialog.saving = false;
      }
    }
    
    async function deleteCategory(id) {
      try {
        await api.deleteCategory(id);
        ElementPlus.ElMessage.success('删除成功');
        if (selectedCategory.value?.id === id) {
          selectedCategory.value = null;
          categoryProducts.value = [];
        }
        loadCategories();
      } catch (err) {
        ElementPlus.ElMessage.error('删除失败');
      }
    }
    
    async function addProductToCategory() {
      const codes = newProductCode.value.split(/[,，]/).map(s => s.trim()).filter(Boolean);
      for (const code of codes) {
        try {
          await api.addProductToCategory(selectedCategory.value.id, code);
        } catch {}
      }
      ElementPlus.ElMessage.success('添加完成');
      addProductDialog.value = false;
      newProductCode.value = '';
      selectCategory(selectedCategory.value);
      loadCategories();
    }
    
    async function removeProductFromCategory(code) {
      try {
        await api.removeProductFromCategory(selectedCategory.value.id, code);
        ElementPlus.ElMessage.success('移除成功');
        selectCategory(selectedCategory.value);
        loadCategories();
      } catch (err) {
        ElementPlus.ElMessage.error('移除失败');
      }
    }
    
    // ============================================
    // Homepage
    // ============================================
    const homepageLoading = ref(false);
    const banners = ref([]);
    const lowerSwiper = ref([]);
    const threeImages = ref([]);
    
    const bannerDialog = reactive({ visible: false, isEdit: false, saving: false, form: {} });
    const swiperDialog = reactive({ visible: false, isEdit: false, saving: false, form: {} });
    const threeDialog = reactive({ visible: false, isEdit: false, saving: false, form: {} });
    
    async function loadHomepage() {
      homepageLoading.value = true;
      try {
        const [b, s, t] = await Promise.all([
          api.getBanners().catch(() => ({})),
          api.getLowerSwiper().catch(() => ({})),
          api.getThreeImages().catch(() => ({}))
        ]);
        banners.value = b.data || b.banners || [];
        lowerSwiper.value = s.data || s.items || [];
        threeImages.value = t.data || t.items || [];
      } finally {
        homepageLoading.value = false;
      }
    }
    
    function showBannerDialog(row = null) {
      bannerDialog.isEdit = !!row;
      bannerDialog.form = row ? { ...row } : { image: '', title: '', link: '', sort_order: 0, is_active: true };
      bannerDialog.visible = true;
    }
    
    async function saveBanner() {
      bannerDialog.saving = true;
      try {
        if (bannerDialog.isEdit) await api.updateBanner(bannerDialog.form.id, bannerDialog.form);
        else await api.createBanner(bannerDialog.form);
        ElementPlus.ElMessage.success('保存成功');
        bannerDialog.visible = false;
        loadHomepage();
      } catch { ElementPlus.ElMessage.error('保存失败'); }
      finally { bannerDialog.saving = false; }
    }
    
    async function deleteBanner(id) {
      try { await api.deleteBanner(id); ElementPlus.ElMessage.success('删除成功'); loadHomepage(); }
      catch { ElementPlus.ElMessage.error('删除失败'); }
    }
    
    function showSwiperDialog(row = null) {
      swiperDialog.isEdit = !!row;
      swiperDialog.form = row ? { ...row } : { image: '', title: '', link: '', sort_order: 0, is_active: true };
      swiperDialog.visible = true;
    }
    
    async function saveSwiper() {
      swiperDialog.saving = true;
      try {
        if (swiperDialog.isEdit) await api.updateLowerSwiper(swiperDialog.form.id, swiperDialog.form);
        else await api.createLowerSwiper(swiperDialog.form);
        ElementPlus.ElMessage.success('保存成功');
        swiperDialog.visible = false;
        loadHomepage();
      } catch { ElementPlus.ElMessage.error('保存失败'); }
      finally { swiperDialog.saving = false; }
    }
    
    async function deleteSwiper(id) {
      try { await api.deleteLowerSwiper(id); ElementPlus.ElMessage.success('删除成功'); loadHomepage(); }
      catch { ElementPlus.ElMessage.error('删除失败'); }
    }
    
    function showThreeDialog(row = null) {
      threeDialog.isEdit = !!row;
      threeDialog.form = row ? { ...row } : { image: '', link: '', sort_order: 0, is_active: true };
      threeDialog.visible = true;
    }
    
    async function saveThree() {
      threeDialog.saving = true;
      try {
        if (threeDialog.isEdit) await api.updateThreeImages(threeDialog.form.id, threeDialog.form);
        else await api.createThreeImages(threeDialog.form);
        ElementPlus.ElMessage.success('保存成功');
        threeDialog.visible = false;
        loadHomepage();
      } catch { ElementPlus.ElMessage.error('保存失败'); }
      finally { threeDialog.saving = false; }
    }
    
    async function deleteThree(id) {
      try { await api.deleteThreeImages(id); ElementPlus.ElMessage.success('删除成功'); loadHomepage(); }
      catch { ElementPlus.ElMessage.error('删除失败'); }
    }
    
    // ============================================
    // Media
    // ============================================
    const mediaLoading = ref(false);
    const mediaList = ref([]);
    const mediaFilter = reactive({ prefix: '' });
    const uploadDialog = ref(false);
    const uploadFolder = ref('images');
    const uploadFiles = ref([]);
    const uploading = ref(false);
    const previewDialog = reactive({ visible: false, item: null });
    
    const isImage = (key) => /\.(jpg|jpeg|png|gif|webp)$/i.test(key);
    const isVideo = (key) => /\.(mp4|mov|avi|webm)$/i.test(key);
    
    function formatSize(bytes) {
      if (!bytes) return '-';
      const units = ['B', 'KB', 'MB', 'GB'];
      let i = 0, size = bytes;
      while (size >= 1024 && i < 3) { size /= 1024; i++; }
      return `${size.toFixed(1)} ${units[i]}`;
    }
    
    async function loadMedia() {
      mediaLoading.value = true;
      try {
        const res = await api.getMediaList({ prefix: mediaFilter.prefix, max_keys: 100 });
        const files = res.data?.files || res.files || [];
        // Map 'name' to 'key' for template compatibility
        mediaList.value = files.map(f => ({
          ...f,
          key: f.name || f.key
        }));
      } catch (err) {
        console.error('Load media error:', err);
        mediaList.value = [];
      } finally {
        mediaLoading.value = false;
      }
    }
    
    function handleFileChange(file, fileList) {
      uploadFiles.value = fileList;
    }
    
    async function handleUpload() {
      if (!uploadFiles.value.length) return;
      
      uploading.value = true;
      let successCount = 0;
      
      for (const f of uploadFiles.value) {
        try {
          await uploadFile(f.raw, uploadFolder.value);
          successCount++;
        } catch (err) {
          console.error('Upload error:', err);
        }
      }
      
      ElementPlus.ElMessage.success(`上传完成，成功 ${successCount} 个`);
      uploading.value = false;
      uploadDialog.value = false;
      uploadFiles.value = [];
      loadMedia();
    }
    
    function previewMedia(item) {
      previewDialog.item = item;
      previewDialog.visible = true;
    }
    
    function copyUrl(url) {
      navigator.clipboard.writeText(url)
        .then(() => ElementPlus.ElMessage.success('已复制到剪贴板'))
        .catch(() => ElementPlus.ElMessage.error('复制失败'));
    }
    
    async function deleteMedia(key) {
      try {
        await api.deleteMedia(key);
        ElementPlus.ElMessage.success('删除成功');
        loadMedia();
      } catch (err) {
        ElementPlus.ElMessage.error('删除失败');
      }
    }
    
    // ============================================
    // Lifecycle
    // ============================================
    onMounted(() => {
      if (isLoggedIn.value) {
        loadDashboard();
        nextTick(() => setTimeout(() => initCharts(), 100));
      }
      
      window.addEventListener('resize', () => {
        salesChart?.resize();
        orderChart?.resize();
      });
    });
    
    // Return all
    return {
      // Auth
      isLoggedIn, userInfo, loginForm, loginRules, loginLoading,
      handleLogin, handleUserCommand,
      
      // Navigation
      sidebarCollapsed, currentPage, menuItems, currentPageTitle,
      
      // Dashboard
      dashboardLoading, chartPeriod, salesChartRef, orderChartRef, dashboardStats, recentOrders,
      loadDashboard, getStatusType, formatDate,
      
      // Products
      productsLoading, productSearch, productPage, productPageSize, productTotal,
      products, productDrawer, loadProducts, handleProductSearch, showProductDetail,
      
      // Orders
      ordersLoading, orderSearch, orderStatusFilter, orderPage, orderPageSize, orderTotal,
      orders, orderDrawer, loadOrders, handleOrderSearch, showOrderDetail, changeOrderStatus, getStatusText,
      
      // Users
      usersLoading, userSearch, userPage, userPageSize, userTotal,
      users, userDrawer, loadUsers, handleUserSearch, showUserDetail, toggleUserStatus,
      
      // Categories
      categoriesLoading, categories, selectedCategory, categoryProducts, categoryProductsLoading,
      categoryDialog, addProductDialog, newProductCode,
      loadCategories, selectCategory, showCategoryDialog, saveCategory, deleteCategory,
      addProductToCategory, removeProductFromCategory,
      
      // Homepage
      homepageLoading, banners, lowerSwiper, threeImages,
      bannerDialog, swiperDialog, threeDialog,
      loadHomepage, showBannerDialog, saveBanner, deleteBanner,
      showSwiperDialog, saveSwiper, deleteSwiper,
      showThreeDialog, saveThree, deleteThree,
      
      // Media
      mediaLoading, mediaList, mediaFilter, uploadDialog, uploadFolder,
      uploadFiles, uploading, previewDialog,
      isImage, isVideo, formatSize, loadMedia, handleFileChange, handleUpload,
      previewMedia, copyUrl, deleteMedia,
      
      // Icons (expose all)
      ...Icons
    };
  }
});

// Register icons
for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
  app.component(key, component);
}

app.use(ElementPlus);
app.mount('#app');
