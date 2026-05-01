import { SectionTitle } from "@/components/SectionTitle";

export const metadata = {
  title: "Login",
  description: "独立站登录页，使用新的网页端登录接口。"
};

export default function LoginPage() {
  return (
    <section className="page-section">
      <SectionTitle
        eyebrow="Sign in"
        title="账号登录"
        description="已补齐 `/api/web/auth/login` 与 `/api/web/auth/me`，前端可直接对接邮箱/用户名登录。"
      />
      <div className="account-card">
        <form className="auth-form">
          <input type="text" placeholder="邮箱 / 用户名" />
          <input type="password" placeholder="密码" />
          <button type="submit">登录</button>
        </form>
      </div>
    </section>
  );
}
