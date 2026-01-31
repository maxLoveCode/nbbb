// ============================================
// NBBB Web端主脚本
// ============================================

const API_BASE_URL = '/api/web';

// 工具函数
const utils = {
    // 显示加载提示
    showLoading() {
        document.getElementById('loadingOverlay').classList.add('show');
    },
    
    // 隐藏加载提示
    hideLoading() {
        document.getElementById('loadingOverlay').classList.remove('show');
    },
    
    // 格式化价格（分转元）
    formatPrice(priceInCents) {
        if (!priceInCents) return '0.00';
        return (priceInCents / 100).toFixed(2);
    },
    
    // 格式化图片URL
    formatImageUrl(url) {
        if (!url) return '/web/images/placeholder.jpg';
        if (url.startsWith('http')) return url;
        return url;
    },
    
    // 获取URL参数
    getUrlParams() {
        const params = new URLSearchParams(window.location.search);
        return Object.fromEntries(params);
    },
    
    // 显示错误提示
    showError(message) {
        // 可以集成toast库，这里简单使用alert
        console.error(message);
    }
};

// API调用函数
const api = {
    // 获取商品列表
    async getProducts(options = {}) {
        try {
            const { page = 1, pageSize = 12, keyword = '', category = '' } = options;
            const params = new URLSearchParams({
                page: page.toString(),
                pageSize: pageSize.toString(),
                ...(keyword && { keyword }),
                ...(category && { category })
            });
            
            const response = await fetch(`${API_BASE_URL}/products?${params}`);
            const data = await response.json();
            
            if (data.success && data.data) {
                return data.data;
            } else {
                throw new Error(data.error?.message || '获取商品列表失败');
            }
        } catch (error) {
            console.error('获取商品列表失败:', error);
            throw error;
        }
    },
    
    // 获取分类列表
    async getCategories() {
        try {
            const response = await fetch('/api/common/categories');
            const data = await response.json();
            
            // 兼容不同的响应格式
            if (data.success && data.data) {
                return data.data;
            } else if (data.code === 0 && data.data) {
                return data.data;
            } else if (Array.isArray(data)) {
                return data;
            }
            
            return [];
        } catch (error) {
            console.error('获取分类列表失败:', error);
            return [];
        }
    },
    
    // 获取首页Banner（如果有的话）
    async getBanners() {
        try {
            // 这里可以调用首页API，目前返回默认数据
            return [
                {
                    id: 1,
                    image: 'https://via.placeholder.com/1200x500/0d6efd/ffffff?text=Banner+1',
                    title: '春季新品上市',
                    link: '/web/products.html?category=spring'
                },
                {
                    id: 2,
                    image: 'https://via.placeholder.com/1200x500/dc3545/ffffff?text=Banner+2',
                    title: '限时特惠',
                    link: '/web/products.html?sort=price_asc'
                },
                {
                    id: 3,
                    image: 'https://via.placeholder.com/1200x500/198754/ffffff?text=Banner+3',
                    title: '热门推荐',
                    link: '/web/products.html?sort=hot'
                }
            ];
        } catch (error) {
            console.error('获取Banner失败:', error);
            return [];
        }
    }
};

// Banner渲染
async function renderBanners() {
    try {
        const banners = await api.getBanners();
        const bannerInner = document.getElementById('bannerInner');
        const bannerIndicators = document.getElementById('bannerIndicators');
        
        if (!banners || banners.length === 0) {
            bannerInner.innerHTML = '<div class="carousel-item active"><img src="https://via.placeholder.com/1200x500/0d6efd/ffffff?text=Welcome+to+NBBB" class="d-block w-100" alt="Banner"></div>';
            return;
        }
        
        bannerInner.innerHTML = '';
        bannerIndicators.innerHTML = '';
        
        banners.forEach((banner, index) => {
            // 指示器
            const indicator = document.createElement('button');
            indicator.type = 'button';
            indicator.setAttribute('data-bs-target', '#bannerCarousel');
            indicator.setAttribute('data-bs-slide-to', index.toString());
            if (index === 0) indicator.classList.add('active');
            indicator.setAttribute('aria-current', index === 0 ? 'true' : 'false');
            bannerIndicators.appendChild(indicator);
            
            // 轮播项
            const carouselItem = document.createElement('div');
            carouselItem.className = `carousel-item ${index === 0 ? 'active' : ''}`;
            carouselItem.innerHTML = `
                <a href="${banner.link || '#'}">
                    <img src="${banner.image}" class="d-block w-100" alt="${banner.title || 'Banner'}">
                </a>
            `;
            bannerInner.appendChild(carouselItem);
        });
    } catch (error) {
        console.error('渲染Banner失败:', error);
    }
}

