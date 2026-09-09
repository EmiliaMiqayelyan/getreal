import { Header } from "@/components/layout/AdminHeader";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";

type PlaceholderPageProps = {
  title: string;
};

export function PlaceholderPage({ title }: PlaceholderPageProps) {
  useDocumentTitle(title);

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-background">
      <Header title={title} />
      <div className="flex flex-1 items-center justify-center px-4 py-10 md:px-7">
        <div className="rounded-[12px] border border-dashed border-[#D9D9D6] bg-white px-8 py-12 text-center">
          <p className="text-[15px] font-medium text-[#111118]">{title}</p>
          <p className="mt-2 text-[13px] text-[#8A8A8A]">
            This page will be updated to match the new Figma design next.
          </p>
        </div>
      </div>
    </div>
  );
}
