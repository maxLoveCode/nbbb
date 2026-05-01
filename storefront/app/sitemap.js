import { getCategories, getListing, getSiteUrl } from "@/lib/api";

export default async function sitemap() {
  const siteUrl = getSiteUrl();
  const [categories, listing] = await Promise.all([
    getCategories().catch(() => []),
    getListing({ pageSize: 50 }).catch(() => ({ products: [] }))
  ]);

  const staticRoutes = [
    "",
    "/collections",
    "/lookbook",
    "/brand",
    "/search",
    "/help",
    "/contact",
    "/login",
    "/register"
  ].map((path) => ({
    url: `${siteUrl}${path}`,
    changeFrequency: "weekly",
    priority: path === "" ? 1 : 0.7
  }));

  const categoryRoutes = categories.map((category) => ({
    url: `${siteUrl}/collections/${category.slug}`,
    changeFrequency: "daily",
    priority: 0.8
  }));

  const productRoutes = listing.products.slice(0, 50).map((product) => ({
    url: `${siteUrl}/products/${product.code}`,
    changeFrequency: "daily",
    priority: 0.9
  }));

  return [...staticRoutes, ...categoryRoutes, ...productRoutes];
}
