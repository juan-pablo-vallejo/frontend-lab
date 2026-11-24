import { durations } from "@frontend-lab/motion";
import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type FocusEvent,
  type KeyboardEvent,
} from "react";
import { createPortal } from "react-dom";
import styles from "./UndoToast.module.css";

export type ToastMessage = {
  /** A new id is a new message: it restarts the timer and replaces what is shown. */
  id: string | number;
  text: string;
  /** "done" offers Undo and goes after `duration`; "refused" stays until dismissed. */
  kind: "done" | "refused";
};

export type UndoToastProps = {
  /** The message to show, or null for none. The parent owns it. */
  message: ToastMessage | null;
  undoLabel: string;
  dismissLabel: string;
  onUndo: () => void;
  /** Asked when the time runs out, on the close button and on Escape: set message to null. */
  onDismiss: () => void;
  /** How long a "done" message shows, in ms, not counting time paused. */
  duration?: number;
  /** Where focus goes when the toast closes with focus inside it. */
  returnFocusTo?: () => HTMLElement | null;
  /**
   * Where focus goes when neither that element nor the one focus came from can take it (gone,
   * hidden, inside a closed dialog): a heading with tabindex="-1", say. Never the body.
   */
  fallbackFocusTo?: () => HTMLElement | null;
  /** "reduce" fades without moving whatever the system setting, as an in-app setting would. */
  motion?: "system" | "reduce";
};

const TEXT_INPUT =
  /^(text|search|email|url|tel|password|number|date|datetime-local|month|time|week)$/;

function isTextField(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable || target instanceof HTMLTextAreaElement) return true;
  return target instanceof HTMLInputElement && TEXT_INPUT.test(target.type);
}

// The topmost open modal dialog. A modal dialog makes everything outside it inert, even an
// element drawn above it in the top layer, so the toast moves inside the open dialog to stay
// usable there (checked in Chromium: a popover outside the dialog cannot be clicked or focused).
function useTopModalDialog(): HTMLDialogElement | null {
  const [dialog, setDialog] = useState<HTMLDialogElement | null>(null);
  useEffect(() => {
    const find = () => {
      const open = [...document.querySelectorAll("dialog")].filter((d) =>
        d.matches(":modal"),
      );
      setDialog(open.at(-1) ?? null);
    };
    find();
    const observer = new MutationObserver(find);
    observer.observe(document.documentElement, {
      subtree: true,
      attributes: true,
      attributeFilter: ["open"],
    });
    return () => observer.disconnect();
  }, []);
  return dialog;
}

