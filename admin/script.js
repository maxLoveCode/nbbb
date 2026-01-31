console.log("NBBB Admin System Loaded");

const API_BASE = window.location.origin;
const HOMEPAGE_API = `${API_BASE}/api/admin/homepage`;
const PRODUCT_DESC_API = `${API_BASE}/api/admin/product-descriptions`;
const PRODUCTS_API = `${API_BASE}/api/admin/products`;
const ORDERS_API = `${API_BASE}/api/admin/orders`;
const USERS_API = `${API_BASE}/api/admin/users`;
const UPLOAD_API = `${API_BASE}/api/admin/upload`;

// 全局状态
let currentProductPage = 1;
let currentOrderPage = 1;
let currentUserPage = 1;

// ============================================
// 页面导航
// ============================================

function showSection(sectionId, clickedElement) {
    // 隐藏所有内容区域
    document.querySelectorAll('.content-section').forEach(section => {
        section.style.display = 'none';
    });
    
    // 移除所有导航链接的active类
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active');
    });
    
    // 显示目标内容区域
    const section = document.getElementById(sectionId);
    if (section) {
        section.style.display = 'block';
    }
    
    // 为点击的链接添加active类
    if (clickedElement) {
        clickedElement.classList.add('active');
    }
}

// 导航函数 - 确保在全局作用域中可用
function showDashboard(element) {
    showSection('dashboard', element);
    if (typeof loadDashboard === 'function') {
        loadDashboard();
    }
}

function showProducts(element) {
    showSection('products', element);
    loadProducts();
}

function showCategories(element) {
    showSection('categories', element);
}

function showOrders(element) {
    showSection('orders', element);
    loadOrders();
}

function showUsers(element) {
    showSection('users', element);
    loadUsers();
}

function showHomepage(element) {
    showSection('homepage', element);
    if (typeof loadHomepageData === 'function') {
        loadHomepageData();
    }
}

function showProductDescriptions(element) {
    showSection('product-descriptions', element);
}

function showMedia(element) {
    showSection('media', element);
    loadMediaList();
}

// 初始化函数
function initNavigation() {
    // 为所有导航链接添加点击事件
    document.querySelectorAll('.nav-link[data-section]').forEach(link => {
        // 移除可能存在的旧事件监听器
        const newLink = link.cloneNode(true);
        link.parentNode.replaceChild(newLink, link);
        
        // 添加新的事件监听器
        newLink.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            const section = this.getAttribute('data-section');
            
            switch(section) {
                case 'dashboard':
                    showDashboard(this);
                    break;
                case 'products':
                    showProducts(this);
                    break;
                case 'categories':
                    showCategories(this);
                    break;
                case 'orders':
                    showOrders(this);
                    break;
                case 'users':
                    showUsers(this);
                    break;
                case 'homepage':
                    showHomepage(this);
                    break;
                case 'product-descriptions':
                    showProductDescriptions(this);
                    break;
                case 'media':
                    showMedia(this);
                    break;
                default:
                    console.warn('Unknown section:', section);
            }
        });
    });
    
    // 默认显示dashboard
    const dashboardLink = document.querySelector('.nav-link[data-section="dashboard"]');
    if (dashboardLink) {
        showDashboard(dashboardLink);
    }
}

// 页面加载完成后初始化事件监听器
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initNavigation);
} else {
    // DOM已经加载完成
    initNavigation();
}

// ============================================
// Dashboard
// ============================================

const DASHBOARD_API = `${API_BASE}/api/admin/dashboard`;

async function loadDashboard() {
    try {
        const response = await fetch(DASHBOARD_API);
        const result = await response.json();

        if (result.success && result.data) {
            // 更新统计数据
            document.getElementById('totalProducts').textContent = 
                formatNumber(result.data.totalProducts || 0);
            document.getElementById('totalCategories').textContent = 
                formatNumber(result.data.totalCategories || 0);
            document.getElementById('totalOrders').textContent = 
                formatNumber(result.data.totalOrders || 0);
            document.getElementById('totalUsers').textContent = 
                formatNumber(result.data.totalUsers || 0);
        } else {
            console.error('加载仪表板数据失败:', result.error?.message || '未知错误');
            // 显示错误状态
            document.getElementById('totalProducts').textContent = '错误';
            document.getElementById('totalCategories').textContent = '错误';
            document.getElementById('totalOrders').textContent = '错误';
            document.getElementById('totalUsers').textContent = '错误';
        }
    } catch (error) {
        console.error('加载仪表板数据失败:', error);
        // 显示错误状态
        document.getElementById('totalProducts').textContent = '错误';
        document.getElementById('totalCategories').textContent = '错误';
        document.getElementById('totalOrders').textContent = '错误';
        document.getElementById('totalUsers').textContent = '错误';
    }
}

