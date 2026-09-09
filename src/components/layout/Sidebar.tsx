import { Link, useLocation } from "react-router";
import { X } from "lucide-react";

import {
  BellIcon,
  BoxIcon,
  CartIcon,
  DashboardIcon,
  InventoryIcon,
  ItemsIcon,
  PackageIcon,
  PhoneIcon,
  RolesIcon,
  SourceIcon,
  TruckIcon,
  UsersIcon,
} from "@/components/icons";
import { BrandLogo } from "@/components/layout/BrandLogo";
import { CountBadge } from "@/components/ui/Badge";
import { APP_NAME } from "@/constants";
import { getNavSections, getRoleHome, type NavItem } from "@/constants/navigation";
import { getRole } from "@/lib/auth";
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
  source: SourceIcon,
  items: ItemsIcon,
  phone: PhoneIcon,
  package: PackageIcon,
  bell: BellIcon,
} as const;

function SidebarItem({
  item,
  active,
  onNavigate,
}: {
  item: NavItem;
  active: boolean;
  onNavigate?: () => void;
}) {
  const Icon = ICONS[item.icon];

  return (
    <Link
      to={item.href}
      onClick={onNavigate}
      className={cn(
        "flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] transition-colors",
        active
          ? "bg-[#28402B] font-medium text-white"
          : "text-white/35 hover:bg-white/5 hover:text-white",
      )}
    >
      <Icon className="size-[17px] shrink-0" />
      <span className="flex-1 truncate">{item.label}</span>
      {item.badge != null ? <CountBadge>{item.badge}</CountBadge> : null}
    </Link>
  );
}

type SidebarProps = {
  open?: boolean;
  onClose?: () => void;
};

export function Sidebar({ open = false, onClose }: SidebarProps) {
  const { pathname } = useLocation();
  const role = getRole();
  const sections = getNavSections(role);
  const home = getRoleHome(role);

  return (
    <aside
      className={cn(
        "flex h-full w-sidebar shrink-0 flex-col self-stretch bg-sidebar",
        "fixed inset-y-0 left-0 z-50 transition-transform duration-200 ease-out lg:static lg:translate-x-0",
        open ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
      )}
    >
      <div className="flex items-start justify-between px-5 pt-6 pb-8">
        <Link
          to={home}
          onClick={onClose}
          className="block w-[120px]"
          aria-label={APP_NAME}
        >
          <BrandLogo variant="whiteColor" width={120} maxHeight={72} />
        </Link>
        <button
          type="button"
          aria-label="Close menu"
          onClick={onClose}
          className="inline-flex size-8 items-center justify-center rounded-lg text-white/50 transition-colors hover:bg-white/10 hover:text-white lg:hidden"
        >
          <X size={18} />
        </button>
      </div>

      <nav className="flex-1 space-y-6 overflow-y-auto px-3 pb-6">
        {sections.map((section) => (
          <div key={section.title}>
            <p className="mb-2 px-3 text-[11px] font-semibold tracking-[0.14em] text-white/35">
              {section.title}
            </p>
            <ul className="space-y-0.5">
              {section.items.map((item) => (
                <li key={item.href}>
                  <SidebarItem
                    item={item}
                    onNavigate={onClose}
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
