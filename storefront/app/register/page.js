import { SectionTitle } from "@/components/SectionTitle";

export const metadata = {
  title: "Register",
  description: "独立站注册页，使用新的网页端注册接口。"
};

export default function RegisterPage() {
  return (
    <section className="page-section">
      <SectionTitle
        eyebrow="Register"
        title="新用户注册"
        description="注册页建议配合首单优惠与 Newsletter 订阅提示，提高获客转化。"
      />
      <div className="account-card">
        <form className="auth-form">
          <input type="email" placeholder="邮箱" />
          <input type="text" placeholder="昵称 / 用户名" />
          <input type="password" placeholder="密码" />
          <button type="submit">创建账号</button>
        </form>
      </div>
    </section>
  );
}
