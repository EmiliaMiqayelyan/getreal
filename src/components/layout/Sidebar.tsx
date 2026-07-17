"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

import {
  BoxIcon,
  CartIcon,
  DashboardIcon,
  InventoryIcon,
  RolesIcon,
  TruckIcon,
  UsersIcon,
} from "@/components/icons";
import { CountBadge } from "@/components/ui/Badge";
import { APP_NAME } from "@/constants";
import { NAV_SECTIONS, type NavItem } from "@/constants/navigation";
import { cn } from "@/utils/cn";

const ICONS = {
  dashboard: DashboardIcon,
  inventory: InventoryIcon,
  box: BoxIcon,
  cart: CartIcon,
  truck: TruckIcon,
  users: UsersIcon,
  customers: UsersIcon,
  roles: RolesIcon,
} as const;

function SidebarItem({ item, active }: { item: NavItem; active: boolean }) {
  const Icon = ICONS[item.icon];

  return (
    <Link
      href={item.href}
      className={cn(
        "flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] transition-colors",
        active
          ? "bg-[#1C5752] font-medium text-white"
          : "text-[#FFFFFF59] hover:bg-white/5 hover:text-white",
      )}
    >
      <Icon className="size-[17px] shrink-0" />
      <span className="flex-1 truncate">{item.label}</span>
      {item.badge != null ? <CountBadge>{item.badge}</CountBadge> : null}
    </Link>
  );
}

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex h-dvh w-sidebar shrink-0 flex-col bg-sidebar">
      <div className="px-5 pt-6 pb-8">
        <Link href="/dashboard" className="block w-[148px]">
          <Image
            src="/logo.png"
            alt={APP_NAME}
            width={138}
            height={61}
            priority
            className="h-auto w-full"
          />
        </Link>
      </div>

      <nav className="flex-1 space-y-6 overflow-y-auto px-3 pb-6">
        {NAV_SECTIONS.map((section) => (
          <div key={section.title}>
            <p className="mb-2 px-3 text-[12px] font-semibold tracking-[0.12em] text-[#FFFFFF59]">
              {section.title}
            </p>
            <ul className="space-y-0.5">
              {section.items.map((item) => (
                <li key={item.href}>
                  <SidebarItem
                    item={item}
                    active={
                      pathname === item.href ||
                      pathname.startsWith(`${item.href}/`)
                    }
                  />
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>
    </aside>
  );
}
