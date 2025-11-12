import { Button } from "@/components/ui/button";
import { useUserResource } from "@/lib/resource";
import { useEffect, useRef } from "react";
import { CodeBlock, CodeBlockCopyButton } from "./code-block";
import { Input } from "./ui/input";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "./ui/sheet";

interface DebugModalProps {
  visible: boolean;
  onClose: () => void;
  debugData?: object;
}

export function DebugModal({
  visible,
  onClose,
  debugData = {},
}: DebugModalProps) {
  const [resourceState, { setResource, resetResource }] = useUserResource();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.value = resourceState;
    }
  }, [resourceState]);

  return (
    <Sheet open={visible} onOpenChange={onClose}>
      <SheetContent side="bottom" className="h-[80vh]">
        <SheetHeader>
          <SheetTitle>Debug Information</SheetTitle>
        </SheetHeader>
        <div className="text-foreground px-4 overflow-y-auto flex-1">
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-2">
                User Resource
              </h3>
              <div className="space-y-3">
                <div className="flex gap-2">
                  <Input
                    ref={inputRef}
                    defaultValue={resourceState}
                    placeholder="Enter custom user ID (or use browser-based ID)"
                    className="flex-1"
                  />
                  <Button
                    onClick={() => setResource(inputRef.current?.value || "")}
                    size="sm"
                  >
                    Save
                  </Button>
                  <Button
                    onClick={resetResource}
                    variant="destructive"
                    size="sm"
                  >
                    Reset to Browser ID
                  </Button>
                </div>
                <div className="text-xs text-muted-foreground">
                  Current: <span className="font-mono">{resourceState}</span>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-2">
                Debug Data
              </h3>
              <CodeBlock
                code={JSON.stringify(debugData, null, 2)}
                language="json"
                className="bg-muted p-3 rounded-md text-xs overflow-x-auto"
              >
                <CodeBlockCopyButton />
              </CodeBlock>
            </div>

            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-2">
                Environment Info
              </h3>
              <div className="bg-muted p-3 rounded-md text-xs space-y-1">
                <div>
                  User Agent:{" "}
                  {typeof window === "undefined"
                    ? "N/A"
                    : window.navigator.userAgent}
                </div>
                <div>
                  URL:{" "}
                  {typeof window === "undefined" ? "N/A" : window.location.href}
                </div>
                <div>Timestamp: {new Date().toISOString()}</div>
              </div>
            </div>
          </div>
        </div>
        <SheetFooter>
          <SheetClose asChild>
            <Button variant="outline">Close</Button>
          </SheetClose>
          <Button
            variant="secondary"
            onClick={() => {
              if (typeof window !== "undefined") {
                console.log("Debug Data:", debugData);
              }
            }}
          >
            Log to Console
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
