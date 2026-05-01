"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

const navItems = [
  { href: "/collections", label: "Collections" },
  { href: "/lookbook", label: "Lookbook" },
  { href: "/brand", label: "Brand" },
  { href: "/search", label: "Search" },
  { href: "/cart", label: "Cart" }
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
              <Link key={item.href} href={item.href} onClick={handleClose}>
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="nav-actions">
            <Link href="/login" onClick={handleClose}>Sign in</Link>
            <Link href="/account" onClick={handleClose}>Account</Link>
          </div>
        </div>
      </div>
    </header>
  );
}
