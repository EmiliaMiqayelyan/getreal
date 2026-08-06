import { Link, useLocation, useNavigate } from "react-router";
import { LogOut } from "lucide-react";

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
import { APP_NAME, ROUTES } from "@/constants";
import { getNavSections, getRoleHome, type NavItem } from "@/constants/navigation";
import { getRole, logout } from "@/lib/auth";
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
      to={item.href}
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

export function Sidebar() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const role = getRole();
  const sections = getNavSections(role);
  const home = getRoleHome(role);

  function handleLogout() {
    logout();
    navigate(ROUTES.login, { replace: true });
  }

  return (
    <aside className="flex h-full w-sidebar shrink-0 flex-col self-stretch bg-sidebar">
      <div className="px-5 pt-6 pb-8">
        <Link to={home} className="block w-[148px]">
          <img
            src="/logo.png"
            alt={APP_NAME}
            width={125}
            height={45}
            className="h-auto w-full"
          />
        </Link>
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

      <div className="border-t border-white/10 px-3 py-4">
        <button
          type="button"
          onClick={handleLogout}
          className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] text-white/35 transition-colors hover:bg-white/5 hover:text-white"
        >
          <LogOut className="size-[17px] shrink-0" />
          <span>Log out</span>
        </button>
      </div>
    </aside>
  );
}
