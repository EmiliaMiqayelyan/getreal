import type { SVGProps } from "react";

import { cn } from "@/utils/cn";

type IconProps = SVGProps<SVGSVGElement>;

function base(props: IconProps) {
  const { className, ...rest } = props;
  return {
    className: cn("size-[18px] shrink-0", className),
    fill: "none" as const,
    stroke: "currentColor",
    strokeWidth: 1.5,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    viewBox: "0 0 24 24",
    "aria-hidden": true as const,
    ...rest,
  };
}

export function DashboardIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
    </svg>
  );
}

export function InventoryIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M3 21V8l9-5 9 5v13" />
      <path d="M3 8h18" />
      <path d="M9 21V12h6v9" />
      <path d="M9 12h6" />
    </svg>
  );
}

export function BoxIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M21 8.5 12 3 3 8.5v7L12 21l9-5.5v-7Z" />
      <path d="M12 12v9" />
      <path d="M3 8.5 12 12l9-3.5" />
    </svg>
  );
}

export function CartIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <circle cx="9" cy="20" r="1.25" />
      <circle cx="17" cy="20" r="1.25" />
      <path d="M3 4h2l2.4 11.2a1.5 1.5 0 0 0 1.5 1.2h7.8a1.5 1.5 0 0 0 1.5-1.2L20 8H7" />
    </svg>
  );
}

export function TruckIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M1 7h11v10H1z" />
      <path d="M12 10h4l3 3v4h-7v-7Z" />
      <circle cx="5.5" cy="18.5" r="1.5" />
      <circle cx="16.5" cy="18.5" r="1.5" />
    </svg>
  );
}

export function UsersIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <circle cx="9" cy="8" r="3" />
      <path d="M3 19c0-3 2.5-5 6-5s6 2 6 5" />
      <circle cx="17" cy="9" r="2.5" />
      <path d="M21 19c0-2.2-1.5-3.8-3.5-4.5" />
    </svg>
  );
}

export function RolesIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <circle cx="12" cy="8" r="3.5" />
      <path d="M5 20c0-3.5 3-6 7-6s7 2.5 7 6" />
    </svg>
  );
}

export function BellIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M6 9a6 6 0 1 1 12 0c0 7 3 7 3 9H3c0-2 3-2 3-9" />
      <path d="M10 21a2 2 0 0 0 4 0" />
    </svg>
  );
}

export function ChevronRightIcon(props: IconProps) {
  return (
    <svg {...base({ ...props, className: cn("size-3.5", props.className) })}>
      <path d="m9 6 6 6-6 6" />
    </svg>
  );
}

export function NoteIcon(props: IconProps) {
  return (
    <svg {...base({ ...props, className: cn("size-3.5", props.className) })}>
      <path d="M4 6a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H9l-3 3v-3H6a2 2 0 0 1-2-2V6Z" />
    </svg>
  );
}

export function ChevronDownIcon(props: IconProps) {
  return (
    <svg {...base({ ...props, className: cn("size-3.5", props.className) })}>
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

export function PlusIcon(props: IconProps) {
  return (
    <svg {...base({ ...props, className: cn("size-4", props.className) })}>
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </svg>
  );
}

export function CloseIcon(props: IconProps) {
  return (
    <svg {...base({ ...props, className: cn("size-5", props.className) })}>
      <path d="M6 6l12 12" />
      <path d="M18 6 6 18" />
    </svg>
  );
}

export function UploadIcon(props: IconProps) {
  return (
    <svg {...base({ ...props, className: cn("size-4", props.className) })}>
      <path d="M12 16V5" />
      <path d="m8 8 4-4 4 4" />
      <path d="M4 20h16" />
    </svg>
  );
}

export function FileIcon(props: IconProps) {
  return (
    <svg {...base({ ...props, className: cn("size-5", props.className) })}>
      <path d="M8 3h6l4 4v12a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z" />
      <path d="M14 3v4h4" />
    </svg>
  );
}

export function LogoMark(props: IconProps) {
  return (
    <svg
      viewBox="0 0 28 28"
      className={cn("size-7 shrink-0", props.className)}
      aria-hidden
      fill="none"
    >
      <path
        d="M14 3c4.5 0 8 3.2 8 7.2 0 5.2-5.2 9.3-8 12.3-2.8-3-8-7.1-8-12.3C6 6.2 9.5 3 14 3Z"
        fill="currentColor"
        opacity="0.95"
      />
      <path
        d="M14 8.5c1.8 0 3.2 1.3 3.2 3 0 2.4-2.2 4.2-3.2 5.4-1-1.2-3.2-3-3.2-5.4 0-1.7 1.4-3 3.2-3Z"
        fill="#00413D"
      />
    </svg>
  );
}
