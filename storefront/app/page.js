import { HomeHeroReel } from "@/components/HomeHeroReel";
import { getHomePage } from "@/lib/api";

function resolveBannerHref(banner, categories, index) {
  if (!banner?.link) {
    return categories[index]?.slug ? `/collections/${categories[index].slug}` : "/collections";
  }

  if (banner.link.startsWith("/pages/category/index")) {
    const match = banner.link.match(/categoryId=(\d+)/);
    if (match) {
      const category = categories.find((item) => String(item.id) === match[1]);
      if (category) {
        return `/collections/${category.slug}`;
      }
    }
    return "/collections";
  }

  if (banner.link.startsWith("http") || banner.link.startsWith("/")) {
    return banner.link;
  }

  return "/collections";
}

export default async function HomePage() {
  const home = await getHomePage();
  const categories = home.categories || [];
  const banners = home.banners || [];

  const slides = banners.map((banner, index) => ({
    ...banner,
    href: resolveBannerHref(banner, categories, index),
    sideTitle: categories[index]?.name || "New Collection",
    sideDescription: categories[index]?.description || "以视频画面衔接系列入口，形成沉浸式翻页式首页。"
  }));

  return (
    <HomeHeroReel slides={slides} categories={categories} />
  );
}
