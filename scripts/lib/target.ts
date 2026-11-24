import type { Step, Target } from "./types.ts";

export const DEFAULT_WIDTHS = [390, 768, 1280];

const STEP_KINDS = [
  "goto",
  "click",
  "fill",
  "press",
  "waitFor",
  "waitMs",
  "hold",
] as const;

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

// `hold` lasts until the state's capture is taken, so it belongs to a state's steps only.
function checkSteps(
  value: unknown,
  where: string,
  errors: string[],
  inState = false,
): void {
  if (!Array.isArray(value)) {
    errors.push(`${where} must be an array of steps`);
    return;
  }
  value.forEach((step: unknown, index) => {
    const at = `${where}[${index}]`;
    if (!isObject(step) || Object.keys(step).length !== 1) {
      errors.push(`${at} must be an object with exactly one of ${STEP_KINDS.join(", ")}`);
      return;
    }
    const [kind, arg] = Object.entries(step)[0] as [string, unknown];
    switch (kind) {
      case "press":
        if (
          !isNonEmptyString(arg) &&
          !(
            Array.isArray(arg) &&
            arg.length === 2 &&
            isNonEmptyString(arg[0]) &&
            isNonEmptyString(arg[1])
          )
        ) {
          errors.push(`${at}.press must be a key or [selector, key]`);
        }
        break;
      case "hold":
        if (!inState) errors.push(`${at}.hold is allowed only in a state's steps`);
        else if (!isNonEmptyString(arg))
          errors.push(`${at}.hold must be a non-empty URL glob`);
        break;
      case "goto":
      case "click":
      case "waitFor":
        if (!isNonEmptyString(arg))
          errors.push(`${at}.${kind} must be a non-empty string`);
        break;
      case "fill":
        if (
          !Array.isArray(arg) ||
          arg.length !== 2 ||
          !isNonEmptyString(arg[0]) ||
          typeof arg[1] !== "string"
        ) {
          errors.push(`${at}.fill must be [selector, value]`);
        }
        break;
      case "waitMs":
        if (typeof arg !== "number" || !Number.isFinite(arg) || arg < 0) {
          errors.push(`${at}.waitMs must be a number of milliseconds`);
        }
        break;
      default:
        errors.push(`${at} has unknown step "${kind}"`);
    }
  });
}

const ID = /^[A-Za-z0-9_-]+$/;

