const { haversineKm } = require('../utils/geo');
const AppError = require('../utils/AppError');
const { ocmApiKey, ocmApiBaseUrl } = require('../config/env');

const DEFAULT_DISTANCE_KM = 15;
const DEFAULT_MAX_RESULTS = 50;
const FETCH_TIMEOUT_MS = 15000;

function buildAddressLine(addr) {
  const parts = [addr.AddressLine1, addr.Town, addr.StateOrProvince, addr.Postcode].filter(Boolean);
  return parts.join(', ');
}

/**
 * Map OCM POI to Power Route–friendly shape (charger types, inferred slots, pricing text).
 */
function normalizePoi(poi, refLat, refLng) {
  const addr = poi.AddressInfo || {};
  const lat = Number(addr.Latitude);
  const lng = Number(addr.Longitude);
  const connections = Array.isArray(poi.Connections) ? poi.Connections : [];

  const chargerTypes = [];
  let maxKw = 0;
  let totalSlots = 0;
  let availableSlots = 0;

  for (const c of connections) {
    const title = c.ConnectionType?.Title || c.ConnectionType?.FormalName || 'Unknown';
    if (title && !chargerTypes.includes(title)) chargerTypes.push(title);
    maxKw = Math.max(maxKw, Number(c.PowerKW) || 0);
    const qty = Math.max(1, Number(c.Quantity) || 1);
    totalSlots += qty;
    const removed = c.StatusType?.Title === 'Removed' || c.StatusType?.Title === 'Permanently Removed';
    const operational = !removed && c.StatusType?.IsOperational !== false;
    if (operational) availableSlots += qty;
  }

  if (connections.length && totalSlots === 0) {
    totalSlots = connections.length;
    availableSlots = connections.filter(
      (c) => c.StatusType?.IsOperational !== false && c.StatusType?.Title !== 'Removed'
    ).length;
  }

  const distanceKm = Number.isFinite(lat) && Number.isFinite(lng) ? haversineKm(refLat, refLng, lat, lng) : null;

  return {
    source: 'openchargemap',
    externalId: poi.ID,
    uuid: poi.UUID || null,
    stationName: String(addr.Title || 'EV charging site').trim(),
    location: {
      type: 'Point',
      coordinates: [lng, lat],
    },
    address: {
      line1: addr.AddressLine1 || '',
      town: addr.Town || '',
      state: addr.StateOrProvince || '',
      postcode: addr.Postcode || '',
      country: addr.Country?.ISOCode || addr.Country?.Title || '',
      formatted: buildAddressLine(addr),
    },
    chargerTypes,
    chargingSpeedKw: Math.round(maxKw * 100) / 100,
    slotAvailability: {
      totalSlots,
      availableSlots,
      note:
        'Derived from OCM connector quantities and operational status; real-time bay occupancy is usually not available from this provider.',
    },
    pricing: {
      summary: poi.UsageCost || null,
      usageType: poi.UsageType?.Title || null,
      isMembershipRequired: poi.UsageType?.IsMembershipRequired ?? null,
      isAccessKeyRequired: poi.UsageType?.IsAccessKeyRequired ?? null,
    },
    operator: poi.OperatorInfo?.Title || null,
    dataProvider: poi.DataProvider?.Title || null,
    lastStatusUpdate: poi.DateLastStatusUpdate || null,
    distanceKm: distanceKm != null ? Math.round(distanceKm * 100) / 100 : null,
  };
}

/**
 * Fetch nearby charging locations from Open Charge Map.
 * @see https://openchargemap.org/site/develop/api
 */
async function fetchNearbyStations(lat, lng, distanceKm = DEFAULT_DISTANCE_KM, maxResults = DEFAULT_MAX_RESULTS) {
  const base = ocmApiBaseUrl.trim().replace(/\/+$/, '');
  const params = new URLSearchParams({
    output: 'json',
    latitude: String(lat),
    longitude: String(lng),
    distance: String(Math.min(1000, Math.max(0.1, distanceKm))),
    maxresults: String(Math.min(200, Math.max(1, maxResults))),
    compact: 'true',
    verbose: 'false',
  });
  if (ocmApiKey) params.set('key', ocmApiKey);

  const fullUrl = `${base}?${params.toString()}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  let res;
  try {
    res = await fetch(fullUrl, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        ...(ocmApiKey ? { 'X-API-Key': ocmApiKey } : {}),
      },
      signal: controller.signal,
    });
  } catch (err) {
    if (err.name === 'AbortError') {
      throw new AppError('Open Charge Map request timed out', 504);
    }
    throw new AppError(`Open Charge Map request failed: ${err.message}`, 502);
  } finally {
    clearTimeout(timer);
  }

  const bodyText = await res.text();
  if (!res.ok) {
    if (res.status === 401 || res.status === 403) {
      // Invalid or missing API key – treat as no data for demo purposes
      return [];
    }
    throw new AppError(`Open Charge Map error (${res.status}): ${bodyText.slice(0, 200)}`, 502);
  }

  let data;
  try {
    data = JSON.parse(bodyText);
  } catch {
    throw new AppError('Open Charge Map returned invalid JSON', 502);
  }

  if (!Array.isArray(data)) {
    throw new AppError('Open Charge Map returned an unexpected payload', 502);
  }

  const stations = data
    .map((poi) => normalizePoi(poi, lat, lng))
    .filter((s) => s.location.coordinates.every(Number.isFinite))
    .sort((a, b) => (a.distanceKm ?? 0) - (b.distanceKm ?? 0));

  return stations;
}

module.exports = {
  fetchNearbyStations,
  normalizePoi,
  DEFAULT_DISTANCE_KM,
  DEFAULT_MAX_RESULTS,
};
