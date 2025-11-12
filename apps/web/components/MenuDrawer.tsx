import { MessageCircle, CircleHelp, X, Bug } from "lucide-react";
import { cn } from "@/lib/utils";
import { Locale } from "@renisa-ai/config/types";
import { i18n } from "@/lib/i18n";
import { LegalPages } from "@/types";

interface MenuDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onLegalClick: (page: LegalPages | "bug") => void;
  locale: Locale;
}

export function MenuDrawer({ isOpen, onClose, onLegalClick, locale }: MenuDrawerProps) {
  return (
    <div
      className={`absolute top-0 right-0 h-full bg-[#002c66] flex flex-col z-50 transition-transform duration-300 ease-in-out ${
        isOpen ? 'translate-x-0' : 'translate-x-full'
      }`}
      style={{ width: '75%' }}
    >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-2">
          <div className="w-7 h-7">
            <img
              src="/logo-white.svg"
              alt="Logo"
              className="w-full h-full"
            />
          </div>
          <button
            onClick={onClose}
            className="w-12 h-12 flex items-center justify-center"
          >
            <X className="w-6 h-6 text-white" />
          </button>
        </div>

        {/* Menu Items */}
        <div className="flex-1 flex flex-col px-6 pt-12">
          <div className="flex flex-col">
            {/* Chat Mode - Active */}
            <div className="flex items-center gap-3 px-2 py-6 border-b-0">
              <MessageCircle className="w-5 h-5 text-[#1ae59b]" />
              <p className="flex-1 font-[family-name:var(--font-outfit)] font-semibold text-base leading-[1.5] uppercase text-[#1ae59b]">
                {i18n[locale].menu.chatMode}
              </p>
            </div>

            {/* Support */}
            <div className="flex items-center gap-3 px-2 py-6 border-t border-white/15">
              <CircleHelp className="w-5 h-5 text-white" />
              <p className="flex-1 font-[family-name:var(--font-outfit)] font-semibold text-base leading-[1.5] uppercase text-white">
                {i18n[locale].menu.support}
              </p>
            </div>

            {/* Bug / Debug */}
            <button
              onClick={() => {
                onLegalClick("bug");
                onClose();
              }}
              className="flex items-center gap-3 px-2 py-6 border-t border-white/15 w-full text-left hover:bg-white/5 transition-colors"
            >
              <Bug className="w-5 h-5 text-white" />
              <p className="flex-1 font-[family-name:var(--font-outfit)] font-semibold text-base leading-[1.5] uppercase text-white">
                {i18n[locale].menu.debug}
              </p>
            </button>
          </div>

          {/* Footer - Legal Links */}
          <div className="flex gap-8 items-end pb-6 pt-auto mt-auto">
            <button
              onClick={() => {
                onLegalClick("imprint");
                onClose();
              }}
              className="font-[family-name:var(--font-outfit)] font-medium text-base leading-[1.5] text-white hover:text-[#1ae59b] transition-colors"
            >
              {i18n[locale].legal.imprint}
            </button>
            <button
              onClick={() => {
                onLegalClick("terms");
                onClose();
              }}
              className="font-[family-name:var(--font-outfit)] font-medium text-base leading-[1.5] text-white hover:text-[#1ae59b] transition-colors"
            >
              {i18n[locale].legal.terms}
            </button>
            <button
              onClick={() => {
                onLegalClick("privacy");
                onClose();
              }}
              className="font-[family-name:var(--font-outfit)] font-medium text-base leading-[1.5] text-white hover:text-[#1ae59b] transition-colors"
            >
              {i18n[locale].legal.privacy}
            </button>
          </div>
        </div>
    </div>
  );
}
