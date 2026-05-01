import Link from "next/link";

import { SectionTitle } from "@/components/SectionTitle";

export const metadata = {
  title: "Checkout",
  description: "结算页衔接地址、订单创建与支付。"
};

export default function CheckoutPage() {
  return (
    <section className="page-section">
      <SectionTitle
        eyebrow="Checkout"
        title="结算页"
        description="当前已预留 `/api/web/orders` 与 `/api/web/payment` 收口，后续可对接真实地址与支付流程。"
      />
      <div className="grid-two">
        <article className="account-card">
          <h3>订单信息</h3>
          <p>结算页需整合地址、配送、优惠券、备注和订单确认信息。</p>
        </article>
        <article className="account-card">
          <h3>支付能力</h3>
          <p>现有项目以微信体系为主，独立站建议继续扩展 H5/PC 支付方式。</p>
          <Link href="/checkout/result" className="button-secondary">
            查看支付结果页
          </Link>
        </article>
      </div>
    </section>
  );
}
