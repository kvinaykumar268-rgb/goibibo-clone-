const apiBaseUrl = "/api";
const authButton = document.querySelector("#auth-button");
const logoutButton = document.querySelector("#logout-button");
const authForm = document.querySelector("#auth-form");
const authSwitch = document.querySelector("#auth-switch");
const themeToggleButton = document.querySelector("#theme-toggle-btn");
const bookingForm = document.querySelector("#booking-form");
const myTripsLink = document.querySelector("#my-trips-link");
const resultsList = document.querySelector("#results-list");
const resultsTitle = document.querySelector("#results-title");
const searchButton = document.querySelector(".search-btn");
const searchForm = document.querySelector(".search-form");
const swapButton = document.querySelector(".swap");
const toast = document.querySelector("#toast");
const fromInput = document.querySelector("#search-from");
const toInput = document.querySelector("#search-to");
const dateInput = document.querySelector("#search-date");
const returnDateInput = document.querySelector("#return-date");
const passengerInput = document.querySelector("#search-passengers");
const fromSuggestions = document.querySelector("#from-suggestions");
const toSuggestions = document.querySelector("#to-suggestions");

let activeService = "flights";
let authMode = "login";
let selectedItem = null;
let rawSearchResults = [];
let airportsList = [];
let selectedSeats = [];
let currentBookingDetails = null;
let appliedDiscount = 0;
let appliedCouponCode = null;

function getToken() {
  try { return localStorage.getItem("tripwise-demo-token") || localStorage.getItem("goibibo-demo-token"); } catch (e) { return null; }
}
function setToken(token) {
  try { localStorage.setItem("tripwise-demo-token", token); } catch (e) {}
}
function removeToken() {
  try {
    localStorage.removeItem("tripwise-demo-token");
    localStorage.removeItem("goibibo-demo-token");
  } catch (e) {}
}
function localDateValue() { return new Date().toLocaleDateString("en-CA"); }


function openModal(modalId) {
  const modal = document.querySelector(`#${modalId}`);
  if (modal) {
    modal.classList.add("is-open");
    modal.setAttribute("aria-hidden", "false");
  }
}

function closeModal(modalId) {
  const modal = document.querySelector(`#${modalId}`);
  if (modal) {
    modal.classList.remove("is-open");
    modal.setAttribute("aria-hidden", "true");
  }
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("is-visible");
  window.clearTimeout(showToast.timeout);
  showToast.timeout = window.setTimeout(() => toast.classList.remove("is-visible"), 3500);
}

async function apiRequest(endpoint, options = {}) {
  const headers = { "Content-Type": "application/json", ...options.headers };
  if (getToken()) headers.Authorization = `Bearer ${getToken()}`;
  const response = await fetch(`${apiBaseUrl}${endpoint}`, { ...options, headers });
  const result = await response.json();
  if (!response.ok) throw new Error(result.message || "Something went wrong.");
  return result;
}

// AIRPORTS AUTOCOMPLETE
async function loadAirports() {
  try {
    const res = await apiRequest("/airports");
    airportsList = res.data || [];
  } catch (err) {
    console.error("Airports load error", err);
  }
}

function setupAutocomplete(inputElement, dropdownElement) {
  inputElement.addEventListener("input", () => {
    const query = inputElement.value.trim().toLowerCase();
    if (!query || !airportsList.length) {
      dropdownElement.classList.add("hidden");
      return;
    }
    const matches = airportsList.filter(a =>
      a.city.toLowerCase().includes(query) ||
      a.code.toLowerCase().includes(query) ||
      a.airport.toLowerCase().includes(query)
    );
    if (!matches.length) {
      dropdownElement.classList.add("hidden");
      return;
    }
    dropdownElement.innerHTML = matches.map(item => `
      <div class="autocomplete-item" data-value="${item.city}">
        <div>
          <strong>${item.city}</strong>
          <div style="font-size: 11px; color: #666;">${item.airport}</div>
        </div>
        <span class="code-badge">${item.code}</span>
      </div>
    `).join("");
    dropdownElement.classList.remove("hidden");
  });

  dropdownElement.addEventListener("click", (e) => {
    const item = e.target.closest(".autocomplete-item");
    if (item) {
      inputElement.value = item.dataset.value;
      dropdownElement.classList.add("hidden");
    }
  });

  document.addEventListener("click", (e) => {
    if (!inputElement.contains(e.target) && !dropdownElement.contains(e.target)) {
      dropdownElement.classList.add("hidden");
    }
  });
}

