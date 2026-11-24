import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { BusyButton } from "./BusyButton.tsx";
import demo from "./demo.module.css";

type Result = "succeeds" | "fails" | "never settles";

// A pretend request: one timer of 1200 ms (the tests count them), or none at all.
function request(result: Result): Promise<void> {
  if (result === "never settles") return new Promise<void>(() => {});
  return new Promise<void>((resolve, reject) => {
    setTimeout(() => {
      if (result === "succeeds") resolve();
      else reject(new Error("refused"));
    }, 1200);
  });
}

// The parent: it clears the last outcome when a new attempt starts, and says the outcome
// beside the button once the button reports it. Both regions are in the page from the start.
function SaveDemo({ result }: { result: Result }) {
  const [saved, setSaved] = useState("");
  const [failed, setFailed] = useState("");
  return (
    <div className={demo.row}>
      <BusyButton
        label="Save"
        busyLabel="Saving…"
        onAction={() => {
          setSaved("");
          setFailed("");
          return request(result);
        }}
        onSettled={(outcome) => {
          if (outcome.status === "succeeded") setSaved("Saved.");
          else setFailed("Could not save. Try again.");
        }}
      />
      <p role="status" className={demo.ok}>
        {saved}
      </p>
      <p role="alert" className={demo.problem}>
        {failed}
      </p>
    </div>
  );
}

const meta = {
  title: "Busy button",
  component: SaveDemo,
} satisfies Meta<typeof SaveDemo>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Idle: Story = { args: { result: "succeeds" } };

export const Busy: Story = {
  args: { result: "never settles" },
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Save" }));
    await canvas.findByRole("button", { name: "Saving…" });
  },
};

export const Succeeded: Story = {
  args: { result: "succeeds" },
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Save" }));
    await canvas.findByText("Saved.", {}, { timeout: 3000 });
  },
};

export const Failed: Story = {
  args: { result: "fails" },
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Save" }));
    await canvas.findByText("Could not save. Try again.", {}, { timeout: 3000 });
  },
};
