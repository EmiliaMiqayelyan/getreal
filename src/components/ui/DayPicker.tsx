import { cn } from "@/utils/cn";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;

export type WeekDay = (typeof DAYS)[number];

type DayPickerProps = {
  value: WeekDay[];
  onChange: (days: WeekDay[]) => void;
};

export function DayPicker({ value, onChange }: DayPickerProps) {
  function toggle(day: WeekDay) {
    if (value.includes(day)) {
      onChange(value.filter((item) => item !== day));
      return;
    }
    onChange([...value, day]);
  }

  return (
    <div className="flex flex-wrap gap-2">
      {DAYS.map((day) => {
        const selected = value.includes(day);
        return (
          <button
            key={day}
            type="button"
            onClick={() => toggle(day)}
            className={cn(
              "h-9 min-w-[44px] rounded-lg px-3 text-sm font-medium transition-colors",
              selected
                ? "bg-sidebar text-white"
                : "text-muted-strong bg-id-pill hover:bg-[#e4e7ed]",
            )}
          >
            {day}
          </button>
        );
      })}
    </div>
  );
}
