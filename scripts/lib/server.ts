import { createReadStream } from "node:fs";
import { realpath, stat } from "node:fs/promises";
import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { extname, join, resolve, sep } from "node:path";

const TYPES: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".webp": "image/webp",
  ".woff2": "font/woff2",
  ".txt": "text/plain; charset=utf-8",
};

export type StaticServer = { url: string; close: () => Promise<void> };

// Serves one folder on 127.0.0.1 at a free port. Nothing outside the folder is reachable:
// a link is served only when its real target is inside the folder too.
export async function serveFolder(dir: string): Promise<StaticServer> {
  const root = await realpath(resolve(dir));
  const inside = (file: string) => file === root || file.startsWith(root + sep);
  const server: Server = createServer((request, response) => {
    void (async () => {
      try {
        const pathname = decodeURIComponent(
          new URL(request.url ?? "/", "http://x").pathname,
        );
        let file = await realpath(resolve(join(root, pathname)));
        if (!inside(file)) throw new Error("outside");
        let info = await stat(file);
        if (info.isDirectory()) {
          file = await realpath(join(file, "index.html"));
          if (!inside(file)) throw new Error("outside");
          info = await stat(file);
        }
        response.writeHead(200, {
          "content-type":
            TYPES[extname(file).toLowerCase()] ?? "application/octet-stream",
          "content-length": info.size,
          "cache-control": "no-store",
        });
        const stream = createReadStream(file);
        // A file that goes away mid-response ends that response, not the process.
        stream.on("error", () => response.destroy());
        stream.pipe(response);
      } catch {
        response.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
        response.end("not found");
      }
    })();
  });
  await new Promise<void>((done, fail) => {
    server.once("error", fail);
    server.listen(0, "127.0.0.1", () => done());
  });
  const { port } = server.address() as AddressInfo;
  return {
    url: `http://127.0.0.1:${port}`,
    close: () =>
      new Promise<void>((done) => {
        server.closeAllConnections();
        server.close(() => done());
      }),
  };
}
