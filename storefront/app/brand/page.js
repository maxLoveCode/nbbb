import { SectionTitle } from "@/components/SectionTitle";

export const metadata = {
  title: "Brand",
  description: "品牌故事、面料理念与工艺表达页。"
};

export default function BrandPage() {
  return (
    <section className="page-section">
      <SectionTitle
        eyebrow="Brand story"
        title="品牌故事与工艺表达"
        description="服装独立站需要比通用商城更完整地讲清楚品牌理念、面料、版型与洗护标准。"
      />
      <div className="columns-two">
        <article className="feature-card">
          <h3>品牌定位</h3>
          <p>以简洁、高级、可持续搭配为核心，把每个系列拆成更适合搜索和转化的独立页面。</p>
        </article>
        <article className="feature-card">
          <h3>面料与工艺</h3>
          <p>建议后续把面料说明、洗护建议、模特信息纳入商品扩展字段或 CMS 模块。</p>
        </article>
      </div>
    </section>
  );
}
