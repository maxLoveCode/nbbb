import Link from "next/link";

import { SectionTitle } from "@/components/SectionTitle";

export const metadata = {
  title: "Account",
  description: "个人中心页，承接订单、收藏、地址和营销权益。"
};

export default function AccountPage() {
  return (
    <section className="page-section">
      <SectionTitle
        eyebrow="Account"
        title="个人中心"
        description="独立站个人中心建议聚合订单、收藏、地址、优惠券与品牌服务。"
      />
      <div className="grid-three">
        <Link href="/account/orders" className="feature-card">
          <h3>我的订单</h3>
          <p>查询订单状态、支付结果与物流进度。</p>
        </Link>
        <article className="feature-card">
          <h3>收藏夹</h3>
          <p>后端已收口 `/api/web/favorites`，可继续补前端交互。</p>
        </article>
        <article className="feature-card">
          <h3>收货地址</h3>
          <p>后端已收口 `/api/web/addresses`，可直接接表单与默认地址逻辑。</p>
        </article>
      </div>
    </section>
  );
}
