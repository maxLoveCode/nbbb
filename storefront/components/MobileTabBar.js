"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  { href: "/", label: "首页", icon: "Home" },
  { href: "/collections", label: "分类", icon: "Shop" },
  { href: "/search", label: "搜索", icon: "Find" },
  { href: "/cart", label: "购物车", icon: "Cart" },
  { href: "/account", label: "我的", icon: "Me" }
];

export function MobileTabBar() {
  const pathname = usePathname();

  if (pathname === "/") {
    return null;
  }

  return (
    <nav className="mobile-tabbar" aria-label="Mobile navigation">
      {items.map((item) => {
        const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);

        return (
          <Link key={item.href} href={item.href} className={`mobile-tabbar-item ${active ? "is-active" : ""}`}>
            <span className="mobile-tabbar-icon">{item.icon}</span>
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
