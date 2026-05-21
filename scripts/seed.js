require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const ChargingStation = require('../models/ChargingStation');
const User = require('../models/User');
const WomenSafetyReview = require('../models/WomenSafetyReview');
const ChargingVan = require('../models/ChargingVan');
const NearbyService = require('../models/NearbyService');
const { mongoUri } = require('../config/env');

const demoVans = [
  {
    driverName: 'Arjun Singh',
    vehicleNo: 'DL 01 EV 2024',
    distanceKm: 1.4,
    etaMinutes: 8,
    maxKw: 22,
    pricePerKwh: 0.38,
    rating: 4.8,
    available: true,
    phone: '+91 98765 43210',
  },
  {
    driverName: 'Priya Sharma',
    vehicleNo: 'MH 02 EV 5566',
    distanceKm: 2.9,
    etaMinutes: 16,
    maxKw: 15,
    pricePerKwh: 0.34,
    rating: 4.6,
    available: true,
    phone: '+91 91234 56789',
  },
  {
    driverName: 'Ravi Kumar',
    vehicleNo: 'KA 03 EV 7788',
    distanceKm: 4.2,
    etaMinutes: 24,
    maxKw: 30,
    pricePerKwh: 0.42,
    rating: 4.9,
    available: false,
    phone: '+91 99887 76655',
  },
];

const demoServices = [
  { category: 'hospital', name: 'City General Hospital',    distance: '1.2 km', phone: '108',  address: '12 Health Ave',       open: true  },
  { category: 'police',   name: 'Central Police Station',   distance: '0.8 km', phone: '100',  address: '5 Law Street',        open: true  },
  { category: 'hotel',    name: 'Grand Stay Hotel',         distance: '2.1 km', phone: null,   address: '88 Comfort Road',     open: true  },
  { category: 'repair',   name: 'EV Service Center',        distance: '3.4 km', phone: null,   address: '22 Tech Park',        open: true  },
  { category: 'food',     name: 'Highway Rest Stop',        distance: '0.5 km', phone: null,   address: 'NH-48 Bypass',        open: true  },
  { category: 'hotel',    name: 'Budget Inn Express',       distance: '4.0 km', phone: null,   address: '10 Budget Lane',      open: false },
  { category: 'repair',   name: 'QuickFix Auto Workshop',   distance: '1.8 km', phone: null,   address: '7 Workshop Road',     open: true  },
  { category: 'food',     name: 'Green Leaf Restaurant',    distance: '1.1 km', phone: null,   address: '33 Garden Street',    open: true  },
];

const demoStations = [
  {
    stationName: 'Aurora Superhub · Bayfront',
    location: { type: 'Point', coordinates: [-122.4014, 37.7899] },
    chargerTypes: ['CCS', 'NACS'],
    chargingSpeedKw: 150,
    slotAvailability: { totalSlots: 6, availableSlots: 3 },
    pricing: { currency: 'INR', perKwh: 35, sessionFee: 120 },
    ratings: { average: 4.9, count: 128 },
    isEmergencyCapable: true,
    womenSafe: true,
    cctv: true,
    open247: true,
    waitMinAvg: 8,
    safetyRating: 4.9,
  },
  {
    stationName: 'Lumen Plaza EV',
    location: { type: 'Point', coordinates: [-122.4194, 37.7749] },
    chargerTypes: ['CCS', 'CHAdeMO'],
    chargingSpeedKw: 50,
    slotAvailability: { totalSlots: 4, availableSlots: 1 },
    pricing: { currency: 'INR', perKwh: 45, sessionFee: 150 },
    ratings: { average: 4.6, count: 54 },
    isEmergencyCapable: true,
    womenSafe: true,
    cctv: true,
    open247: false,
    waitMinAvg: 22,
    safetyRating: 4.6,
  },
  {
    stationName: 'Harbor Line Hub',
    location: { type: 'Point', coordinates: [-122.422, 37.7599] },
    chargerTypes: ['Type 2', 'CCS'],
    chargingSpeedKw: 350,
    slotAvailability: { totalSlots: 8, availableSlots: 0 },
    pricing: { currency: 'INR', perKwh: 20, sessionFee: 0 },
    ratings: { average: 4.8, count: 210 },
    isEmergencyCapable: true,
    womenSafe: true,
    cctv: true,
    open247: true,
    waitMinAvg: 35,
    safetyRating: 4.8,
  },
  {
    stationName: 'Riverside Quick',
    location: { type: 'Point', coordinates: [-122.435, 37.745] },
    chargerTypes: ['Type 2'],
    chargingSpeedKw: 22,
    slotAvailability: { totalSlots: 2, availableSlots: 2 },
    pricing: { currency: 'INR', perKwh: 18, sessionFee: 50 },
    ratings: { average: 3.9, count: 42 },
    isEmergencyCapable: false,
    womenSafe: false,
    cctv: false,
    open247: false,
    waitMinAvg: 0,
    safetyRating: 3.9,
  },
  {
    stationName: 'Marina Bay Point',
    location: { type: 'Point', coordinates: [-122.39, 37.795] },
    chargerTypes: ['CCS', 'NACS'],
    chargingSpeedKw: 100,
    slotAvailability: { totalSlots: 6, availableSlots: 4 },
    pricing: { currency: 'INR', perKwh: 30, sessionFee: 80 },
    ratings: { average: 4.7, count: 75 },
    isEmergencyCapable: true,
    womenSafe: true,
    cctv: true,
    open247: true,
    waitMinAvg: 5,
    safetyRating: 4.7,
  },
];

