"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Star, Clock, LayoutGrid } from "lucide-react";
import { cn } from "@/lib/utils";

const items = [
  { href: "/", label: "Home", icon: Home, color: "#E8607A" },
  { href: "/#favorites", label: "Favorites", icon: Star, color: "#F59E0B" },
  { href: "/#recent", label: "Recent", icon: Clock, color: "#737373" },
  { href: "/#organize", label: "Tools", icon: LayoutGrid, color: "#2563EB" },
];

export function MobileNav() {
  const pathname = usePathname();
  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border flex safe-bottom shadow-2xl">
      {items.map((item) => {
        const Icon = item.icon;
        const isActive = item.href === "/" && pathname === "/";
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex-1 flex flex-col items-center justify-center py-2.5 gap-1 text-[10px] font-semibold transition-colors",
              isActive ? "text-primary" : "text-muted-foreground"
            )}
          >
            <div className={cn(
              "w-8 h-8 rounded-xl flex items-center justify-center transition-all duration-200",
              isActive ? "bg-primary/10" : "bg-transparent"
            )}>
              <Icon
                className="w-[18px] h-[18px]"
                style={{ color: isActive ? item.color : "currentColor" }}
              />
            </div>
            <span style={{ color: isActive ? item.color : "currentColor" }}>
              {item.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