export function UndoToast({
  message,
  undoLabel,
  dismissLabel,
  onUndo,
  onDismiss,
  duration = 7000,
  returnFocusTo,
  fallbackFocusTo,
  motion = "system",
}: UndoToastProps) {
  // What is drawn: the current message, or the last one while it leaves.
  const [shown, setShown] = useState<ToastMessage | null>(message);
  const [leaving, setLeaving] = useState(false);
  const dialog = useTopModalDialog();
  // The container the region was last made in, set a frame after it was made. The card is
  // drawn only once the region it goes into has been in the page, open and empty: a message
  // is always inserted into a region that was there before it, never created with it.
  const [readyIn, setReadyIn] = useState<HTMLDialogElement | null | undefined>(undefined);
  const ready = readyIn === dialog;
  const wantsFocus = useRef(false);

  const layerRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const focusInside = useRef(false);
  const focusBefore = useRef<HTMLElement | null>(null);
  const hovering = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const remaining = useRef(duration);
  const startedAt = useRef(0);

  // The latest callbacks, for timers and listeners set up earlier.
  const latest = useRef({ onUndo, onDismiss, returnFocusTo, fallbackFocusTo });
  useLayoutEffect(() => {
    latest.current = { onUndo, onDismiss, returnFocusTo, fallbackFocusTo };
  });

  const canUndo = shown?.kind === "done" && !leaving;

  function stopTimer() {
    if (timer.current === undefined) return;
    clearTimeout(timer.current);
    timer.current = undefined;
    remaining.current -= Date.now() - startedAt.current;
  }

  function startTimer() {
    if (!canUndo || timer.current !== undefined) return;
    if (hovering.current || focusInside.current) return;
    startedAt.current = Date.now();
    timer.current = setTimeout(
      () => {
        timer.current = undefined;
        latest.current.onDismiss();
      },
      Math.max(0, remaining.current),
    );
  }

  // The toast is drawn in the top layer, above everything in the page, an open modal dialog
  // included: a z-index cannot reach above the top layer, a popover is in it.
  useLayoutEffect(() => {
    const layer = layerRef.current;
    if (layer && !layer.matches(":popover-open")) layer.showPopover();
    // A new region (first mount, or moved into or out of a dialog) gets its card a frame
    // later, so it is in the page, open and empty, before any text arrives in it.
    const frame = requestAnimationFrame(() => setReadyIn(dialog));
    return () => cancelAnimationFrame(frame);
  }, [dialog]);

  // A message arrives, changes, or goes.
  useLayoutEffect(() => {
    if (message) {
      setShown(message);
      setLeaving(false);
    } else if (shown) {
      setLeaving(true);
    }
    // Only the message decides; `shown` is read as it was.
  }, [message]);

  // A new message is shown: raise the layer above any later top-layer element, take focus
  // when the action left it on nothing (or when it was in the toast being replaced), start
  // the timer.
  useLayoutEffect(() => {
    if (!shown || leaving) return;
    const layer = layerRef.current;
    const active = document.activeElement;
    const onNothing = !active || active === document.body;
    // Hiding a popover moves focus out of it, so it is raised only when focus is elsewhere.
    if (layer && !layer.contains(active)) {
      layer.hidePopover();
      layer.showPopover();
    }
    if (cardRef.current) cardRef.current.inert = false;
    wantsFocus.current = onNothing || focusInside.current;
    clearTimeout(timer.current);
    timer.current = undefined;
    remaining.current = duration;
    if (shown.kind === "done") startTimer();
    return () => {
      clearTimeout(timer.current);
      timer.current = undefined;
    };
    // A new id is a new message; the same message drawn again is not.
  }, [shown?.id, shown?.kind, leaving]);

  // Focus taken for a new message lands once its card is drawn, which may be a frame later.
  useLayoutEffect(() => {
    if (!wantsFocus.current || !cardRef.current) return;
    wantsFocus.current = false;
    cardRef.current.querySelector("button")?.focus();
  }, [ready, shown?.id, leaving]);

  // Leaving: focus inside goes back where it belongs, then the card stops taking input and
  // is removed once its exit has run.
  useLayoutEffect(() => {
    if (!leaving) return;
    const card = cardRef.current;
    if (card && card.contains(document.activeElement)) {
      // The first that really takes focus: the caller's target, where focus came from, the
      // caller's fallback. One that is gone, hidden or inside a closed dialog does not.
      const { returnFocusTo, fallbackFocusTo } = latest.current;
      for (const pick of [returnFocusTo, () => focusBefore.current, fallbackFocusTo]) {
        const target = pick?.();
        if (!target?.isConnected || card.contains(target)) continue;
        target.focus();
        if (document.activeElement === target) break;
      }
    }
    focusInside.current = false;
    hovering.current = false;
    if (card) card.inert = true;
    const done = setTimeout(() => {
      setShown(null);
      setLeaving(false);
    }, durations.mediumOut);
    return () => clearTimeout(done);
  }, [leaving]);

  // Ctrl+Z or Cmd+Z undoes while Undo is offered, unless a text field has focus: there the
  // keys undo typing.
  useEffect(() => {
    if (!canUndo) return;
    const onKey = (event: globalThis.KeyboardEvent) => {
      if (!(event.ctrlKey || event.metaKey) || event.altKey || event.shiftKey) return;
      if (event.key.toLowerCase() !== "z" || isTextField(event.target)) return;
      event.preventDefault();
      latest.current.onUndo();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [canUndo]);

  function onFocus(event: FocusEvent<HTMLDivElement>) {
    if (!focusInside.current) {
      const from = event.relatedTarget;
      focusBefore.current = from instanceof HTMLElement ? from : null;
    }
    focusInside.current = true;
    stopTimer();
  }

  function onBlur(event: FocusEvent<HTMLDivElement>) {
    if (event.currentTarget.contains(event.relatedTarget as Node | null)) return;
    focusInside.current = false;
    startTimer();
  }

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key !== "Escape") return;
    // Escape closes the toast only; an open dialog around it stays open.
    event.preventDefault();
    event.stopPropagation();
    latest.current.onDismiss();
  }

  const layer = (
    <div ref={layerRef} popover="manual" className={styles.layer}>
      <div role="status" className={styles.region}>
        {shown && ready && (
          <div
            key={shown.id}
            ref={cardRef}
            className={styles.card}
            data-kind={shown.kind}
            data-leaving={leaving || undefined}
            data-motion={motion}
            onPointerEnter={() => {
              hovering.current = true;
              stopTimer();
            }}
            onPointerLeave={() => {
              hovering.current = false;
              startTimer();
            }}
            onFocus={onFocus}
            onBlur={onBlur}
            onKeyDown={onKeyDown}
          >
            {shown.kind === "refused" && (
              <svg className={styles.icon} viewBox="0 0 20 20" aria-hidden="true">
                <circle cx="10" cy="10" r="8.5" strokeWidth="2" />
                <path d="M10 5.5v5.5M10 14v0.5" strokeWidth="2" />
              </svg>
            )}
            <p className={styles.text}>{shown.text}</p>
            {shown.kind === "done" && (
              <button type="button" className={styles.undo} onClick={() => onUndo()}>
                {undoLabel}
              </button>
            )}
            <button
              type="button"
              className={styles.dismiss}
              aria-label={dismissLabel}
              onClick={() => onDismiss()}
            >
              <svg className={styles.cross} viewBox="0 0 16 16" aria-hidden="true">
                <path d="M3.5 3.5l9 9M12.5 3.5l-9 9" strokeWidth="2" />
              </svg>
            </button>
          </div>
        )}
      </div>
    </div>
  );

  return dialog ? createPortal(layer, dialog) : layer;
}
