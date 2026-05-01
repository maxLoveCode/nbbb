import { SectionTitle } from "@/components/SectionTitle";

export const metadata = {
  title: "Contact",
  description: "联系品牌、客户支持与商务合作。"
};

export default function ContactPage() {
  return (
    <section className="page-section">
      <SectionTitle
        eyebrow="Contact"
        title="联系我们"
        description="建议后续接入表单、邮件订阅和社媒入口，承接售后与商务咨询。"
      />
      <div className="account-card">
        <p>邮箱：brand@example.com</p>
        <p>工作时间：周一至周五 10:00 - 18:00</p>
      </div>
    </section>
  );
}
