"use client";

import { cn } from "@/lib/utils";
import { Markdown } from "@renisa-ai/utils";
import { ChatStatus } from "ai";
import { type ComponentProps, useState, memo } from "react";
import { defaultRehypePlugins, Streamdown } from "streamdown";
import { Icon } from "./Icon";
import { Alert, AlertDescription, AlertTitle } from "./ui/alert";
import { Button } from "./ui/button";

type ResponseProps = ComponentProps<typeof Streamdown> & {
  onClick?: (data: { label: string; href?: string }) => void;
  disabled?: boolean;
};

// Global state for selected cards (keyed by message content hash or similar)
const selectedCardsGlobal = new Map<string, string>();

const ResponseComponent = ({ className, onClick, disabled = false, ...props }: ResponseProps) => {
  const contentKey = props.children?.toString() || "";
  const [localSelected, setLocalSelected] = useState<string | null>(
    selectedCardsGlobal.get(contentKey) || null
  );

  const components = {
          h1: ({ children }: { children?: React.ReactNode }) => (
            <h1 className="font-[family-name:var(--font-work-sans)] font-bold text-[30px] leading-[1.2] tracking-[-0.3px] text-[#17191c]">
              {children}
            </h1>
          ),
          h2: ({ children }: { children?: React.ReactNode }) => (
            <h2 className="font-[family-name:var(--font-work-sans)] font-bold text-[30px] leading-[1.2] tracking-[-0.3px] text-[#002c66]">
              {children}
            </h2>
          ),
          h3: ({ children }: { children?: React.ReactNode }) => (
            <h3 className="pt-4 pb-0 mb-0 font-[family-name:var(--font-outfit)] font-bold text-[14px] leading-[1.2] uppercase text-[#17191c]">
              {children}
            </h3>
          ),
          p: ({ children }: { children?: React.ReactNode }) => {
            // Check if this paragraph contains multiple yes/no buttons
            const childArray = Array.isArray(children) ? children : [children];
            const hasYesNoButtons = childArray.some(
              (child) =>
                child &&
                typeof child === "object" &&
                "props" in child &&
                child.props?.href &&
                (child.props.href.includes(":yes") ||
                  child.props.href.includes(":no"))
            );

            if (hasYesNoButtons) {
              return (
                <div className="flex gap-[4px] items-center w-full min-w-0 max-w-full">
                  {children}
                </div>
              );
            }

            return (
              <p className="font-[family-name:var(--font-outfit)] font-normal text-[16px] leading-[1.5] text-[#17191c] w-full min-w-0 max-w-full overflow-hidden">
                {children}
              </p>
            );
          },
          strong: ({ children }: { children?: React.ReactNode }) => (
            <strong className="font-[family-name:var(--font-outfit)] font-bold text-[16px] leading-[1.5] text-[#17191c]">
              {children}
            </strong>
          ),
          ul: ({ children }: { children?: React.ReactNode }) => (
            <ul className="border-t border-b border-[rgba(23,25,28,0.15)] py-2 flex flex-col gap-[2px]">
              {children}
            </ul>
          ),
          a: ({ children, href }: { children?: React.ReactNode; href?: string }) => {
            const parsed = Markdown.parseSpecialLink(
              children?.toString() || "",
              href || ""
            );
            if (!parsed) {
              return <a href={href}>{children}</a>;
            }
            switch (parsed.type) {
              case "button": {
                const isPrimary = parsed.variant === "primary";
                const isYes = parsed.variant === "yes";
                const isNo = parsed.variant === "no";

                // Yes/No buttons have special styling
                if (isYes || isNo) {
                  return (
                    <span
                      className="flex-1 flex min-w-0"
                      style={disabled ? { pointerEvents: 'none', opacity: 0.5 } : undefined}
                    >
                      <Button
                        className={cn(
                          "w-full min-w-0 h-[48px] rounded-[6px] px-[16px] py-[8px] uppercase font-[family-name:var(--font-outfit)] font-semibold text-[16px] leading-[1.5] gap-[8px]",
                          isYes
                            ? "bg-[rgba(23,25,28,0.05)] hover:bg-[rgba(23,25,28,0.08)] text-[#17191c] border-0"
                            : "bg-[#002c66] hover:bg-[#003d80] text-white border-0"
                        )}
                        onClick={() => {
                          if (disabled) return;
                          onClick?.(parsed);
                        }}
                      >
                        {isYes && <Icon icon={parsed.icon} size={16} className="text-[#002c66]" />}
                        {parsed.label}
                        {isNo && <Icon icon={parsed.icon} size={16} />}
                      </Button>
                    </span>
                  );
                }

                // Regular primary/secondary buttons
                return (
                  <span
                    className="inline-flex w-full min-w-0 max-w-full"
                    style={disabled ? { pointerEvents: 'none', opacity: 0.5 } : undefined}
                  >
                    <Button
                      className={cn(
                        "w-full min-w-0 max-w-full min-h-[48px] h-auto rounded-[6px] px-[16px] py-[8px] uppercase font-[family-name:var(--font-outfit)] font-semibold text-[16px] leading-[1.5] whitespace-normal break-words",
                        isPrimary
                          ? "bg-[#1ae59b] hover:bg-[#15c785] text-[#17191c] border-0"
                          : "bg-[rgba(23,25,28,0.05)] hover:bg-[rgba(23,25,28,0.08)] text-[#17191c] border-0"
                      )}
                      variant={isPrimary ? "default" : "secondary"}
                      onClick={() => {
                        if (disabled) return;
                        onClick?.(parsed);
                      }}
                    >
                      <Icon icon={parsed.icon} />
                      {parsed.label}
                    </Button>
                  </span>
                );
              }
              case "card": {
                const isSelected = localSelected === parsed.label;
                return (
                  <span
                    className="inline-flex w-full min-w-0 max-w-full"
                    style={disabled ? { pointerEvents: 'none', opacity: 0.5 } : undefined}
                  >
                    <button
                      type="button"
                      onClick={(e) => {
                        if (disabled) return;
                        e.preventDefault();
                        setLocalSelected(parsed.label);
                        selectedCardsGlobal.set(contentKey, parsed.label);
                        onClick?.(parsed);
                      }}
                      className={cn(
                        "flex items-center gap-[8px] py-[8px] px-0 w-full min-w-0 cursor-pointer",
                        "border-b border-[rgba(23,25,28,0.15)] last:border-b-0"
                      )}
                    >
                      <Icon icon={parsed.icon} className="w-5 h-5 shrink-0 text-[#002c66]" />
                      <div className="flex-1 min-w-0 text-left font-[family-name:var(--font-outfit)] font-bold text-[14px] leading-[1.2] uppercase text-[#17191c] break-words">
                        {parsed.label}
                      </div>
                      <div
                        className={cn(
                          "w-4 h-4 rounded-full border shrink-0 flex items-center justify-center",
                          isSelected
                            ? "bg-[#002c66] border-[#002c66]"
                            : "bg-white border-[#002c66]"
                        )}
                      >
                        {isSelected && (
                          <Icon icon="Check" size={12} className="text-white" />
                        )}
                      </div>
                    </button>
                  </span>
                );
              }
              default: {
                return <a href={href}>{children}</a>;
              }
            }
          },
          li: ({ children }: { children?: React.ReactNode }) => {
            const startsWithCheckmark =
              typeof children === "string" && children.trim().startsWith("Y ");
            if (startsWithCheckmark) {
              return (
                <li className={cn("flex gap-[4px] items-start font-[family-name:var(--font-outfit)] font-normal text-[16px] leading-[1.5] text-[#17191c]", "list-none!")}>
                  <div className="flex items-center pt-[6px] shrink-0">
                    <Icon size={16} icon="Check" />
                  </div>
                  <span className="flex-1">{children.replace("Y ", "")}</span>
                </li>
              );
            }
            const startsWithX =
              typeof children === "string" && children.trim().startsWith("N ");
            if (startsWithX) {
              return (
                <li className={cn("flex gap-[4px] items-start font-[family-name:var(--font-outfit)] font-normal text-[16px] leading-[1.5] text-[#17191c]", "list-none!")}>
                  <div className="flex items-center pt-[6px] shrink-0">
                    <Icon size={16} icon="X" />
                  </div>
                  <span className="flex-1">{children.replace("N ", "")}</span>
                </li>
              );
            }
            return <li className="flex gap-[4px] items-start font-[family-name:var(--font-outfit)] font-normal text-[16px] leading-[1.5] text-[#17191c] list-none">{children}</li>;
          },
  };

  return (
      <Streamdown
        // IMPORTANT: The key MUST include 'disabled' to force React to recreate the component
        // when disabled changes. Without it, the 'components' object closures will retain
        // stale values and disabled state won't work. See /docs/TROUBLESHOOTING.md
        key={`${contentKey}-${localSelected}-${disabled}`}
        rehypePlugins={[
          defaultRehypePlugins.raw,
          defaultRehypePlugins.katex,
          // [
          //   harden,
          //   {
          //     defaultOrigin: "#",
          //     allowedLinkPrefixes: ["*", "button"],
          //   },
          // ],
        ]}
        components={components}
        className={cn(
          "flex flex-col gap-2 w-full min-w-0 max-w-full [&>*:first-child]:mt-0 [&>*:last-child]:mb-0",
          className
        )}
        {...props}
      />
  );
};

export const Response = memo(ResponseComponent);

Response.displayName = "Response";
