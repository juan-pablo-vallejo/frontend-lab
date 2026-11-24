// Functions that run inside the page. Playwright sends each one as source text, so none of
// them may use anything from this module's scope: what they share is installed on
// `window.__lab` by `installHelpers`, which runs before any of the page's own scripts.

import type { Box, Described, FocusStop, Measurements, MotionEntry } from "./types.ts";

type Snapshot = Record<string, string>;

type LayoutShiftEntry = PerformanceEntry & {
  value: number;
  hadRecentInput: boolean;
  sources?: { node: Node | null }[];
};

type AxeGlobal = {
  setup: (node: Document) => unknown;
  teardown: () => void;
  commons: {
    aria: { getRole: (el: Element) => string | null };
    text: { accessibleText: (el: Element) => string };
  };
};

export type LabHelpers = {
  selectorOf: (el: Element) => string;
  describe: (elements: Element[]) => Described[];
  snapshot: (el: Element) => Snapshot;
  before: WeakMap<Element, Snapshot>;
  shifts: Measurements["layoutShift"]["shifts"];
};

declare global {
  interface Window {
    __lab: LabHelpers;
    axe?: AxeGlobal;
  }
}

export function installHelpers(): void {
  const selectorOf = (el: Element): string => {
    const parts: string[] = [];
    let node: Element | null = el;
    while (node) {
      if (node.id && document.querySelectorAll(`#${CSS.escape(node.id)}`).length === 1) {
        parts.unshift(`#${CSS.escape(node.id)}`);
        break;
      }
      const tag = node.localName;
      const parent: Element | null = node.parentElement;
      if (!parent) {
        parts.unshift(tag);
        break;
      }
      const cls = node.classList[0];
      let part = cls ? `${tag}.${CSS.escape(cls)}` : tag;
      const same = Array.from(parent.children).filter((child) => child.localName === tag);
      if (same.length > 1) part += `:nth-of-type(${same.indexOf(node) + 1})`;
      parts.unshift(part);
      node = parent;
    }
    return parts.join(" > ");
  };

  // The one description of an element in the evidence. `interactive` and `focusAfter` take
  // all of it; `focus.stops` names its elements with the same `selectorOf`. Role and
  // accessible name are axe's, and the tag name stands for the role of an element that has
  // none. It throws when axe is not in the page or fails on an element: there is no other
  // way to a role or a name.
  const describe = (elements: Element[]): Described[] => {
    const axe = window.axe;
    if (!axe) throw new Error("axe is not in the page");
    axe.setup(document);
    try {
      return elements.map((el) => ({
        selector: selectorOf(el),
        role: axe.commons.aria.getRole(el) ?? el.localName,
        name: axe.commons.text.accessibleText(el).trim(),
      }));
    } finally {
      axe.teardown();
    }
  };

  const snapshot = (el: Element): Snapshot => {
    const cs = getComputedStyle(el);
    const sides = ["top", "right", "bottom", "left"];
    // Not drawn: the keyword transparent, or an alpha of 0. Alpha is the fourth component of
    // a comma-separated colour, or what follows the slash of a space-separated one.
    const clear = (color: string): boolean => {
      const value = color.trim().toLowerCase();
      if (value === "transparent") return true;
      const inner = /^[a-z-]+\((.*)\)$/.exec(value)?.[1];
      if (inner === undefined) return false;
      let alpha: string | undefined;
      if (inner.includes("/")) alpha = inner.split("/").pop();
      else if (inner.includes(",")) alpha = inner.split(",")[3];
      if (alpha === undefined) return false;
      const number = alpha.trim().endsWith("%")
        ? parseFloat(alpha) / 100
        : parseFloat(alpha);
      return number === 0;
    };
    // A line is drawn only with a style other than none or hidden, a width above zero and a
    // colour that is not fully transparent. The browser's own ring (style auto) counts.
    const drawn = (style: string, width: string, color: string, rest = "") =>
      style === "none" || style === "hidden" || parseFloat(width) === 0 || clear(color)
        ? "none"
        : `${style} ${width} ${color} ${rest}`.trim();
    // A shadow is drawn only when some layer has a colour and a size.
    const shadow = (value: string): string => {
      if (value === "none") return "none";
      const layers = value.split(/,(?![^(]*\))/).filter((layer) => {
        const color = /(rgba?|hsla?|color)\([^)]*\)|transparent/.exec(layer)?.[0] ?? "";
        const sizes = layer.replace(color, "").match(/-?[\d.]+px/g) ?? [];
        return !clear(color) && sizes.some((size) => parseFloat(size) !== 0);
      });
      return layers.length === 0 ? "none" : layers.join(",");
    };
    return {
      outline: drawn(cs.outlineStyle, cs.outlineWidth, cs.outlineColor, cs.outlineOffset),
      "box-shadow": shadow(cs.boxShadow),
      border: sides
        .map((side) =>
          drawn(
            cs.getPropertyValue(`border-${side}-style`),
            cs.getPropertyValue(`border-${side}-width`),
            cs.getPropertyValue(`border-${side}-color`),
          ),
        )
        .join(", "),
      background: `${cs.backgroundColor} ${cs.backgroundImage}`,
    };
  };

  const shifts: LabHelpers["shifts"] = [];
  window.__lab = {
    selectorOf,
    describe,
    snapshot,
    before: new WeakMap(),
    shifts,
  };
  try {
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries() as LayoutShiftEntry[]) {
        shifts.push({
          value: entry.value,
          startTime: entry.startTime,
          hadRecentInput: entry.hadRecentInput,
          sources: (entry.sources ?? [])
            .map((source) =>
              source.node instanceof Element
                ? selectorOf(source.node)
                : source.node?.parentElement
                  ? selectorOf(source.node.parentElement)
                  : "",
            )
            .filter(Boolean),
        });
      }
    }).observe({ type: "layout-shift", buffered: true });
  } catch {
    // A browser without layout-shift entries reports a score of 0.
  }
}

