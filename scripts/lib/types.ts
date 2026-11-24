// Shapes shared by capture (which writes them) and measure (which reads them).

export type Step =
  | { goto: string }
  | { click: string }
  | { fill: [string, string] }
  | { press: string }
  | { waitFor: string }
  | { waitMs: number };

export type Target = {
  name: string;
  baseUrl?: string;
  serve?: { dir: string };
  signIn?: Step[];
  routes: { id: string; path: string; waitFor?: string }[];
  widths?: number[];
  languages?: { id: string; query?: string; steps?: Step[] }[];
  states?: { id: string; routes?: string[]; steps: Step[] }[];
};

export type Unit = {
  id: string;
  route: string;
  width: number;
  lang: string;
  state: string | null;
  url: string;
  shot: string;
};

export type Manifest = {
  target: string;
  startedAt: string;
  endedAt: string;
  browser: { name: string; version: string };
  playwright: string;
  repo: { commit: string; dirty: boolean } | null;
  options: {
    target: string;
    only: string | null;
    reducedMotion: boolean;
    allowRemote: boolean;
    viewportHeight: number;
  };
  units: Unit[];
  failed: { id: string; error: string }[];
};

export type Box = { x: number; y: number; width: number; height: number };

export type AxeNode = {
  selector: string;
  summary: string;
  box: Box | null;
  data: Record<string, unknown> | null;
};

export type AxeViolation = {
  id: string;
  impact: string | null;
  help: string;
  helpUrl: string;
  nodes: AxeNode[];
};

export type AxeUnit = { violations: AxeViolation[]; incomplete: AxeViolation[] };

export type MotionEntry = {
  selector: string;
  kind: "transition" | "animation";
  name: string | null;
  properties: string[];
  durationMs: number;
  iterations: number | "infinite";
};

export type FocusStop = {
  selector: string;
  changed: boolean | null;
  changedProperties: string[];
  outlineStyle: string;
  outlineWidth: number;
};

export type Measurements = {
  settled: boolean;
  viewport: { width: number; height: number };
  overflow: {
    scrollWidth: number;
    clientWidth: number;
    elements: { selector: string; left: number; right: number }[];
  };
  interactive: {
    selector: string;
    role: string;
    name: string;
    box: Box;
    inlineInText: boolean;
  }[];
  focus: { stops: FocusStop[]; limitReached: boolean };
  motion: { noPreference: MotionEntry[] | null; reduce: MotionEntry[] };
  layoutShift: {
    score: number;
    shifts: {
      value: number;
      startTime: number;
      hadRecentInput: boolean;
      sources: string[];
    }[];
  };
  truncation: {
    selector: string;
    kind: "single-line" | "clamped";
    text: string;
    scrollWidth: number;
    clientWidth: number;
    scrollHeight: number;
    clientHeight: number;
  }[];
};

export type ConsoleRecord = {
  messages: { type: "error" | "warning"; text: string }[];
  pageErrors: string[];
  failedRequests: { url: string; failure: string }[];
};

export type Finding = {
  key: string;
  unit: { route: string; width: number; lang: string; state: string | null };
  selector: string;
  measured: unknown;
  threshold: unknown;
  evidence: { shot: string; rule?: string };
};

export type Standards = {
  contrast: { text: number; largeText: number };
  targetSize: number;
  maxAnimationMs: number;
  maxLayoutShift: number;
  minFocusOutline: number;
};
