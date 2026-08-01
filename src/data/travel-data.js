const airports = [
  { city: "New Delhi", code: "DEL", airport: "Indira Gandhi International Airport" },
  { city: "Mumbai", code: "BOM", airport: "Chhatrapati Shivaji Maharaj International Airport" },
  { city: "Bengaluru", code: "BLR", airport: "Kempegowda International Airport" },
  { city: "Goa", code: "GOI", airport: "Dabolim / Mopa International Airport" },
  { city: "Jaipur", code: "JAI", airport: "Jaipur International Airport" },
  { city: "Manali", code: "KUU", airport: "Kullu–Manali Airport" },
  { city: "Chandigarh", code: "IXC", airport: "Chandigarh International Airport" },
  { city: "Kolkata", code: "CCU", airport: "Netaji Subhash Chandra Bose Airport" },
  { city: "Chennai", code: "MAA", airport: "Chennai International Airport" },
  { city: "Hyderabad", code: "HYD", airport: "Rajiv Gandhi International Airport" },
  { city: "Dubai", code: "DXB", airport: "Dubai International Airport" },
  { city: "Maldives", code: "MLE", airport: "Velana International Airport, Male" },
  { city: "Bali", code: "DPS", airport: "Ngurah Rai International Airport, Denpasar" }
];

const flights = [
  {
    id: "FL-101",
    airline: "IndiGo",
    flightNumber: "6E 2134",
    from: "New Delhi",
    fromCode: "DEL",
    to: "Mumbai",
    toCode: "BOM",
    departureTime: "06:15",
    arrivalTime: "08:20",
    timeSlot: "morning",
    stops: 0,
    duration: "2h 05m",
    price: 4899,
    rating: 4.5
  },
  {
    id: "FL-102",
    airline: "Air India",
    flightNumber: "AI 665",
    from: "New Delhi",
    fromCode: "DEL",
    to: "Mumbai",
    toCode: "BOM",
    departureTime: "09:40",
    arrivalTime: "11:55",
    timeSlot: "morning",
    stops: 0,
    duration: "2h 15m",
    price: 5720,
    rating: 4.2
  },
  {
    id: "FL-103",
    airline: "Vistara",
    flightNumber: "UK 955",
    from: "New Delhi",
    fromCode: "DEL",
    to: "Bengaluru",
    toCode: "BLR",
    departureTime: "12:30",
    arrivalTime: "15:20",
    timeSlot: "afternoon",
    stops: 0,
    duration: "2h 50m",
    price: 6125,
    rating: 4.8
  },
  {
    id: "FL-104",
    airline: "Akasa Air",
    flightNumber: "QP 1123",
    from: "Mumbai",
    fromCode: "BOM",
    to: "New Delhi",
    toCode: "DEL",
    departureTime: "07:10",
    arrivalTime: "09:20",
    timeSlot: "morning",
    stops: 0,
    duration: "2h 10m",
    price: 5100,
    rating: 4.3
  },
  {
    id: "FL-105",
    airline: "IndiGo",
    flightNumber: "6E 531",
    from: "Bengaluru",
    fromCode: "BLR",
    to: "New Delhi",
    toCode: "DEL",
    departureTime: "18:35",
    arrivalTime: "21:25",
    timeSlot: "evening",
    stops: 0,
    duration: "2h 50m",
    price: 5900,
    rating: 4.4
  },
  {
    id: "FL-106",
    airline: "Air India",
    flightNumber: "AI 804",
    from: "New Delhi",
    fromCode: "DEL",
    to: "Goa",
    toCode: "GOI",
    departureTime: "14:15",
    arrivalTime: "16:45",
    timeSlot: "afternoon",
    stops: 0,
    duration: "2h 30m",
    price: 4399,
    rating: 4.1
  },
  {
    id: "FL-107",
    airline: "SpiceJet",
    flightNumber: "SG 8171",
    from: "New Delhi",
    fromCode: "DEL",
    to: "Goa",
    toCode: "GOI",
    departureTime: "21:00",
    arrivalTime: "23:35",
    timeSlot: "night",
    stops: 1,
    duration: "2h 35m",
    price: 3899,
    rating: 3.9
  }
];

