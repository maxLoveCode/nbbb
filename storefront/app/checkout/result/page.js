import { SectionTitle } from "@/components/SectionTitle";

export const metadata = {
  title: "Payment Result",
  description: "支付结果页用于承接支付回跳与订单状态查询。"
};

export default function CheckoutResultPage() {
  return (
    <section className="page-section">
      <SectionTitle
        eyebrow="Result"
        title="支付结果页"
        description="可根据订单状态展示支付成功、失败、待确认，并引导继续浏览或查看订单详情。"
      />
      <div className="account-card">
        <p>推荐在这里加入订单摘要、物流预期、会员拉新和二次推荐商品模块。</p>
      </div>
    </section>
  );
}
