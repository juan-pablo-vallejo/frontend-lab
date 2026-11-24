# scripts

Four entry points for the lab, each a short shell file that starts Node on its implementation in
`lib/`. Node strips the TypeScript types itself; there is no build step. Each sets the
telemetry variables off (`DO_NOT_TRACK`, `STORYBOOK_DISABLE_TELEMETRY`,
`NEXT_TELEMETRY_DISABLED`, `EXPO_NO_TELEMETRY`, `MAESTRO_CLI_NO_ANALYTICS`) and works from
any directory: relative arguments are read against the current directory.

| Script     | Does                                                                     |
| ---------- | ------------------------------------------------------------------------ |
| `capture`  | Renders a target in Chromium and writes screenshots and raw measurements |
| `measure`  | Judges a capture folder against thresholds and writes `findings.json`    |
| `validate` | Checks `kb/` and `catalogue/`, and their two generated indexes           |
| `guard`    | Refuses home-directory paths, private addresses, private strings, leaks  |
| `ws`       | Drives the Linux comparison machine over SSH (POSIX sh, no Node)         |

Tests for all five are in `test/` and run with `pnpm test:scripts`.

## Example: capture and measure the fixture

Needs `pnpm install --frozen-lockfile` and `pnpm exec playwright install chromium` once.
From the repository root, with the output outside the repository:

```sh
out="$(mktemp -d)"
scripts/capture --target qa/fixtures/seeded-defects.target.json --out "$out"
scripts/measure --in "$out"
```

`capture` serves `qa/fixtures/seeded-defects/` on 127.0.0.1 and writes 60 units (2 routes ×
3 widths × 2 languages × base and 4 states) into `$out`. `measure` writes
`$out/findings.json`, prints one line per finding and exits 1: the `defects` route carries
the nine measurable keys (`contrast`, `target-size`, `overflow`, `missing-label`,
`focus-ring`, `layout-shift`, `long-animation`, `reduced-motion`, `truncation`) and the
`clean` route none. Add `--only clean` to `capture` and `measure` exits 0.

