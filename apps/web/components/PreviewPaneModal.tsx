import { Button } from "@/components/ui/button";
import React from "react";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "./ui/sheet";

interface PreviewPaneModalProps {
  visible: boolean;
  onClose: () => void;
  onUserInfoChange: (userInfo: Record<string, unknown>) => void;
}

export function PreviewPaneModal({
  visible,
  onClose,
  onUserInfoChange,
}: PreviewPaneModalProps) {
  return (
    <Sheet open={visible} onOpenChange={onClose}>
      <SheetContent side="bottom" className="h-[80vh]">
        <SheetHeader>
          <SheetTitle>User Information Preview</SheetTitle>
        </SheetHeader>
        <div className="text-foreground px-4">
          <p>This is a preview of user information that would be collected.</p>
          <p className="mt-2 text-sm text-muted-foreground">
            In a real implementation, this would show the current user data and allow editing.
          </p>
        </div>
        <SheetFooter>
          <SheetClose asChild>
            <Button variant="outline">
              Cancel
            </Button>
          </SheetClose>
          <Button onClick={onClose}>Save</Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

