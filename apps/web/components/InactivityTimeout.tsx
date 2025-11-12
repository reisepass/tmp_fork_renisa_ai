"use client";

import { i18n } from "@/lib/i18n";
import { Locale } from "@renisa-ai/config/types";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "./ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";

export interface InactivityTimeoutProps {
  locale: Locale;
  warningTimeMinutes?: number; // Time before showing warning (default: 12 minutes)
  logoutTimeMinutes?: number; // Time before forcing logout (default: 15 minutes)
  onSessionExpired?: () => void;
}

const DEFAULT_WARNING_TIME_MINUTES = 12;
const DEFAULT_LOGOUT_TIME_MINUTES = 15;

export function InactivityTimeout({
  locale,
  warningTimeMinutes = DEFAULT_WARNING_TIME_MINUTES,
  logoutTimeMinutes = DEFAULT_LOGOUT_TIME_MINUTES,
  onSessionExpired,
}: InactivityTimeoutProps) {
  const warningTimeMs = warningTimeMinutes * 60 * 1000;
  const logoutTimeMs = logoutTimeMinutes * 60 * 1000;
  const [showWarning, setShowWarning] = useState(false);
  const [showLogout, setShowLogout] = useState(false);
  const warningTimerRef = useRef<NodeJS.Timeout | null>(null);
  const logoutTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastActivityRef = useRef<number>(0);

  const labels = i18n[locale].inactivityTimeout;
  const remainingMinutes = logoutTimeMinutes - warningTimeMinutes;

  // Replace placeholders in warning message
  const warningMessage = labels.warningMessage
    .replace("{inactiveMinutes}", warningTimeMinutes.toString())
    .replace("{remainingMinutes}", remainingMinutes.toString());

  const handleSessionExpired = useCallback(() => {
    setShowWarning(false);
    setShowLogout(true);

    // Call callback if provided
    if (onSessionExpired) {
      onSessionExpired();
    }
  }, [onSessionExpired]);

  // Reset timers on user activity
  const resetTimers = useCallback(() => {
    lastActivityRef.current = Date.now();
    setShowWarning(false);

    // Clear existing timers
    if (warningTimerRef.current) {
      clearTimeout(warningTimerRef.current);
    }
    if (logoutTimerRef.current) {
      clearTimeout(logoutTimerRef.current);
    }

    // Set warning timer (12 minutes)
    warningTimerRef.current = setTimeout(() => {
      setShowWarning(true);
    }, warningTimeMs);

    // Set logout timer (15 minutes)
    logoutTimerRef.current = setTimeout(() => {
      handleSessionExpired();
    }, logoutTimeMs);
  }, [warningTimeMs, logoutTimeMs, handleSessionExpired]);

  const handleContinueSession = () => {
    resetTimers();
  };

  const handleRefresh = () => {
    window.location.reload();
  };

  // Set up activity listeners
  useEffect(() => {
    const events = [
      "mousedown",
      "mousemove",
      "keypress",
      "scroll",
      "touchstart",
      "click",
    ];

    // Throttle reset to avoid too many calls
    let throttleTimeout: NodeJS.Timeout | null = null;
    const throttledReset = () => {
      if (!throttleTimeout) {
        throttleTimeout = setTimeout(() => {
          resetTimers();
          throttleTimeout = null;
        }, 1000); // Throttle to once per second
      }
    };

    events.forEach((event) => {
      window.addEventListener(event, throttledReset);
    });

    // Initialize timers
    resetTimers();

    // Cleanup
    return () => {
      events.forEach((event) => {
        window.removeEventListener(event, throttledReset);
      });
      if (warningTimerRef.current) {
        clearTimeout(warningTimerRef.current);
      }
      if (logoutTimerRef.current) {
        clearTimeout(logoutTimerRef.current);
      }
      if (throttleTimeout) {
        clearTimeout(throttleTimeout);
      }
    };
  }, [resetTimers]);

  return (
    <>
      {/* Warning Dialog */}
      <Dialog open={showWarning} onOpenChange={setShowWarning}>
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>{labels.warningTitle}</DialogTitle>
            <DialogDescription>{warningMessage}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={handleContinueSession}>
              {labels.continueSession}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Logout Dialog */}
      <Dialog open={showLogout} onOpenChange={() => {}}>
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>{labels.logoutTitle}</DialogTitle>
            <DialogDescription>{labels.logoutMessage}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={handleRefresh}>{labels.refresh}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
