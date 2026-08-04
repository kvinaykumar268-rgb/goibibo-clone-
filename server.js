const http = require("http");
const path = require("path");
const fs = require("fs");

const { handleApiRequest } = require("./src/routes/api-routes");
const { sendFile, sendJson } = require("./src/utils/response");

const PORT = process.env.PORT || 3000;
const PUBLIC_DIRECTORY = __dirname;

const MIME_TYPES = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
};

function serveStaticFile(request, response) {
  const requestedPath = request.url === "/" ? "/index.html" : request.url;
  const safePath = path.normalize(requestedPath).replace(/^([/\\])+/, "");
  const filePath = path.join(PUBLIC_DIRECTORY, safePath);

  if (!filePath.startsWith(PUBLIC_DIRECTORY)) {
    sendJson(response, 403, { message: "Access denied." });
    return;
  }

  const extension = path.extname(filePath);
  const contentType = MIME_TYPES[extension];

  if (!contentType || !fs.existsSync(filePath)) {
    sendJson(response, 404, { message: "Page not found." });
    return;
  }

  sendFile(response, filePath, contentType);
}

function handleRequest(request, response) {
  const host = request.headers.host || "localhost";
  const requestUrl = new URL(request.url, `http://${host}`);

  if (requestUrl.pathname.startsWith("/api/")) {
    handleApiRequest(request, response, requestUrl);
    return;
  }

  serveStaticFile(request, response);
}

if (require.main === module) {
  const server = http.createServer(handleRequest);
  server.listen(PORT, () => {
    console.log(`Goibibo clone is running at http://localhost:${PORT}`);
  });
}

module.exports = handleRequest;
