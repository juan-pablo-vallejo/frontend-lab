// The gallery's entries: one route per state of each component. Plain data, so the tests can
// read it without React Native.

export const pressableStates = ["idle", "pressed", "disabled", "busy"] as const;
export type PressableState = (typeof pressableStates)[number];

export const statusChipStates = ["saved", "sending", "sent", "attention"] as const;
export type StatusChipState = (typeof statusChipStates)[number];

export const gallery = [
  { component: "pressable", states: pressableStates },
  { component: "status-chip", states: statusChipStates },
] as const;

export type GalleryComponent = (typeof gallery)[number]["component"];

export function routeOf(component: GalleryComponent, state: string): string {
  return `/${component}/${state}`;
}

export function isState<T extends string>(
  states: readonly T[],
  value: unknown,
): value is T {
  return typeof value === "string" && (states as readonly string[]).includes(value);
}
