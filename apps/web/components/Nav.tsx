"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cx } from "@/lib/sketch";

const DOCS_URL = process.env.NEXT_PUBLIC_DOCS_URL ?? "https://mandate-docs.vercel.app";

const LINKS = [
  { href: "/chat", label: "Chat" },
  { href: "/mandate", label: "Mandate" },
  { href: "/activity", label: "Activity" },
  { href: DOCS_URL, label: "Docs", external: true },
];

export function Nav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Primary" className="flex gap-5 md:gap-7">
      {LINKS.map(({ href, label, external }) => {
        const active = !external && (pathname === href || pathname.startsWith(href + "/"));
        return (
          <Link
            key={href}
            href={href}
            target={external ? "_blank" : undefined}
            rel={external ? "noopener noreferrer" : undefined}
            aria-current={active ? "page" : undefined}
            className={cx(
              "font-body text-lg px-1 decoration-2 underline-offset-6 transition-colors",
              "hover:text-ink hover:underline hover:decoration-wavy hover:decoration-ink",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/40 wobbly-sm",
              active && "font-bold underline decoration-wavy decoration-accent decoration-[3px]",
            )}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