// 格式化数字（添加千分位）
function formatNumber(num) {
    if (num === null || num === undefined) return '0';
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

// ============================================
// 商品管理
// ============================================

async function loadProducts(page = 1) {
    try {
        currentProductPage = page;
        const keyword = document.getElementById('productKeyword')?.value || '';
        const category = document.getElementById('productCategory')?.value || '';
        const pageSize = document.getElementById('productPageSize')?.value || '20';

        const params = new URLSearchParams({
            page,
            pageSize,
            keyword,
            category
        });

        const response = await fetch(`${PRODUCTS_API}?${params}`);
        const result = await response.json();

        if (result.success) {
            // API返回格式: { success: true, data: { items: [...], pagination: {...} } }
            const products = result.data?.items || result.data || [];
            const pagination = result.data?.pagination || result.pagination;
            displayProducts(products);
            displayProductPagination(pagination);
        } else {
            throw new Error(result.error?.message || '加载失败');
        }
    } catch (error) {
        console.error('加载商品列表失败:', error);
        document.getElementById('productsTableBody').innerHTML = 
            `<tr><td colspan="8" class="text-center text-danger">加载失败: ${error.message}</td></tr>`;
    }
}

function displayProducts(products) {
    const tbody = document.getElementById('productsTableBody');
    
    if (!products || products.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" class="text-center">暂无数据</td></tr>';
        return;
    }

    tbody.innerHTML = products.map(product => {
        // API返回的价格单位是分，需要转换为元
        const price = product.price ? (parseFloat(product.price) / 100).toFixed(2) : '0.00';
        // 图片字段可能是 mainImage 或 pic
        const imageUrl = product.mainImage || product.pic || product.main_image || '';
        // 分类字段可能是 category 或 category_name
        const category = product.category_name || product.category || '-';
        // SKU编码
        const skuCode = product.sku_code || product.code || product.id || '-';
        // 商品名称
        const productName = product.name || '-';
        // 库存
        const stock = product.stock || 0;
        // 上架状态（onsale 或 is_active）
        const isActive = product.onsale !== undefined ? product.onsale : (product.is_active !== false);
        
        return `
        <tr>
            <td>
                ${imageUrl ? `<img src="${imageUrl}" alt="${productName}" style="max-width: 60px; max-height: 60px; object-fit: cover;">` : '-'}
            </td>
            <td>${skuCode}</td>
            <td>${productName}</td>
            <td>${category}</td>
            <td>¥${price}</td>
            <td>${stock}</td>
            <td><span class="badge bg-${isActive ? 'success' : 'secondary'}">${isActive ? '上架' : '下架'}</span></td>
            <td>
                <button class="btn btn-sm btn-info" onclick="viewProductDetail('${product.code || product.id}')">
                    <i class="bi bi-eye"></i> 查看
                </button>
            </td>
        </tr>
        `;
    }).join('');
}

function displayProductPagination(pagination) {
    const paginationEl = document.getElementById('productPagination');
    if (!pagination) {
        paginationEl.innerHTML = '';
        return;
    }

    const { page, pageSize, total, totalPages } = pagination;
    let html = '';

    // 上一页
    html += `
        <li class="page-item ${page <= 1 ? 'disabled' : ''}">
            <a class="page-link" href="#" onclick="loadProducts(${page - 1}); return false;">上一页</a>
        </li>
    `;

    // 页码
    const startPage = Math.max(1, page - 2);
    const endPage = Math.min(totalPages, page + 2);

    if (startPage > 1) {
        html += `<li class="page-item"><a class="page-link" href="#" onclick="loadProducts(1); return false;">1</a></li>`;
        if (startPage > 2) {
            html += `<li class="page-item disabled"><span class="page-link">...</span></li>`;
        }
    }

    for (let i = startPage; i <= endPage; i++) {
        html += `
            <li class="page-item ${i === page ? 'active' : ''}">
                <a class="page-link" href="#" onclick="loadProducts(${i}); return false;">${i}</a>
            </li>
        `;
    }

    if (endPage < totalPages) {
        if (endPage < totalPages - 1) {
            html += `<li class="page-item disabled"><span class="page-link">...</span></li>`;
        }
        html += `<li class="page-item"><a class="page-link" href="#" onclick="loadProducts(${totalPages}); return false;">${totalPages}</a></li>`;
    }

    // 下一页
    html += `
        <li class="page-item ${page >= totalPages ? 'disabled' : ''}">
            <a class="page-link" href="#" onclick="loadProducts(${page + 1}); return false;">下一页</a>
        </li>
    `;

    paginationEl.innerHTML = html;
}

function searchProducts() {
    loadProducts(1);
}

function resetProductSearch() {
    document.getElementById('productKeyword').value = '';
    document.getElementById('productCategory').value = '';
    document.getElementById('productPageSize').value = '20';
    loadProducts(1);
}

async function viewProductDetail(code) {
    try {
        const modal = new bootstrap.Modal(document.getElementById('productDetailModal'));
        modal.show();

        const response = await fetch(`${PRODUCTS_API}/${code}`);
        const result = await response.json();

        if (result.success) {
            displayProductDetail(result.data);
        } else {
            throw new Error(result.error?.message || '加载失败');
        }
    } catch (error) {
        console.error('加载商品详情失败:', error);
        document.getElementById('productDetailContent').innerHTML = 
            `<div class="alert alert-danger">加载失败: ${error.message}</div>`;
    }
}

function displayProductDetail(product) {
    const content = document.getElementById('productDetailContent');
    content.innerHTML = `
        <div class="row">
            <div class="col-md-4">
                ${product.pic ? `<img src="${product.pic}" class="img-fluid" alt="${product.name}">` : '<div class="text-muted">暂无图片</div>'}
            </div>
            <div class="col-md-8">
                <h4>${product.name}</h4>
                <table class="table table-bordered">
                    <tr>
                        <th style="width: 150px;">商品编码</th>
                        <td>${product.sku_code || product.code || '-'}</td>
                    </tr>
                    <tr>
                        <th>分类</th>
                        <td>${product.category_name || '-'}</td>
                    </tr>
                    <tr>
                        <th>价格</th>
                        <td>¥${product.price ? parseFloat(product.price).toFixed(2) : '0.00'}</td>
                    </tr>
                    <tr>
                        <th>库存</th>
                        <td>${product.stock || 0}</td>
                    </tr>
                    <tr>
                        <th>状态</th>
                        <td><span class="badge bg-${product.is_active !== false ? 'success' : 'secondary'}">${product.is_active !== false ? '上架' : '下架'}</span></td>
                    </tr>
                    <tr>
                        <th>描述</th>
                        <td>${product.description || '-'}</td>
                    </tr>
                </table>
            </div>
        </div>
    `;
}

// ============================================
// 订单管理
// ============================================

async function loadOrders(page = 1) {
    try {
        currentOrderPage = page;
        const keyword = document.getElementById('orderKeyword')?.value || '';
        const status = document.getElementById('orderStatus')?.value || '';
        const startDate = document.getElementById('orderStartDate')?.value || '';
        const endDate = document.getElementById('orderEndDate')?.value || '';
        const pageSize = 20;

        const params = new URLSearchParams({
            page,
            pageSize,
            keyword,
            status,
            startDate,
            endDate
        });

        const response = await fetch(`${ORDERS_API}?${params}`);
        const result = await response.json();

        if (result.success) {
            // API返回格式: { success: true, data: { items: [...], pagination: {...} } }
            const orders = result.data?.items || result.data || [];
            const pagination = result.data?.pagination || result.pagination;
            displayOrders(orders);
            displayOrderPagination(pagination);
        } else {
            throw new Error(result.error?.message || '加载失败');
        }
    } catch (error) {
        console.error('加载订单列表失败:', error);
        document.getElementById('ordersTableBody').innerHTML = 
            `<tr><td colspan="7" class="text-center text-danger">加载失败: ${error.message}</td></tr>`;
    }
}

function displayOrders(orders) {
    const tbody = document.getElementById('ordersTableBody');
    
    if (!orders || orders.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="text-center">暂无数据</td></tr>';
        return;
    }

    tbody.innerHTML = orders.map(order => {
        // 兼容字段名称
        const orderNo = order.orderNo || order.order_no || order.id;
        const userId = order.userId || order.user_id;
        const userNickname = order.userNickname || order.user_nickname || userId || '-';
        const totalAmount = order.totalAmount || order.total_amount || 0;
        const itemCount = order.itemCount || order.item_count || 0;
        const createdAt = order.createdAt || order.created_at;
        const status = order.status || 'pending';
        
        const statusBadge = {
            'pending': 'warning',
            'paid': 'info',
            'shipped': 'primary',
            'completed': 'success',
            'cancelled': 'secondary'
        }[status] || 'secondary';

        const statusText = {
            'pending': '待支付',
            'paid': '已支付',
            'shipped': '已发货',
            'completed': '已完成',
            'cancelled': '已取消'
        }[status] || status;

        return `
            <tr>
                <td>${orderNo}</td>
                <td>${userNickname}</td>
                <td>¥${parseFloat(totalAmount).toFixed(2)}</td>
                <td>${itemCount}</td>
                <td><span class="badge bg-${statusBadge}">${statusText}</span></td>
                <td>${createdAt ? new Date(createdAt).toLocaleString('zh-CN') : '-'}</td>
                <td>
                    <button class="btn btn-sm btn-info" onclick="viewOrderDetail(${order.id})">
                        <i class="bi bi-eye"></i> 查看
                    </button>
                </td>
            </tr>
        `;
    }).join('');
}

function displayOrderPagination(pagination) {
    const paginationEl = document.getElementById('orderPagination');
    if (!pagination) {
        paginationEl.innerHTML = '';
        return;
    }

    const { page, totalPages } = pagination;
    let html = '';

    // 上一页
    html += `
        <li class="page-item ${page <= 1 ? 'disabled' : ''}">
            <a class="page-link" href="#" onclick="loadOrders(${page - 1}); return false;">上一页</a>
        </li>
    `;

    // 页码
    const startPage = Math.max(1, page - 2);
    const endPage = Math.min(totalPages, page + 2);

    if (startPage > 1) {
        html += `<li class="page-item"><a class="page-link" href="#" onclick="loadOrders(1); return false;">1</a></li>`;
        if (startPage > 2) {
            html += `<li class="page-item disabled"><span class="page-link">...</span></li>`;
        }
    }

    for (let i = startPage; i <= endPage; i++) {
        html += `
            <li class="page-item ${i === page ? 'active' : ''}">
                <a class="page-link" href="#" onclick="loadOrders(${i}); return false;">${i}</a>
            </li>
        `;
    }

    if (endPage < totalPages) {
        if (endPage < totalPages - 1) {
            html += `<li class="page-item disabled"><span class="page-link">...</span></li>`;
        }
        html += `<li class="page-item"><a class="page-link" href="#" onclick="loadOrders(${totalPages}); return false;">${totalPages}</a></li>`;
    }

    // 下一页
    html += `
        <li class="page-item ${page >= totalPages ? 'disabled' : ''}">
            <a class="page-link" href="#" onclick="loadOrders(${page + 1}); return false;">下一页</a>
        </li>
    `;

    paginationEl.innerHTML = html;
}

function searchOrders() {
    loadOrders(1);
}

function resetOrderSearch() {
    document.getElementById('orderKeyword').value = '';
    document.getElementById('orderStatus').value = '';
    document.getElementById('orderStartDate').value = '';
    document.getElementById('orderEndDate').value = '';
    loadOrders(1);
}

async function viewOrderDetail(orderId) {
    try {
        const modal = new bootstrap.Modal(document.getElementById('orderDetailModal'));
        modal.show();

        const response = await fetch(`${ORDERS_API}/${orderId}`);
        const result = await response.json();

        if (result.success) {
            displayOrderDetail(result.data);
        } else {
            throw new Error(result.error?.message || '加载失败');
        }
    } catch (error) {
        console.error('加载订单详情失败:', error);
        document.getElementById('orderDetailContent').innerHTML = 
            `<div class="alert alert-danger">加载失败: ${error.message}</div>`;
    }
}

function displayOrderDetail(order) {
    const content = document.getElementById('orderDetailContent');
    
    const statusBadge = {
        'pending': 'warning',
        'paid': 'info',
        'shipped': 'primary',
        'completed': 'success',
        'cancelled': 'secondary'
    }[order.status] || 'secondary';

    const statusText = {
        'pending': '待支付',
        'paid': '已支付',
        'shipped': '已发货',
        'completed': '已完成',
        'cancelled': '已取消'
    }[order.status] || order.status;

    let itemsHtml = '';
    if (order.items && order.items.length > 0) {
        itemsHtml = order.items.map(item => `
            <tr>
                <td>${item.product_name || '-'}</td>
                <td>${item.sku_name || '-'}</td>
                <td>${item.quantity || 0}</td>
                <td>¥${item.price ? parseFloat(item.price).toFixed(2) : '0.00'}</td>
                <td>¥${item.subtotal ? parseFloat(item.subtotal).toFixed(2) : '0.00'}</td>
            </tr>
        `).join('');
    } else {
        itemsHtml = '<tr><td colspan="5" class="text-center text-muted">暂无商品信息</td></tr>';
    }

    content.innerHTML = `
        <div class="row mb-3">
            <div class="col-md-6">
                <h5>订单信息</h5>
                <table class="table table-bordered">
                    <tr>
                        <th style="width: 120px;">订单号</th>
                        <td>${order.order_no || order.id}</td>
                    </tr>
                    <tr>
                        <th>订单状态</th>
                        <td><span class="badge bg-${statusBadge}">${statusText}</span></td>
                    </tr>
                    <tr>
                        <th>创建时间</th>
                        <td>${order.created_at ? new Date(order.created_at).toLocaleString('zh-CN') : '-'}</td>
                    </tr>
                    <tr>
                        <th>支付时间</th>
                        <td>${order.paid_at ? new Date(order.paid_at).toLocaleString('zh-CN') : '-'}</td>
                    </tr>
                </table>
            </div>
            <div class="col-md-6">
                <h5>收货信息</h5>
                <table class="table table-bordered">
                    <tr>
                        <th style="width: 120px;">收货人</th>
                        <td>${order.receiver_name || '-'}</td>
                    </tr>
                    <tr>
                        <th>联系电话</th>
                        <td>${order.receiver_phone || '-'}</td>
                    </tr>
                    <tr>
                        <th>收货地址</th>
                        <td>${order.receiver_address || '-'}</td>
                    </tr>
                </table>
            </div>
        </div>
        
        <h5>商品清单</h5>
        <table class="table table-bordered">
            <thead>
                <tr>
                    <th>商品名称</th>
                    <th>规格</th>
                    <th>数量</th>
                    <th>单价</th>
                    <th>小计</th>
                </tr>
            </thead>
            <tbody>
                ${itemsHtml}
            </tbody>
        </table>
        
        <div class="text-end">
            <h4>订单总额: <span class="text-danger">¥${order.total_amount ? parseFloat(order.total_amount).toFixed(2) : '0.00'}</span></h4>
        </div>
    `;
}

// ============================================
// 会员管理
// ============================================

async function loadUsers(page = 1) {
    try {
        currentUserPage = page;
        const keyword = document.getElementById('userKeyword')?.value || '';
        const status = document.getElementById('userStatus')?.value || '';
        const pageSize = document.getElementById('userPageSize')?.value || '20';

        const params = new URLSearchParams({
            page,
            pageSize,
            keyword,
            status
        });

        const response = await fetch(`${USERS_API}?${params}`);
        const result = await response.json();

        if (result.success) {
            // API返回格式: { success: true, data: { items: [...], pagination: {...} } }
            const users = result.data?.items || result.data || [];
            const pagination = result.data?.pagination || result.pagination;
            displayUsers(users);
            displayUserPagination(pagination);
        } else {
            throw new Error(result.error?.message || '加载失败');
        }
    } catch (error) {
        console.error('加载用户列表失败:', error);
        document.getElementById('usersTableBody').innerHTML = 
            `<tr><td colspan="9" class="text-center text-danger">加载失败: ${error.message}</td></tr>`;
    }
}

function displayUsers(users) {
    const tbody = document.getElementById('usersTableBody');
    
    if (!users || users.length === 0) {
        tbody.innerHTML = '<tr><td colspan="9" class="text-center">暂无数据</td></tr>';
        return;
    }

    tbody.innerHTML = users.map(user => {
        // 兼容字段名称
        const avatarUrl = user.avatar || user.avatar_url || '';
        const nickname = user.nickname || '-';
        const phone = user.phone || '-';
        const orderCount = user.orderCount || user.order_count || 0;
        const totalSpent = user.totalSpent || user.total_spent || 0;
        const createdAt = user.createdAt || user.created_at;
        const isActive = user.isActive !== undefined ? user.isActive : (user.is_active !== false);
        
        return `
        <tr>
            <td>${user.id}</td>
            <td>
                ${avatarUrl ? `<img src="${avatarUrl}" alt="${nickname}" style="width: 40px; height: 40px; border-radius: 50%;">` : '-'}
            </td>
            <td>${nickname}</td>
            <td>${phone}</td>
            <td>${orderCount}</td>
            <td>¥${parseFloat(totalSpent).toFixed(2)}</td>
            <td>${createdAt ? new Date(createdAt).toLocaleString('zh-CN') : '-'}</td>
            <td><span class="badge bg-${isActive ? 'success' : 'secondary'}">${isActive ? '启用' : '禁用'}</span></td>
            <td>
                <button class="btn btn-sm btn-info" onclick="viewUserDetail(${user.id})">
                    <i class="bi bi-eye"></i> 查看
                </button>
            </td>
        </tr>
        `;
    }).join('');
}

function displayUserPagination(pagination) {
    const paginationEl = document.getElementById('userPagination');
    if (!pagination) {
        paginationEl.innerHTML = '';
        return;
    }

    const { page, totalPages } = pagination;
    let html = '';

    // 上一页
    html += `
        <li class="page-item ${page <= 1 ? 'disabled' : ''}">
            <a class="page-link" href="#" onclick="loadUsers(${page - 1}); return false;">上一页</a>
        </li>
    `;

    // 页码
    const startPage = Math.max(1, page - 2);
    const endPage = Math.min(totalPages, page + 2);

    if (startPage > 1) {
        html += `<li class="page-item"><a class="page-link" href="#" onclick="loadUsers(1); return false;">1</a></li>`;
        if (startPage > 2) {
            html += `<li class="page-item disabled"><span class="page-link">...</span></li>`;
        }
    }

    for (let i = startPage; i <= endPage; i++) {
        html += `
            <li class="page-item ${i === page ? 'active' : ''}">
                <a class="page-link" href="#" onclick="loadUsers(${i}); return false;">${i}</a>
            </li>
        `;
    }

    if (endPage < totalPages) {
        if (endPage < totalPages - 1) {
            html += `<li class="page-item disabled"><span class="page-link">...</span></li>`;
        }
        html += `<li class="page-item"><a class="page-link" href="#" onclick="loadUsers(${totalPages}); return false;">${totalPages}</a></li>`;
    }

    // 下一页
    html += `
        <li class="page-item ${page >= totalPages ? 'disabled' : ''}">
            <a class="page-link" href="#" onclick="loadUsers(${page + 1}); return false;">下一页</a>
        </li>
    `;

    paginationEl.innerHTML = html;
}

function searchUsers() {
    loadUsers(1);
}

function resetUserSearch() {
    document.getElementById('userKeyword').value = '';
    document.getElementById('userStatus').value = '';
    document.getElementById('userPageSize').value = '20';
    loadUsers(1);
}

async function viewUserDetail(userId) {
    try {
        const modal = new bootstrap.Modal(document.getElementById('userDetailModal'));
        modal.show();

        const response = await fetch(`${USERS_API}/${userId}`);
        const result = await response.json();

        if (result.success) {
            displayUserDetail(result.data);
        } else {
            throw new Error(result.error?.message || '加载失败');
        }
    } catch (error) {
        console.error('加载用户详情失败:', error);
        document.getElementById('userDetailContent').innerHTML = 
            `<div class="alert alert-danger">加载失败: ${error.message}</div>`;
    }
}

function displayUserDetail(user) {
    const content = document.getElementById('userDetailContent');
    content.innerHTML = `
        <div class="row">
            <div class="col-md-4 text-center">
                ${user.avatar_url ? `<img src="${user.avatar_url}" class="img-fluid rounded-circle mb-3" alt="${user.nickname}" style="max-width: 200px;">` : '<div class="text-muted">暂无头像</div>'}
                <h5>${user.nickname || '未设置昵称'}</h5>
            </div>
            <div class="col-md-8">
                <h5>基本信息</h5>
                <table class="table table-bordered">
                    <tr>
                        <th style="width: 150px;">用户ID</th>
                        <td>${user.id}</td>
                    </tr>
                    <tr>
                        <th>昵称</th>
                        <td>${user.nickname || '-'}</td>
                    </tr>
                    <tr>
                        <th>手机号</th>
                        <td>${user.phone || '-'}</td>
                    </tr>
                    <tr>
                        <th>微信OpenID</th>
                        <td>${user.wechat_openid || '-'}</td>
                    </tr>
                    <tr>
                        <th>注册时间</th>
                        <td>${user.created_at ? new Date(user.created_at).toLocaleString('zh-CN') : '-'}</td>
                    </tr>
                    <tr>
                        <th>最后登录</th>
                        <td>${user.last_login_at ? new Date(user.last_login_at).toLocaleString('zh-CN') : '-'}</td>
                    </tr>
                    <tr>
                        <th>订单数量</th>
                        <td>${user.order_count || 0}</td>
                    </tr>
                    <tr>
                        <th>累计消费</th>
                        <td>¥${user.total_spent ? parseFloat(user.total_spent).toFixed(2) : '0.00'}</td>
                    </tr>
                    <tr>
                        <th>账户状态</th>
                        <td><span class="badge bg-${user.is_active !== false ? 'success' : 'secondary'}">${user.is_active !== false ? '启用' : '禁用'}</span></td>
                    </tr>
                </table>
            </div>
        </div>
    `;
}

// ============================================
// 图片上传
// ============================================

function showImageUploadModal() {
    const modal = new bootstrap.Modal(document.getElementById('imageUploadModal'));
    document.getElementById('imageFiles').value = '';
    document.getElementById('uploadFolder').value = 'images';
    document.getElementById('uploadProgress').style.display = 'none';
    document.getElementById('uploadResults').innerHTML = '';
    modal.show();
}

async function uploadImages() {
    const fileInput = document.getElementById('imageFiles');
    const folder = document.getElementById('uploadFolder').value || 'images';
    const uploadButton = document.getElementById('uploadButton');
    const progressDiv = document.getElementById('uploadProgress');
    const progressBar = document.getElementById('uploadProgressBar');
    const statusDiv = document.getElementById('uploadStatus');
    const resultsDiv = document.getElementById('uploadResults');

    if (!fileInput.files || fileInput.files.length === 0) {
        alert('请选择要上传的图片');
        return;
    }

    const files = Array.from(fileInput.files);
    uploadButton.disabled = true;
    progressDiv.style.display = 'block';
    resultsDiv.innerHTML = '';

    try {
        let completed = 0;
        const results = [];

        for (const file of files) {
            statusDiv.textContent = `正在上传 ${file.name}...`;
            
            const formData = new FormData();
            formData.append('image', file);
            formData.append('folder', folder);

            try {
                const response = await fetch(`${UPLOAD_API}/image`, {
                    method: 'POST',
                    body: formData
                });

                const result = await response.json();

                if (result.success) {
                    results.push({ success: true, file: file.name, data: result.data });
                } else {
                    results.push({ success: false, file: file.name, error: result.error?.message || '上传失败' });
                }
            } catch (error) {
                results.push({ success: false, file: file.name, error: error.message });
            }

            completed++;
            const progress = (completed / files.length) * 100;
            progressBar.style.width = `${progress}%`;
            progressBar.textContent = `${Math.round(progress)}%`;
        }

        // 显示结果
        statusDiv.textContent = `上传完成！成功: ${results.filter(r => r.success).length}, 失败: ${results.filter(r => !r.success).length}`;
        
        let resultsHtml = '<div class="list-group mt-3">';
        results.forEach(result => {
            if (result.success) {
                resultsHtml += `
                    <div class="list-group-item list-group-item-success">
                        <div class="d-flex justify-content-between align-items-center">
                            <div>
                                <strong>${result.file}</strong>
                                <div class="small text-muted">${result.data.url}</div>
                            </div>
                            <button class="btn btn-sm btn-outline-secondary" onclick="copyToClipboard('${result.data.url}')">
                                <i class="bi bi-clipboard"></i> 复制URL
                            </button>
                        </div>
                    </div>
                `;
            } else {
                resultsHtml += `
                    <div class="list-group-item list-group-item-danger">
                        <strong>${result.file}</strong>
                        <div class="small">${result.error}</div>
                    </div>
                `;
            }
        });
        resultsHtml += '</div>';
        
        resultsDiv.innerHTML = resultsHtml;
    } catch (error) {
        console.error('上传失败:', error);
        statusDiv.textContent = '上传失败: ' + error.message;
    } finally {
        uploadButton.disabled = false;
    }
}

function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => {
        alert('URL已复制到剪贴板');
    }).catch(err => {
        console.error('复制失败:', err);
        // 降级方案
        const textarea = document.createElement('textarea');
        textarea.value = text;
        document.body.appendChild(textarea);
        textarea.select();
        try {
            document.execCommand('copy');
            alert('URL已复制到剪贴板');
        } catch (e) {
            alert('复制失败，请手动复制: ' + text);
        }
        document.body.removeChild(textarea);
    });
}