Finding keys and default thresholds (details under [Finding keys](#finding-keys)):

| Key              | Default threshold                              |
| ---------------- | ---------------------------------------------- |
| `contrast`       | 4.5:1, 3:1 for large text (axe)                |
| `target-size`    | 24 × 24 px                                     |
| `overflow`       | no sideways page scroll                        |
| `missing-label`  | every form field has an accessible name (axe)  |
| `focus-ring`     | a visible change on focus; outline ≥ 2 px      |
| `layout-shift`   | cumulative score ≤ 0.1                         |
| `long-animation` | finite transition or animation ≤ 500 ms        |
| `reduced-motion` | no loop; only opacity or colour under `reduce` |
| `truncation`     | no clipped single-line or clamped text         |
| `console-error`  | no console error, no uncaught page error       |
| `request-failed` | no failed request, no response ≥ 400           |
| `axe:<rule-id>`  | no other axe violation (WCAG 2.0–2.2 A and AA) |

## capture

```sh
scripts/capture --target <file> --out <dir> [--only <route>] [--reduced-motion] [--repo <dir>] [--allow-remote]
```

| Option             | Meaning                                                                    |
| ------------------ | -------------------------------------------------------------------------- |
| `--target`         | Target file (JSON, below)                                                  |
| `--out`            | Folder to write into; created when missing. Keep it outside the repository |
| `--only`           | Capture one route only                                                     |
| `--reduced-motion` | Take the whole capture, screenshots included, with reduced motion emulated |
| `--repo`           | A git repository whose commit and dirty flag go into the manifest          |
| `--allow-remote`   | Allow requests to hosts that are not loopback                              |

Without `--allow-remote`, a `baseUrl` that is not loopback is refused, and the browser can
reach nothing but loopback. A request whose own URL names another host (a route or `goto` to
an absolute URL, a sub-resource) is aborted with `net::ERR_BLOCKED_BY_CLIENT`. Everything else
that would leave loopback, which that check never sees (the target of a redirect, a
WebSocket), goes to a proxy on a closed loopback port and fails with
`net::ERR_PROXY_CONNECTION_FAILED`, before any name lookup; only `localhost`, `127.0.0.1` and
`[::1]` bypass it. A page that cannot load fails its unit; a sub-resource that cannot is a
`request-failed` finding.

Exit 0 when every unit was captured; 2 on a bad target or option, or when any unit failed
(each failed unit is named on standard error and in `manifest.json`).

### Target file

| Field       | Type                       | Default               | Meaning                                                                                                                                      |
| ----------- | -------------------------- | --------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| `name`      | string                     | required              | Name written into the manifest                                                                                                               |
| `baseUrl`   | URL                        | one of the two        | Site to capture; loopback only (`localhost`, `127.0.0.1`, `[::1]`, the hosts the proxy bypass names) without `--allow-remote`                |
| `serve`     | `{ dir }`                  | one of the two        | Folder, relative to the target file, served on 127.0.0.1 at a free port, closed on exit                                                      |
| `signIn`    | `Step[]`                   | none                  | Run once per browser context (one per width), before any route                                                                               |
| `routes`    | `{ id, path, waitFor? }[]` | required              | Pages; `path` is resolved against the base URL; `waitFor` is a selector every unit of the route waits for (visible, at most 15 s) after load |
| `widths`    | number[]                   | `[390, 768, 1280]`    | Viewport widths, no repeats; the height is always 800                                                                                        |
| `languages` | `{ id, query?, steps? }[]` | `[{ id: "default" }]` | `query` is merged into the URL (`lang=es`); `steps` run after the page loads                                                                 |
| `states`    | `{ id, routes?, steps }[]` | none                  | Named states reached by `steps`; `routes` limits a state to those route ids                                                                  |

A step is an object with exactly one key: `{ goto: path }`, `{ click: selector }`,
`{ fill: [selector, value] }`, `{ press: key }`, `{ waitFor: selector }` (waits until
visible) or `{ waitMs: number }`.

A unit is one route at one width in one language, in its base state or one named state. Its
id is `<route>-<width>-<lang>[-<state>]`; a target whose ids would collide is refused. Each
unit gets a fresh page: load, fonts ready, the route's `waitFor` (or else a fixed 1000 ms),
the language steps, the state steps, then until no finite animation or transition is running
(at most 5 s) and two frames.

### What a capture writes

| File             | Shape                                                                                                                                                                                                                                                    |
| ---------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `manifest.json`  | `{ target, startedAt, endedAt, browser: { name, version }, playwright, repo: { commit, dirty } \| null, options, units: [{ id, route, width, lang, state, url, shot }], failed: [{ id, error }] }`                                                       |
| `shots/<id>.png` | Full page, animations finished (finite ones run to their end, loops reset)                                                                                                                                                                               |
| `axe.json`       | `{ <unit id>: { violations: Rule[], incomplete: Rule[] } }`, `Rule` = `{ id, impact, help, helpUrl, nodes: [{ selector, summary, box, data }] }`; `incomplete` is what axe could not decide; tags `wcag2a`, `wcag2aa`, `wcag21a`, `wcag21aa`, `wcag22aa` |
| `measure.json`   | `{ <unit id>: Measurements }`, below                                                                                                                                                                                                                     |
| `console.json`   | `{ <unit id>: { messages: [{ type, text }], pageErrors: [], failedRequests: [{ url, failure }] } }`; errors and warnings only; a response of 400 or more counts as failed                                                                                |

`axe-core` 4.14 has no `wcag22a` tag; the WCAG 2.2 A criteria it checks carry older tags.
`options.target` in the manifest is the target file's base name only.

`Measurements`, per unit, taken after the page has settled and in this order (screenshot and
axe first, the focus walk and motion last because they change the page). In a unit with a
named state, axe-core itself is put into the page before the state's steps, and into any
document they load, to describe `focusAfter`; its scan still follows the screenshot:

| Field         | Shape                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| ------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `settled`     | `false` when finite animations were still running after 5 s                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| `viewport`    | `{ width, height }`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| `overflow`    | `{ scrollWidth, clientWidth, elements: [{ selector, left, right }] }`: the outermost elements past the viewport edge that are neither fixed nor inside a scroll or clip container                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| `interactive` | `[{ selector, role, name, box, inlineInText, states }]`: role and accessible name as axe computes them, the tag name where the element has no role; `states` holds whichever of `aria-busy`, `aria-disabled`, `disabled` (as `true`), `aria-expanded`, `aria-pressed`, `aria-selected`, `aria-checked`, `aria-invalid`, `aria-describedby` and `aria-current` the element carries                                                                                                                                                                                                                                                      |
| `document`    | `{ lang, title }`: the root element's `lang` attribute and the document title                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| `liveRegions` | `[{ selector, role, live, text }]`: every element with `role="status"`, `"alert"` or `"log"` or an `aria-live` attribute; `live` is the `aria-live` value, or the role's own politeness (`status` and `log` polite, `alert` assertive)                                                                                                                                                                                                                                                                                                                                                                                                 |
| `focusAfter`  | For a unit with a named state, `{ selector, role, name }` of the element that has focus after the state's steps and the settling, or `null` when focus is on the body, the element has left the page or it cannot be described; `null` for a base unit. Focus is read again until it has not changed for 400 ms (at most 2 s), so a move on the next frame, after a timer or at the end of a transition is seen; a later move is seen only if the state ends with a `waitMs` or `waitFor` step. The element is described at that moment, as in `interactive`; inside a shadow root or an `iframe` it is the host or the frame element  |
| `focus`       | `{ stops: [{ selector, changed, changedProperties, outlineStyle, outlineWidth }], limitReached }`: up to 60 Tab presses from the top, passing over one stop on the body (under a modal dialog Tab goes through the browser's own controls and comes back); after each, the focused element's own transitions run to their end (at most 1 s); `changed` compares outline, box-shadow, border and background with how the element was drawn before any focus. A line with style `none`, zero width or a transparent colour, and a shadow with no colour or no size, count as not drawn; `outlineStyle: "auto"` is the browser's own ring |
| `motion`      | `{ noPreference: Entry[] \| null, reduce: Entry[] }`; `Entry` is `{ selector, kind, name, properties, durationMs, iterations }` for every declared transition and animation with a duration, hidden elements included, on elements, on their drawn `::before` and `::after`, and inside open shadow roots (selector `host >> inner`). `noPreference` is `null` under `--reduced-motion`                                                                                                                                                                                                                                                |
| `layoutShift` | `{ score, shifts: [{ value, startTime, hadRecentInput, sources }] }`; `score` sums the shifts without recent input since navigation                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| `truncation`  | `[{ selector, kind, text, scrollWidth, clientWidth, scrollHeight, clientHeight }]`: a box holding text (its own or its children's) that does not wrap and is clipped (`single-line`), or is line-clamped (`clamped`), and whose content is wider or taller than it                                                                                                                                                                                                                                                                                                                                                                     |

## measure

```sh
scripts/measure --in <dir> [--standards <file>]
```

Reads a capture folder and writes `<dir>/findings.json`: an array of
`{ key, unit: { route, width, lang, state }, selector, measured, threshold, evidence: { shot, rule? } }`.
Prints one tab-separated line per finding. On standard error it prints one `notice:` line per
unit whose measurement is limited: the page had not settled, the focus walk stopped at 60
stops, or axe could not decide some rules (`incomplete`). Notices are not findings.

| Exit | Meaning                                                                                                                        |
| ---- | ------------------------------------------------------------------------------------------------------------------------------ |
| 0    | No finding                                                                                                                     |
| 1    | Findings                                                                                                                       |
| 2    | A unit failed in capture (`manifest.failed`), or the folder, a file in it, an entry for a unit, or `--standards` is unreadable |

### Finding keys

Defined in `lib/keys.ts`. Default thresholds are in `lib/standards.json`; a `--standards`
file overrides any of them.

| Key              | Source                           | Finding when                                                                                                                                        | Default           |
| ---------------- | -------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------- |
| `contrast`       | axe `color-contrast`             | axe reports it                                                                                                                                      | 4.5, 3 large text |
| `target-size`    | axe `target-size`; `interactive` | axe reports it at 24 px; when `targetSize` is above 24, also any interactive element smaller in either dimension, except an inline link inside text | 24 px             |
| `overflow`       | `overflow`                       | the page scrolls sideways                                                                                                                           | none              |
| `missing-label`  | axe `label`, `select-name`       | axe reports it                                                                                                                                      | none              |
| `focus-ring`     | `focus.stops`                    | focusing changes nothing visible, or changes only an outline thinner than the minimum (the browser's own `auto` ring passes)                        | 2 px              |
| `layout-shift`   | `layoutShift.score`              | the score is above the limit                                                                                                                        | 0.1               |
| `long-animation` | `motion.noPreference`            | a finite transition or animation is longer than the limit; a loop is not judged by length                                                           | 500 ms            |
| `reduced-motion` | `motion.reduce`                  | under reduced motion, anything still loops, or animates a property other than opacity or a colour                                                   | none              |
| `truncation`     | `truncation`                     | any entry                                                                                                                                           | none              |
| `console-error`  | `console.json`                   | a console error or an uncaught page error                                                                                                           | none              |
| `request-failed` | `console.json`                   | a request failed or answered 400 or more                                                                                                            | none              |
| `axe:<rule-id>`  | axe                              | any other axe violation                                                                                                                             | none              |

`document`, `liveRegions`, `interactive[].states` and `focusAfter` are evidence for a reader
of the capture; `measure` makes no finding from them.

`contrast` and `missing-label` are axe's judgement: a `contrast` value in `--standards`
labels the findings but does not re-judge text that axe passed.

## validate

```sh
scripts/validate [--write] [--root <dir>]
```

Checks `kb/patterns/NN-slug.md` (front matter, title, rule of use, the thirteen sections,
sources, unique number and slug) and `catalogue/components/<id>.yaml` against
`catalogue/schema.json` (unique id, file name equal to it). `--write` regenerates
`kb/INDEX.md` and `catalogue/index.json`, formatted with the repository's Prettier settings;
without it a stale or missing index fails. With no pages or no components, the matching
index is neither written nor expected. A component file must end in `.yaml` (a `.yml` file is
refused), and each `changelog` date must be a real date. `--root` checks another folder
instead of the repository. Exit 0 when valid, 1 on any problem (each printed as
`file: problem`), 2 on a bad option.

A component's `provenance.source` is an `https://` URL, with `commit` (hex) and `spdx`
required, or the literal `original` for one written in this repository, where `commit` and
`spdx` may be left out and `changes` may say `written here`.

## guard

```sh
scripts/guard [--pre-push <remote> <url> | --ci] [--repo <dir>]
```

Works on the git repository of the current directory, or of `--repo`. It prints where each
problem is (file and line, commit, tag, or line of git's pre-push input), never the matched
text, with one unavoidable exception: when a file or folder name matches, the printed path
contains it. Exit 0 when clean, 1 on problems, 2 when the guard cannot run. The guard is a
net for known shapes and listed strings, not proof: it does not see text inside images or
archives, a name missing from the private list, or a push made with `--no-verify`.

### What it flags

- An absolute home-directory path. The text is read as written and decoded (`\/`, `%2F`,
  `%5C` and `%20`, a doubled backslash, escaped `\n`, `\t`, `\r`). A match is a separator
  (`/` or `\`), `Users`, `home` or `root` in any case, a separator, and a name (characters
  that are not a separator, white space, a quote or a bracket), so a closing tag such as
  `</Root>` is not one. Every match is flagged, after any character, unless it is the path
  of a URL with a host (`https://example.org/home/page`: between `://` and the path only host
  characters, letters, digits and `. _ ~ % @ : [ ] -`; a `file` URL, an empty host or the
  host `file` of an editor link do not count), or it continues a relative path (a letter,
  digit, `_`, `.` or `~` just before it: `docs/home/x`, `./home/x`). These make it absolute
  even after such a character: an option glued straight to the path (`-I`, `--include`),
  a drive letter and colon before it, `/Volumes/`, `/System/Volumes/` or `/mnt/` earlier on
  the line (a volume name may hold a space), a doubled separator, or a path in front of it
  that starts at a filesystem root (`/var`, `/export`, `/private`, `/srv`, `/opt`, `/data`,
  `/net`, `/nfs`, `/media`, `/run`, `/tmp`, or one letter as in Git-Bash's `/c`), not after
  `@`, so `@/pages/home/Home` and `/api/users/42` pass. The token is read back at most 4096
  characters, so a long line costs linear time. A web route that starts `/home/`,
  `/users/` or names root's home folder cannot be told from a home folder and is flagged: a
  committed target file must not use such a route.
- A machine address: an IPv4 address in the three RFC 1918 ranges, the link-local range or
  the shared (carrier-grade NAT) range (a dotted quad that follows a letter or a dot is not
  one, so SVG path data passes; a four-part version number inside one of those ranges may
  still be flagged), an IPv6 unique-local or link-local address, a hardware address (six
  colon-separated hex pairs). Loopback is allowed. These documents name the ranges in words
  for that reason. Machine names are not matched by shape (a `.local` name cannot be told
  from code such as `this.local`): put them in the private list.
- A line of the private list, compared three ways: per line ignoring case; against the whole
  text (a file, or a commit's added lines per file) after NFKC normalisation, accent folding
  and collapsing whitespace, so an entry wrapped over a line break is found; and with every
  character that is not a letter or digit removed from both sides. Reported with its line
  when one line holds it, otherwise with the file. Not applied to the content of the root
  `LICENSE`; applied to every name.
- Whatever gitleaks reports, run with its default rules only: a configuration the guard
  writes, inline `gitleaks:allow` comments ignored, no ignore file or configuration read from
  the repository or the environment (`GITLEAKS_CONFIG` is dropped). In the commit modes
  gitleaks is given the git directory, so a committed `.gitleaksignore` is never read; in the
  working-tree mode such a file is scanned under another name.

File and folder names get the same checks as content (`<path>: path matches ...`). Content
is read as bytes: a file with NUL bytes is also read as UTF-16 and with the NULs dropped; in
the commit modes the diff is taken with `--text --no-textconv`, so `-diff` attributes and
text filters hide nothing.

### Modes

| Mode         | Scans                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | Lists                                                       |
| ------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| no argument  | Every tracked file and every untracked file that is not ignored: a link's target text (not followed), a regular file's bytes, and, for a file whose staged content differs from the disk, the staged content too (`(staged) <path>`). Outside CI (`CI` unset) it first requires `core.hooksPath` to be `.githooks`                                                                                                                                                                                                                                                                                                                                                                | Private list when it exists                                 |
| `--pre-push` | Both ref names of every line git hands the hook; each annotated tag's name, message and tagger, peeling nested tags (a ref to a blob or a tree is refused); then every commit being pushed: its message, author and committer e-mail, the names it adds, changes or renames to, and its added lines, through plumbing (`git diff-tree` against the first parent, root commits included), whatever the user's git settings; gitleaks over the same commits with merges diffed against their first parent. The commits already on the remote are what `git ls-remote <url>` advertises, not the local tracking refs; if the remote cannot be asked, everything reachable is scanned | Private list and identity list, both required and non-empty |
| `--ci`       | The same commit checks for every commit of every ref (`--all`), and gitleaks over the whole history                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               | Neither                                                     |

The private list is the file named by `FRONTEND_LAB_GUARD_PATTERNS`, or
`~/.config/frontend-lab/guard-patterns`: one string per line. The identity list is the file
named by `FRONTEND_LAB_GUARD_IDENTITY`, or `~/.config/frontend-lab/guard-identity`: one
e-mail address per line; every pushed commit's author and committer, and every pushed tag's
tagger, must be one of them (`commit <sha>: author e-mail is not an allowed identity`, the
address not printed). In both files blank lines and lines starting with `#` are ignored.

`.githooks/pre-push` runs `scripts/guard --pre-push`. Turn it on once per clone with
`git config core.hooksPath .githooks`.

## ws

```sh
scripts/ws [--print] send|refs|run|test|pull
```

Drives the one Linux machine where reference images are written and compared, over SSH. It
names no machine: the SSH alias and the folder there come from `FRONTEND_LAB_WS_HOST` and
`FRONTEND_LAB_WS_DIR`, or from the file named by `FRONTEND_LAB_ENV` (default
`~/.config/frontend-lab/env`, lines `KEY=value`, read, never run). The alias must be a plain
SSH alias and the folder a plain relative folder under that account's home (no `/` at the
start, no `..`); anything else exits 2.

| Action | Does                                                                                                                                                                      |
| ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `send` | Makes or clears the folder (only one that carries its marker `.frontend-lab-ws`, or an empty one), sends the tracked files with rsync, installs the packages and Chromium |
| `refs` | Writes reference images there, then copies `visual-refs/` here to commit                                                                                                  |
| `run`  | Compares against the references there                                                                                                                                     |
| `test` | Runs typecheck, the script tests except the guard's (`--grep-invert guard\.spec\.ts`: no gitleaks there, by design) and the accessibility tests there                     |
| `pull` | Copies the test results here, outside the repository                                                                                                                      |

`refs`, `run`, `test` and `pull` first check, there, that the folder carries the marker,
and stop with exit 3 and one line when it does not: nothing runs there and nothing is copied
back. `--print` prints the commands instead of running them and runs nothing itself, not even
git (the file list is shown as `git -C <root> ls-files -z > <list>`), so it works in a copy
that is not a repository. Only tracked files travel.
