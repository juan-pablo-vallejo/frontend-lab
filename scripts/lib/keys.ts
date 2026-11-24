// The finding keys `measure` emits. Any axe violation without a key of its own is reported
// as `axe:<rule-id>`, so none is dropped.
export const KEYS = [
  "contrast",
  "target-size",
  "overflow",
  "missing-label",
  "focus-ring",
  "layout-shift",
  "long-animation",
  "reduced-motion",
  "truncation",
  "console-error",
  "request-failed",
] as const;

export type Key = (typeof KEYS)[number] | `axe:${string}`;

// axe rules whose violations carry one of the keys above.
export const AXE_RULE_KEYS: Record<string, Key> = {
  "color-contrast": "contrast",
  label: "missing-label",
  "select-name": "missing-label",
  "target-size": "target-size",
};

export function keyForAxeRule(ruleId: string): Key {
  return AXE_RULE_KEYS[ruleId] ?? `axe:${ruleId}`;
}
