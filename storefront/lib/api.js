const API_BASE_URL = process.env.API_BASE_URL || "http://localhost:3000";

const DEMO_CATEGORIES = [
  {
    id: 1,
    slug: "new-arrivals",
    name: "New Arrivals",
    description: "轻盈外套、针织与通勤廓形组成的新季系列。",
    productCount: 12
  },
  {
    id: 2,
    slug: "tailoring",
    name: "Tailoring",
    description: "适合日常通勤和周末出行的西装、衬衫与半裙。",
    productCount: 8
  },
  {
    id: 3,
    slug: "soft-layers",
    name: "Soft Layers",
    description: "以羊毛、针织和暖色中性色构建可叠搭衣橱。",
    productCount: 10
  }
];

const DEMO_PRODUCTS = [
  {
    code: "NBBB-101",
    name: "羊毛混纺短外套",
    category: "New Arrivals",
    brand: "NBBB Atelier",
    description: "短款盒型廓形，适合搭配高腰半裙或直筒裤。",
    price: 689,
    originalPrice: 829,
    inStock: true,
    images: [],
    sku: [{ skuId: "NBBB-101-S", properties: "Ivory / S" }]
  },
  {
    code: "NBBB-102",
    name: "结构感通勤西装",
    category: "Tailoring",
    brand: "NBBB Atelier",
    description: "利落肩线与柔和收腰，兼顾正式感和日常舒适度。",
    price: 899,
    inStock: true,
    images: [],
    sku: [{ skuId: "NBBB-102-M", properties: "Black / M" }]
  },
  {
    code: "NBBB-103",
    name: "柔雾针织连衣裙",
    category: "Soft Layers",
    brand: "NBBB Atelier",
    description: "细腻坑条纹理，单穿或叠搭外套都保持轻盈线条。",
    price: 529,
    inStock: false,
    images: [],
    sku: [{ skuId: "NBBB-103-F", properties: "Mocha / Free" }]
  },
  {
    code: "NBBB-104",
    name: "高腰垂感半裙",
    category: "Tailoring",
    brand: "NBBB Atelier",
    description: "自然垂坠的 A 字裙摆，适合与衬衫和针织衫组合。",
    price: 459,
    inStock: true,
    images: [],
    sku: [{ skuId: "NBBB-104-M", properties: "Charcoal / M" }]
  }
];

const DEMO_HOME = {
  categories: DEMO_CATEGORIES,
  featuredProducts: DEMO_PRODUCTS,
  banners: [
    {
      id: "demo-hero-1",
      brand_name: "NBBB Atelier",
      title: "新季衣橱，从轻盈廓形开始。",
      subtitle: "以通勤、周末与晚间场景为线索，构建可持续搭配的服装独立站首页。",
      button_text: "浏览新品",
      link: "/collections/new-arrivals"
    },
    {
      id: "demo-hero-2",
      brand_name: "NBBB Studio",
      title: "Soft tailoring for every day.",
      subtitle: "柔和剪裁、暖调中性色与可叠搭层次，适合品牌视觉与转化测试。",
      button_text: "查看系列",
      link: "/collections/tailoring"
    }
  ]
};

const DEMO_LISTING = {
  products: DEMO_PRODUCTS,
  pagination: { total: DEMO_PRODUCTS.length, page: 1, pageSize: DEMO_PRODUCTS.length }
};

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {})
    },
    next: options.next || { revalidate: 60 }
  });

  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`);
  }

  return response.json();
}

export async function getHomePage() {
  try {
    const payload = await request("/api/web/home");
    return payload.data;
  } catch {
    return DEMO_HOME;
  }
}

export async function getListing(params = {}) {
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      searchParams.set(key, String(value));
    }
  });

  try {
    const payload = await request(`/api/web/listing?${searchParams.toString()}`);
    return payload.data;
  } catch {
    return DEMO_LISTING;
  }
}

export async function getCategories() {
  try {
    const payload = await request("/api/web/categories");
    return payload.data.categories || [];
  } catch {
    return DEMO_CATEGORIES;
  }
}

export async function getProduct(code) {
  try {
    const payload = await request(`/api/web/products/${code}`, {
      next: { revalidate: 120 }
    });
    return payload.data;
  } catch {
    return DEMO_PRODUCTS.find((product) => product.code === code) || {
      code,
      name: "Product",
      price: 0,
      images: [],
      sku: [],
      inStock: false
    };
  }
}

export async function getSearchSuggestions(keyword) {
  try {
    const payload = await request(`/api/web/search/suggest?keyword=${encodeURIComponent(keyword)}`, {
      next: { revalidate: 30 }
    });
    return payload.data.suggestions || [];
  } catch {
    return DEMO_PRODUCTS.map((product) => ({
      label: product.name,
      value: product.code
    }));
  }
}

export function getSiteUrl() {
  return process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3001";
}
