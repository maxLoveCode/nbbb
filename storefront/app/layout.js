import "./globals.css";

import { MobileTabBar } from "@/components/MobileTabBar";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";

export const metadata = {
  title: {
    default: "NBBB Atelier",
    template: "%s | NBBB Atelier"
  },
  description: "面向服装品牌的独立站前台，支持分类、商品、内容与 SEO。",
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3001")
};

export default function RootLayout({ children }) {
  return (
    <html lang="zh-CN">
      <body>
        <SiteHeader />
        <main className="page-shell">{children}</main>
        <SiteFooter />
        <MobileTabBar />
      </body>
    </html>
  );
}
