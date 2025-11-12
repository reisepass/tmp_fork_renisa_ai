import { LegalPages } from "@/types";
import { Button } from "@/components/ui/button";
import { FileText, Shield, BookOpen } from "lucide-react";
import React from "react";

interface ChatFooterProps {
  onLegalPress: (type?: LegalPages) => void;
}

export function ChatFooter({ onLegalPress }: ChatFooterProps) {
  return (
    <footer className="border-t border-border bg-muted/30 px-4 py-3">
      <div className="flex justify-center gap-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onLegalPress("imprint")}
          className="text-xs text-muted-foreground hover:text-foreground"
        >
          <FileText className="w-3 h-3 mr-1" />
          Imprint
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onLegalPress("privacy")}
          className="text-xs text-muted-foreground hover:text-foreground"
        >
          <Shield className="w-3 h-3 mr-1" />
          Privacy
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onLegalPress("terms")}
          className="text-xs text-muted-foreground hover:text-foreground"
        >
          <BookOpen className="w-3 h-3 mr-1" />
          Terms
        </Button>
      </div>
    </footer>
  );
}
