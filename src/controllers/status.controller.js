const { changeStatusSchema } = require('../validators/status.validator');
const ticketStatusService = require('../services/ticketStatus.service');

async function changeStatus(req, res, next) {
  try {
    const parsed = changeStatusSchema.parse(req.body);
    const ticketId = req.params.id;
    const actor = req.user; // { id, role }
    const updated = await ticketStatusService.changeTicketStatus({ ticketId, actor, newStatus: parsed.newStatus, reason: parsed.reason });
    res.json(updated);
  } catch (err) { next(err); }
}

// convenience wrapper endpoints
async function cancelTicket(req, res, next) {
  try {
    const ticketId = req.params.id;
    const actor = req.user;
    const updated = await ticketStatusService.changeTicketStatus({ ticketId, actor, newStatus: 'CANCELLED' });
    res.json(updated);
  } catch (err) { next(err); }
}

async function reopenTicket(req, res, next) {
  try {
    const ticketId = req.params.id;
    const actor = req.user;
    const updated = await ticketStatusService.changeTicketStatus({ ticketId, actor, newStatus: 'REOPENED' });
    res.json(updated);
  } catch (err) { next(err); }
}

async function closeTicket(req, res, next) {
  try {
    const ticketId = req.params.id;
    const actor = req.user;
    const updated = await ticketStatusService.changeTicketStatus({ ticketId, actor, newStatus: 'CLOSED' });
    res.json(updated);
  } catch (err) { next(err); }
}

module.exports = { changeStatus, cancelTicket, reopenTicket, closeTicket };
