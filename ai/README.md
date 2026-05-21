# Power Route AI module

Hackathon-ready AI features for the **Power Route** EV Charging Assistant API. Logic is **mock / heuristic** by default, with clear extension points for **OpenAI** or **Google Gemini** (`services/providers/`, `llmClient.service.js`).

All routes are mounted under **`/api/ai`** and require the same **JWT** (`Authorization: Bearer <token>`) as the rest of the API.

## Folder map

| Path | Purpose |
|------|---------|
| `config/ai.config.js` | Provider, thresholds, defaults (from root `config/env.js`) |
| `controllers/` | HTTP handlers (one file per feature + legacy) |
| `routes/ai.routes.js` | Route table; imported by `routes/aiRoutes.js` |
| `services/` | Business logic (range, stations, routes, emergency, chat, charging, eco) |
| `services/providers/` | OpenAI / Gemini stubs (wire official SDKs here) |
| `utils/` | Response envelope, battery math, conditions, station scoring |
| `validators/aiFeature.validators.js` | `express-validator` rules for new endpoints |
| `prompts/chatPrompts.js` | System / user prompt fragments for future LLM chat |

## Environment variables

Set in the backend root `.env` (see `config/env.js`):

| Variable | Default | Notes |
|----------|---------|--------|
| `AI_PROVIDER` | `mock` | `mock` \| `openai` \| `gemini` |
| `OPENAI_API_KEY` | _(empty)_ | Required if `AI_PROVIDER=openai` |
| `OPENAI_MODEL` | `gpt-4o-mini` | Chat completion model |
| `GEMINI_API_KEY` | _(empty)_ | Required if `AI_PROVIDER=gemini` |
| `GEMINI_MODEL` | `gemini-1.5-flash` | Generative model id |
| `AI_EMERGENCY_BATTERY_THRESHOLD` | `15` | Below = emergency mode in `/emergency-detection` |
| `AI_DEFAULT_KWH_PER_100KM` | `18` | Consumption fallback |
| `AI_DEFAULT_PRICE_PER_KWH` | `0.35` | Cost demos (local units) |

## New endpoints (REST)

| Method | Path | Summary |
|--------|------|---------|
| `POST` | `/api/ai/predict-range` | Range, drain over a reference distance, safe distance (traffic / weather / speed factors) |
| `POST` | `/api/ai/recommend-station` | Best + backup station, arrival SoC, cost (client POIs **or** DB lookup by `userLocation`) |
| `POST` | `/api/ai/optimize-route` | Trip plan + mock safest / fastest / battery-efficient profiles |
| `POST` | `/api/ai/emergency-detection` | Threshold, failure risk, nearest recommendation, optional `createAlert` |
| `POST` | `/api/ai/chat` | EV assistant (mock rules; LLM when keys + provider set) |
| `POST` | `/api/ai/estimate-charging` | Session time + cost from charger type and SoC window |
| `GET` | `/api/ai/eco-score/:userId` | Eco score for **own** `userId` only (403 if mismatch) |

Successful JSON shape:

```json
{
  "status": "success",
  "data": { "kind": "...", "..." : "..." },
  "meta": { "provider": "mock", "generatedAt": "ISO-8601" }
}
```

## Legacy endpoints (unchanged)

Still supported for existing clients:

- `POST /api/ai/recommend`
- `POST /api/ai/range-prediction`
- `POST /api/ai/route` and `POST /api/ai/route-optimize`
- `POST /api/ai/traffic-charging`
- `POST /api/ai/low-battery-detect`

## Frontend integration tips

1. Send **numeric** lat/lng and battery fields; optional strings must match enums in validators (e.g. traffic: `light` \| `moderate` \| `heavy` \| `severe`).
2. **`/recommend-station`**: Either send `nearbyChargingStations[]` (with `lat`/`lng` or GeoJSON `location.coordinates`) **or** omit the array and rely on MongoDB stations near `userLocation` (uses `radiusKm` when fetching).
3. **`/estimate-charging`**: Prefer charger keys `ac-home`, `ac-public`, `dc-50`, `dc-150`, `dc-350`; unknown types fall back to a 50 kW mock profile.
4. **`/chat`**: Pass `lat`/`lng` to attach the nearest DB station snippet to the response when useful.

## Internal reuse

`services/aiService.js` re-exports a subset of this module for code outside `ai/` (for example emergency flows). Prefer importing from `ai/services/...` in new code.
