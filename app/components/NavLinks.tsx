"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/crypto", label: "Crypto" },
];

export default function NavLinks() {
  const pathname = usePathname();
  return (
    <nav className="flex items-center gap-1">
      {LINKS.map(({ href, label }) => {
        const active = pathname === href;
        return (
          <Link
            key={href}
            href={href}
            className={`px-3 py-1.5 text-sm rounded transition-colors ${
              active
                ? "text-white bg-zinc-800"
                : "text-zinc-400 hover:text-white hover:bg-zinc-800/60"
            }`}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