// 分类渲染
async function renderCategories() {
    try {
        const categories = await api.getCategories();
        const categoryGrid = document.getElementById('categoryGrid');
        const categoryMenu = document.getElementById('categoryMenu');
        
        if (!categories || categories.length === 0) {
            categoryGrid.innerHTML = '<div class="col-12"><p class="text-center text-muted">暂无分类数据</p></div>';
            return;
        }
        
        // 渲染分类网格（只显示前6个）
        const displayCategories = categories.slice(0, 6);
        categoryGrid.innerHTML = '';
        
        displayCategories.forEach(category => {
            const col = document.createElement('div');
            col.className = 'col-6 col-md-4 col-lg-2';
            col.innerHTML = `
                <a href="/web/products.html?category=${category.id || category.code}" class="category-card">
                    <i class="bi bi-tag"></i>
                    <h4>${category.name || category.c_name || '分类'}</h4>
                    <p>${category.description || ''}</p>
                </a>
            `;
            categoryGrid.appendChild(col);
        });
        
        // 渲染分类下拉菜单
        if (categoryMenu) {
            categoryMenu.innerHTML = '';
            categories.forEach(category => {
                const item = document.createElement('li');
                item.innerHTML = `<a class="dropdown-item" href="/web/products.html?category=${category.id || category.code}">${category.name || category.c_name}</a>`;
                categoryMenu.appendChild(item);
            });
        }
    } catch (error) {
        console.error('渲染分类失败:', error);
    }
}

// 商品卡片渲染
function renderProductCard(product) {
    return `
        <div class="col-6 col-md-4 col-lg-3">
            <div class="product-card">
                <img src="${utils.formatImageUrl(product.mainImage || product.main_image)}" 
                     class="product-image" 
                     alt="${product.name}"
                     onerror="this.src='https://via.placeholder.com/300x300/f8f9fa/6c757d?text=No+Image'">
                <div class="product-body">
                    <h5 class="product-title">${product.name}</h5>
                    <div class="product-price">${utils.formatPrice(product.price)}</div>
                    <div class="product-actions">
                        <button class="btn btn-view-detail" onclick="window.location.href='/web/product.html?code=${product.code || product.id}'">
                            查看详情
                        </button>
                        <button class="btn btn-add-cart" onclick="addToCart('${product.code || product.id}')">
                            <i class="bi bi-cart-plus"></i>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
}

// 渲染商品列表
async function renderProducts(containerId, options = {}) {
    try {
        const container = document.getElementById(containerId);
        if (!container) return;
        
        const productsData = await api.getProducts(options);
        const products = productsData.products || productsData.items || [];
        
        if (products.length === 0) {
            container.innerHTML = `
                <div class="col-12">
                    <div class="empty-state">
                        <i class="bi bi-inbox"></i>
                        <h3>暂无商品</h3>
                        <p>还没有商品数据，请稍后再试</p>
                    </div>
                </div>
            `;
            return;
        }
        
        container.innerHTML = products.map(product => renderProductCard(product)).join('');
        
        // 添加淡入动画
        container.querySelectorAll('.col-6, .col-md-4, .col-lg-3').forEach((el, index) => {
            setTimeout(() => {
                el.classList.add('fade-in');
            }, index * 50);
        });
    } catch (error) {
        console.error('渲染商品失败:', error);
        const container = document.getElementById(containerId);
        if (container) {
            container.innerHTML = `
                <div class="col-12">
                    <div class="empty-state">
                        <i class="bi bi-exclamation-triangle"></i>
                        <h3>加载失败</h3>
                        <p>${error.message || '无法加载商品数据，请稍后重试'}</p>
                    </div>
                </div>
            `;
        }
    }
}

// 添加到购物车
function addToCart(productCode) {
    // TODO: 实现添加到购物车功能
    console.log('添加到购物车:', productCode);
    alert('添加到购物车功能开发中...');
}

// 搜索功能
function initSearch() {
    const searchForm = document.getElementById('searchForm');
    const searchInput = document.getElementById('searchInput');
    
    if (searchForm) {
        searchForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const keyword = searchInput.value.trim();
            if (keyword) {
                window.location.href = `/web/products.html?keyword=${encodeURIComponent(keyword)}`;
            }
        });
    }
}

// 页面初始化
async function init() {
    utils.showLoading();
    
    try {
        // 并行加载所有数据
        await Promise.all([
            renderBanners(),
            renderCategories(),
            renderProducts('hotProductsGrid', { page: 1, pageSize: 8, sort: 'hot' }),
            renderProducts('recommendedProductsGrid', { page: 1, pageSize: 8, sort: 'new' })
        ]);
    } catch (error) {
        console.error('初始化失败:', error);
    } finally {
        utils.hideLoading();
        initSearch();
    }
}

// 页面加载完成后初始化
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}





