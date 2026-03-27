"use client";

import { useCallback, useEffect, useState } from "react";

const INPUT_TAGS = new Set(["INPUT", "TEXTAREA", "SELECT"]);

export default function useKeyboardShortcuts() {
  const [quickSwitcherOpen, setQuickSwitcherOpen] = useState(false);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      // Cmd+K / Ctrl+K → open quick switcher
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setQuickSwitcherOpen((prev) => !prev);
        return;
      }

      // Escape → close quick switcher (MUI dialogs handle their own Escape,
      // but this covers the quick switcher explicitly)
      if (e.key === "Escape" && quickSwitcherOpen) {
        setQuickSwitcherOpen(false);
        return;
      }

      // Auto-focus message input when typing printable characters
      // Skip if already in an input, or if modifier keys are held, or if a dialog is open
      if (
        e.key.length === 1 &&
        !e.metaKey &&
        !e.ctrlKey &&
        !e.altKey &&
        !quickSwitcherOpen
      ) {
        const active = document.activeElement;
        if (active && INPUT_TAGS.has(active.tagName)) return;
        // Check if any MUI dialog is open (role="dialog" in DOM)
        if (document.querySelector("[role='dialog']")) return;

        const msgInput = document.querySelector<HTMLTextAreaElement>(
          "textarea[placeholder='Send a message…']",
        );
        if (msgInput) {
          msgInput.focus();
          // Don't prevent default — let the character be typed into the now-focused input
        }
      }
    },
    [quickSwitcherOpen],
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  return {
    quickSwitcherOpen,
    closeQuickSwitcher: useCallback(() => setQuickSwitcherOpen(false), []),
  };
}
