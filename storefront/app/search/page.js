import { ProductCard } from "@/components/ProductCard";
import { SectionTitle } from "@/components/SectionTitle";
import { getListing, getSearchSuggestions } from "@/lib/api";

export const metadata = {
  title: "Search",
  description: "搜索商品、系列和分类，承接站内导航与 SEO 长尾流量。"
};

export default async function SearchPage({ searchParams }) {
  const keyword = searchParams.q || "";
  const [listing, suggestions] = await Promise.all([
    getListing({ keyword, pageSize: 12 }),
    keyword ? getSearchSuggestions(keyword) : Promise.resolve([])
  ]);

  return (
    <section className="page-section">
      <SectionTitle
        eyebrow="Search"
        title="搜索与快速发现"
        description="服装独立站建议同时提供关键词搜索、类目联想和专题内容入口。"
      />
      <div className="search-bar">
        <form>
          <input name="q" defaultValue={keyword} placeholder="搜索商品、系列或风格关键词" />
          <button className="button-primary" type="submit">
            搜索
          </button>
        </form>
        {suggestions.length ? (
          <div className="inline-list" style={{ marginTop: 16 }}>
            {suggestions.map((item) => (
              <a key={item.value} href={`/search?q=${encodeURIComponent(item.label)}`} className="tag">
                {item.label}
              </a>
            ))}
          </div>
        ) : null}
      </div>
      <div className="content-section compact-section">
        <div className="quick-chip-row">
          <a href="/search?q=%E7%BE%BD%E7%BB%92%E6%9C%8D" className="quick-chip">羽绒服</a>
          <a href="/search?q=%E8%A5%BF%E8%A3%85" className="quick-chip">西装</a>
          <a href="/search?q=%E6%AF%9B%E8%A1%A3" className="quick-chip">毛衣</a>
          <a href="/search?q=%E7%A3%A8%E6%AF%9B" className="quick-chip">秋冬保暖</a>
        </div>
      </div>
      <div className="content-section">
        <div className="product-grid">
          {listing.products.map((product) => (
            <ProductCard key={product.code} product={product} />
          ))}
        </div>
      </div>
    </section>
  );
}