function updateAuthButton(user) {
  const loggedIn = Boolean(user);
  authButton.textContent = loggedIn ? `Hi, ${user.name.split(" ")[0]}` : "Login / Sign up";
  logoutButton.classList.toggle("hidden", !loggedIn);
}

async function restoreUserSession() {
  if (!getToken()) return;
  try { updateAuthButton((await apiRequest("/auth/me")).user); } catch { removeToken(); updateAuthButton(null); }
}

function setSearchButtonLabel(serviceName) {
  searchButton.innerHTML = `Search ${serviceName} <span>→</span>`;
}

function syncServiceForm() {
  const routeBased = ["flights", "trains", "buses"].includes(activeService);
  fromInput.closest(".field-wrap").style.display = (!routeBased && activeService !== "hotels") ? "none" : "block";
  toInput.placeholder = activeService === "hotels" ? "City e.g. Goa" : activeService === "holidays" ? "Destination e.g. Bali" : "Where to?";
  returnDateInput.closest("label").classList.toggle("is-muted", activeService !== "flights");
}

function handleTabChange(selectedTab) {
  activeService = selectedTab.dataset.panel;
  document.querySelector(".tab.active").classList.remove("active");
  selectedTab.classList.add("active");
  setSearchButtonLabel(activeService);
  syncServiceForm();
}

function swapCities() {
  [fromInput.value, toInput.value] = [toInput.value, fromInput.value];
  if (!fromInput.value) fromInput.focus();
}

function itemDetails(item, service) {
  if (service === "flights") return `${item.from} (${item.fromCode || 'DEL'}) ${item.departureTime} → ${item.to} (${item.toCode || 'BOM'}) ${item.arrivalTime} · ${item.duration} · ${item.stops === 0 ? 'Non-stop' : '1 Stop'}`;
  if (service === "hotels") return `${item.city} · ${item.rating || 4.5}★ rating · per night`;
  if (service === "holidays") return `${item.location} · ${item.duration} · ${item.rating || 4.7}★ rating`;
  return `${item.from} ${item.departureTime} → ${item.to} ${item.arrivalTime} · ${item.duration}`;
}

function itemTitle(item, service) {
  if (service === "flights") return `${item.airline} · ${item.flightNumber}`;
  if (service === "trains") return `${item.name} · ${item.number}`;
  if (service === "buses") return item.operator;
  return item.name;
}

// FILTER & SORT ENGINE
function applyFiltersAndSort() {
  if (!rawSearchResults) return;
  let filtered = [...rawSearchResults];

  const maxPrice = Number(document.querySelector("#price-filter").value);
  filtered = filtered.filter(item => item.price <= maxPrice);

  const selectedStops = Array.from(document.querySelectorAll(".stop-filter:checked")).map(cb => Number(cb.value));
  if (activeService === "flights" && selectedStops.length > 0) {
    filtered = filtered.filter(item => selectedStops.includes(item.stops ?? 0));
  }

  const selectedTime = document.querySelector("#time-filter").value;
  if (selectedTime !== "all") {
    filtered = filtered.filter(item => item.timeSlot === selectedTime || !item.timeSlot);
  }

  const sortValue = document.querySelector("#sort-select").value;
  if (sortValue === "price-asc") {
    filtered.sort((a, b) => a.price - b.price);
  } else if (sortValue === "price-desc") {
    filtered.sort((a, b) => b.price - a.price);
  } else if (sortValue === "rating-desc") {
    filtered.sort((a, b) => (b.rating || 4) - (a.rating || 4));
  }

  renderSearchResults(filtered, activeService);
}

function renderSearchResults(items, service) {
  resultsTitle.textContent = `Available ${service}`;
  resultsList.innerHTML = items.length ? items.map((item) => `
    <article class="flight-result">
      <div>
        <h3>${itemTitle(item, service)}</h3>
        <p>${itemDetails(item, service)}</p>
      </div>
      <div class="flight-price">
        <strong>₹${item.price.toLocaleString("en-IN")}</strong>
        <button data-item-id="${item.id}" data-service="${service}" type="button">Book now</button>
      </div>
    </article>`).join("") : "<p>No matching options were found for these filters.</p>";
}

function bookingItem(booking) { return booking.item || booking.flight; }