async function run() {
  await mongoose.connect(mongoUri);

  // Clear existing seeding data
  await ChargingStation.deleteMany({ stationName: { $in: demoStations.map((s) => s.stationName) } });
  await WomenSafetyReview.deleteMany({});
  await ChargingVan.deleteMany({});
  await NearbyService.deleteMany({});

  // Seed charging stations
  const createdStations = await ChargingStation.insertMany(demoStations);
  console.log(`Seeded ${createdStations.length} charging stations (San Francisco area).`);

  // Seed mobile charging vans
  const createdVans = await ChargingVan.insertMany(demoVans);
  console.log(`Seeded ${createdVans.length} mobile charging vans.`);

  // Seed essential nearby services
  const createdServices = await NearbyService.insertMany(demoServices);
  console.log(`Seeded ${createdServices.length} essential nearby services.`);

  // Create a default driver / test user
  const passwordHash = await bcrypt.hash('password123', 10);
  const testUser = await User.findOneAndUpdate(
    { email: 'driver@voltpath.com' },
    {
      name: 'Priya Sharma',
      email: 'driver@voltpath.com',
      phone: '+91 98765 43210',
      password: passwordHash,
      isEmailVerified: true,
      evVehicleModel: 'Tesla Model Y',
      batteryCapacityKwh: 75,
      chargerType: 'CCS',
      currentBatteryPercent: 42,
      lastKnownLocation: { type: 'Point', coordinates: [-122.4194, 37.7749] },
    },
    { new: true, upsert: true }
  );
  console.log(`Seeded/verified default test user: ${testUser.email}`);

  // Seed reviews for Aurora, Lumen, and Harbor
  const aurora = createdStations.find(s => s.stationName.includes('Aurora'));
  const lumen = createdStations.find(s => s.stationName.includes('Lumen'));
  const harbor = createdStations.find(s => s.stationName.includes('Harbor'));

  const reviews = [
    {
      user: testUser._id,
      station: aurora._id,
      rating: 5,
      text: 'Well-lit lot, security guard visible. Felt safe charging alone at 11pm.',
      safeAlone: true,
      verified: true,
    },
    {
      user: testUser._id,
      station: lumen._id,
      rating: 4,
      text: 'Busy shopping plaza with plenty of foot traffic and active lighting.',
      safeAlone: true,
      verified: true,
    },
    {
      user: testUser._id,
      station: harbor._id,
      rating: 5,
      text: 'High-speed modern chargers, very well lit, adjacent to active cafe.',
      safeAlone: true,
      verified: true,
    },
  ];

  await WomenSafetyReview.insertMany(reviews);
  console.log(`Seeded safety reviews for safe charging stations.`);

  await mongoose.disconnect();
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
