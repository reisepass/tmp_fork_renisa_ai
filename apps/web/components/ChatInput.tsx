import { LegalPages } from "@/types";
import { ChatStatus } from "ai";
import { Paperclip, Mic, Send, BookText, Lock, FileText, Bug, Loader2 } from "lucide-react";
import { i18n } from "@/lib/i18n";
import React, { FormEventHandler } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Locale } from "@renisa-ai/config/types";
import { cn } from "@/lib/utils";

interface ChatInputProps {
  input: string;
  setInput: (text: string) => void;
  onSendMessage: (text: string) => void;
  status: ChatStatus;
  placeholder: string;
  onChange: (text: string) => void;
  onButtonClick: (button: LegalPages | "bug") => void;
  locale: Locale;
  className?: string;
}

export function ChatInput({
  input,
  setInput,
  onSendMessage,
  status,
  placeholder,
  onChange,
  onButtonClick,
  locale,
  className,
}: ChatInputProps) {
  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value;
    setInput(text);
    onChange(text);
  };

  const handleSubmit: FormEventHandler<HTMLFormElement> = (e) => {
    e.preventDefault();
    if (input.trim() && status === "ready") {
      onSendMessage(input);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (input.trim() && status === "ready") {
        handleSubmit(e as any);
      }
    }
  };

  return (
    <div className={cn("px-6 py-3", className)}>
      <form onSubmit={handleSubmit} className="space-y-2">
        {/* Text Input Container - Matching Figma Design */}
        <div className={cn(
          "bg-white border rounded-md p-3 transition-colors",
          "border-[rgba(23,25,28,0.25)]",
          "focus-within:border-[#1ae59b] focus-within:border-2 focus-within:p-[11px]"
        )}>
          <Textarea
            value={input}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            className="w-full border-none outline-none resize-none text-base bg-transparent p-0 min-h-[24px] focus-visible:ring-0 font-[family-name:var(--font-outfit)]"
            rows={1}
          />

          {/* Input Footer with buttons - Matching Figma Design */}
          <div className="flex justify-end items-center mt-2.5">
            <button
              type="submit"
              disabled={!input.trim() || status !== "ready"}
              className={cn(
                "w-12 h-12 rounded-md flex items-center justify-center transition-all",
                input.trim() && status === "ready"
                  ? "bg-[#1ae59b] hover:bg-[#15c785] active:bg-[#12b574]"
                  : "bg-[#a0e8d1] cursor-not-allowed"
              )}
            >
              {status === "submitted" ? (
                <Loader2 className="w-4 h-4 animate-spin text-white" />
              ) : (
                <Send className="w-4 h-4 text-white" />
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