function renderBookings(bookings) {
  resultsTitle.textContent = "My trips";
  document.querySelector("#filter-sidebar").style.display = "none";
  resultsList.innerHTML = bookings.length ? bookings.map((booking) => {
    const item = bookingItem(booking);
    const service = booking.service || "flights";
    return `
      <article class="flight-result">
        <div>
          <h3>${itemTitle(item, service)} <small style="color: #666; font-size:12px;">(PNR: ${booking.pnr || booking.id})</small></h3>
          <p>${itemDetails(item, service)} · Travel Date: ${booking.departureDate}</p>
          <p>${booking.travellerName} · Seats: ${booking.seats ? booking.seats.join(", ") : "Confirmed"} · ${booking.status}</p>
        </div>
        <div class="flight-price">
          <strong>₹${booking.totalAmount.toLocaleString("en-IN")}</strong>
          ${booking.status === "CONFIRMED" ? `<button data-view-ticket-id="${booking.id}" type="button" style="margin-bottom:6px; background:#17634e; color:#fff;">View E-Ticket</button><button data-booking-id="${booking.id}" type="button">Cancel</button>` : `<span style="color:#d9534f; font-size:12px; font-weight:700;">CANCELLED</span>`}
        </div>
      </article>`;
  }).join("") : "<p>You do not have any bookings yet.</p>";
}

async function showMyTrips(event) {
  event?.preventDefault();
  if (!getToken()) { showToast("Please login to view your trips."); openModal("auth-modal"); return; }
  try {
    const bookings = (await apiRequest("/bookings")).data;
    renderBookings(bookings);
    openModal("results-modal");
  } catch (error) { showToast(error.message); }
}

async function cancelBooking(bookingId) {
  try {
    showToast((await apiRequest(`/bookings/${bookingId}/cancel`, { method: "PATCH" })).message);
    showMyTrips();
  } catch (error) { showToast(error.message); }
}

function buildSearchQuery() {
  const params = new URLSearchParams();
  if (fromInput.value.trim()) params.set("from", fromInput.value.trim());
  if (toInput.value.trim()) params.set("to", toInput.value.trim());
  return params.toString();
}

async function handleSearch(event) {
  event.preventDefault();
  searchButton.textContent = "Searching...";
  document.querySelector("#filter-sidebar").style.display = "block";
  try {
    const { data } = await apiRequest(`/${activeService}?${buildSearchQuery()}`);
    rawSearchResults = data || [];
    applyFiltersAndSort();
    openModal("results-modal");
  } catch (error) { showToast(error.message); } finally { setSearchButtonLabel(activeService); }
}

let authType = "phone"; // "phone" or "email"
let otpSent = false;

function switchAuthType(type) {
  authType = type;
  const isPhone = type === "phone";
  document.querySelector("#toggle-phone-btn").classList.toggle("active", isPhone);
  document.querySelector("#toggle-email-btn").classList.toggle("active", !isPhone);
  document.querySelector("#phone-auth-container").classList.toggle("hidden", !isPhone);
  document.querySelector("#email-auth-container").classList.toggle("hidden", isPhone);
}

async function handleGoogleLogin() {
  showToast("Signing in with Google...");
  try {
    const res = await apiRequest("/auth/google", { method: "POST" });
    setToken(res.token);
    updateAuthButton(res.user);
    closeModal("auth-modal");
    showToast(`Welcome ${res.user.name}! Logged in via Google.`);
  } catch (err) {
    const demoUser = { name: "Rahul Sharma", email: "rahul.google@gmail.com" };
    setToken("demo-google-token-" + Date.now());
    updateAuthButton(demoUser);
    closeModal("auth-modal");
    showToast("Logged in successfully with Google!");
  }
}

function toggleAuthMode() {
  authMode = authMode === "login" ? "register" : "login";
  const registering = authMode === "register";
  document.querySelector("#auth-kicker").textContent = registering ? "JOIN TRIPWISE" : "WELCOME BACK";
  document.querySelector("#auth-title").textContent = registering ? "Create your account" : "Login to your account";
  document.querySelector("#name-field").classList.toggle("hidden", !registering);
  document.querySelector("#auth-submit").textContent = registering ? "Create account" : (authType === "phone" && otpSent ? "Verify OTP & Login" : "Continue →");
  authSwitch.textContent = registering ? "Already have an account? Login" : "New here? Create an account";
}

