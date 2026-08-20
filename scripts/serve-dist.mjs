import { readFile } from "node:fs/promises";
import { createServer } from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const distRoot = path.join(projectRoot, "dist");
const port = Number.parseInt(process.argv[2] ?? "4321", 10);

const contentTypes = new Map([
  [".css", "text/css; charset=utf-8"],
  [".html", "text/html; charset=utf-8"],
  [".jpeg", "image/jpeg"],
  [".js", "text/javascript; charset=utf-8"],
  [".jpg", "image/jpeg"],
  [".json", "application/json; charset=utf-8"],
  [".svg", "image/svg+xml"],
  [".txt", "text/plain; charset=utf-8"],
  [".webmanifest", "application/manifest+json; charset=utf-8"],
  [".xml", "application/xml; charset=utf-8"],
]);

function resolveRequestPath(pathname) {
  const relativePath = decodeURIComponent(pathname).replace(/^\/+/, "");
  const candidate =
    !relativePath || relativePath.endsWith("/")
      ? path.join(relativePath, "index.html")
      : path.extname(relativePath)
        ? relativePath
        : path.join(relativePath, "index.html");
  const absolutePath = path.resolve(distRoot, candidate);

  if (
    absolutePath !== distRoot &&
    !absolutePath.startsWith(`${distRoot}${path.sep}`)
  ) {
    throw new Error("请求路径越过 dist 目录。");
  }

  return absolutePath;
}

const server = createServer(async (request, response) => {
  try {
    const requestUrl = new URL(request.url ?? "/", "http://127.0.0.1");
    const requestedFile = resolveRequestPath(requestUrl.pathname);
    const content = await readFile(requestedFile);
    const contentType =
      contentTypes.get(path.extname(requestedFile)) ??
      "application/octet-stream";

    response.writeHead(200, { "Content-Type": contentType });
    response.end(content);
  } catch (error) {
    const status = error?.code === "ENOENT" ? 404 : 400;
    try {
      const notFound = await readFile(path.join(distRoot, "404.html"));
      response.writeHead(status, {
        "Content-Type": "text/html; charset=utf-8",
      });
      response.end(notFound);
    } catch {
      response.writeHead(status, {
        "Content-Type": "text/plain; charset=utf-8",
      });
      response.end(status === 404 ? "Not Found" : "Bad Request");
    }
  }
});

server.listen(port, "127.0.0.1", () => {
  console.log(`静态测试服务器：http://127.0.0.1:${port}`);
});

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => {
    server.close(() => process.exit(0));
  });
}
