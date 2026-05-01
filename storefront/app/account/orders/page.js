import { SectionTitle } from "@/components/SectionTitle";

export const metadata = {
  title: "My Orders",
  description: "订单列表与详情入口页。"
};

export default function AccountOrdersPage() {
  return (
    <section className="page-section">
      <SectionTitle
        eyebrow="Orders"
        title="我的订单"
        description="订单接口已挂到 `/api/web/orders`，适合继续补分页、筛选和支付状态展示。"
      />
      <div className="account-card">
        <p>建议后续加入订单时间线、售后入口和再次购买组件。</p>
      </div>
    </section>
  );
}