async function handleAuthSubmit(event) {
  event.preventDefault();
  
  if (authType === "phone") {
    const phoneVal = document.querySelector("#auth-phone").value.trim();
    if (!phoneVal || phoneVal.length < 10) {
      showToast("Please enter a valid 10-digit mobile number.");
      return;
    }
    const otpContainer = document.querySelector("#otp-container");
    if (!otpSent) {
      otpSent = true;
      otpContainer.classList.remove("hidden");
      document.querySelector("#auth-submit").textContent = "Verify OTP & Login";
      showToast("OTP sent to +91 " + phoneVal + " (Demo OTP: 1234)");
      return;
    }

    const otpVal = document.querySelector("#auth-otp").value.trim();
    if (!otpVal || otpVal.length < 4) {
      showToast("Please enter the 4-digit OTP.");
      return;
    }

    try {
      const res = await apiRequest("/auth/phone", { method: "POST", body: JSON.stringify({ phone: phoneVal, otp: otpVal }) });
      setToken(res.token);
      updateAuthButton(res.user);
      closeModal("auth-modal");
      authForm.reset();
      otpSent = false;
      otpContainer.classList.add("hidden");
      document.querySelector("#auth-submit").textContent = "Continue →";
      showToast(res.message || "Logged in with Mobile Number!");
    } catch (err) {
      const demoUser = { name: `User (+91 ${phoneVal.slice(0, 5)}...)`, email: `${phoneVal}@tripwise.demo` };
      setToken("demo-phone-token-" + Date.now());
      updateAuthButton(demoUser);
      closeModal("auth-modal");
      authForm.reset();
      otpSent = false;
      otpContainer.classList.add("hidden");
      document.querySelector("#auth-submit").textContent = "Continue →";
      showToast("Logged in successfully with Mobile Number!");
    }
    return;
  }

  // Email Mode
  const body = { email: document.querySelector("#auth-email").value, password: document.querySelector("#auth-password").value };
  if (authMode === "register") body.name = document.querySelector("#auth-name").value;
  try {
    const { token, user, message } = await apiRequest(authMode === "login" ? "/auth/login" : "/auth/register", { method: "POST", body: JSON.stringify(body) });
    setToken(token); updateAuthButton(user); closeModal("auth-modal"); authForm.reset(); showToast(message);
  } catch (error) { showToast(error.message); }
}

async function logout() {
  try { if (getToken()) await apiRequest("/auth/logout", { method: "POST" }); } catch { /* local logout still succeeds */ }
  removeToken(); updateAuthButton(null); showToast("You have been logged out.");
}

// SEAT SELECTION INTERACTIVITY
function initSeatPicker(service, count) {
  const container = document.querySelector("#seat-grid-container");
  container.innerHTML = "";
  selectedSeats = [];

  const rows = ["1", "2", "3", "4", "5"];
  const cols = ["A", "B", "C", "D", "E", "F"];
  const bookedSeats = ["1B", "2D", "3F", "4A"];

  rows.forEach(row => {
    cols.forEach((col, idx) => {
      const seatCode = `${row}${col}`;
      const isBooked = bookedSeats.includes(seatCode);
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = `seat-button ${isBooked ? "booked" : ""} ${idx === 2 ? "aisle-gap" : ""}`;
      btn.textContent = seatCode;
      btn.dataset.seat = seatCode;
      if (!isBooked) {
        btn.addEventListener("click", () => toggleSeatSelection(btn, seatCode, count));
      }
      container.appendChild(btn);
    });
  });
  document.querySelector("#selected-seats-display").textContent = "None";
}

function toggleSeatSelection(btn, seatCode, maxCount) {
  if (btn.classList.contains("selected")) {
    btn.classList.remove("selected");
    selectedSeats = selectedSeats.filter(s => s !== seatCode);
  } else {
    if (selectedSeats.length >= maxCount) {
      showToast(`You can select maximum ${maxCount} seat(s).`);
      return;
    }
    btn.classList.add("selected");
    selectedSeats.push(seatCode);
  }
  document.querySelector("#selected-seats-display").textContent = selectedSeats.length ? selectedSeats.join(", ") : "None";
}

function startBooking(itemId, service) {
  if (!getToken()) { showToast("Please login before booking."); openModal("auth-modal"); return; }
  
  const found = rawSearchResults.find(i => i.id === itemId);
  selectedItem = found ? { ...found, service } : { id: itemId, service, price: 5000 };

  const passengers = Number(passengerInput.value) || 1;
  appliedDiscount = 0;
  appliedCouponCode = null;
  document.querySelector("#coupon-code-input").value = "";
  document.querySelector("#coupon-status-msg").textContent = "";

  closeModal("results-modal");

  if (["flights", "buses", "trains"].includes(service)) {
    document.querySelector("#seat-modal-title").textContent = `Select Seats for ${itemTitle(selectedItem, service)}`;
    initSeatPicker(service, passengers);
    openModal("seat-modal");
  } else {
    openCheckoutModal();
  }
}

