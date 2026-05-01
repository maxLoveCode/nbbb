const API_BASE_URL = process.env.API_BASE_URL || "http://localhost:3000";

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
  const payload = await request("/api/web/home");
  return payload.data;
}

export async function getListing(params = {}) {
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      searchParams.set(key, String(value));
    }
  });

  const payload = await request(`/api/web/listing?${searchParams.toString()}`);
  return payload.data;
}

export async function getCategories() {
  const payload = await request("/api/web/categories");
  return payload.data.categories || [];
}

export async function getProduct(code) {
  const payload = await request(`/api/web/products/${code}`, {
    next: { revalidate: 120 }
  });
  return payload.data;
}

export async function getSearchSuggestions(keyword) {
  const payload = await request(`/api/web/search/suggest?keyword=${encodeURIComponent(keyword)}`, {
    next: { revalidate: 30 }
  });
  return payload.data.suggestions || [];
}

export function getSiteUrl() {
  return process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3001";
}
