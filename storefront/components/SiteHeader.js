"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

const navItems = [
  {
    href: "/collections/女款上装",
    label: "Women",
    children: [
      { href: "/collections/女款上装", label: "女款上装" },
      { href: "/collections/女款下装", label: "女款下装" },
      { href: "/collections/女款裙子", label: "女款裙子" },
      { href: "/collections/裙装", label: "裙装" },
      { href: "/collections/毛衣针织", label: "毛衣针织" }
    ]
  },
  {
    href: "/collections/男款上装",
    label: "Men",
    children: [
      { href: "/collections/男款上装", label: "男款上装" },
      { href: "/collections/男款下装", label: "男款下装" },
      { href: "/collections/T恤", label: "T恤" },
      { href: "/collections/卫衣", label: "卫衣" },
      { href: "/collections/裤子", label: "裤子" }
    ]
  },
  {
    href: "/collections/宠物",
    label: "Pets",
    children: [
      { href: "/collections/宠物", label: "宠物" },
      { href: "/collections/人宠同款", label: "人宠同款" },
      { href: "/collections/宠物服饰及配件", label: "宠物服饰及配件" }
    ]
  },
  {
    href: "/collections/配饰",
    label: "Accessories",
    children: [
      { href: "/collections/帽子", label: "帽子" },
      { href: "/collections/配饰", label: "配饰" },
      { href: "/collections/鞋包-皮带配件", label: "鞋包/皮带配件" }
    ]
  },
  {
    href: "/collections",
    label: "Collections",
    children: [
      { href: "/collections/博主甄选", label: "博主甄选" },
      { href: "/collections/人宠同款", label: "人宠同款" },
      { href: "/lookbook", label: "Lookbook" }
    ]
  }
];

const utilityItems = [
  { href: "/search", label: "Search" },
  { href: "/brand", label: "Brand" },
  { href: "/account", label: "Saved" },
  { href: "/login", label: "Login" },
  { href: "/cart", label: "Bag (0)" }
];

export function SiteHeader() {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();
  const isHome = pathname === "/";

  const handleClose = () => setIsOpen(false);

  return (
    <header className={`site-header ${isHome ? "site-header-home" : ""}`}>
      {!isHome ? <div className="announcement-bar">新客首单 95 折，满 399 元包邮。</div> : null}
      <div className="nav-shell">
        <div className="nav-top-row">
          <Link href="/" className="brand-mark" onClick={handleClose}>
            NBBB Atelier
          </Link>
          <button
            type="button"
            className={`nav-toggle ${isOpen ? "is-open" : ""}`}
            aria-expanded={isOpen}
            aria-label="Toggle navigation"
            onClick={() => setIsOpen((value) => !value)}
          >
            <span />
            <span />
            <span />
          </button>
        </div>
        <div className={`nav-panel ${isOpen ? "is-open" : ""}`}>
          <nav className="nav-links">
            {navItems.map((item) => (
              <div key={item.href} className="nav-item">
                <Link href={item.href} className="nav-link" onClick={handleClose}>
                  {item.label}
                </Link>
                {item.children?.length ? (
                  <div className="nav-dropdown">
                    {item.children.map((child) => (
                      <Link key={child.href} href={child.href} onClick={handleClose}>
                        {child.label}
                      </Link>
                    ))}
                  </div>
                ) : null}
              </div>
            ))}
          </nav>
          <Link href="/" className="brand-mark brand-mark-desktop" onClick={handleClose}>
            NBBB Atelier
          </Link>
          <div className="nav-actions">
            {utilityItems.map((item) => (
              <Link key={item.href} href={item.href} onClick={handleClose}>
                {item.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </header>
  );
}