// True when no finite animation or transition is still running.
export function animationsDone(): boolean {
  return document.getAnimations().every((animation) => {
    if (animation.playState !== "running") return true;
    const iterations = animation.effect?.getComputedTiming().iterations;
    return iterations === Infinity;
  });
}

export function collectStatic(): Pick<
  Measurements,
  "viewport" | "overflow" | "interactive" | "truncation" | "document" | "liveRegions"
> {
  const { selectorOf, describe } = window.__lab;
  const doc = document.documentElement;
  const clientWidth = doc.clientWidth;
  const all = Array.from(document.querySelectorAll("body *"));
  const round = (n: number) => Math.round(n * 100) / 100;
  const toBox = (r: DOMRect): Box => ({
    x: round(r.x),
    y: round(r.y),
    width: round(r.width),
    height: round(r.height),
  });

  const inContainer = (el: Element): boolean => {
    for (let node: Element | null = el; node && node !== doc; node = node.parentElement) {
      const cs = getComputedStyle(node);
      if (cs.position === "fixed") return true;
      if (node !== el && cs.overflowX !== "visible") return true;
    }
    return false;
  };
  const sticking: Measurements["overflow"]["elements"] = [];
  const stickingSet = new Set<Element>();
  for (const el of all) {
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) continue;
    if (r.right <= clientWidth + 0.5 && r.left >= -0.5) continue;
    if (inContainer(el)) continue;
    stickingSet.add(el);
    if (el.parentElement && stickingSet.has(el.parentElement)) continue;
    sticking.push({
      selector: selectorOf(el),
      left: round(r.left),
      right: round(r.right),
    });
  }

  const interactiveSelector = [
    "a[href]",
    "button",
    "input:not([type=hidden])",
    "select",
    "textarea",
    "summary",
    "[role=button]",
    "[role=link]",
    "[role=checkbox]",
    "[role=switch]",
    "[role=tab]",
    "[role=menuitem]",
    "[tabindex]:not([tabindex='-1'])",
    "[contenteditable='']",
    "[contenteditable='true']",
  ].join(",");
  const STATE_ATTRIBUTES = [
    "aria-busy",
    "aria-disabled",
    "disabled",
    "readonly",
    "aria-readonly",
    "aria-expanded",
    "aria-pressed",
    "aria-selected",
    "aria-checked",
    "aria-invalid",
    "aria-describedby",
    "aria-current",
  ];
  // Only what is drawn is listed. All of it is described in one go: axe reads the page once.
  const candidates = Array.from(document.querySelectorAll(interactiveSelector));
  const drawn = candidates.filter((el) => {
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) return false;
    return getComputedStyle(el).visibility === "visible";
  });
  const described = describe(drawn);
  const interactive: Measurements["interactive"] = drawn.map((el, index) => {
    const states: Record<string, string | boolean> = {};
    for (const attribute of STATE_ATTRIBUTES) {
      if (!el.hasAttribute(attribute)) continue;
      states[attribute] =
        attribute === "disabled" || attribute === "readonly"
          ? true
          : (el.getAttribute(attribute) ?? "");
    }
    const parentText = (el.parentElement?.textContent ?? "").trim();
    const ownText = (el.textContent ?? "").trim();
    return {
      ...described[index]!,
      box: toBox(el.getBoundingClientRect()),
      inlineInText:
        el.localName === "a" &&
        getComputedStyle(el).display === "inline" &&
        parentText.length > ownText.length,
      states,
    };
  });

  // Live regions: explicit roles that are live by default, and any aria-live.
  const IMPLICIT_LIVE: Record<string, string> = {
    status: "polite",
    alert: "assertive",
    log: "polite",
  };
  const liveRegions: Measurements["liveRegions"] = Array.from(
    document.querySelectorAll(
      '[role="status"], [role="alert"], [role="log"], [aria-live]',
    ),
  ).map((el) => {
    const role = el.getAttribute("role");
    return {
      selector: selectorOf(el),
      role,
      live: el.getAttribute("aria-live") ?? (role ? (IMPLICIT_LIVE[role] ?? null) : null),
      text: (el.textContent ?? "").replace(/\s+/g, " ").trim(),
    };
  });

  const truncation: Measurements["truncation"] = [];
  // A box that clips text which does not wrap, or clamps it; the text may sit in children.
  for (const el of all) {
    const text = (el.textContent ?? "").replace(/\s+/g, " ").trim();
    if (!text) continue;
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) continue;
    const cs = getComputedStyle(el);
    const noWrap =
      cs.whiteSpace === "nowrap" ||
      cs.whiteSpace === "pre" ||
      cs.getPropertyValue("text-wrap-mode") === "nowrap";
    const clipsX = cs.overflowX === "hidden" || cs.overflowX === "clip";
    const clamp = cs.webkitLineClamp && cs.webkitLineClamp !== "none";
    const html = el as HTMLElement;
    const entry = {
      selector: selectorOf(el),
      text,
      scrollWidth: html.scrollWidth,
      clientWidth: html.clientWidth,
      scrollHeight: html.scrollHeight,
      clientHeight: html.clientHeight,
    };
    if (noWrap && clipsX && html.scrollWidth > html.clientWidth + 1) {
      truncation.push({ ...entry, kind: "single-line" });
    } else if (clamp && html.scrollHeight > html.clientHeight + 1) {
      truncation.push({ ...entry, kind: "clamped" });
    }
  }

  return {
    document: {
      lang: document.documentElement.getAttribute("lang"),
      title: document.title,
    },
    liveRegions,
    viewport: { width: window.innerWidth, height: window.innerHeight },
    overflow: { scrollWidth: doc.scrollWidth, clientWidth, elements: sticking },
    interactive,
    truncation,
  };
}

