const { handleApiRequest } = require("../src/routes/api-routes");

module.exports = (request, response) => {
  const host = request.headers.host || "localhost";
  const requestUrl = new URL(request.url, `http://${host}`);

  handleApiRequest(request, response, requestUrl);
};
