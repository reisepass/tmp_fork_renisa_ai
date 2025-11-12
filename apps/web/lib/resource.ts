/**
 * Resource management utilities for handling user names and device IDs
 */

import { useEffect, useState } from "react";

const RESOURCE_KEY = "renisa_user_resource";

/**
 * Generate a unique browser-based identifier
 */
function generateBrowserFingerprint(): string {
  if (typeof window === "undefined") {
    return "default";
  }

  try {
    // Collect browser characteristics
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.textBaseline = "top";
      ctx.font = "14px Arial";
      ctx.fillText("Browser fingerprint", 2, 2);
    }

    const fingerprint = [
      navigator.userAgent,
      navigator.language,
      screen.width + "x" + screen.height,
      new Date().getTimezoneOffset(),
      navigator.platform,
      canvas.toDataURL(),
      navigator.hardwareConcurrency || "unknown",
      navigator.maxTouchPoints || "unknown",
    ].join("|");

    // Create a simple hash from the fingerprint
    let hash = 0;
    for (let i = 0; i < fingerprint.length; i++) {
      const char = fingerprint.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash &= hash; // Convert to 32-bit integer
    }

    // Convert to positive hex string and take first 8 characters
    const hexHash = Math.abs(hash)
      .toString(16)
      .padStart(8, "0")
      .substring(0, 8);

    // Add a prefix to make it more readable
    return `user_${hexHash}`;
  } catch (error) {
    console.warn("Failed to generate browser fingerprint:", error);
    // Fallback to timestamp-based ID
    return `user_${Date.now().toString(36)}`;
  }
}

/**
 * Get the current user resource (name/ID) from localStorage or generate a new one
 */
export function getUserResource(): string {
  if (typeof window === "undefined") {
    return "default";
  }

  try {
    const stored = localStorage.getItem(RESOURCE_KEY);
    if (stored) {
      return stored;
    }

    // Generate new browser-based ID if nothing exists
    const newId = generateBrowserFingerprint();
    localStorage.setItem(RESOURCE_KEY, newId);
    return newId;
  } catch (error) {
    console.warn("Failed to access localStorage:", error);
    return "default";
  }
}

/**
 * Set the user resource (name/ID) in localStorage
 */
export function setUserResource(resource: string): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    localStorage.setItem(RESOURCE_KEY, resource);
  } catch (error) {
    console.warn("Failed to save to localStorage:", error);
  }
}

/**
 * Clear the user resource from localStorage
 */
export function clearUserResource(): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    localStorage.removeItem(RESOURCE_KEY);
  } catch (error) {
    console.warn("Failed to clear localStorage:", error);
  }
}

/**
 * Generate a new browser-based user resource and save it
 */
export function generateNewUserResource(): string {
  const newId = generateBrowserFingerprint();
  setUserResource(newId);
  return newId;
}

export function useUserResource() {
  const [resourceState, setResourceState] = useState<string>(getUserResource());
  useEffect(() => {
    setResourceState(getUserResource());
  }, []);

  return [resourceState, { setResource, resetResource }] as const;

  function setResource(resource: string): void {
    setUserResource(resource);
    setResourceState(resource);
  }

  function resetResource(): void {
    setResourceState(generateNewUserResource());
  }
}
