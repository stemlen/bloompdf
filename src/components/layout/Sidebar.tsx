"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useState } from "react";
import type { LucideIcon } from "lucide-react";
import {
  ChevronLeft,
  ChevronRight,
  LayoutGrid,
  PackageMinus,
  Image as ImageIcon,
  ArrowRightLeft,
  PenLine,
  Shield,
  Brain,
  Star,
  Clock,
  Home,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { categories } from "@/lib/categories";

const categoryIcons: Record<string, LucideIcon> = {
  organize: LayoutGrid,
  optimize: PackageMinus,
  "convert-to": ImageIcon,
  "convert-from": ArrowRightLeft,
  edit: PenLine,
  security: Shield,
  intelligence: Brain,
};

const navItems: { href: string; label: string; icon: LucideIcon }[] = [
  { href: "/", label: "All Tools", icon: Home },
  { href: "/#favorites", label: "Favorites", icon: Star },
  { href: "/#recent", label: "Recent", icon: Clock },
];

export function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={cn(
        "hidden md:flex flex-col h-full bg-card border-r border-border sidebar-transition flex-shrink-0 relative z-10",
        collapsed ? "w-[64px]" : "w-[232px]"
      )}
    >
      {/* ── Logo ─────────────────────────────────────────── */}
      <div
        className={cn(
          "flex items-center h-[60px] px-4 border-b border-border flex-shrink-0",
          collapsed && "justify-center px-0"
        )}
      >
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 overflow-hidden bg-[#FFF0F3] border border-[#FFE0E8] group-hover:border-[#FFC5D3] transition-all shadow-sm">
            <Image src="/bloompdf-logo.png" alt="BloomPDF" width={28} height={28} className="object-contain" />
          </div>
          {!collapsed && (
            <div>
              <span className="font-bold text-[15px] text-foreground tracking-tight leading-none">
                BloomPDF
              </span>
              <span className="block text-[10px] text-muted-foreground font-medium leading-none mt-0.5">
                PDF Workspace
              </span>
            </div>
          )}
        </Link>
      </div>

      {/* ── Nav ──────────────────────────────────────────── */}
      <nav className="flex-1 overflow-y-auto py-3 px-2.5 space-y-0.5">
        {/* Quick links */}
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = item.href === "/" && pathname === "/";
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-[13px] font-medium transition-all duration-150",
                isActive
                  ? "bg-[#FFF0F3] text-[#E8607A]"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted",
                collapsed && "justify-center px-2"
              )}
              title={collapsed ? item.label : undefined}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          );
        })}

        {/* Divider */}
        <div className="my-3 border-t border-border" />

        {/* Categories label */}
        {!collapsed && (
          <p className="px-2.5 pb-1.5 text-[10.5px] font-bold uppercase tracking-widest text-muted-foreground">
            Categories
          </p>
        )}

        {/* Category links */}
        {categories.map((cat) => {
          const Icon = categoryIcons[cat.id] ?? LayoutGrid;
          const isActive = pathname.includes(`/${cat.id}`);
          return (
            <Link
              key={cat.id}
              href={`/#${cat.id}`}
              className={cn(
                "flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-[13px] transition-all duration-150",
                isActive
                  ? "font-semibold"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted",
                collapsed && "justify-center px-2"
              )}
              style={isActive ? { backgroundColor: cat.lightBg, color: cat.color } : {}}
              title={collapsed ? cat.label : undefined}
            >
              {/* Color dot */}
              <div className="relative flex-shrink-0">
                <Icon
                  className="w-4 h-4"
                  style={{ color: isActive ? cat.color : undefined }}
                />
                {!isActive && !collapsed && (
                  <span
                    className="absolute -bottom-0.5 -right-0.5 w-1.5 h-1.5 rounded-full"
                    style={{ backgroundColor: cat.color }}
                  />
                )}
              </div>
              {!collapsed && (
                <span className="truncate text-[13px]">{cat.label}</span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* ── Footer ───────────────────────────────────────── */}
      {!collapsed && (
        <div className="px-4 py-3.5 border-t border-border">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            <p className="text-[11px] font-medium text-muted-foreground">All tools free</p>
          </div>
          <p className="text-[10.5px] text-muted-foreground">No sign-up • No watermarks</p>
        </div>
      )}

      {/* ── Collapse toggle ───────────────────────────────── */}
      <button
        onClick={() => setCollapsed((c) => !c)}
        className="absolute -right-3.5 top-[68px] w-7 h-7 bg-card border border-border rounded-full flex items-center justify-center shadow-sm hover:bg-muted transition-colors z-20"
        aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
      >
        {collapsed ? (
          <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
        ) : (
          <ChevronLeft className="w-3.5 h-3.5 text-muted-foreground" />
        )}
      </button>
    </aside>
  );
}
