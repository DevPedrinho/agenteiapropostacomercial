"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/orcamento", label: "Montador de setup" },
  { href: "/", label: "Ficha de produto" },
];

export default function SiteNav() {
  const pathname = usePathname();
  return (
    <nav className="site-nav" aria-label="Ferramentas">
      <span className="site-brand">
        <span className="site-mark">U</span> Upar Vendas
      </span>
      {LINKS.map((l) => (
        <Link key={l.href} href={l.href} className={pathname === l.href ? "active" : ""}>
          {l.label}
        </Link>
      ))}
    </nav>
  );
}