function openCheckoutModal() {
  closeModal("seat-modal");
  const passengers = Number(passengerInput.value) || 1;
  document.querySelector("#passenger-count").value = passengers;
  document.querySelector("#departure-date").value = dateInput.value || localDateValue();
  document.querySelector("#selected-flight-label").textContent = `Booking: ${itemTitle(selectedItem, selectedItem.service)} · ${passengers} Traveller(s)`;
  updateCheckoutPriceSummary();
  openModal("booking-modal");
}

function updateCheckoutPriceSummary() {
  const passengers = Number(document.querySelector("#passenger-count").value) || 1;
  const basePrice = selectedItem.price * passengers;
  const tax = Math.round(basePrice * 0.18);
  const convenienceFee = 150;
  const total = Math.max(0, basePrice + tax + convenienceFee - appliedDiscount);

  document.querySelector("#summary-base").textContent = `₹${basePrice.toLocaleString("en-IN")}`;
  document.querySelector("#summary-tax").textContent = `₹${tax.toLocaleString("en-IN")}`;
  document.querySelector("#summary-discount-row").classList.toggle("hidden", appliedDiscount <= 0);
  document.querySelector("#summary-discount").textContent = `-₹${appliedDiscount.toLocaleString("en-IN")}`;
  document.querySelector("#summary-total").textContent = `₹${total.toLocaleString("en-IN")}`;
}

async function handleApplyCoupon() {
  const code = document.querySelector("#coupon-code-input").value.trim();
  const passengers = Number(document.querySelector("#passenger-count").value) || 1;
  const basePrice = selectedItem.price * passengers;
  const statusMsg = document.querySelector("#coupon-status-msg");

  if (!code) {
    statusMsg.style.color = "red";
    statusMsg.textContent = "Please enter a coupon code.";
    return;
  }

  try {
    const res = await apiRequest("/coupons/validate", {
      method: "POST",
      body: JSON.stringify({ code, amount: basePrice })
    });

    if (res.valid) {
      appliedDiscount = res.discount;
      appliedCouponCode = res.code;
      statusMsg.style.color = "green";
      statusMsg.textContent = `Coupon applied! ${res.description}`;
      updateCheckoutPriceSummary();
    }
  } catch (err) {
    appliedDiscount = 0;
    appliedCouponCode = null;
    statusMsg.style.color = "red";
    statusMsg.textContent = err.message || "Invalid coupon code.";
    updateCheckoutPriceSummary();
  }
}

async function handleBookingSubmit(event) {
  event.preventDefault();
  if (!selectedItem) return;

  const submitBtn = document.querySelector("#pay-submit-btn");
  submitBtn.textContent = "Authorizing Payment... ⏳";
  submitBtn.disabled = true;

  try {
    const selectedPayMethod = document.querySelector("input[name='payment-method']:checked").value;
    const body = {
      itemId: selectedItem.id,
      service: selectedItem.service,
      travellerName: document.querySelector("#traveller-name").value,
      departureDate: document.querySelector("#departure-date").value,
      passengers: document.querySelector("#passenger-count").value,
      seats: selectedSeats.length ? selectedSeats : ["12A"],
      couponCode: appliedCouponCode,
      discountAmount: appliedDiscount,
      paymentMethod: selectedPayMethod
    };

    const { booking, message } = await apiRequest("/bookings", { method: "POST", body: JSON.stringify(body) });

    closeModal("booking-modal");
    bookingForm.reset();
    selectedItem = null;
    showToast(message);

    showTicketModal(booking);
  } catch (error) {
    showToast(error.message);
  } finally {
    submitBtn.textContent = "Pay & Confirm Booking 🔒";
    submitBtn.disabled = false;
  }
}

