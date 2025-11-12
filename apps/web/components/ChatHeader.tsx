import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { config } from "@renisa-ai/config";

interface ChatHeaderProps {
  logoUrl?: string;
  onMenuClick?: () => void;
  className?: string;
}

export function ChatHeader({
  logoUrl = "/logo.svg",
  onMenuClick,
  className,
}: ChatHeaderProps) {
  return (
    <header
      className={cn(
        "flex items-center justify-between px-6 py-2",
        className
      )}
    >
      <div className="flex items-center gap-3">
        <div className="w-7 h-7">
          <img
            src={logoUrl}
            alt="Logo"
            className="w-full h-full"
          />
        </div>
        <span className="font-[family-name:var(--font-work-sans)] font-semibold text-[16px] text-[#17191c]">
          {config.name}
        </span>
      </div>
      <Button
        variant="ghost"
        size="icon"
        onClick={onMenuClick}
        className="w-12 h-12"
      >
        <Menu className="w-6 h-6" />
      </Button>
    </header>
  );
}