export function collectMotion(): MotionEntry[] {
  const { selectorOf } = window.__lab;
  const toMs = (value: string): number => {
    const v = value.trim();
    if (v.endsWith("ms")) return parseFloat(v);
    if (v.endsWith("s")) return parseFloat(v) * 1000;
    return 0;
  };
  const list = (value: string): string[] => value.split(",").map((part) => part.trim());
  const pick = (items: string[], index: number): string =>
    items.length === 0 ? "" : (items[index % items.length] ?? "");

  const keyframes = new Map<string, Set<string>>();
  const walk = (rules: CSSRuleList) => {
    for (const rule of Array.from(rules)) {
      if (rule instanceof CSSKeyframesRule) {
        const props = keyframes.get(rule.name) ?? new Set<string>();
        for (const frame of Array.from(rule.cssRules)) {
          const style = (frame as CSSKeyframeRule).style;
          for (let i = 0; i < style.length; i += 1) props.add(style.item(i));
        }
        keyframes.set(rule.name, props);
      } else if ("cssRules" in rule) {
        walk((rule as CSSGroupingRule).cssRules);
      }
    }
  };
  const readSheets = (sheets: Iterable<CSSStyleSheet>) => {
    for (const sheet of sheets) {
      try {
        walk(sheet.cssRules);
      } catch {
        // a cross-origin sheet cannot be read; its keyframes are reported without properties
      }
    }
  };
  readSheets(Array.from(document.styleSheets));
  readSheets(document.adoptedStyleSheets);

  // Every element of the document and of each open shadow root, with its ::before and
  // ::after when they are drawn. Inside a shadow root the selector is `host >> inner`.
  const targets: { selector: string; style: CSSStyleDeclaration }[] = [];
  const visit = (root: Document | ShadowRoot, prefix: string) => {
    for (const el of Array.from(root.querySelectorAll("*"))) {
      const selector = prefix + selectorOf(el);
      targets.push({ selector, style: getComputedStyle(el) });
      for (const pseudo of ["::before", "::after"]) {
        const style = getComputedStyle(el, pseudo);
        if (style.content !== "none" && style.content !== "normal") {
          targets.push({ selector: selector + pseudo, style });
        }
      }
      if (el.shadowRoot) {
        readSheets(Array.from(el.shadowRoot.styleSheets));
        readSheets(el.shadowRoot.adoptedStyleSheets);
        visit(el.shadowRoot, `${selector} >> `);
      }
    }
  };
  visit(document, "");

  const entries: MotionEntry[] = [];
  for (const { selector, style: cs } of targets) {
    const tProps = list(cs.transitionProperty);
    const tDurations = list(cs.transitionDuration);
    tProps.forEach((property, index) => {
      const durationMs = toMs(pick(tDurations, index));
      if (durationMs > 0 && property !== "none") {
        entries.push({
          selector,
          kind: "transition",
          name: null,
          properties: [property],
          durationMs,
          iterations: 1,
        });
      }
    });
    const names = list(cs.animationName);
    const durations = list(cs.animationDuration);
    const counts = list(cs.animationIterationCount);
    names.forEach((name, index) => {
      if (name === "none") return;
      const durationMs = toMs(pick(durations, index));
      if (durationMs <= 0) return;
      const count = pick(counts, index);
      entries.push({
        selector,
        kind: "animation",
        name,
        properties: Array.from(keyframes.get(name) ?? []),
        durationMs,
        iterations: count === "infinite" ? "infinite" : Number(count),
      });
    });
  }
  return entries;
}

