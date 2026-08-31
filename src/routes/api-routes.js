const { airports, destinations, flights, inventory, offers, promoCoupons } = require("../data/travel-data");
const { createToken, getBearerToken, hashPassword, verifyPassword } = require("../utils/auth");
const { createId, readDatabase, writeDatabase } = require("../utils/database");
const { readRequestBody, sendJson } = require("../utils/response");

function generatePNR() {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let result = "GBB";
  for (let i = 0; i < 5; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

function findFlights(searchParameters) {
  const from = searchParameters.get("from")?.toLowerCase();
  const to = searchParameters.get("to")?.toLowerCase();

  return flights.filter((flight) => {
    const originMatches = !from || flight.from.toLowerCase().includes(from) || flight.fromCode.toLowerCase().includes(from);
    const destinationMatches = !to || flight.to.toLowerCase().includes(to) || flight.toCode.toLowerCase().includes(to);
    return originMatches && destinationMatches;
  });
}

function findInventory(service, searchParameters) {
  if (service === "flights") return findFlights(searchParameters);
  const items = inventory[service];
  if (!items) return null;
  const from = searchParameters.get("from")?.trim().toLowerCase();
  const to = searchParameters.get("to")?.trim().toLowerCase();
  const query = searchParameters.get("query")?.trim().toLowerCase();

  return items.filter((item) => {
    const searchableText = Object.values(item).join(" ").toLowerCase();
    const fromMatches = !from || !item.from || item.from.toLowerCase().includes(from);
    const toMatches = !to || !(item.to || item.city || item.location) || (item.to || item.city || item.location).toLowerCase().includes(to);
    return fromMatches && toMatches && (!query || searchableText.includes(query));
  });
}

function findBookableItem(service, itemId) {
  if (service === "flights") return flights.find((flight) => flight.id === itemId);
  return inventory[service]?.find((item) => item.id === itemId);
}

function getAuthenticatedUser(request) {
  const token = getBearerToken(request);
  const database = readDatabase();
  const session = database.sessions.find((item) => item.token === token);

  if (!session) {
    return null;
  }

  return database.users.find((user) => user.id === session.userId) || null;
}

function publicUser(user) {
  return { id: user.id, name: user.name, email: user.email, createdAt: user.createdAt };
}

async function registerUser(request, response) {
  const { name, email, password } = await readRequestBody(request);
  const cleanEmail = email?.trim().toLowerCase();

  if (!name?.trim() || !cleanEmail || !password || password.length < 6) {
    sendJson(response, 400, {
      message: "Name, email, and a password of at least 6 characters are required.",
    });
    return;
  }

  const database = readDatabase();
  const existingUser = database.users.find((user) => user.email === cleanEmail);

  if (existingUser) {
    sendJson(response, 409, { message: "An account with this email already exists." });
    return;
  }

  const user = {
    id: createId("USR"),
    name: name.trim(),
    email: cleanEmail,
    passwordHash: hashPassword(password),
    createdAt: new Date().toISOString(),
  };
  const token = createToken();

  database.users.push(user);
  database.sessions.push({ token, userId: user.id, createdAt: new Date().toISOString() });
  writeDatabase(database);

  sendJson(response, 201, { message: "Account created successfully.", token, user: publicUser(user) });
}

async function loginUser(request, response) {
  const { email, password } = await readRequestBody(request);
  const cleanEmail = email?.trim().toLowerCase();
  const database = readDatabase();
  const user = database.users.find((item) => item.email === cleanEmail);

  if (!user || !password || !verifyPassword(password, user.passwordHash)) {
    sendJson(response, 401, { message: "Incorrect email or password." });
    return;
  }

  const token = createToken();
  database.sessions.push({ token, userId: user.id, createdAt: new Date().toISOString() });
  writeDatabase(database);

  sendJson(response, 200, { message: "Login successful.", token, user: publicUser(user) });
}

function logoutUser(request, response) {
  const token = getBearerToken(request);
  const database = readDatabase();
  database.sessions = database.sessions.filter((session) => session.token !== token);
  writeDatabase(database);
  sendJson(response, 200, { message: "Logged out successfully." });
}

async function validateCoupon(request, response) {
  const { code, amount } = await readRequestBody(request);
  const cleanCode = code?.trim().toUpperCase();
  const coupon = promoCoupons[cleanCode];

  if (!coupon) {
    sendJson(response, 404, { valid: false, message: "Invalid promo code." });
    return;
  }

  if (amount && amount < coupon.minPrice) {
    sendJson(response, 400, { valid: false, message: `Code requires a minimum amount of ₹${coupon.minPrice}` });
    return;
  }

  let discount = 0;
  if (coupon.type === "flat") {
    discount = coupon.amount;
  } else if (coupon.type === "percentage") {
    discount = Math.round((amount * coupon.percentage) / 100);
    if (coupon.maxDiscount) discount = Math.min(discount, coupon.maxDiscount);
  }

  sendJson(response, 200, { valid: true, code: cleanCode, discount, description: coupon.description });
}

async function createBooking(request, response) {
  const user = getAuthenticatedUser(request);

  if (!user) {
    sendJson(response, 401, { message: "Please log in before creating a booking." });
    return;
  }

  const {
    itemId,
    flightId,
    service = "flights",
    travellerName,
    departureDate,
    passengers = 1,
    seats = [],
    couponCode = null,
    discountAmount = 0,
    paymentMethod = "UPI"
  } = await readRequestBody(request);

  const cleanService = String(service).toLowerCase();
  const selectedItem = findBookableItem(cleanService, itemId || flightId);
  const passengerCount = Number(passengers);

  if (!selectedItem || !travellerName?.trim() || !Number.isInteger(passengerCount) || passengerCount < 1 || passengerCount > 9) {
    sendJson(response, 400, { message: "A valid item, traveller name, and 1 to 9 passengers are required." });
    return;
  }

  const basePrice = selectedItem.price * passengerCount;
  const taxAmount = Math.round(basePrice * 0.18);
  const convenienceFee = 150;
  const finalDiscount = Number(discountAmount) || 0;
  const totalAmount = Math.max(0, basePrice + taxAmount + convenienceFee - finalDiscount);
  const pnr = generatePNR();

  const booking = {
    id: createId("BK"),
    pnr,
    userId: user.id,
    service: cleanService,
    item: selectedItem,
    flight: cleanService === "flights" ? selectedItem : undefined,
    travellerName: travellerName.trim(),
    departureDate: departureDate || new Date().toISOString().split("T")[0],
    passengers: passengerCount,
    seats: Array.isArray(seats) && seats.length ? seats : ["12A", "12B"].slice(0, passengerCount),
    basePrice,
    taxAmount,
    convenienceFee,
    discountAmount: finalDiscount,
    couponCode,
    paymentMethod,
    totalAmount,
    status: "CONFIRMED",
    createdAt: new Date().toISOString(),
  };

  const database = readDatabase();
  database.bookings.push(booking);
  writeDatabase(database);

  sendJson(response, 201, { message: "Booking & Payment confirmed!", booking });
}

function getBookings(request, response) {
  const user = getAuthenticatedUser(request);

  if (!user) {
    sendJson(response, 401, { message: "Please log in to view bookings." });
    return;
  }

  const database = readDatabase();
  const bookings = database.bookings.filter((booking) => booking.userId === user.id);
  sendJson(response, 200, { data: bookings });
}

function cancelBooking(request, response, bookingId) {
  const user = getAuthenticatedUser(request);

  if (!user) {
    sendJson(response, 401, { message: "Please log in to cancel a booking." });
    return;
  }

  const database = readDatabase();
  const booking = database.bookings.find(
    (item) => item.id === bookingId && item.userId === user.id,
  );

  if (!booking) {
    sendJson(response, 404, { message: "Booking not found." });
    return;
  }

  booking.status = "CANCELLED";
  booking.cancelledAt = new Date().toISOString();
  writeDatabase(database);
  sendJson(response, 200, { message: "Booking cancelled successfully.", booking });
}

async function phoneAuth(request, response) {
  const { phone } = await readRequestBody(request);
  const cleanPhone = phone?.trim() || "9876543210";
  const database = readDatabase();
  let user = database.users.find((u) => u.phone === cleanPhone || u.email === `${cleanPhone}@goibibo.demo`);

  if (!user) {
    user = {
      id: createId("USR"),
      name: `User (+91 ${cleanPhone.slice(0, 5)}...)`,
      phone: cleanPhone,
      email: `${cleanPhone}@goibibo.demo`,
      createdAt: new Date().toISOString(),
    };
    database.users.push(user);
  }

  const token = createToken();
  database.sessions.push({ token, userId: user.id, createdAt: new Date().toISOString() });
  writeDatabase(database);

  sendJson(response, 200, { message: "Login successful with Mobile OTP.", token, user: publicUser(user) });
}

async function googleAuth(request, response) {
  const database = readDatabase();
  let user = database.users.find((u) => u.email === "rahul.google@gmail.com");

  if (!user) {
    user = {
      id: createId("USR"),
      name: "Rahul Sharma",
      email: "rahul.google@gmail.com",
      createdAt: new Date().toISOString(),
    };
    database.users.push(user);
  }

  const token = createToken();
  database.sessions.push({ token, userId: user.id, createdAt: new Date().toISOString() });
  writeDatabase(database);

  sendJson(response, 200, { message: "Signed in with Google.", token, user: publicUser(user) });
}

async function handleApiRequest(request, response, requestUrl) {
  try {
    const { method } = request;
    let pathname = requestUrl.pathname;
    if (!pathname.startsWith("/api")) {
      pathname = `/api${pathname.startsWith("/") ? "" : "/"}${pathname}`;
    }
    const searchParams = requestUrl.searchParams;
    const bookingMatch = pathname.match(/^\/api\/bookings\/([^/]+)\/cancel$/);

    if (method === "GET" && pathname === "/api/health") {
      sendJson(response, 200, { status: "ok", message: "API is running." });
      return;
    }

    if (method === "GET" && pathname === "/api/airports") {
      sendJson(response, 200, { data: airports });
      return;
    }

    if (method === "POST" && pathname === "/api/coupons/validate") return validateCoupon(request, response);

    if (method === "GET" && pathname === "/api/flights") {
      sendJson(response, 200, { data: findFlights(searchParams) });
      return;
    }

    const searchMatch = pathname.match(/^\/api\/(flights|hotels|trains|buses|holidays)$/);
    if (method === "GET" && searchMatch) {
      const data = findInventory(searchMatch[1], searchParams);
      sendJson(response, data ? 200 : 404, data ? { data } : { message: "Service not found." });
      return;
    }

    if (method === "GET" && pathname === "/api/offers") {
      sendJson(response, 200, { data: offers });
      return;
    }

    if (method === "GET" && pathname === "/api/destinations") {
      sendJson(response, 200, { data: destinations });
      return;
    }

    if (method === "POST" && pathname === "/api/auth/register") return registerUser(request, response);
    if (method === "POST" && pathname === "/api/auth/login") return loginUser(request, response);
    if (method === "POST" && pathname === "/api/auth/logout") return logoutUser(request, response);
    if (method === "POST" && pathname === "/api/auth/phone") return phoneAuth(request, response);
    if (method === "POST" && pathname === "/api/auth/google") return googleAuth(request, response);

    if (method === "GET" && pathname === "/api/auth/me") {
      const user = getAuthenticatedUser(request);
      sendJson(response, user ? 200 : 401, user ? { user: publicUser(user) } : { message: "Unauthorized." });
      return;
    }

    if (method === "POST" && pathname === "/api/bookings") return createBooking(request, response);
    if (method === "GET" && pathname === "/api/bookings") return getBookings(request, response);
    if (method === "PATCH" && bookingMatch) return cancelBooking(request, response, bookingMatch[1]);

    sendJson(response, 404, { message: "API route not found." });
  } catch (error) {
    sendJson(response, 400, { message: error.message || "Request could not be completed." });
  }
}

module.exports = { handleApiRequest };

