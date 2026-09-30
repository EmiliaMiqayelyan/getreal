import { Link, useLocation } from "react-router";
import { X } from "lucide-react";
import { BrandLogo } from "@/components/layout/BrandLogo";
import { CountBadge } from "@/components/ui/Badge";
import { APP_NAME, ROUTES } from "@/constants";
import { getNavSections, getRoleHome, type NavItem } from "@/constants/navigation";
import { useRolesUsers } from "@/context/RolesUsersContext";
import { getRole } from "@/lib/auth";
import { getTotalOrderDemandCount } from "@/utils/distributorOrdersPage";
import { canAccessPath } from "@/utils/rolesUsers";
import { cn } from "@/utils/cn";

function resolveNavBadge(item: NavItem): number | undefined {
  if (item.href === ROUTES.productOrders) {
    const count = getTotalOrderDemandCount();
    return count > 0 ? count : undefined;
  }
  return item.badge;
}

const SIDEBAR_ICONS: Record<string, string> = {
  [ROUTES.distributors]: "/icons/sidebar-icons/distributors.png",
  [ROUTES.source]: "/icons/sidebar-icons/source.png",
  [ROUTES.items]: "/icons/sidebar-icons/items.png",
  [ROUTES.productsForSale]: "/icons/sidebar-icons/prouctsforsale.png",
  [ROUTES.productOrders]: "/icons/sidebar-icons/distributorsorders.png",
  [ROUTES.inventory]: "/icons/sidebar-icons/inventory.png",
  [ROUTES.customers]: "/icons/sidebar-icons/customers.png",
  [ROUTES.customerOrders]: "/icons/sidebar-icons/customerorders.png",
  [ROUTES.distributorDeliveries]: "/icons/sidebar-icons/distributorreceiving.png",
  [ROUTES.packingCoolers]: "/icons/sidebar-icons/coolerpacking.png",
  [ROUTES.packerManager]: "/icons/sidebar-icons/packermanager.png",
  [ROUTES.roles]: "/icons/sidebar-icons/roles.png",
  [ROUTES.notifications]: "/icons/sidebar-icons/notifications.png",
};

function SidebarItem({
  item,
  active,
  onNavigate,
}: {
  item: NavItem;
  active: boolean;
  onNavigate?: () => void;
}) {
  const iconSrc = SIDEBAR_ICONS[item.href];
  const badge = resolveNavBadge(item);

  return (
    <Link
      to={item.href}
      onClick={onNavigate}
      className={cn(
        "group flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] transition-colors",
        active
          ? "bg-[#28402B] font-medium text-white"
          : "text-white/35 hover:bg-white/5 hover:text-white",
      )}
    >
      {iconSrc ? (
        <img
          src={iconSrc}
          alt=""
          className={cn(
            "size-5 shrink-0 [filter:url(#sidebar-icon-solid)]",
            active ? "opacity-100" : "opacity-40 group-hover:opacity-100",
          )}
        />
      ) : null}
      <span className="flex-1 truncate">{item.label}</span>
      {badge != null ? <CountBadge>{badge}</CountBadge> : null}
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
  const { sessionPermissions } = useRolesUsers();
  const sections = getNavSections(role)
    .map((section) => ({
      ...section,
      items: section.items.filter((item) =>
        canAccessPath(sessionPermissions, item.href),
      ),
    }))
    .filter((section) => section.items.length > 0);
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

      <svg aria-hidden className="absolute size-0">
        <filter id="sidebar-icon-solid" colorInterpolationFilters="sRGB">
          <feColorMatrix
            type="matrix"
            values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 2.5 0"
          />
        </filter>
      </svg>

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
