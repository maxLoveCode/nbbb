import Link from "next/link";

import { SectionTitle } from "@/components/SectionTitle";

export const metadata = {
  title: "Lookbook",
  description: "通过穿搭内容页承接 SEO 与社媒流量，强化品牌感。"
};

export default function LookbookPage() {
  return (
    <section className="page-section">
      <SectionTitle
        eyebrow="Lookbook"
        title="穿搭灵感"
        description="Lookbook 页建议由 CMS 驱动，未来可扩展为博客、系列专题和内容营销中心。"
      />
      <div className="story-grid">
        <Link href="/campaign/spring-atelier" className="story-card">
          <p className="eyebrow">Series 01</p>
          <h3>Spring Atelier</h3>
          <p>适合搭配西装、半裙和轻薄针织的编辑型专题。</p>
        </Link>
        <article className="story-card">
          <p className="eyebrow">Series 02</p>
          <h3>Weekend Soft Tailoring</h3>
          <p>面向轻通勤和都市休闲场景，适合品牌站做场景化陈列。</p>
        </article>
        <article className="story-card">
          <p className="eyebrow">Series 03</p>
          <h3>Capsule Wardrobe</h3>
          <p>把高复购单品组织成套装逻辑，提升连带购买率。</p>
        </article>
      </div>
    </section>
  );
}
