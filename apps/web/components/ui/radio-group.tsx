import { cn } from "@/lib/utils";
import { Check, User, Users, Baby, UsersRound } from "lucide-react";

export interface RadioOption {
  value: string;
  label: string;
  icon?: "user" | "users" | "baby" | "family";
}

export interface RadioGroupProps {
  options: RadioOption[];
  value?: string;
  onChange?: (value: string) => void;
  className?: string;
}

const iconMap = {
  user: User,
  users: Users,
  baby: Baby,
  family: UsersRound,
};

export function RadioGroup({ options, value, onChange, className }: RadioGroupProps) {
  return (
    <div className={cn("flex flex-col w-full", className)}>
      {options.map((option, index) => {
        const isSelected = value === option.value;
        const Icon = option.icon ? iconMap[option.icon] : null;
        const isLast = index === options.length - 1;

        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange?.(option.value)}
            className={cn(
              "flex items-center gap-[8px] py-[8px] px-0 w-full",
              !isLast && "border-b border-[rgba(23,25,28,0.15)]"
            )}
          >
            {Icon && <Icon className="w-5 h-5 shrink-0 text-[#002c66]" />}

            <div className="flex-1 text-left font-[family-name:var(--font-outfit)] font-bold text-[14px] leading-[1.2] uppercase text-[#17191c]">
              {option.label}
            </div>

            <div
              className={cn(
                "w-4 h-4 rounded-full border shrink-0 flex items-center justify-center",
                isSelected
                  ? "bg-[#002c66] border-[#002c66]"
                  : "bg-white border-[#002c66]"
              )}
            >
              {isSelected && <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />}
            </div>
          </button>
        );
      })}
    </div>
  );
}
