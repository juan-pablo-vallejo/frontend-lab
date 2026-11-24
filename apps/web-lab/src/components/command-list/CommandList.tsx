import {
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import styles from "./CommandList.module.css";

export type Command = {
  id: string;
  label: string;
  /** A second line under the label. */
  detail?: string;
};

export type CommandListProps = {
  /** The field's visible label. */
  label: string;
  commands: readonly Command[];
  /** Runs a command: on Enter, or on a click on its row. */
  onActivate: (command: Command) => void;
  /** Told every change of the filter text. */
  onQueryChange?: (query: string) => void;
  /** Said, in the status line, while the filter leaves nothing. */
  emptyText: string;
  /** Said, in the status line, while the list is open: "6 results". */
  countText: (count: number) => string;
  /** The button that empties the filter. */
  clearLabel: string;
  placeholder?: string;
};

function matches(command: Command, query: string): boolean {
  return command.label.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase());
}

// A filter field with a list of results: a combobox with a listbox popup, as in the WAI-ARIA
// Authoring Practices (https://www.w3.org/WAI/ARIA/apg/patterns/combobox/). Focus stays in
// the field; the active option is named by aria-activedescendant, carries aria-selected,
// and is the one row drawn highlighted. There is one active option, set by the keys and by
// pointer movement alike, so the two never disagree.
export function CommandList({
  label,
  commands,
  onActivate,
  onQueryChange,
  emptyText,
  countText,
  clearLabel,
  placeholder,
}: CommandListProps) {
  const base = useId();
  const fieldId = `${base}field`;
  const listId = `${base}list`;
  const optionId = (command: Command) => `${base}option-${command.id}`;

  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const field = useRef<HTMLInputElement>(null);
  const list = useRef<HTMLUListElement>(null);

  const results = useMemo(
    () => commands.filter((c) => matches(c, query)),
    [commands, query],
  );
  const showList = open && results.length > 0;
  const showEmpty = open && results.length === 0;
  // The active option is always one of the results shown; the first when none is chosen.
  const active = showList
    ? (results.find((c) => c.id === activeId) ?? results[0])
    : undefined;

  // The active option is always in view: scroll the list itself, never the page.
  useLayoutEffect(() => {
    const box = list.current;
    if (!box || !active) return;
    const row = document.getElementById(optionId(active));
    if (!row) return;
    if (row.offsetTop < box.scrollTop) box.scrollTop = row.offsetTop;
    else if (row.offsetTop + row.offsetHeight > box.scrollTop + box.clientHeight) {
      box.scrollTop = row.offsetTop + row.offsetHeight - box.clientHeight;
    }
  });

  function changeQuery(next: string) {
    setQuery(next);
    setActiveId(null);
    setOpen(true);
    onQueryChange?.(next);
  }

  function move(to: "next" | "previous" | "first" | "last") {
    if (results.length === 0) return;
    const at = active ? results.indexOf(active) : -1;
    const index = {
      next: Math.min(at + 1, results.length - 1),
      previous: Math.max(at - 1, 0),
      first: 0,
      last: results.length - 1,
    }[to];
    setActiveId(results[index]!.id);
  }

  function activate(command: Command) {
    setOpen(false);
    setActiveId(null);
    onActivate(command);
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    switch (event.key) {
      case "ArrowDown":
      case "ArrowUp": {
        event.preventDefault();
        if (!open) {
          setOpen(true);
          if (event.altKey) return;
          // Opening by ArrowUp starts from the end, as in the pattern.
          const first = event.key === "ArrowDown" ? results[0] : results.at(-1);
          setActiveId(first?.id ?? null);
          return;
        }
        move(event.key === "ArrowDown" ? "next" : "previous");
        return;
      }
      case "Home":
      case "End":
        // While the list is open these move the active option; closed, they move the caret.
        if (!showList) return;
        event.preventDefault();
        move(event.key === "Home" ? "first" : "last");
        return;
      case "Enter":
        if (!active) return;
        event.preventDefault();
        activate(active);
        return;
      case "Escape":
        // Taken only when it does something here; otherwise it stays the page's, so that a
        // dialog around the field still closes on it.
        if (open) {
          event.preventDefault();
          setOpen(false);
        } else if (query !== "") {
          event.preventDefault();
          changeQueryClosed("");
        }
        return;
      case "Tab":
        setOpen(false);
        return;
    }
  }

  function changeQueryClosed(next: string) {
    setQuery(next);
    setActiveId(null);
    onQueryChange?.(next);
  }

  let status = "";
  if (showEmpty) status = emptyText;
  else if (showList) status = countText(results.length);

  return (
    <div className={styles.root}>
      <label htmlFor={fieldId} className={styles.label}>
        {label}
      </label>
      <div className={styles.fieldRow}>
        <input
          ref={field}
          id={fieldId}
          className={styles.field}
          type="text"
          role="combobox"
          autoComplete="off"
          spellCheck={false}
          aria-autocomplete="list"
          aria-expanded={showList}
          aria-controls={listId}
          aria-activedescendant={active ? optionId(active) : undefined}
          placeholder={placeholder}
          value={query}
          onChange={(event) => changeQuery(event.target.value)}
          onKeyDown={onKeyDown}
          onClick={() => setOpen(true)}
          onBlur={() => setOpen(false)}
        />
        {query !== "" && (
          <button
            type="button"
            className={styles.clear}
            onClick={() => {
              changeQuery("");
              field.current?.focus();
            }}
          >
            {clearLabel}
          </button>
        )}
      </div>
      <div className={styles.popup}>
        <ul
          ref={list}
          id={listId}
          role="listbox"
          aria-label={label}
          className={styles.list}
          hidden={!showList}
          // A press on a row must not take focus from the field.
          onPointerDown={(event) => event.preventDefault()}
        >
          {results.map((command) => (
            <li
              key={command.id}
              id={optionId(command)}
              role="option"
              aria-selected={command === active}
              className={styles.option}
              // Movement, not entry: a row scrolled under a still pointer does not take over.
              onPointerMove={() => {
                if (command !== active) setActiveId(command.id);
              }}
              onClick={() => activate(command)}
            >
              <span data-part="label" className={styles.optionLabel}>
                {command.label}
              </span>
              {command.detail && (
                <span data-part="detail" className={styles.detail}>
                  {command.detail}
                </span>
              )}
            </li>
          ))}
        </ul>
        <p role="status" className={styles.status}>
          {status}
        </p>
      </div>
    </div>
  );
}
