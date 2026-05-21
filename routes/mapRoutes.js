const express = require('express');
const { getPlaces, getRoute, getSafetyScore } = require('../services/mapService');

const router = express.Router();

// GET /api/map/places?lat&lng&category&limit
router.get('/places', async (req, res) => {
  try {
    const { lat, lng, category, limit } = req.query;
    if (!lat || !lng || !category) {
      return res.status(400).json({ error: 'lat, lng, and category are required' });
    }
    const data = await getPlaces(Number(lat), Number(lng), category, Number(limit) || 10);
    res.json(data);
  } catch (error) {
    console.error('Map places error:', error.message);
    res.status(500).json({ error: 'Failed to fetch places' });
  }
});

// POST /api/map/route
router.post('/route', async (req, res) => {
  try {
    const { start, end } = req.body; // format: [lng, lat]
    if (!start || !end) {
      return res.status(400).json({ error: 'start and end coordinates are required' });
    }
    const data = await getRoute(start, end);
    res.json(data);
  } catch (error) {
    console.error('Map route error:', error.message);
    res.status(500).json({ error: 'Failed to fetch route' });
  }
});

// GET /api/map/safety-score?lat&lng
router.get('/safety-score', async (req, res) => {
  try {
    const { lat, lng } = req.query;
    if (!lat || !lng) {
      return res.status(400).json({ error: 'lat and lng are required' });
    }
    const data = await getSafetyScore(Number(lat), Number(lng));
    res.json(data);
  } catch (error) {
    console.error('Safety score error:', error.message);
    res.status(500).json({ error: 'Failed to fetch safety score' });
  }
});

module.exports = router;
