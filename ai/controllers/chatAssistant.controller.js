const catchAsync = require('../../utils/catchAsync');
const { aiSuccess } = require('../utils/apiResponse');
const chatAssistant = require('../services/chatAssistant.service');
const aiConfig = require('../config/ai.config');

const chat = catchAsync(async (req, res) => {
  const { message, context } = req.body;
  const lat = req.body.lat != null ? Number(req.body.lat) : null;
  const lng = req.body.lng != null ? Number(req.body.lng) : null;

  const base = await chatAssistant.answerChat({ message, user: req.user, context });
  const enriched = await chatAssistant.enrichWithNearestStation(base.reply, req.user, lat, lng);

  return aiSuccess(
    res,
    200,
    'ev_assistant_chat',
    {
      reply: enriched.reply,
      nearestStation: enriched.nearestStation,
      provider: base.provider,
      intents: base.intents,
    },
    { provider: base.provider }
  );
});

module.exports = { chat };