// Waits until the focused element has stayed the same for `steady` ms (giving up after
// `limit` ms) and describes it in that same turn: it is still what `document.activeElement`
// gives, and nothing of the page runs between the reading and the description. null when
// focus is on the body (where it goes when its element leaves the page) or nowhere, and
// when the element cannot be described, as when axe is not in the page.
export function recordSteadyFocus({
  steady,
  limit,
}: {
  steady: number;
  limit: number;
}): Promise<Measurements["focusAfter"]> {
  return new Promise((done) => {
    const start = performance.now();
    let last = document.activeElement;
    let since = start;
    const tick = () => {
      const now = performance.now();
      if (document.activeElement !== last) {
        last = document.activeElement;
        since = now;
      }
      if (now - since >= steady || now - start >= limit) {
        let described: Measurements["focusAfter"] = null;
        try {
          if (last && last !== document.body && last !== document.documentElement) {
            described = window.__lab.describe([last])[0] ?? null;
          }
        } catch {
          // Not described: null says so, and nothing is made up in its place.
        }
        done(described);
      } else {
        setTimeout(tick, 25);
      }
    };
    tick();
  });
}

// True when the focused element has no finite animation or transition still running.
export function focusedSettled(): boolean {
  const el = document.activeElement;
  if (!el) return true;
  return el.getAnimations().every((animation) => {
    if (animation.playState !== "running") return true;
    return animation.effect?.getComputedTiming().iterations === Infinity;
  });
}

// Records how every element is drawn while nothing is focused; focusStop compares against it.
export function prepareFocusWalk(): void {
  const lab = window.__lab;
  const active = document.activeElement as HTMLElement | null;
  active?.blur?.();
  lab.before = new WeakMap();
  for (const el of Array.from(document.querySelectorAll("*"))) {
    lab.before.set(el, lab.snapshot(el));
  }
  // Start sequential navigation from the top of the document.
  const body = document.body;
  body.setAttribute("tabindex", "-1");
  body.focus();
  body.removeAttribute("tabindex");
}

export function focusStop(): (FocusStop & { atBody: boolean; key: string }) | null {
  const lab = window.__lab;
  const el = document.activeElement;
  if (!el || el === document.body || el === document.documentElement) {
    return {
      atBody: true,
      key: "",
      selector: "",
      changed: null,
      changedProperties: [],
      outlineStyle: "",
      outlineWidth: 0,
    };
  }
  const before = lab.before.get(el);
  const after = lab.snapshot(el);
  const changedProperties = before
    ? Object.keys(after).filter((prop) => after[prop] !== before[prop])
    : [];
  const cs = getComputedStyle(el);
  const selector = lab.selectorOf(el);
  return {
    atBody: false,
    key: selector,
    selector,
    changed: before ? changedProperties.length > 0 : null,
    changedProperties,
    outlineStyle: cs.outlineStyle,
    outlineWidth: cs.outlineStyle === "none" ? 0 : parseFloat(cs.outlineWidth),
  };
}

export function boxesOf(selectors: string[]): (Box | null)[] {
  return selectors.map((selector) => {
    try {
      const el = document.querySelector(selector);
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { x: r.x, y: r.y, width: r.width, height: r.height };
    } catch {
      return null;
    }
  });
}
