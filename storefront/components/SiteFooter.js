"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function SiteFooter() {
  const pathname = usePathname();

  if (pathname === "/") {
    return null;
  }

  return (
    <footer className="site-footer">
      <div className="footer-brand-block">
        <p className="footer-title">NBBB Atelier</p>
        <p className="footer-copy">
          为服装独立站重做前台体验，突出面料、版型与日常穿搭灵感。
        </p>
        <div className="footer-marquee">
          <span>Editorial Layers</span>
          <span>Quiet Luxury</span>
          <span>Soft Tailoring</span>
        </div>
      </div>
      <div className="footer-links">
        <Link href="/brand">品牌故事</Link>
        <Link href="/help">帮助中心</Link>
        <Link href="/contact">联系我们</Link>
        <Link href="/policies/privacy">隐私政策</Link>
      </div>
    </footer>
  );
}
