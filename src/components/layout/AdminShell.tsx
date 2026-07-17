import { Sidebar } from "@/components/layout/Sidebar";

type AdminShellProps = {
  children: React.ReactNode;
};

export function AdminShell({ children }: AdminShellProps) {
  return (
    <div className="flex min-h-dvh bg-background">
      <Sidebar />
      <div className="flex min-h-dvh min-w-0 flex-1 flex-col bg-background">
        {children}
      </div>
    </div>
  );
}
