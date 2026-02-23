const slaService = require('../services/sla.service');

async function runSlaCheckEndpoint(req, res, next) {
  try {
    // Only ADMIN or SUPERVISOR allowed (enforced by role middleware)
    const result = await slaService.runSlaChecks({ escalate: false });
    res.json({ ok: true, result });
  } catch (err) {
    next(err);
  }
}

module.exports = { runSlaCheckEndpoint };