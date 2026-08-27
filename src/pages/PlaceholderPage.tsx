import { UserMenu } from "@/components/layout/UserMenu";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";

type PlaceholderPageProps = {
  title: string;
};

export function PlaceholderPage({ title }: PlaceholderPageProps) {
  useDocumentTitle(title);

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-[#F5F5F3]">
      <div className="shrink-0 border-b border-[#ECECEA] bg-white px-4 pt-5 pb-4 md:px-7">
        <div className="flex items-start justify-between gap-4">
          <h1 className="text-[22px] font-semibold tracking-tight text-[#111118]">
            {title}
          </h1>
          <UserMenu showAvatar className="items-center" />
        </div>
      </div>
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
