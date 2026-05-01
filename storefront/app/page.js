import { HomeHeroReel } from "@/components/HomeHeroReel";
import { HomeProductStrip } from "@/components/HomeProductStrip";
import { HomeSplitFeature } from "@/components/HomeSplitFeature";
import { getHomePage, getListing } from "@/lib/api";

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
  const [home, listing] = await Promise.all([
    getHomePage(),
    getListing({ pageSize: 7 })
  ]);
  const categories = home.categories || [];
  const banners = home.banners || [];
  const products = listing.products || [];

  const slides = banners.map((banner, index) => ({
    ...banner,
    href: resolveBannerHref(banner, categories, index),
    sideTitle: categories[index]?.name || "New Collection",
    sideDescription: categories[index]?.description || "以视频画面衔接系列入口，形成沉浸式翻页式首页。"
  }));
  const featureProducts = products.slice(5, 7).length === 2 ? products.slice(5, 7) : products.slice(0, 2);
  const featurePanels = [
    {
      title: "潮流款",
      buttonText: "潮流款",
      href: "/collections/博主甄选",
      image: featureProducts[0]?.mainImage
    },
    {
      title: "主推款",
      buttonText: "主推款",
      href: "/collections/人宠同款",
      image: featureProducts[1]?.mainImage
    }
  ];

  return (
    <>
      <HomeHeroReel slides={slides} categories={categories} />
      <HomeProductStrip products={products} />
      <HomeSplitFeature panels={featurePanels} />
    </>
  );
}