function showTicketModal(booking) {
  const item = bookingItem(booking);
  document.querySelector("#ticket-pnr").textContent = booking.pnr || "TPW9841";
  document.querySelector("#ticket-id").textContent = booking.id;
  document.querySelector("#ticket-passenger").textContent = booking.travellerName;
  document.querySelector("#ticket-date").textContent = booking.departureDate;
  document.querySelector("#ticket-carrier").textContent = itemTitle(item, booking.service);
  document.querySelector("#ticket-seats").textContent = booking.seats ? booking.seats.join(", ") : "Confirmed";
  document.querySelector("#ticket-amount").textContent = `₹${booking.totalAmount.toLocaleString("en-IN")}`;
  document.querySelector("#ticket-paymethod").textContent = booking.paymentMethod || "UPI";

  document.querySelector("#ticket-from-code").textContent = item.fromCode || item.from?.slice(0, 3).toUpperCase() || "DEL";
  document.querySelector("#ticket-from-name").textContent = item.from || "Origin";
  document.querySelector("#ticket-to-code").textContent = item.toCode || item.to?.slice(0, 3).toUpperCase() || item.city?.slice(0, 3).toUpperCase() || "BOM";
  document.querySelector("#ticket-to-name").textContent = item.to || item.city || item.location || "Destination";
  document.querySelector("#ticket-dept-time").textContent = item.departureTime || "09:00 AM";
  document.querySelector("#ticket-arr-time").textContent = item.arrivalTime || "11:15 AM";
  document.querySelector("#ticket-duration").textContent = item.duration || "Direct";

  openModal("ticket-modal");
}

function chooseDestination(destination) {
  activeService = "holidays";
  document.querySelectorAll(".tab").forEach((tab) => tab.classList.toggle("active", tab.dataset.panel === activeService));
  toInput.value = destination;
  setSearchButtonLabel(activeService); syncServiceForm(); searchForm.requestSubmit();
}

// SETUP LISTENERS
document.querySelectorAll(".tab").forEach((tab) => tab.addEventListener("click", () => handleTabChange(tab)));
document.querySelectorAll("[data-close-modal]").forEach((button) => button.addEventListener("click", () => closeModal(button.dataset.closeModal)));
document.querySelectorAll(".offer button[data-service]").forEach((button) => button.addEventListener("click", () => { document.querySelector(`[data-panel="${button.dataset.service}"]`).click(); document.querySelector(".search-wrap").scrollIntoView({ behavior: "smooth" }); }));
document.querySelectorAll(".destination").forEach((card) => card.addEventListener("click", () => chooseDestination(card.dataset.destination)));
document.querySelectorAll("[data-destination-direction]").forEach((button) => button.addEventListener("click", () => document.querySelector(".destination-grid").scrollBy({ left: button.dataset.destinationDirection === "next" ? 260 : -260, behavior: "smooth" })));
document.querySelectorAll(".dest-filter-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".dest-filter-btn").forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    const filter = btn.dataset.destFilter;
    const grid = document.querySelector(".destination-grid");
    document.querySelectorAll(".destination-grid .destination").forEach((card) => {
      const type = card.dataset.type;
      if (filter === "all" || type === filter) {
        card.style.display = "";
      } else {
        card.style.display = "none";
      }
    });
    grid.scrollLeft = 0;
  });
});
document.querySelectorAll("[data-app-store]").forEach((button) => button.addEventListener("click", () => showToast(`${button.dataset.appStore} link can be added when your app is published.`)));

authButton.addEventListener("click", () => getToken() ? showMyTrips() : openModal("auth-modal"));
logoutButton.addEventListener("click", logout);
authSwitch.addEventListener("click", toggleAuthMode);
authForm.addEventListener("submit", handleAuthSubmit);
document.querySelector("#google-login-btn")?.addEventListener("click", handleGoogleLogin);
document.querySelector("#toggle-phone-btn")?.addEventListener("click", () => switchAuthType("phone"));
document.querySelector("#toggle-email-btn")?.addEventListener("click", () => switchAuthType("email"));
bookingForm.addEventListener("submit", handleBookingSubmit);

// Filter & Sort event listeners
document.querySelector("#price-filter").addEventListener("input", (e) => {
  document.querySelector("#price-limit-val").textContent = `₹${Number(e.target.value).toLocaleString("en-IN")}`;
  applyFiltersAndSort();
});
document.querySelectorAll(".stop-filter").forEach(cb => cb.addEventListener("change", applyFiltersAndSort));
document.querySelector("#time-filter").addEventListener("change", applyFiltersAndSort);
document.querySelector("#sort-select").addEventListener("change", applyFiltersAndSort);
document.querySelector("#reset-filters").addEventListener("click", () => {
  document.querySelector("#price-filter").value = 50000;
  document.querySelector("#price-limit-val").textContent = "₹50,000";
  document.querySelectorAll(".stop-filter").forEach(cb => cb.checked = true);
  document.querySelector("#time-filter").value = "all";
  document.querySelector("#sort-select").value = "price-asc";
  applyFiltersAndSort();
});

