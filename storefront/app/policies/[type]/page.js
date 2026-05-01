import { SectionTitle } from "@/components/SectionTitle";

const policyMap = {
  privacy: {
    title: "隐私政策",
    description: "说明用户数据、埋点与营销订阅的使用边界。"
  },
  terms: {
    title: "服务条款",
    description: "说明账号、订单、支付和售后服务条款。"
  },
  returns: {
    title: "售后政策",
    description: "说明服装类目的退换货、签收和洗护须知。"
  }
};

export async function generateMetadata({ params }) {
  const policy = policyMap[params.type] || policyMap.privacy;
  return {
    title: policy.title,
    description: policy.description
  };
}

export default function PolicyPage({ params }) {
  const policy = policyMap[params.type] || policyMap.privacy;

  return (
    <section className="page-section">
      <SectionTitle eyebrow="Policy" title={policy.title} description={policy.description} />
      <article className="policy-card">
        <p>
          这些页面建议与 SEO 一起建设，确保品牌站在自然搜索中拥有完整的信任信息与基础合规页面。
        </p>
      </article>
    </section>
  );
}
