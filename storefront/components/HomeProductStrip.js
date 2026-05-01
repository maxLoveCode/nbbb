import Link from "next/link";

import { formatPrice } from "@/lib/format";

export function HomeProductStrip({ products = [] }) {
  if (!products.length) return null;

  return (
    <section className="home-product-strip">
      <div className="home-product-strip-grid">
        {products.slice(0, 5).map((product) => {
          const hoverImage = product.images?.find((image) => image && image !== product.mainImage);

          return (
            <article key={product.code} className="home-product-card">
              <Link href={`/products/${product.code}`} className="home-product-media">
                {product.mainImage ? (
                  <img className="home-product-image is-primary" src={product.mainImage} alt={product.name} />
                ) : (
                  <div className="product-placeholder">NBBB</div>
                )}
                {hoverImage ? (
                  <img className="home-product-image is-hover" src={hoverImage} alt={product.name} />
                ) : null}
              </Link>
              <div className="home-product-meta">
                <Link href={`/products/${product.code}`} className="home-product-name">
                  {product.name}
                </Link>
                <p>{formatPrice(product.price)}</p>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
