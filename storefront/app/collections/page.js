import Link from "next/link";

import { SectionTitle } from "@/components/SectionTitle";
import { getCategories } from "@/lib/api";

export const metadata = {
  title: "Collections",
  description: "浏览服装独立站的分类聚合页，包括新品、热销、专题和品牌系列。"
};

export default async function CollectionsPage() {
  const categories = await getCategories();

  return (
    <section className="page-section">
      <div className="page-hero">
        <SectionTitle
          eyebrow="Collections"
          title="分类聚合页"
          description="支持男装、女装、童装、配饰和活动主题等扩展，同时复用已有分类与上架配置。"
        />
      </div>
      <div className="grid-three">
        {categories.map((category) => (
          <Link key={category.slug} href={`/collections/${category.slug}`} className="feature-card">
            <p className="eyebrow">{category.productCount || 0} items</p>
            <h3>{category.name}</h3>
            <p>{category.description || "适合为服装品类、系列专题和人群分类建立 SEO 落地页。"}</p>
          </Link>
        ))}
      </div>
    </section>
  );
}
