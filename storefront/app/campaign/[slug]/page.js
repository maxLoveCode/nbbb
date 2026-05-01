import { SectionTitle } from "@/components/SectionTitle";

export async function generateMetadata({ params }) {
  return {
    title: `${params.slug} Campaign`,
    description: "活动专题页适合承接广告投放、限时活动和系列叙事。"
  };
}

export default function CampaignPage({ params }) {
  return (
    <section className="page-section">
      <SectionTitle
        eyebrow="Campaign"
        title={params.slug.replace(/-/g, " ")}
        description="活动专题页建议后续接入 CMS，支持 Banner、系列商品、倒计时和品牌叙事模块。"
      />
      <div className="grid-two">
        <article className="feature-card">
          <h3>限时活动</h3>
          <p>支持首单券、满减、包邮门槛和搭配购组件，适合服装大促与上新场景。</p>
        </article>
        <article className="feature-card">
          <h3>系列故事</h3>
          <p>把一个系列拆成视觉、文案和商品卡的组合，提升品牌调性与转化效率。</p>
        </article>
      </div>
    </section>
  );
}