// Returns the errors in a parsed target file; an empty list means it is a valid Target.
export function validateTarget(value: unknown): string[] {
  const errors: string[] = [];
  if (!isObject(value)) return ["the target must be a JSON object"];
  const allowed = [
    "name",
    "baseUrl",
    "serve",
    "signIn",
    "routes",
    "widths",
    "languages",
    "states",
  ];
  for (const key of Object.keys(value)) {
    if (!allowed.includes(key)) errors.push(`unknown field "${key}"`);
  }
  if (!isNonEmptyString(value.name)) errors.push("name must be a non-empty string");

  const hasBase = value.baseUrl !== undefined;
  const hasServe = value.serve !== undefined;
  if (hasBase === hasServe)
    errors.push("the target needs exactly one of baseUrl and serve");
  if (hasBase) {
    if (typeof value.baseUrl !== "string" || !URL.canParse(value.baseUrl)) {
      errors.push("baseUrl must be an absolute URL");
    }
  }
  if (hasServe && (!isObject(value.serve) || !isNonEmptyString(value.serve.dir))) {
    errors.push("serve must be { dir: <folder relative to the target file> }");
  }
  if (value.signIn !== undefined) checkSteps(value.signIn, "signIn", errors);

  const routeIds = new Set<string>();
  if (!Array.isArray(value.routes) || value.routes.length === 0) {
    errors.push("routes must be a non-empty array");
  } else {
    value.routes.forEach((route: unknown, index) => {
      if (
        !isObject(route) ||
        !isNonEmptyString(route.id) ||
        !isNonEmptyString(route.path)
      ) {
        errors.push(`routes[${index}] must be { id, path, waitFor? }`);
        return;
      }
      for (const key of Object.keys(route)) {
        if (!["id", "path", "waitFor"].includes(key)) {
          errors.push(`routes[${index}] has unknown field "${key}"`);
        }
      }
      if (route.waitFor !== undefined && !isNonEmptyString(route.waitFor)) {
        errors.push(`routes[${index}].waitFor must be a selector`);
      }
      if (!ID.test(route.id))
        errors.push(`routes[${index}].id may hold only A-Z a-z 0-9 _ -`);
      if (routeIds.has(route.id))
        errors.push(`routes[${index}].id "${route.id}" is repeated`);
      routeIds.add(route.id);
    });
  }

  if (value.widths !== undefined) {
    if (
      !Array.isArray(value.widths) ||
      value.widths.length === 0 ||
      !value.widths.every((w: unknown) => Number.isInteger(w) && (w as number) > 0)
    ) {
      errors.push("widths must be a non-empty array of positive whole numbers");
    } else if (new Set(value.widths).size !== value.widths.length) {
      errors.push("widths must not repeat");
    }
  }

  if (value.languages !== undefined) {
    if (!Array.isArray(value.languages) || value.languages.length === 0) {
      errors.push("languages must be a non-empty array");
    } else {
      const ids = new Set<string>();
      value.languages.forEach((lang: unknown, index) => {
        if (!isObject(lang) || !isNonEmptyString(lang.id) || !ID.test(lang.id)) {
          errors.push(
            `languages[${index}] must be { id, query?, steps? } with a plain id`,
          );
          return;
        }
        if (ids.has(lang.id))
          errors.push(`languages[${index}].id "${lang.id}" is repeated`);
        ids.add(lang.id);
        if (lang.query !== undefined && typeof lang.query !== "string") {
          errors.push(`languages[${index}].query must be a string`);
        }
        if (lang.steps !== undefined)
          checkSteps(lang.steps, `languages[${index}].steps`, errors);
      });
    }
  }

  if (value.states !== undefined) {
    if (!Array.isArray(value.states)) {
      errors.push("states must be an array");
    } else {
      const ids = new Set<string>();
      value.states.forEach((state: unknown, index) => {
        if (!isObject(state) || !isNonEmptyString(state.id) || !ID.test(state.id)) {
          errors.push(`states[${index}] must be { id, routes?, steps } with a plain id`);
          return;
        }
        if (ids.has(state.id))
          errors.push(`states[${index}].id "${state.id}" is repeated`);
        ids.add(state.id);
        if (state.routes !== undefined) {
          if (
            !Array.isArray(state.routes) ||
            !state.routes.every((r: unknown) => typeof r === "string" && routeIds.has(r))
          ) {
            errors.push(`states[${index}].routes must name routes of this target`);
          }
        }
        checkSteps(state.steps, `states[${index}].steps`, errors, true);
      });
    }
  }
  if (errors.length === 0) {
    const seen = new Set<string>();
    for (const id of unitIds(withDefaults(value as Target))) {
      if (seen.has(id)) errors.push(`unit id "${id}" would be made twice`);
      seen.add(id);
    }
  }
  return errors;
}

export function unitId(route: string, width: number, lang: string, state: string | null) {
  return `${route}-${width}-${lang}${state ? `-${state}` : ""}`;
}

// Every unit id the target produces, in capture order.
export function unitIds(target: ResolvedTarget, only: string | null = null): string[] {
  const ids: string[] = [];
  for (const width of target.widths) {
    for (const route of target.routes) {
      if (only && route.id !== only) continue;
      for (const lang of target.languages) {
        const states = [
          null,
          ...target.states.filter((s) => !s.routes || s.routes.includes(route.id)),
        ];
        for (const state of states)
          ids.push(unitId(route.id, width, lang.id, state?.id ?? null));
      }
    }
  }
  return ids;
}

// Loopback is these three hosts only: the same three the browser's proxy bypass names.
export const LOOPBACK_HOSTS = ["localhost", "127.0.0.1", "[::1]"];

export function isLoopbackUrl(url: string): boolean {
  return LOOPBACK_HOSTS.includes(new URL(url).hostname);
}

export type ResolvedTarget = Required<Omit<Target, "baseUrl" | "serve">> &
  Pick<Target, "baseUrl" | "serve">;

export function withDefaults(target: Target): ResolvedTarget {
  return {
    ...target,
    signIn: target.signIn ?? [],
    widths: target.widths ?? DEFAULT_WIDTHS,
    languages: target.languages ?? [{ id: "default" }],
    states: target.states ?? [],
  };
}

export type { Step };
