const express = require('express');
const router = express.Router();
const { getRecentErrors, getStats } = require('../db/error-logs');
const supabase = require('../db/supabase');

// GET /api/monitoring/errors — recent errors with optional filters
router.get('/errors', async (req, res) => {
  const { limit = 100, type, severity, since } = req.query;
  const errors = await getRecentErrors({
    limit: parseInt(limit),
    type: type || null,
    severity: severity || null,
    since: since || null
  });
  res.json(errors);
});

// GET /api/monitoring/stats — error counts by type/severity (last 24h default)
router.get('/stats', async (req, res) => {
  const { since } = req.query;
  const stats = await getStats({ since: since || null });
  res.json(stats);
});

// GET /api/monitoring/health — system health overview
router.get('/health', async (req, res) => {
  const now = new Date();
  const oneHourAgo = new Date(now - 60 * 60 * 1000).toISOString();
  const oneDayAgo = new Date(now - 24 * 60 * 60 * 1000).toISOString();

  const [
    errorsLastHour,
    errorsLastDay,
    activeBatches,
    callsLastDay
  ] = await Promise.all([
    getRecentErrors({ since: oneHourAgo, limit: 1000 }),
    getStats({ since: oneDayAgo }),
    supabase.from('batch_calls').select('id, status, total, completed, failed').eq('status', 'running'),
    supabase.from('call_logs').select('id, status').gte('created_at', oneDayAgo)
  ]);

  const geminiErrors = errorsLastHour.filter(e => e.type === 'gemini');
  const rateLimits = errorsLastHour.filter(e => e.type === 'gemini_rate_limit' || e.type === 'jambonz_rate_limit');

  res.json({
    timestamp: now.toISOString(),
    last_hour: {
      total_errors: errorsLastHour.length,
      gemini_errors: geminiErrors.length,
      rate_limits: rateLimits.length
    },
    last_24h: errorsLastDay,
    active_batches: activeBatches.data || [],
    calls_today: (callsLastDay.data || []).length,
    status: rateLimits.length > 10 ? 'degraded' : errorsLastHour.length > 50 ? 'warning' : 'healthy'
  });
});

module.exports = router;