// Seat confirmation button
document.querySelector("#confirm-seats-btn").addEventListener("click", openCheckoutModal);

// Coupon button
document.querySelector("#apply-coupon-btn").addEventListener("click", handleApplyCoupon);

// Payment method radio toggles
document.querySelectorAll("input[name='payment-method']").forEach(radio => {
  radio.addEventListener("change", (e) => {
    const val = e.target.value;
    document.querySelector("#upi-box").classList.toggle("hidden", val !== "UPI");
    document.querySelector("#card-box").classList.toggle("hidden", val !== "CARD");
  });
});

// Print ticket button
document.querySelector("#print-ticket-btn").addEventListener("click", () => {
  window.print();
});

resultsList.addEventListener("click", async (event) => {
  const { bookingId, itemId, service, viewTicketId } = event.target.dataset;
  if (itemId) startBooking(itemId, service);
  if (bookingId) cancelBooking(bookingId);
  if (viewTicketId) {
    try {
      const bookings = (await apiRequest("/bookings")).data;
      const b = bookings.find(x => x.id === viewTicketId);
      if (b) showTicketModal(b);
    } catch (err) {
      showToast(err.message);
    }
  }
});

myTripsLink.addEventListener("click", showMyTrips);
swapButton.addEventListener("click", swapCities);
searchForm.addEventListener("submit", handleSearch);

setupAutocomplete(fromInput, fromSuggestions);
setupAutocomplete(toInput, toSuggestions);

dateInput.min = localDateValue();
returnDateInput.min = localDateValue();
dateInput.value = localDateValue();
document.querySelector("#departure-date").min = localDateValue();

syncServiceForm();
restoreUserSession();
loadAirports();

// HERO DYNAMIC TEXT ROTATOR EFFECT
function initHeroTextRotator() {
  const dynamicTextEl = document.querySelector("#hero-dynamic-text");
  if (!dynamicTextEl) return;
  const phrases = ["here.", "in Goa.", "in Maldives.", "in Dubai.", "in Manali.", "with us."];
  let index = 0;

  setInterval(() => {
    index = (index + 1) % phrases.length;
    dynamicTextEl.classList.add("word-swap");
    setTimeout(() => {
      dynamicTextEl.textContent = phrases[index];
      dynamicTextEl.classList.remove("word-swap");
    }, 400);
  }, 3500);
}

// THEME MANAGEMENT (LIGHT / DARK MODE)
function getStoredTheme() {
  try {
    return localStorage.getItem("tripwise-theme") || localStorage.getItem("goibibo-theme");
  } catch (e) {
    return null;
  }
}

function setStoredTheme(theme) {
  try {
    localStorage.setItem("tripwise-theme", theme);
  } catch (e) {}
}

function getCurrentEffectiveTheme() {
  const currentAttr = document.documentElement.getAttribute("data-theme");
  if (currentAttr === "dark" || currentAttr === "light") {
    return currentAttr;
  }
  if (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches) {
    return "dark";
  }
  return "light";
}

function updateThemeToggleUI(theme) {
  if (!themeToggleButton) return;
  const isDark = theme === "dark";
  const labelEl = themeToggleButton.querySelector(".theme-toggle-text");
  if (labelEl) {
    labelEl.textContent = isDark ? "Light" : "Dark";
  }
  themeToggleButton.setAttribute(
    "aria-label",
    isDark ? "Switch to light mode" : "Switch to dark mode"
  );
  themeToggleButton.setAttribute(
    "title",
    isDark ? "Switch to light mode" : "Switch to dark mode"
  );
}

function applyTheme(theme, notify = false) {
  document.documentElement.setAttribute("data-theme", theme);
  setStoredTheme(theme);
  updateThemeToggleUI(theme);
  if (notify) {
    showToast(theme === "dark" ? "🌙 Switched to Dark Mode" : "☀️ Switched to Light Mode");
  }
}

function toggleTheme() {
  const current = getCurrentEffectiveTheme();
  const nextTheme = current === "dark" ? "light" : "dark";
  applyTheme(nextTheme, true);
}

function initTheme() {
  const saved = getStoredTheme();
  if (saved) {
    applyTheme(saved, false);
  } else {
    const prefersDark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
    const initialTheme = prefersDark ? "dark" : "light";
    document.documentElement.setAttribute("data-theme", initialTheme);
    updateThemeToggleUI(initialTheme);
  }

  if (themeToggleButton) {
    themeToggleButton.addEventListener("click", toggleTheme);
  }

  if (window.matchMedia) {
    window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", (e) => {
      if (!getStoredTheme()) {
        const newTheme = e.matches ? "dark" : "light";
        document.documentElement.setAttribute("data-theme", newTheme);
        updateThemeToggleUI(newTheme);
      }
    });
  }
}

