import Link from "next/link";

import { compactText, formatPrice } from "@/lib/format";

export function ProductCard({ product }) {
  return (
    <article className="product-card">
      <Link href={`/products/${product.code}`} className="product-media">
        <div className="product-card-badge">{product.inStock ? "New Season" : "Limited"}</div>
        {product.mainImage ? (
          <img src={product.mainImage} alt={product.name} />
        ) : (
          <div className="product-placeholder">NBBB</div>
        )}
        <div className="product-card-overlay">
          <span>View story</span>
        </div>
      </Link>
      <div className="product-meta">
        <p className="product-category">{product.category || "Wardrobe Staple"}</p>
        <Link href={`/products/${product.code}`} className="product-name">
          {product.name}
        </Link>
        <p className="product-description">{compactText(product.description || product.seo?.description || "", 72)}</p>
        <div className="product-price-row">
          <span>{formatPrice(product.price)}</span>
          {product.originalPrice ? <s>{formatPrice(product.originalPrice)}</s> : null}
        </div>
        <div className="product-meta-footer">
          <span className="product-meta-line">{product.brand || "NBBB Atelier"}</span>
          <span className="product-meta-line">Discover</span>
        </div>
      </div>
    </article>
  );
}
