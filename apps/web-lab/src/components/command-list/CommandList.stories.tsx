import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { CommandList, type Command } from "./CommandList.tsx";
import demo from "./demo.module.css";

const COMMANDS: Command[] = [
  { id: "new", label: "New document", detail: "Start from a blank page" },
  { id: "recent", label: "Open recent", detail: "Pick from the files opened lately" },
  { id: "save", label: "Save", detail: "Write the changes to this file" },
  { id: "copy", label: "Save a copy", detail: "Keep this version under a new name" },
  { id: "rename", label: "Rename", detail: "Change this file's name" },
  { id: "share", label: "Share", detail: "Invite people to this file" },
  { id: "print", label: "Print" },
  { id: "pdf", label: "Export as PDF", detail: "Write a copy for reading only" },
  { id: "find", label: "Find and replace" },
  { id: "line", label: "Go to line" },
  { id: "sidebar", label: "Show or hide the sidebar" },
  { id: "zoom-in", label: "Zoom in", detail: "Make everything larger" },
  { id: "zoom-out", label: "Zoom out", detail: "Make everything smaller" },
  { id: "zoom-reset", label: "Reset zoom", detail: "Back to 100 percent" },
  { id: "settings", label: "Settings", detail: "Change how the app looks and works" },
  { id: "keys", label: "Keyboard shortcuts", detail: "See every shortcut" },
  { id: "problem", label: "Report a problem" },
  { id: "updates", label: "Check for updates" },
  { id: "close", label: "Close window" },
  { id: "quit", label: "Quit", detail: "Close every window" },
];

// The parent: it says what ran, and clears that as soon as the filter changes, so the line
// never outlives the command it reports.
function Palette() {
  const [ran, setRan] = useState("");
  return (
    <div className={demo.page}>
      <CommandList
        label="Command"
        commands={COMMANDS}
        placeholder="Type to filter"
        emptyText="No command matches this filter."
        countText={(n) => (n === 1 ? "1 result" : `${n} results`)}
        clearLabel="Clear filter"
        onActivate={(command) => setRan(`Ran “${command.label}”.`)}
        onQueryChange={() => setRan("")}
      />
      <output className={demo.result}>{ran}</output>
    </div>
  );
}

const meta = {
  title: "Command list",
  component: Palette,
} satisfies Meta<typeof Palette>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Closed: Story = {};

export const OpenWithFewResults: Story = {
  // "zoom" leaves three commands, which fit in the list without scrolling.
  play: async ({ canvas, userEvent }) => {
    await userEvent.type(canvas.getByRole("combobox", { name: "Command" }), "zoom");
    await canvas.findByRole("listbox");
  },
};

export const OpenWithEnoughResultsToScroll: Story = {
  play: async ({ canvas, userEvent }) => {
    // A click in the field opens the full list, its first option active.
    await userEvent.click(canvas.getByRole("combobox", { name: "Command" }));
    await canvas.findByRole("listbox");
  },
};

export const ActiveOptionAtTheEnd: Story = {
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole("combobox", { name: "Command" }));
    await userEvent.keyboard("{End}");
    await canvas.findByRole("listbox");
  },
};

export const Empty: Story = {
  play: async ({ canvas, userEvent }) => {
    await userEvent.type(canvas.getByRole("combobox", { name: "Command" }), "zzz");
    await canvas.findByText("No command matches this filter.");
  },
};