// ============================================
// 商品描述管理
// ============================================

async function loadProductDescription() {
    const codeInput = document.getElementById('pdProductCode');
    const descTextarea = document.getElementById('pdLocalDescription');
    const productCode = codeInput.value.trim();

    if (!productCode) {
        alert('请先输入商品编码');
        codeInput.focus();
        return;
    }

    try {
        const response = await fetch(`${PRODUCT_DESC_API}/${encodeURIComponent(productCode)}`);
        const result = await response.json();

        if (!result.success) {
            alert(`加载失败：${result.message || '未知错误'}`);
            return;
        }

        descTextarea.value = result.data && result.data.local_description
            ? result.data.local_description
            : '';
    } catch (error) {
        console.error("加载商品本地描述失败:", error);
        alert("加载失败: " + error.message);
    }
}

async function saveProductDescription() {
    const codeInput = document.getElementById('pdProductCode');
    const descTextarea = document.getElementById('pdLocalDescription');
    const productCode = codeInput.value.trim();
    const localDescription = descTextarea.value;

    if (!productCode) {
        alert('请先输入商品编码');
        codeInput.focus();
        return;
    }

    try {
        const response = await fetch(`${PRODUCT_DESC_API}/${encodeURIComponent(productCode)}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ local_description: localDescription })
        });

        const result = await response.json();

        if (result.success) {
            alert('保存成功！');
        } else {
            alert(`保存失败：${result.message || '未知错误'}`);
        }
    } catch (error) {
        console.error("保存商品本地描述失败:", error);
        alert("保存失败: " + error.message);
    }
}

// ============================================
// 首页管理
// ============================================

async function loadHomepageData() {
    await Promise.all([
        loadBanners(),
        loadLowerSwiper(),
        loadThreeImages()
    ]);
}

// Banners 管理
async function loadBanners() {
    try {
        const response = await fetch(`${HOMEPAGE_API}/banners`);
        const result = await response.json();
        
        if (result.success) {
            const tbody = document.getElementById('bannersTableBody');
            tbody.innerHTML = result.data.map(banner => `
                <tr>
                    <td>${banner.id}</td>
                    <td><span class="badge bg-${banner.type === 'video' ? 'primary' : 'info'}">${banner.type === 'video' ? '视频' : '图片'}</span></td>
                    <td>${banner.title || '-'}</td>
                    <td>${banner.sort_order}</td>
                    <td><span class="badge bg-${banner.is_active ? 'success' : 'secondary'}">${banner.is_active ? '启用' : '禁用'}</span></td>
                    <td>
                        <button class="btn btn-sm btn-primary" onclick="editBanner(${banner.id})">编辑</button>
                        <button class="btn btn-sm btn-danger" onclick="deleteBanner(${banner.id})">删除</button>
                    </td>
                </tr>
            `).join('');
        }
    } catch (error) {
        console.error("加载banners失败:", error);
        alert("加载banners失败: " + error.message);
    }
}

function showBannerModal(id = null) {
    const modal = new bootstrap.Modal(document.getElementById('bannerModal'));
    const form = document.getElementById('bannerForm');
    
    if (id) {
        document.getElementById('bannerModalTitle').textContent = '编辑Banner';
        loadBannerData(id);
    } else {
        document.getElementById('bannerModalTitle').textContent = '添加Banner';
        form.reset();
        document.getElementById('bannerId').value = '';
        document.getElementById('bannerBrandName').value = 'NOT-BORING BOREBOI';
        document.getElementById('bannerIsActive').checked = true;
    }
    
    // 监听类型变化
    document.getElementById('bannerType').addEventListener('change', function() {
        const type = this.value;
        const imageGroup = document.getElementById('bannerImageGroup');
        const videoGroup = document.getElementById('bannerVideoGroup');
        
        if (type === 'image') {
            imageGroup.style.display = 'block';
            videoGroup.style.display = 'none';
            document.getElementById('bannerImage').required = true;
            document.getElementById('bannerVideo').required = false;
            document.getElementById('bannerVideo').value = '';
        } else if (type === 'video') {
            imageGroup.style.display = 'none';
            videoGroup.style.display = 'block';
            document.getElementById('bannerImage').required = false;
            document.getElementById('bannerVideo').required = true;
            document.getElementById('bannerImage').value = '';
        } else {
            imageGroup.style.display = 'block';
            videoGroup.style.display = 'block';
        }
    });
    
    modal.show();
}

async function loadBannerData(id) {
    try {
        const response = await fetch(`${HOMEPAGE_API}/banners/${id}`);
        const result = await response.json();
        
        if (result.success) {
            const banner = result.data;
            document.getElementById('bannerId').value = banner.id;
            document.getElementById('bannerType').value = banner.type;
            document.getElementById('bannerImage').value = banner.image || '';
            document.getElementById('bannerVideo').value = banner.video || '';
            document.getElementById('bannerTitle').value = banner.title || '';
            document.getElementById('bannerSubtitle').value = banner.subtitle || '';
            document.getElementById('bannerBrandName').value = banner.brand_name || 'NOT-BORING BOREBOI';
            document.getElementById('bannerButtonText').value = banner.button_text || '';
            document.getElementById('bannerButtonAction').value = banner.button_action || '';
            document.getElementById('bannerLink').value = banner.link || '';
            document.getElementById('bannerSortOrder').value = banner.sort_order || 0;
            document.getElementById('bannerIsActive').checked = banner.is_active !== false;
            
            // 触发类型变化以显示/隐藏相应字段
            document.getElementById('bannerType').dispatchEvent(new Event('change'));
        }
    } catch (error) {
        console.error("加载banner数据失败:", error);
        alert("加载banner数据失败: " + error.message);
    }
}

async function saveBanner() {
    const form = document.getElementById('bannerForm');
    const formData = new FormData(form);
    const id = formData.get('id');
    
    const data = {
        type: formData.get('type'),
        image: formData.get('image') || null,
        video: formData.get('video') || null,
        title: formData.get('title') || null,
        subtitle: formData.get('subtitle') || null,
        brand_name: formData.get('brand_name') || 'NOT-BORING BOREBOI',
        button_text: formData.get('button_text') || null,
        button_action: formData.get('button_action') || null,
        link: formData.get('link') || null,
        sort_order: parseInt(formData.get('sort_order')) || 0,
        is_active: formData.get('is_active') === 'on'
    };
    
    try {
        const url = id ? `${HOMEPAGE_API}/banners/${id}` : `${HOMEPAGE_API}/banners`;
        const method = id ? 'PUT' : 'POST';
        
        const response = await fetch(url, {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        
        const result = await response.json();
        
        if (result.success) {
            bootstrap.Modal.getInstance(document.getElementById('bannerModal')).hide();
            loadBanners();
            alert('保存成功！');
        } else {
            alert('保存失败: ' + result.message);
        }
    } catch (error) {
        console.error("保存banner失败:", error);
        alert("保存失败: " + error.message);
    }
}

async function editBanner(id) {
    showBannerModal(id);
}

async function deleteBanner(id) {
    if (!confirm('确定要删除这个Banner吗？')) return;
    
    try {
        const response = await fetch(`${HOMEPAGE_API}/banners/${id}`, {
            method: 'DELETE'
        });
        
        const result = await response.json();
        
        if (result.success) {
            loadBanners();
            alert('删除成功！');
        } else {
            alert('删除失败: ' + result.message);
        }
    } catch (error) {
        console.error("删除banner失败:", error);
        alert("删除失败: " + error.message);
    }
}

// Lower Swiper 管理
async function loadLowerSwiper() {
    try {
        const response = await fetch(`${HOMEPAGE_API}/lower-swiper`);
        const result = await response.json();
        
        if (result.success) {
            const tbody = document.getElementById('lowerSwiperTableBody');
            tbody.innerHTML = result.data.map(item => `
                <tr>
                    <td>${item.id}</td>
                    <td><img src="${item.image}" alt="${item.title || ''}" style="max-width: 100px; max-height: 60px;"></td>
                    <td>${item.title || '-'}</td>
                    <td>${item.sort_order}</td>
                    <td><span class="badge bg-${item.is_active ? 'success' : 'secondary'}">${item.is_active ? '启用' : '禁用'}</span></td>
                    <td>
                        <button class="btn btn-sm btn-primary" onclick="editLowerSwiper(${item.id})">编辑</button>
                        <button class="btn btn-sm btn-danger" onclick="deleteLowerSwiper(${item.id})">删除</button>
                    </td>
                </tr>
            `).join('');
        }
    } catch (error) {
        console.error("加载lowerSwiper失败:", error);
        alert("加载lowerSwiper失败: " + error.message);
    }
}

function showLowerSwiperModal(id = null) {
    const modal = new bootstrap.Modal(document.getElementById('lowerSwiperModal'));
    const form = document.getElementById('lowerSwiperForm');
    
    if (id) {
        document.getElementById('lowerSwiperModalTitle').textContent = '编辑横向轮播';
        loadLowerSwiperData(id);
    } else {
        document.getElementById('lowerSwiperModalTitle').textContent = '添加横向轮播';
        form.reset();
        document.getElementById('lowerSwiperId').value = '';
        document.getElementById('lowerSwiperIsActive').checked = true;
    }
    
    modal.show();
}

async function loadLowerSwiperData(id) {
    try {
        const response = await fetch(`${HOMEPAGE_API}/lower-swiper`);
        const result = await response.json();
        
        if (result.success) {
            const item = result.data.find(i => i.id === id);
            if (item) {
                document.getElementById('lowerSwiperId').value = item.id;
                document.getElementById('lowerSwiperImage').value = item.image || '';
                document.getElementById('lowerSwiperTitle').value = item.title || '';
                document.getElementById('lowerSwiperLink').value = item.link || '';
                document.getElementById('lowerSwiperSortOrder').value = item.sort_order || 0;
                document.getElementById('lowerSwiperIsActive').checked = item.is_active !== false;
            }
        }
    } catch (error) {
        console.error("加载lowerSwiper数据失败:", error);
        alert("加载lowerSwiper数据失败: " + error.message);
    }
}

async function saveLowerSwiper() {
    const form = document.getElementById('lowerSwiperForm');
    const formData = new FormData(form);
    const id = formData.get('id');
    
    const data = {
        image: formData.get('image'),
        title: formData.get('title') || null,
        link: formData.get('link') || null,
        sort_order: parseInt(formData.get('sort_order')) || 0,
        is_active: formData.get('is_active') === 'on'
    };
    
    try {
        const url = id ? `${HOMEPAGE_API}/lower-swiper/${id}` : `${HOMEPAGE_API}/lower-swiper`;
        const method = id ? 'PUT' : 'POST';
        
        const response = await fetch(url, {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        
        const result = await response.json();
        
        if (result.success) {
            bootstrap.Modal.getInstance(document.getElementById('lowerSwiperModal')).hide();
            loadLowerSwiper();
            alert('保存成功！');
        } else {
            alert('保存失败: ' + result.message);
        }
    } catch (error) {
        console.error("保存lowerSwiper失败:", error);
        alert("保存失败: " + error.message);
    }
}

async function editLowerSwiper(id) {
    showLowerSwiperModal(id);
}

async function deleteLowerSwiper(id) {
    if (!confirm('确定要删除这条记录吗？')) return;
    
    try {
        const response = await fetch(`${HOMEPAGE_API}/lower-swiper/${id}`, {
            method: 'DELETE'
        });
        
        const result = await response.json();
        
        if (result.success) {
            loadLowerSwiper();
            alert('删除成功！');
        } else {
            alert('删除失败: ' + result.message);
        }
    } catch (error) {
        console.error("删除lowerSwiper失败:", error);
        alert("删除失败: " + error.message);
    }
}

// Three Images 管理
async function loadThreeImages() {
    try {
        const response = await fetch(`${HOMEPAGE_API}/three-images`);
        const result = await response.json();
        
        if (result.success) {
            const tbody = document.getElementById('threeImagesTableBody');
            tbody.innerHTML = result.data.map(item => `
                <tr>
                    <td>${item.id}</td>
                    <td><img src="${item.image}" alt="" style="max-width: 100px; max-height: 60px;"></td>
                    <td>${item.link || '-'}</td>
                    <td>${item.sort_order}</td>
                    <td><span class="badge bg-${item.is_active ? 'success' : 'secondary'}">${item.is_active ? '启用' : '禁用'}</span></td>
                    <td>
                        <button class="btn btn-sm btn-primary" onclick="editThreeImages(${item.id})">编辑</button>
                        <button class="btn btn-sm btn-danger" onclick="deleteThreeImages(${item.id})">删除</button>
                    </td>
                </tr>
            `).join('');
        }
    } catch (error) {
        console.error("加载threeImages失败:", error);
        alert("加载threeImages失败: " + error.message);
    }
}

function showThreeImagesModal(id = null) {
    const modal = new bootstrap.Modal(document.getElementById('threeImagesModal'));
    const form = document.getElementById('threeImagesForm');
    
    if (id) {
        document.getElementById('threeImagesModalTitle').textContent = '编辑三图展示';
        loadThreeImagesData(id);
    } else {
        document.getElementById('threeImagesModalTitle').textContent = '添加三图展示';
        form.reset();
        document.getElementById('threeImagesId').value = '';
        document.getElementById('threeImagesIsActive').checked = true;
    }
    
    modal.show();
}

async function loadThreeImagesData(id) {
    try {
        const response = await fetch(`${HOMEPAGE_API}/three-images`);
        const result = await response.json();
        
        if (result.success) {
            const item = result.data.find(i => i.id === id);
            if (item) {
                document.getElementById('threeImagesId').value = item.id;
                document.getElementById('threeImagesImage').value = item.image || '';
                document.getElementById('threeImagesLink').value = item.link || '';
                document.getElementById('threeImagesSortOrder').value = item.sort_order || 0;
                document.getElementById('threeImagesIsActive').checked = item.is_active !== false;
            }
        }
    } catch (error) {
        console.error("加载threeImages数据失败:", error);
        alert("加载threeImages数据失败: " + error.message);
    }
}

async function saveThreeImages() {
    const form = document.getElementById('threeImagesForm');
    const formData = new FormData(form);
    const id = formData.get('id');
    
    const data = {
        image: formData.get('image'),
        link: formData.get('link') || null,
        sort_order: parseInt(formData.get('sort_order')) || 0,
        is_active: formData.get('is_active') === 'on'
    };
    
    try {
        const url = id ? `${HOMEPAGE_API}/three-images/${id}` : `${HOMEPAGE_API}/three-images`;
        const method = id ? 'PUT' : 'POST';
        
        const response = await fetch(url, {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        
        const result = await response.json();
        
        if (result.success) {
            bootstrap.Modal.getInstance(document.getElementById('threeImagesModal')).hide();
            loadThreeImages();
            alert('保存成功！');
        } else {
            alert('保存失败: ' + result.message);
        }
    } catch (error) {
        console.error("保存threeImages失败:", error);
        alert("保存失败: " + error.message);
    }
}

async function editThreeImages(id) {
    showThreeImagesModal(id);
}

async function deleteThreeImages(id) {
    if (!confirm('确定要删除这条记录吗？')) return;
    
    try {
        const response = await fetch(`${HOMEPAGE_API}/three-images/${id}`, {
            method: 'DELETE'
        });
        
        const result = await response.json();
        
        if (result.success) {
            loadThreeImages();
            alert('删除成功！');
        } else {
            alert('删除失败: ' + result.message);
        }
    } catch (error) {
        console.error("删除threeImages失败:", error);
        alert("删除失败: " + error.message);
    }
}

// ============================================
// 媒体管理
// ============================================

// 显示媒体上传模态框
function showMediaUploadModal() {
    const modal = new bootstrap.Modal(document.getElementById('mediaUploadModal'));
    document.getElementById('mediaFiles').value = '';
    document.getElementById('mediaUploadFolder').value = 'images';
    document.getElementById('mediaUploadCustomFolder').value = '';
    document.getElementById('mediaUploadCustomFolder').style.display = 'none';
    document.getElementById('mediaUploadProgress').style.display = 'none';
    document.getElementById('mediaUploadResults').innerHTML = '';
    
    modal.show();
}

// 初始化媒体上传模态框的目录选择事件（页面加载时执行一次）
document.addEventListener('DOMContentLoaded', function() {
    const folderSelect = document.getElementById('mediaUploadFolder');
    const customFolderInput = document.getElementById('mediaUploadCustomFolder');
    
    if (folderSelect && customFolderInput) {
        folderSelect.addEventListener('change', function() {
            if (this.value === 'custom') {
                customFolderInput.style.display = 'block';
                customFolderInput.required = true;
            } else {
                customFolderInput.style.display = 'none';
                customFolderInput.required = false;
                customFolderInput.value = '';
            }
        });
    }
});

// 上传媒体文件（图片和视频）
async function uploadMediaFiles() {
    const fileInput = document.getElementById('mediaFiles');
    const folderSelect = document.getElementById('mediaUploadFolder');
    const customFolderInput = document.getElementById('mediaUploadCustomFolder');
    const folder = folderSelect.value === 'custom' ? customFolderInput.value : folderSelect.value;
    const uploadButton = document.getElementById('mediaUploadButton');
    const progressDiv = document.getElementById('mediaUploadProgress');
    const progressBar = document.getElementById('mediaUploadProgressBar');
    const statusDiv = document.getElementById('mediaUploadStatus');
    const resultsDiv = document.getElementById('mediaUploadResults');

    if (!folder || (folderSelect.value === 'custom' && !customFolderInput.value.trim())) {
        alert('请选择或输入上传目录');
        return;
    }

    if (!fileInput.files || fileInput.files.length === 0) {
        alert('请选择要上传的文件');
        return;
    }

    const files = Array.from(fileInput.files);
    uploadButton.disabled = true;
    progressDiv.style.display = 'block';
    resultsDiv.innerHTML = '';

    try {
        let completed = 0;
        const results = [];

        for (const file of files) {
            statusDiv.textContent = `正在上传 ${file.name}...`;
            
            const formData = new FormData();
            formData.append('file', file);
            formData.append('folder', folder);

            try {
                const response = await fetch(`${UPLOAD_API}/file`, {
                    method: 'POST',
                    body: formData
                });

                // 检查响应类型
                const contentType = response.headers.get('content-type');
                if (!contentType || !contentType.includes('application/json')) {
                    const text = await response.text();
                    console.error('服务器返回非JSON响应:', text.substring(0, 200));
                    results.push({ success: false, file: file.name, error: '服务器错误：返回了非JSON响应' });
                    continue;
                }

                const result = await response.json();

                if (result.success) {
                    results.push({ success: true, file: file.name, data: result.data });
                } else {
                    results.push({ success: false, file: file.name, error: result.error?.message || '上传失败' });
                }
            } catch (error) {
                console.error('上传文件错误:', error);
                results.push({ success: false, file: file.name, error: error.message || '上传失败' });
            }

            completed++;
            const progress = (completed / files.length) * 100;
            progressBar.style.width = `${progress}%`;
            progressBar.textContent = `${Math.round(progress)}%`;
        }

        // 显示结果
        statusDiv.textContent = `上传完成！成功: ${results.filter(r => r.success).length}, 失败: ${results.filter(r => !r.success).length}`;
        
        let resultsHtml = '<div class="list-group mt-3">';
        results.forEach(result => {
            if (result.success) {
                resultsHtml += `
                    <div class="list-group-item list-group-item-success">
                        <div class="d-flex justify-content-between align-items-start">
                            <div class="flex-grow-1">
                                <h6 class="mb-1">${result.file}</h6>
                                <div class="small">
                                    <div class="mb-1">
                                        <strong>URL:</strong> 
                                        <code class="text-break">${result.data.url}</code>
                                    </div>
                                    <div>
                                        <strong>类型:</strong> ${result.data.type === 'video' ? '视频' : '图片'} | 
                                        <strong>大小:</strong> ${formatFileSize(result.data.size)}
                                    </div>
                                </div>
                            </div>
                            <div class="ms-3">
                                <button class="btn btn-sm btn-outline-primary" onclick="copyToClipboard('${result.data.url}')">
                                    <i class="bi bi-clipboard"></i> 复制URL
                                </button>
                            </div>
                        </div>
                    </div>
                `;
            } else {
                resultsHtml += `
                    <div class="list-group-item list-group-item-danger">
                        <strong>${result.file}</strong>
                        <div class="small">${result.error}</div>
                    </div>
                `;
            }
        });
        resultsHtml += '</div>';
        
        resultsDiv.innerHTML = resultsHtml;
        
        // 如果上传成功，刷新列表
        if (results.some(r => r.success)) {
            setTimeout(() => {
                loadMediaList();
            }, 1000);
        }
    } catch (error) {
        console.error('上传失败:', error);
        statusDiv.textContent = '上传失败: ' + error.message;
    } finally {
        uploadButton.disabled = false;
    }
}

// 格式化文件大小
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

// 加载媒体列表
async function loadMediaList() {
    try {
        const typeFilter = document.getElementById('mediaTypeFilter')?.value || '';
        const prefixFilter = document.getElementById('mediaPrefixFilter')?.value || '';
        
        const params = new URLSearchParams();
        if (prefixFilter) {
            params.append('prefix', prefixFilter);
        }
        params.append('maxKeys', '100');
        
        const response = await fetch(`${UPLOAD_API}/list?${params}`);
        const result = await response.json();

        if (result.success) {
            let files = result.data.files || [];
            
            // 类型筛选
            if (typeFilter) {
                files = files.filter(file => file.type === typeFilter);
            }
            
            displayMediaList(files);
        } else {
            throw new Error(result.error?.message || '加载失败');
        }
    } catch (error) {
        console.error('加载媒体列表失败:', error);
        document.getElementById('mediaListContainer').innerHTML = 
            `<div class="alert alert-danger">加载失败: ${error.message}</div>`;
    }
}

// 显示媒体列表
function displayMediaList(files) {
    const container = document.getElementById('mediaListContainer');
    
    if (!files || files.length === 0) {
        container.innerHTML = '<div class="text-center py-4 text-muted">暂无文件</div>';
        return;
    }

    // 按类型分组
    const images = files.filter(f => f.type === 'image');
    const videos = files.filter(f => f.type === 'video');
    const others = files.filter(f => f.type === 'other');

    let html = '';
    
    if (images.length > 0) {
        html += '<div class="mb-4"><h5>图片 (' + images.length + ')</h5><div class="row g-3">';
        images.forEach(file => {
            html += `
                <div class="col-md-3">
                    <div class="card">
                        <img src="${file.url}" class="card-img-top" style="height: 200px; object-fit: cover;" alt="${file.name}">
                        <div class="card-body">
                            <h6 class="card-title text-truncate" title="${file.name}">${file.name.split('/').pop()}</h6>
                            <p class="card-text small text-muted">${formatFileSize(file.size)}</p>
                            <div class="btn-group w-100" role="group">
                                <button class="btn btn-sm btn-outline-primary" onclick="copyToClipboard('${file.url}')">
                                    <i class="bi bi-clipboard"></i> URL
                                </button>
                                <button class="btn btn-sm btn-outline-danger" onclick="deleteMediaFile('${file.name}')">
                                    <i class="bi bi-trash"></i> 删除
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        });
        html += '</div></div>';
    }
    
    if (videos.length > 0) {
        html += '<div class="mb-4"><h5>视频 (' + videos.length + ')</h5><div class="row g-3">';
        videos.forEach(file => {
            html += `
                <div class="col-md-3">
                    <div class="card">
                        <video class="card-img-top" style="height: 200px; object-fit: cover;" controls>
                            <source src="${file.url}" type="video/mp4">
                            您的浏览器不支持视频播放
                        </video>
                        <div class="card-body">
                            <h6 class="card-title text-truncate" title="${file.name}">${file.name.split('/').pop()}</h6>
                            <p class="card-text small text-muted">${formatFileSize(file.size)}</p>
                            <div class="btn-group w-100" role="group">
                                <button class="btn btn-sm btn-outline-primary" onclick="copyToClipboard('${file.url}')">
                                    <i class="bi bi-clipboard"></i> URL
                                </button>
                                <button class="btn btn-sm btn-outline-danger" onclick="deleteMediaFile('${file.name}')">
                                    <i class="bi bi-trash"></i> 删除
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        });
        html += '</div></div>';
    }
    
    if (others.length > 0) {
        html += '<div class="mb-4"><h5>其他文件 (' + others.length + ')</h5><div class="list-group">';
        others.forEach(file => {
            html += `
                <div class="list-group-item">
                    <div class="d-flex justify-content-between align-items-center">
                        <div>
                            <h6 class="mb-1">${file.name.split('/').pop()}</h6>
                            <small class="text-muted">${formatFileSize(file.size)}</small>
                        </div>
                        <div class="btn-group">
                            <button class="btn btn-sm btn-outline-primary" onclick="copyToClipboard('${file.url}')">
                                <i class="bi bi-clipboard"></i> URL
                            </button>
                            <button class="btn btn-sm btn-outline-danger" onclick="deleteMediaFile('${file.name}')">
                                <i class="bi bi-trash"></i> 删除
                            </button>
                        </div>
                    </div>
                </div>
            `;
        });
        html += '</div></div>';
    }
    
    container.innerHTML = html;
}

// 删除媒体文件
async function deleteMediaFile(objectName) {
    if (!confirm('确定要删除这个文件吗？此操作不可恢复。')) return;
    
    try {
        const response = await fetch(`${UPLOAD_API}/image`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ objectName })
        });
        
        const result = await response.json();
        
        if (result.success) {
            alert('删除成功！');
            loadMediaList();
        } else {
            alert('删除失败: ' + result.error?.message);
        }
    } catch (error) {
        console.error('删除文件失败:', error);
        alert('删除失败: ' + error.message);
    }
}

// 重置媒体筛选
function resetMediaFilter() {
    document.getElementById('mediaTypeFilter').value = '';
    document.getElementById('mediaPrefixFilter').value = '';
    loadMediaList();
}
