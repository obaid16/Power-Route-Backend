/**
 * Consistent success envelope for Power Route AI endpoints.
 */
function aiSuccess(res, statusCode, kind, data, meta = {}) {
  return res.status(statusCode).json({
    status: 'success',
    data: { kind, ...data },
    meta: {
      provider: meta.provider || 'mock',
      generatedAt: new Date().toISOString(),
      ...meta,
    },
  });
}

module.exports = { aiSuccess };
