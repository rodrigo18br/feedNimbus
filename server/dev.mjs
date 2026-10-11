import {createServer} from "node:http";
import {readFile, stat} from "node:fs/promises";
import {extname, resolve} from "node:path";
import {fileURLToPath} from "node:url";
import {handleRssRequest} from "./rss-proxy.mjs";

const staticRoot = fileURLToPath(new URL("../static/", import.meta.url));
const port = Number(process.env.PORT) || 8888;
const contentTypes = {
  ".css": "text/css; charset=utf-8",
  ".gif": "image/gif",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
};

createServer(async (incoming, outgoing) => {
  try {
    const url = new URL(incoming.url, `http://${incoming.headers.host || "localhost"}`);

    if (url.pathname === "/api/rss") {
      const response = await handleRssRequest(new Request(url, {method: incoming.method}));
      outgoing.writeHead(response.status, Object.fromEntries(response.headers));
      outgoing.end(Buffer.from(await response.arrayBuffer()));
      return;
    }

    const requestedPath = decodeURIComponent(url.pathname);
    const pathname = requestedPath === "/"
      ? "/wordcloud.html"
      : requestedPath.endsWith("/") ? `${requestedPath}index.html` : requestedPath;
    const filePath = resolve(staticRoot, `.${pathname}`);
    if (!filePath.startsWith(staticRoot) || !(await stat(filePath)).isFile()) throw new Error();

    outgoing.writeHead(200, {"Content-Type": contentTypes[extname(filePath)] || "application/octet-stream"});
    outgoing.end(await readFile(filePath));
  } catch {
    outgoing.writeHead(404, {"Content-Type": "text/plain; charset=utf-8"});
    outgoing.end("Not found.");
  }
}).listen(port, () => {
  console.log(`FeedNimbus is running at http://localhost:${port}`);
});
