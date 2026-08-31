const fs = require("fs");

function sendJson(response, statusCode, payload) {
  response.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
  });
  response.end(JSON.stringify(payload));
}

function sendFile(response, filePath, contentType) {
  response.writeHead(200, { "Content-Type": contentType });
  fs.createReadStream(filePath).pipe(response);
}

function readRequestBody(request) {
  if (request.body !== undefined && request.body !== null) {
    if (typeof request.body === "object") {
      return Promise.resolve(request.body);
    }
    if (typeof request.body === "string" && request.body.trim().length > 0) {
      try {
        return Promise.resolve(JSON.parse(request.body));
      } catch (error) {
        return Promise.reject(new Error("Request body must be valid JSON."));
      }
    }
  }

  return new Promise((resolve, reject) => {
    let body = "";
    const maximumBodySize = 100_000;

    request.on("data", (chunk) => {
      body += chunk.toString();
      if (body.length > maximumBodySize) {
        request.destroy();
        reject(new Error("Request body is too large."));
      }
    });

    request.on("end", () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (error) {
        reject(new Error("Request body must be valid JSON."));
      }
    });

    request.on("error", reject);
  });
}

module.exports = { readRequestBody, sendFile, sendJson };

