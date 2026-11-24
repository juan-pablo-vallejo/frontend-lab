import type { Meta, StoryObj } from "@storybook/react-vite";
import { useRef, useState } from "react";
import { UndoToast, type ToastMessage } from "./UndoToast.tsx";
import demo from "./demo.module.css";

const MESSAGES = [
  "Quarterly figures",
  "Team offsite",
  "Supplier invoice",
  "Holiday rota",
];
const STRINGS = { undoLabel: "Undo", dismissLabel: "Dismiss" } as const;
const archived = (title: string) => `Archived “${title}”`;
const refused = (title: string) => `Could not undo. “${title}” stays archived.`;

// One message at a time, with Archive beside it. Archive keeps its place and its focus: the
// next message takes the place of the archived one.
function useArchive() {
  const [items, setItems] = useState(MESSAGES);
  const [message, setMessage] = useState<ToastMessage | null>(null);
  const last = useRef<string | null>(null);
  const nextId = useRef(1);
  return {
    current: items[0],
    message,
    archive() {
      const [title, ...rest] = items;
      if (title === undefined) return;
      last.current = title;
      setItems(rest);
      setMessage({ id: nextId.current++, kind: "done", text: archived(title) });
    },
    undo() {
      const title = last.current;
      last.current = null;
      if (title !== null) setItems((now) => [title, ...now]);
      setMessage(null);
    },
    dismiss() {
      last.current = null;
      setMessage(null);
    },
  };
}

function Pane({ motion }: { motion?: "system" | "reduce" }) {
  const box = useArchive();
  const archiveButton = useRef<HTMLButtonElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  return (
    <section className={demo.pane}>
      <h2 ref={heading} tabIndex={-1} className={demo.title}>
        {box.current ?? "Nothing left to archive"}
      </h2>
      {box.current !== undefined && (
        <>
          <button
            ref={archiveButton}
            type="button"
            className={demo.button}
            onClick={box.archive}
          >
            Archive
          </button>
        </>
      )}
      <label className={demo.field}>
        Note
        <input className={demo.input} type="text" />
      </label>
      <UndoToast
        {...STRINGS}
        message={box.message}
        onUndo={box.undo}
        onDismiss={box.dismiss}
        returnFocusTo={() => archiveButton.current}
        fallbackFocusTo={() => heading.current}
        motion={motion}
      />
    </section>
  );
}

// A list whose rows go when archived: the button pressed goes with its row, which leaves
// focus on nothing, so the toast takes it.
function List({ refuse = false }: { refuse?: boolean }) {
  const [items, setItems] = useState(MESSAGES);
  const [message, setMessage] = useState<ToastMessage | null>(null);
  const [refuseUndo, setRefuseUndo] = useState(refuse);
  const last = useRef<{ title: string; index: number } | null>(null);
  const focusAfter = useRef<string | null>(null);
  const buttons = useRef(new Map<string, HTMLButtonElement>());
  const heading = useRef<HTMLHeadingElement>(null);
  const nextId = useRef(1);

  function archive(title: string, index: number) {
    last.current = { title, index };
    setItems((now) => now.filter((t) => t !== title));
    setMessage({ id: nextId.current++, kind: "done", text: archived(title) });
  }

  function undo() {
    const gone = last.current;
    if (!gone) return;
    if (refuseUndo) {
      // The pretend server answers no: the refusal takes the toast's place and stays.
      last.current = null;
      setMessage({ id: nextId.current++, kind: "refused", text: refused(gone.title) });
      return;
    }
    last.current = null;
    focusAfter.current = gone.title;
    setItems((now) => [
      ...now.slice(0, gone.index),
      gone.title,
      ...now.slice(gone.index),
    ]);
    setMessage(null);
  }

  function dismiss() {
    const gone = last.current;
    focusAfter.current = gone ? (items[gone.index] ?? items.at(-1) ?? null) : null;
    last.current = null;
    setMessage(null);
  }

  return (
    <section className={demo.pane}>
      <h2 ref={heading} tabIndex={-1} className={demo.title}>
        Inbox
      </h2>
      {items.length === 0 ? (
        <p>Nothing left to archive.</p>
      ) : (
        <ul className={demo.list}>
          {items.map((title, index) => (
            <li key={title} className={demo.row}>
              <span>{title}</span>
              <button
                ref={(el) => {
                  if (el) buttons.current.set(title, el);
                  else buttons.current.delete(title);
                }}
                type="button"
                className={demo.button}
                aria-label={`Archive ${title}`}
                onClick={() => archive(title, index)}
              >
                Archive
              </button>
            </li>
          ))}
        </ul>
      )}
      <label className={demo.check}>
        <input
          type="checkbox"
          className={demo.box}
          checked={refuseUndo}
          onChange={(event) => setRefuseUndo(event.target.checked)}
        />
        Refuse the undo
      </label>
      <UndoToast
        {...STRINGS}
        message={message}
        onUndo={undo}
        onDismiss={dismiss}
        returnFocusTo={() =>
          (focusAfter.current && buttons.current.get(focusAfter.current)) ||
          heading.current
        }
      />
    </section>
  );
}