initHeroTextRotator();
initTheme();

// HERO AUTOSLIDER & SPONSORED AD CAROUSEL
function initHeroCarousel() {
  const heroSection = document.querySelector("#hero-carousel");
  const track = document.querySelector("#hero-slider-track");
  const dots = document.querySelectorAll(".hero-dot");
  const prevBtn = document.querySelector("#hero-slide-prev");
  const nextBtn = document.querySelector("#hero-slide-next");
  const couponBtn = document.querySelector("#ad-hero-coupon-btn");
  const ctaBtn = document.querySelector("#ad-hero-cta-btn");

  if (!heroSection || !track) return;

  const totalSlides = 2;
  let currentSlide = 0;
  let slideInterval = null;
  let isHovered = false;

  function goToSlide(index) {
    currentSlide = (index + totalSlides) % totalSlides;
    // Slide left: translateX(-0%) for slide 0, translateX(-50%) for slide 1
    track.style.transform = `translateX(-${currentSlide * 50}%)`;

    dots.forEach((dot, i) => {
      dot.classList.toggle("active", i === currentSlide);
    });
  }

  function startAutoSlide() {
    stopAutoSlide();
    slideInterval = setInterval(() => {
      if (!isHovered) {
        goToSlide(currentSlide + 1);
      }
    }, 6500);
  }

  function stopAutoSlide() {
    if (slideInterval) {
      clearInterval(slideInterval);
      slideInterval = null;
    }
  }

  // Hover pauses autosliding so user can read/click smoothly
  heroSection.addEventListener("mouseenter", () => { isHovered = true; });
  heroSection.addEventListener("mouseleave", () => { isHovered = false; });

  // Navigation Arrows
  if (prevBtn) {
    prevBtn.addEventListener("click", () => {
      goToSlide(currentSlide - 1);
      startAutoSlide();
    });
  }

  if (nextBtn) {
    nextBtn.addEventListener("click", () => {
      goToSlide(currentSlide + 1);
      startAutoSlide();
    });
  }

  // Navigation Dots
  dots.forEach((dot) => {
    dot.addEventListener("click", () => {
      const idx = parseInt(dot.getAttribute("data-slide-index"), 10) || 0;
      goToSlide(idx);
      startAutoSlide();
    });
  });

  // Touch Swipe Support on Mobile/Tablets
  let touchStartX = 0;
  heroSection.addEventListener("touchstart", (e) => {
    touchStartX = e.touches[0].clientX;
  }, { passive: true });

  heroSection.addEventListener("touchend", (e) => {
    const touchEndX = e.changedTouches[0].clientX;
    const diff = touchStartX - touchEndX;
    if (Math.abs(diff) > 40) {
      if (diff > 0) {
        goToSlide(currentSlide + 1); // Swiped left -> next slide
      } else {
        goToSlide(currentSlide - 1); // Swiped right -> prev slide
      }
      startAutoSlide();
    }
  }, { passive: true });

  // Ad Slide Actions: 1-Click Promo Code Copy
  if (couponBtn) {
    couponBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      const code = "EMIRATES35";
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(code).catch(() => {});
      }
      showToast(`Promo code ${code} copied! Flat ₹3,500 off on Dubai flights.`);
    });
  }

  // Ad Slide Actions: Explore Dubai Deals CTA
  if (ctaBtn) {
    ctaBtn.addEventListener("click", () => {
      const fromInput = document.querySelector("#flight-from");
      const toInput = document.querySelector("#flight-to");

      if (fromInput && !fromInput.value) {
        fromInput.value = "New Delhi";
      }
      if (toInput) {
        toInput.value = "Dubai";
      }

      const searchWrap = document.querySelector(".search-wrap");
      if (searchWrap) {
        searchWrap.scrollIntoView({ behavior: "smooth", block: "center" });
        searchWrap.classList.add("highlight-pulse");
        setTimeout(() => searchWrap.classList.remove("highlight-pulse"), 1300);
      }

      showToast(`Emirates Dubai offers loaded! Click "Search Flights".`);
    });
  }

  // Kick off auto slider
  startAutoSlide();
}

initHeroCarousel();


