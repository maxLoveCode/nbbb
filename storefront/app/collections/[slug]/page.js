import { ProductCard } from "@/components/ProductCard";
import { SectionTitle } from "@/components/SectionTitle";
import { getCategories, getListing } from "@/lib/api";
import { createSeoDescription } from "@/lib/format";

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const categories = await getCategories();
  const category = categories.find((item) => item.slug === slug);

  return {
    title: category ? `${category.name} Collection` : "Collection",
    description: createSeoDescription([
      category?.description,
      "服装分类页",
      "支持 SEO 与移动端转化"
    ])
  };
}

export default async function CollectionDetailPage({ params, searchParams }) {
  const { slug } = await params;
  const query = await searchParams;
  const categories = await getCategories();
  const category = categories.find((item) => item.slug === slug);
  const activeSort = query.sort || "featured";
  const data = await getListing({
    category: category?.name || "",
    sort: activeSort,
    page: query.page || 1
  });

  return (
    <section className="page-section">
      <SectionTitle
        eyebrow="Collection"
        title={category?.name || "Curated selection"}
        description={
          category?.description ||
          "这个页面承接自然搜索与活动投放流量，突出服装品类、价格筛选和快速浏览体验。"
        }
      />

      <div className="mobile-toolbar">
        <div className="quick-chip-row">
          <a href={`?sort=featured`} className={`quick-chip ${activeSort === "featured" ? "is-active" : ""}`}>精选</a>
          <a href={`?sort=latest`} className={`quick-chip ${activeSort === "latest" ? "is-active" : ""}`}>上新</a>
          <a href={`?sort=price-asc`} className={`quick-chip ${activeSort === "price-asc" ? "is-active" : ""}`}>价格升序</a>
          <a href={`?sort=price-desc`} className={`quick-chip ${activeSort === "price-desc" ? "is-active" : ""}`}>价格降序</a>
          <a href={`?sort=${activeSort}&inStock=true`} className="quick-chip">仅看现货</a>
        </div>
        <p className="mobile-toolbar-note">共 {data.pagination?.total || data.products.length} 件，适合手机端快速切换筛选。</p>
      </div>

      <div className="filter-grid">
        <aside className="filter-card">
          <p className="eyebrow">Filters</p>
          <div className="meta-list">
            <span>价格区间</span>
            <span>颜色</span>
            <span>尺码</span>
            <span>上新优先</span>
          </div>
          <p className="page-lead">
            当前 BFF 已提供 `sort`、`price`、`inStock` 过滤入口，后续可继续补颜色/尺码 facet。
          </p>
        </aside>

        <div className="product-grid">
          {data.products.map((product) => (
            <ProductCard key={product.code} product={product} />
          ))}
        </div>
      </div>
    </section>
  );
}
