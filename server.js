const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "dist");
const port = Number(process.env.PORT || 3000);

const types = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
};

function send(res, file) {
  fs.readFile(file, (error, body) => {
    if (error) {
      res.writeHead(404);
      res.end("Not found");
      return;
    }

    res.writeHead(200, {
      "content-type": types[path.extname(file)] || "application/octet-stream",
      "cache-control": file.endsWith("index.html")
        ? "no-cache"
        : "public, max-age=31536000, immutable",
    });
    res.end(body);
  });
}

http
  .createServer((req, res) => {
    const urlPath = decodeURIComponent(new URL(req.url, "http://localhost").pathname);
    const normalized = path.normalize(urlPath).replace(/^(\.\.[/\\])+/, "");
    const requested = path.join(root, normalized);

    fs.stat(requested, (error, stat) => {
      if (!error && stat.isFile()) {
        send(res, requested);
        return;
      }

      if (!error && stat.isDirectory()) {
        send(res, path.join(requested, "index.html"));
        return;
      }

      send(res, path.join(root, "index.html"));
    });
  })
  .listen(port, "0.0.0.0", () => {
    console.log(`Serving ${root} on port ${port}`);
  });