const inventory = {
  hotels: [
    { id: "HT-101", name: "Palm Grove Luxury Resort", city: "Goa", rating: 4.8, price: 4499, timeSlot: "any", amenities: ["Pool", "Free WiFi", "Beach view"], image: "beach" },
    { id: "HT-102", name: "Cityview Residency & Spa", city: "Mumbai", rating: 4.3, price: 4299, timeSlot: "any", amenities: ["Gym", "Breakfast", "Airport transfer"], image: "cityscape" },
    { id: "HT-103", name: "Himalayan Pine Retreat", city: "Manali", rating: 4.6, price: 3899, timeSlot: "any", amenities: ["Mountain view", "Heater", "Bonfire"], image: "mountain" },
    { id: "HT-104", name: "Taj Mahal Palace Heritage", city: "Mumbai", rating: 4.9, price: 12999, timeSlot: "any", amenities: ["5 Star", "Sea View", "Infinity Pool"], image: "cityscape" },
    { id: "HT-105", name: "Goa Beachfront Villa", city: "Goa", rating: 4.2, price: 2999, timeSlot: "any", amenities: ["Private balcony", "Free breakfast"], image: "ocean" }
  ],
  trains: [
    { id: "TR-101", name: "Rajdhani Express", number: "12951", from: "New Delhi", to: "Mumbai", departureTime: "16:55", arrivalTime: "08:35", duration: "15h 40m", price: 2340, rating: 4.6, stops: 0 },
    { id: "TR-102", name: "Shatabdi Express", number: "12009", from: "New Delhi", to: "Chandigarh", departureTime: "07:40", arrivalTime: "11:05", duration: "3h 25m", price: 985, rating: 4.5, stops: 0 },
    { id: "TR-103", name: "Vande Bharat Express", number: "22436", from: "New Delhi", to: "Jaipur", departureTime: "06:10", arrivalTime: "10:20", duration: "4h 10m", price: 1450, rating: 4.9, stops: 0 }
  ],
  buses: [
    { id: "BS-101", operator: "ZingBus AC Sleeper", from: "New Delhi", to: "Manali", departureTime: "21:30", arrivalTime: "08:00", duration: "10h 30m", price: 1199, rating: 4.4, timeSlot: "night" },
    { id: "BS-102", operator: "IntrCity SmartBus Volvo", from: "New Delhi", to: "Jaipur", departureTime: "06:00", arrivalTime: "11:15", duration: "5h 15m", price: 699, rating: 4.2, timeSlot: "morning" },
    { id: "BS-103", operator: "VRL Travels Multi-Axle", from: "Mumbai", to: "Goa", departureTime: "20:00", arrivalTime: "07:30", duration: "11h 30m", price: 1350, rating: 4.5, timeSlot: "night" }
  ],
  holidays: [
    { id: "HL-101", name: "Maldives Luxury Beach Escape", location: "Maldives", duration: "4 nights / 5 days", price: 42999, rating: 4.9 },
    { id: "HL-102", name: "Dubai Desert & City Explorer", location: "Dubai", duration: "4 nights / 5 days", price: 28499, rating: 4.7 },
    { id: "HL-103", name: "Manali Snowy Mountain Break", location: "Manali", duration: "3 nights / 4 days", price: 9999, rating: 4.5 },
    { id: "HL-104", name: "Bali Island Paradise getaway", location: "Bali", duration: "5 nights / 6 days", price: 32999, rating: 4.8 }
  ]
};

const offers = [
  {
    id: "OFFER-1",
    category: "flights",
    title: "Fly now, pay later",
    discount: "Flat ₹500 off",
    code: "GOFIRST"
  },
  {
    id: "OFFER-2",
    category: "hotels",
    title: "Stay a little longer",
    discount: "Save 35% on stays",
    code: "STAYMORE"
  },
  {
    id: "OFFER-3",
    category: "all",
    title: "Welcome Bonus",
    discount: "Flat ₹500 off for new users",
    code: "WELCOME500"
  }
];

const promoCoupons = {
  GOFIRST: { type: "flat", amount: 500, minPrice: 1000, description: "Flat ₹500 Instant Discount" },
  STAYMORE: { type: "percentage", percentage: 35, maxDiscount: 2000, minPrice: 1500, description: "35% Off (Up to ₹2,000)" },
  WELCOME500: { type: "flat", amount: 500, minPrice: 500, description: "Flat ₹500 Discount" },
  GOBUS: { type: "percentage", percentage: 15, maxDiscount: 300, minPrice: 400, description: "15% Off Bus Tickets" }
};

const destinations = [
  { id: "DST-1", name: "Maldives", category: "Beaches", startingPrice: 42999 },
  { id: "DST-2", name: "Dubai", category: "City break", startingPrice: 28499 },
  { id: "DST-3", name: "Manali", category: "Mountains", startingPrice: 9999 },
  { id: "DST-4", name: "Bali", category: "Islands", startingPrice: 32999 }
];

module.exports = { airports, destinations, flights, inventory, offers, promoCoupons };
