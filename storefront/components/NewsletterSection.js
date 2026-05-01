export function NewsletterSection() {
  return (
    <section className="newsletter-card">
      <div className="newsletter-copy">
        <p className="eyebrow">Newsletter</p>
        <h3>加入品牌通讯，获取新品预览与限时活动。</h3>
        <p>接收精选造型、面料故事与上新提醒，让页面从商城更像一本可订阅的时尚刊物。</p>
      </div>
      <form className="newsletter-form">
        <input type="email" placeholder="输入你的邮箱" aria-label="Email" />
        <button type="submit">订阅</button>
      </form>
    </section>
  );
}
