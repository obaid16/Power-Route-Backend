const axios = require('axios');
const { geoapifyApiKey, orsApiKey, googleMapsApiKey } = require('../config/env');

/**
 * Fetch nearby places (police, hospital, hotel) from Geoapify
 * @param {number} lat 
 * @param {number} lng 
 * @param {string} category 
 * @param {number} limit 
 */
async function getPlaces(lat, lng, category, limit = 5) {
  // Prefer Google Maps if API key is set, otherwise fall back to Geoapify
  if (googleMapsApiKey) {
    // Google Places Nearby Search API expects a type; we map category directly (e.g., 'restaurant')
    const url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${lat},${lng}&radius=10000&type=${category}&key=${googleMapsApiKey}`;
    const response = await axios.get(url);
    return response.data;
  }
  if (!geoapifyApiKey) throw new Error('GEOAPIFY_API_KEY is missing');
  // Geoapify categories: https://apidocs.geoapify.com/docs/places/#categories
  // e.g., 'commercial.hotel', 'healthcare.hospital', 'service.police'
  const url = `https://api.geoapify.com/v2/places?categories=${category}&filter=circle:${lng},${lat},10000&bias=proximity:${lng},${lat}&limit=${limit}&apiKey=${geoapifyApiKey}`;
  const response = await axios.get(url);
  return response.data;
}

/**
 * Get route from ORS
 * @param {Array<number>} start [lng, lat]
 * @param {Array<number>} end [lng, lat]
 */
async function getRoute(start, end) {
  if (!orsApiKey) throw new Error('ORS_API_KEY is missing');
  const url = `https://api.openrouteservice.org/v2/directions/driving-car/geojson`;
  const response = await axios.post(
    url,
    {
      coordinates: [start, end],
    },
    {
      headers: {
        'Authorization': orsApiKey,
        'Content-Type': 'application/json',
      },
    }
  );
  return response.data;
}

/**
 * Get safety score based on nearby emergency services (within 5km)
 * @param {number} lat 
 * @param {number} lng 
 */
async function getSafetyScore(lat, lng) {
  if (!geoapifyApiKey) return { score: 0, factors: [] };
  
  try {
    const policeUrl = `https://api.geoapify.com/v2/places?categories=service.police&filter=circle:${lng},${lat},5000&bias=proximity:${lng},${lat}&limit=5&apiKey=${geoapifyApiKey}`;
    const hospitalUrl = `https://api.geoapify.com/v2/places?categories=healthcare.hospital&filter=circle:${lng},${lat},5000&bias=proximity:${lng},${lat}&limit=5&apiKey=${geoapifyApiKey}`;
    
    const [policeRes, hospitalRes] = await Promise.all([
      axios.get(policeUrl),
      axios.get(hospitalUrl),
    ]);

    const policeCount = policeRes.data.features?.length || 0;
    const hospitalCount = hospitalRes.data.features?.length || 0;
    
    let score = 50; // Base score
    score += Math.min(policeCount * 15, 30);
    score += Math.min(hospitalCount * 10, 20);
    
    const factors = [];
    if (policeCount > 0) factors.push(`${policeCount} police stations nearby`);
    if (hospitalCount > 0) factors.push(`${hospitalCount} hospitals nearby`);
    if (factors.length === 0) factors.push('Limited emergency services in immediate vicinity');

    return {
      score: Math.min(score, 100),
      factors,
    };
  } catch (error) {
    console.error('Error fetching safety score:', error.message);
    return { score: 50, factors: ['Unable to determine safety score'] };
  }
}

/**
 * Get a static map image URL from Google Maps Static API
 * @param {number} lat Latitude
 * @param {number} lng Longitude
 * @param {number} zoom Zoom level (default 14)
 * @param {string} size Image size (default '600x300')
 * @returns {string} URL to static map image
 */
function getStaticMap(lat, lng, zoom = 14, size = '600x300') {
  if (!googleMapsApiKey) throw new Error('GOOGLE_MAPS_API_KEY is missing');
  const baseUrl = 'https://maps.googleapis.com/maps/api/staticmap';
  const params = new URLSearchParams({
    center: `${lat},${lng}`,
    zoom: zoom.toString(),
    size,
    key: googleMapsApiKey,
    markers: `color:red|${lat},${lng}`,
  });
  return `${baseUrl}?${params.toString()}`;
}

module.exports = {
  getPlaces,
  getRoute,
  getSafetyScore,
  getStaticMap,
};
