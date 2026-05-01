import Link from "next/link";

import { ProductCard } from "@/components/ProductCard";
import { SectionTitle } from "@/components/SectionTitle";
import { getListing, getProduct } from "@/lib/api";
import { createSeoDescription, formatPrice } from "@/lib/format";

export async function generateMetadata({ params }) {
  const { code } = await params;
  const product = await getProduct(code);

  return {
    title: product.name,
    description: createSeoDescription([
      product.brand,
      product.category,
      product.description?.slice(0, 120)
    ])
  };
}

export default async function ProductDetailPage({ params }) {
  const { code } = await params;
  const product = await getProduct(code);
  const related = await getListing({
    category: product.category || "",
    pageSize: 4
  });

  return (
    <section className="page-section">
      <div className="detail-grid">
        <div className="detail-gallery">
          <div className="detail-gallery-main">
            {product.mainImage ? <img src={product.mainImage} alt={product.name} /> : <div className="product-placeholder">NBBB</div>}
          </div>
          <div className="detail-gallery-grid">
            {(product.images?.length ? product.images : [product.mainImage, product.mainImage, product.mainImage]).slice(0, 3).map((image, index) => (
              <div key={`${image}-${index}`}>
                {image ? <img src={image} alt={`${product.name}-${index + 1}`} /> : <div className="product-placeholder">NBBB</div>}
              </div>
            ))}
          </div>
        </div>

        <aside className="detail-sidebar">
          <div className="detail-copy">
            <p className="eyebrow">{product.brand || "NBBB Atelier"}</p>
            <h1>{product.name}</h1>
            <div className="detail-price">{formatPrice(product.price)}</div>
            <div className="detail-meta">
              <span className="tag">{product.category || "Ready to wear"}</span>
              <span className="tag">{product.inStock ? "现货可购" : "补货中"}</span>
              {product.discount ? <span className="tag">立省 {product.discount}%</span> : null}
            </div>
            <p>{product.description || "商品详情将继续补充面料说明、版型建议、洗护信息和尺码建议。"}</p>

            <div className="detail-block">
              <h3>颜色 / 尺码</h3>
              <div className="inline-list">
                {(product.sku || []).slice(0, 6).map((item) => (
                  <span key={item.skuId}>{item.properties || "默认规格"}</span>
                ))}
              </div>
            </div>

            <div className="detail-actions">
              <Link href="/cart" className="button-primary">
                加入购物车
              </Link>
              <Link href="/checkout" className="button-secondary">
                立即购买
              </Link>
            </div>

            <div className="detail-block">
              <h3>为什么适合服装独立站</h3>
              <p>详情页突出媒体、SKU、库存、价格、FAQ 和搭配推荐，是转化率最高的页面。</p>
            </div>
          </div>
        </aside>
      </div>

      <div className="mobile-detail-bar">
        <div className="mobile-detail-bar-copy">
          <p className="eyebrow">Ready to buy</p>
          <strong>{formatPrice(product.price)}</strong>
        </div>
        <div className="mobile-detail-bar-actions">
          <Link href="/cart" className="button-secondary">
            加购
          </Link>
          <Link href="/checkout" className="button-primary">
            立即购买
          </Link>
        </div>
      </div>

      <section className="content-section">
        <SectionTitle
          eyebrow="Style with"
          title="搭配推荐"
          description="服装详情页需要通过同类目或同系列商品拉高连带购买率。"
        />
        <div className="product-grid">
          {related.products
            .filter((item) => item.code !== product.code)
            .slice(0, 4)
            .map((item) => (
              <ProductCard key={item.code} product={item} />
            ))}
        </div>
      </section>
    </section>
  );
}
