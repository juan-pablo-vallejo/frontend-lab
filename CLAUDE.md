# Frontend lab: working in this repository

A place to try interface components and patterns outside any product, and the tooling that
inspects a rendered interface. What is validated here is re-implemented in a product by hand,
against that product's own tokens and rules. Nothing here ships anywhere by itself.

## This repository is public

A push cannot be taken back. Before anything is committed:

- No secret, no machine name or address, no absolute home-directory path, and nothing about a
  person, a client, another project or a private preference. `scripts/guard` enforces what it
  can: it runs gitleaks and refuses home-directory paths and private network addresses. The
  pre-push hook also refuses every line of a private list kept outside the repository, at
  `~/.config/frontend-lab/guard-patterns`. That list's contents are never written here.
- A source is a public URL or a path inside this repository.
- Code is committed only when its licence allows republishing (MIT, Apache-2.0, BSD, ISC,
  W3C), with its notice in `licenses/` and a line in `THIRD_PARTY_NOTICES.md`. Code under any
  other terms may be read, never committed.
- `kb/` is written in our own words and links its sources. Prose from documentation or design
  guidelines is not copied.
- Captures of other projects never enter the repository. `scripts/capture` writes outside
  it, and a target file for a private project is kept outside it too.

## Commands

```sh
pnpm install --frozen-lockfile
pnpm check                        # typecheck, lint, format, validate, guard, package and script tests,
                                  # the story build, accessibility, components
scripts/capture --target <file> --out <dir> [--only <route>] [--reduced-motion]
scripts/measure --in <dir> [--standards <file>]
scripts/validate [--write]        # --write regenerates the indexes
scripts/guard
scripts/ws send|refs|run|test|pull   # the comparison machine, over SSH
```

`scripts/README.md` describes the target file, what a capture writes and the finding keys.
Turn the hook on once per clone: `git config core.hooksPath .githooks`.

## Rules

1. Dependencies are added by hand at exact versions. No scaffolder, no `dlx`. The workspace
   refuses a release younger than a day: wait, never lower it.
2. Versions and platform behaviour are looked up, never recalled.
3. A `kb/` page or a catalogue entry carries its sources, its evidence, a date and a status.
   `scripts/validate` fails on one without, and on a duplicate id.
4. Knowledge here informs. It never overrides a standard or a product's own rules.
5. One test engine, Playwright Test. Reference images are written and compared on one Linux
   machine only, never in CI and never on a Mac: `pnpm test:visual` skips everywhere else.
6. Telemetry stays off. The scripts set `STORYBOOK_DISABLE_TELEMETRY`,
   `NEXT_TELEMETRY_DISABLED`, `EXPO_NO_TELEMETRY`, `MAESTRO_CLI_NO_ANALYTICS` and
   `DO_NOT_TRACK`.
7. A component's status is `experimental`, `validated` or `project-specific`. It becomes
   `validated` on evidence only: an independent review with nothing critical or high open,
   its tests green, CI green. Each step of the way leaves a file.
8. Commits are signed and carry no trailers. The message says what changed and why.
   `pnpm check` is green before a commit.
9. A push goes through the hook. Never `--no-verify`, and never a push from a clone where
   `core.hooksPath` is not `.githooks`. When the guard refuses, the content changes, not the
   guard.
