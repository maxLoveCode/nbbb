import { SectionTitle } from "@/components/SectionTitle";

export const metadata = {
  title: "Help Center",
  description: "帮助中心页，用于承接 FAQ、配送、退换货和尺码说明。"
};

export default function HelpPage() {
  return (
    <section className="page-section">
      <SectionTitle
        eyebrow="Help"
        title="帮助中心"
        description="服装独立站建议把配送、退换货、尺码和洗护说明做成可索引页面。"
      />
      <div className="grid-two">
        <article className="feature-card">
          <h3>尺码助手</h3>
          <p>结合面料弹性、版型与模特信息，减少尺码不确定带来的流失。</p>
        </article>
        <article className="feature-card">
          <h3>售后政策</h3>
          <p>清晰的退换货承诺有助于服装品类降低决策门槛。</p>
        </article>
      </div>
    </section>
  );
}
