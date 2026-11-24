import { useRef, useState } from "react";
import styles from "./BusyButton.module.css";

export type BusyOutcome = { status: "succeeded" } | { status: "failed"; error: unknown };

export type BusyButtonProps = {
  /** What the button does, said while idle: "Save". */
  label: string;
  /** The act under way, said while the promise is pending: "Saving…". */
  busyLabel: string;
  /** The action. A second press while its promise is pending does nothing. */
  onAction: () => Promise<void>;
  /** Told the outcome once the promise has settled, never before. */
  onSettled?: (outcome: BusyOutcome) => void;
};

// A button for an action that takes time. While pending it stays focusable and in the tab
// order: `disabled` would drop focus to the body, so it says aria-disabled and ignores presses.
export function BusyButton({ label, busyLabel, onAction, onSettled }: BusyButtonProps) {
  const [busy, setBusy] = useState(false);
  // A ref, not the state: two presses in the same frame both see the state as idle.
  const pending = useRef(false);

  async function press() {
    if (pending.current) return;
    pending.current = true;
    setBusy(true);
    let outcome: BusyOutcome;
    try {
      await onAction();
      outcome = { status: "succeeded" };
    } catch (error) {
      outcome = { status: "failed", error };
    }
    pending.current = false;
    setBusy(false);
    onSettled?.(outcome);
  }

  return (
    <button
      type="button"
      className={styles.button}
      aria-busy={busy || undefined}
      aria-disabled={busy || undefined}
      onClick={() => void press()}
    >
      {busy ? busyLabel : label}
    </button>
  );
}
