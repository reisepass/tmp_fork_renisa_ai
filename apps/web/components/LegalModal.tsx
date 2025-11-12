import { LegalPages } from "@/types";
import { Button } from "@/components/ui/button";
import React from "react";
import { i18n } from "@/lib/i18n";
import { Locale } from "@renisa-ai/config/types";
import ReactMarkdown from "react-markdown";
import { X } from "lucide-react";

interface LegalModalProps {
  pageType: LegalPages | undefined;
  locale: Locale;
  onClose: () => void;
}

export function LegalModal({ pageType, onClose, locale }: LegalModalProps) {
  if (!pageType) return null;

  const getContent = () => {
    switch (pageType) {
      case "imprint":
        return {
          title: i18n[locale].legalModal.titles.imprint,
          content: i18n[locale].legalModal.contents.imprint,
        };
      case "privacy":
        return {
          title: i18n[locale].legalModal.titles.privacy,
          content: i18n[locale].legalModal.contents.privacy,
        };
      case "terms":
        return {
          title: i18n[locale].legalModal.titles.terms,
          content: i18n[locale].legalModal.contents.terms,
        };
      default:
        return { title: "", content: "" };
    }
  };

  const { title, content } = getContent();

  return (
    <div className="absolute inset-0 bg-[#ebf3ff] z-50 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b">
        <h2 className="text-xl font-semibold">{title}</h2>
        <button
          onClick={onClose}
          className="w-10 h-10 flex items-center justify-center rounded-md hover:bg-black/5"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        <div className="prose prose-sm max-w-none text-foreground
            [&_h3]:text-lg [&_h3]:font-bold [&_h3]:mt-6 [&_h3]:mb-3
            [&_p]:mb-3 [&_p]:leading-relaxed
            [&_ul]:mb-3 [&_ul]:ml-4
            [&_strong]:font-semibold
            [&_a]:text-blue-600 [&_a]:underline">
          <ReactMarkdown>
            {content}
          </ReactMarkdown>
        </div>
      </div>

      {/* Footer */}
      <div className="px-6 py-4 border-t">
        <Button variant="outline" onClick={onClose}>
          {i18n[locale].legalModal.close}
        </Button>
      </div>
    </div>
  );
}
