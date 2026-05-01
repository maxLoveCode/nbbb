import Link from "next/link";

import { SectionTitle } from "@/components/SectionTitle";

export const metadata = {
  title: "Cart",
  description: "购物车页突出商品快照、库存校验和结算入口。"
};

export default function CartPage() {
  return (
    <section className="page-section">
      <SectionTitle
        eyebrow="Cart"
        title="购物车"
        description="后端已复用现有购物车控制器，并在 `/api/web/cart` 下提供统一入口。"
      />
      <div className="columns-two">
        <article className="account-card">
          <h3>已接入能力</h3>
          <div className="meta-list">
            <span>购物车快照</span>
            <span>库存校验</span>
            <span>删除 / 清空</span>
            <span>下单衔接</span>
          </div>
        </article>
        <article className="account-card">
          <h3>转化建议</h3>
          <p>这里适合加入免邮门槛提示、搭配购、加价购和弃单召回埋点。</p>
          <Link href="/checkout" className="button-primary">
            前往结算
          </Link>
        </article>
      </div>
    </section>
  );
}
