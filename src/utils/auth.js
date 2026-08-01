const crypto = require("crypto");

const HASH_LENGTH = 64;
const SALT_LENGTH = 16;

function hashPassword(password, salt = crypto.randomBytes(SALT_LENGTH).toString("hex")) {
  const passwordHash = crypto.scryptSync(password, salt, HASH_LENGTH).toString("hex");
  return `${salt}:${passwordHash}`;
}

function verifyPassword(password, storedPassword) {
  const [salt, savedHash] = storedPassword.split(":");
  const suppliedHash = crypto.scryptSync(password, salt, HASH_LENGTH).toString("hex");

  return crypto.timingSafeEqual(
    Buffer.from(savedHash, "hex"),
    Buffer.from(suppliedHash, "hex"),
  );
}

function createToken() {
  return crypto.randomBytes(32).toString("hex");
}

function getBearerToken(request) {
  const authorization = request.headers.authorization || "";
  const [scheme, token] = authorization.split(" ");

  return scheme === "Bearer" ? token : null;
}

module.exports = { createToken, getBearerToken, hashPassword, verifyPassword };
