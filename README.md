# frontend-lab

A place to try interface components and micro-interactions outside any product, and the
scripts that inspect a rendered interface: screenshots at several widths and languages, an
accessibility scan, and measurements of target size, overflow, focus, motion and layout shift.

| Path                    | What                                                                                                                   |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `scripts/`              | `capture`, `measure`, `validate`, `guard`, `ws`. `scripts/README.md` has their inputs and outputs                      |
| `packages/motion/`      | motion tokens as data: durations, easings, critically damped springs                                                   |
| `packages/tokens/`      | reference tokens: `src/tokens.ts` is the source, `tokens.css` is generated from it                                     |
| `apps/web-lab/`         | Storybook (React with Vite) with three components and a story per state: busy button, toast with Undo, command list    |
| `apps/native-lab/`      | Expo (expo-router) gallery: a pressable button and a status chip, one route per state; a Maestro flow screenshots each |
| `catalogue/components/` | one entry per component: status, keyboard map, reduced motion, stories, tests; `catalogue/index.json` is generated     |
| `qa/fixtures/`          | pages the scripts are tested against                                                                                   |
| `tests/`                | accessibility, component and visual tests; the story tests run against the static story build                          |
| `visual-refs/`          | reference images, written and compared on one Linux machine only                                                       |

`pnpm install --frozen-lockfile && pnpm check` runs what CI runs.

This is not open source: see `LICENSE`. Third-party code keeps its own licence: see
`THIRD_PARTY_NOTICES.md`.
