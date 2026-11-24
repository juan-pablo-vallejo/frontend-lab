// Home-directory paths. A deny-list: every match is flagged unless it is the path of a URL
// with a host, or continues a relative path. The shapes are assembled here rather than written
// out, so this file passes its own check.

// A separator, `Users`, `home` or `root` (any case), one or more separators, and a name: one
// or more characters that are not a separator, white space, a quote or a bracket.
const QUOTES = "\"'`“”„‘’‚«»‹›";
const BRACKETS = "()\\[\\]{}<>";
const MATCH = new RegExp(
  `[/\\\\](?:users|home|root)[/\\\\]+[^/\\\\\\s${QUOTES}${BRACKETS}]+`,
  "giu",
);

// The text as written, and decoded: `\/`, `%2F` and `%5C` to `/`, a doubled backslash to one,
// `%20` to a space; then also with escaped `\n`, `\t` and `\r` read as a space.
function variants(line: string): string[] {
  const decoded = line
    .replace(/\\\//g, "/")
    .replace(/%2f|%5c/gi, "/")
    .replace(/\\\\/g, "\\")
    .replace(/%20/g, " ");
  return [line, decoded, decoded.replace(/\\[ntr]/g, " ")];
}

const RELATIVE_BEFORE = /[\p{L}\p{N}_.~]/u;
const DRIVE_AT_END = /(?:^|[^\p{L}\p{N}])[a-z]:$/iu;
const VOLUME_BEFORE = /\/(?:system\/volumes|volumes|mnt)\//i;
// The path in front of the match starts at a filesystem root (`/var/home`, `/export/home`,
// Git-Bash's `/c`), not after `@` (an import alias) and not at a web folder such as `/api`.
const ROOTED_BEFORE =
  /(?:^|[^\p{L}\p{N}_.~/@-])\/(?:var|export|private|srv|opt|data|net|nfs|media|run|tmp|[a-z])(?:\/[\p{L}\p{N}_.~-]+)*$/iu;
// An option glued straight to the path: `-I`, `-L`, `-C`, `--include`.
const OPTION = /^--?[a-z][a-z0-9-]*$/i;
// What may stand between `://` and the path for the path to belong to a URL: a host, with
// user, port or brackets. Anything else (a quote, `,`, `&`, `;`) means the URL ended there.
const HOST = /^[\p{L}\p{N}._~%@:[\]-]*$/u;
// The token is read back at most this far, so a long line costs linear time.
const MAX_TOKEN = 4096;

function tokenStart(text: string, index: number): number {
  const limit = Math.max(0, index - MAX_TOKEN);
  let start = index;
  while (start > limit && !/\s/u.test(text[start - 1] ?? "")) start -= 1;
  return start;
}

function schemeBefore(text: string): string {
  let start = text.length;
  while (start > 0 && /[a-z0-9+.-]/i.test(text[start - 1] ?? "")) start -= 1;
  const scheme = text.slice(start);
  return /^[a-z]/i.test(scheme) ? scheme : "";
}

function flagged(text: string, index: number): boolean {
  const prefix = text.slice(tokenStart(text, index), index);
  const previous = text[index - 1] ?? "";

  // The path part of a URL with a host: the token has `://`, then only host characters, then
  // the match. A file URL, an empty host, or the host `file` (an editor link) name a local
  // path and are flagged.
  const at = prefix.lastIndexOf("://");
  if (at >= 0) {
    const host = prefix.slice(at + 3);
    if (HOST.test(host)) {
      const scheme = schemeBefore(prefix.slice(0, at));
      return /(?:^|\+)file$/i.test(scheme) || host === "" || /^file$/i.test(host);
    }
  }

  // Signs of an absolute path, even after a word character.
  if (OPTION.test(prefix)) return true;
  if (DRIVE_AT_END.test(prefix)) return true;
  if (previous === "/") return true;
  if (ROOTED_BEFORE.test(prefix)) return true;
  if (VOLUME_BEFORE.test(text.slice(0, index))) return true;

  // The continuation of a relative path.
  if (RELATIVE_BEFORE.test(previous)) return false;
  return true;
}

export function hasHomePath(line: string): boolean {
  for (const text of variants(line)) {
    for (const match of text.matchAll(MATCH)) {
      if (flagged(text, match.index)) return true;
    }
  }
  return false;
}
