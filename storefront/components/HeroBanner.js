import Link from "next/link";

export function HeroBanner({ banner }) {
  return (
    <section className="hero-banner">
      <div className="hero-copy">
        <div className="hero-floating-tag">Spring Summer 2026</div>
        <div className="hero-editorial-line">
          <span className="hero-editorial-index">Issue 01</span>
          <span className="hero-editorial-rule" />
          <span className="hero-editorial-city">Shanghai / Studio</span>
        </div>
        <p className="eyebrow">{banner?.brand_name || "NBBB Atelier"}</p>
        <h1>{banner?.title || "为日常衣橱打造更轻盈的高级感。"}</h1>
        <p>
          {banner?.subtitle ||
            "用现有商品、分类与首页配置能力，快速搭建一个面向品牌表达与转化的服装独立站。"}
        </p>
        <div className="hero-note-row">
          <span className="hero-note">轻奢廓形</span>
          <span className="hero-note">限时系列</span>
          <span className="hero-note">可叠搭衣橱</span>
        </div>
        <div className="hero-actions">
          <Link href={banner?.link || "/collections"} className="button-primary">
            {banner?.button_text || "Shop New Arrivals"}
          </Link>
          <Link href="/lookbook" className="button-secondary">
            Explore Lookbook
          </Link>
        </div>
        <div className="hero-metrics">
          <div>
            <strong>90+</strong>
            <span>精选款式</span>
          </div>
          <div>
            <strong>24h</strong>
            <span>热销上新节奏</span>
          </div>
          <div>
            <strong>Editorial</strong>
            <span>品牌穿搭叙事</span>
          </div>
        </div>
      </div>
      <div className="hero-media">
        <div className="hero-wordmark">NBBB</div>
        <div className="hero-orb hero-orb-left" />
        <div className="hero-orb hero-orb-right" />
        {banner?.image ? <img src={banner.image} alt={banner.title || "NBBB banner"} /> : <div className="hero-fallback" />}
        <div className="hero-media-card hero-media-card-top">
          <span className="eyebrow">Runway note</span>
          <strong>Structured softness</strong>
        </div>
        <div className="hero-media-card hero-media-card-bottom">
          <span className="eyebrow">Styling direction</span>
          <strong>Layered tailoring and warm neutrals</strong>
        </div>
      </div>
    </section>
  );
}