// The same pane inside a modal dialog: the toast must be drawn above the dialog and usable.
function InDialog() {
  const dialog = useRef<HTMLDialogElement>(null);
  const box = useArchive();
  const archiveButton = useRef<HTMLButtonElement>(null);
  const pageHeading = useRef<HTMLHeadingElement>(null);
  const dialogHeading = useRef<HTMLHeadingElement>(null);
  return (
    <section className={demo.pane}>
      <h2 ref={pageHeading} tabIndex={-1} className={demo.title}>
        Messages
      </h2>
      <button
        type="button"
        className={demo.button}
        onClick={() => dialog.current?.showModal()}
      >
        Open message
      </button>
      <dialog ref={dialog} aria-labelledby="dialog-title" className={demo.dialog}>
        <h2 ref={dialogHeading} id="dialog-title" tabIndex={-1} className={demo.title}>
          {box.current ?? "Nothing left to archive"}
        </h2>
        <div className={demo.actions}>
          {box.current !== undefined && (
            <button
              ref={archiveButton}
              type="button"
              className={demo.button}
              onClick={box.archive}
            >
              Archive
            </button>
          )}
          <button
            type="button"
            className={demo.button}
            onClick={() => dialog.current?.close()}
          >
            Close
          </button>
        </div>
      </dialog>
      <UndoToast
        {...STRINGS}
        message={box.message}
        onUndo={box.undo}
        onDismiss={box.dismiss}
        returnFocusTo={() => archiveButton.current}
        fallbackFocusTo={() =>
          dialog.current?.open ? dialogHeading.current : pageHeading.current
        }
      />
    </section>
  );
}

const meta = {
  title: "Toast with Undo",
  component: UndoToast,
  args: { ...STRINGS, message: null, onUndo: () => {}, onDismiss: () => {} },
} satisfies Meta<typeof UndoToast>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Shown: Story = {
  render: () => <Pane />,
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Archive" }));
    await canvas.findByText(archived("Quarterly figures"));
  },
};

export const FocusMovedToUndo: Story = {
  name: "Focus moved to Undo",
  render: () => <List />,
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(
      canvas.getByRole("button", { name: "Archive Quarterly figures" }),
    );
    await canvas.findByText(archived("Quarterly figures"));
  },
};

export const OverAnOpenDialog: Story = {
  render: () => <InDialog />,
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Open message" }));
    await userEvent.click(canvas.getByRole("button", { name: "Archive" }));
    await canvas.findByText(archived("Quarterly figures"));
  },
};

export const Refused: Story = {
  render: () => <List refuse />,
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(
      canvas.getByRole("button", { name: "Archive Quarterly figures" }),
    );
    await userEvent.click(await canvas.findByRole("button", { name: "Undo" }));
    await canvas.findByText(refused("Quarterly figures"));
  },
};

export const ReducedMotion: Story = {
  render: () => <Pane motion="reduce" />,
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Archive" }));
    await canvas.findByText(archived("Quarterly figures"));
  },
};
