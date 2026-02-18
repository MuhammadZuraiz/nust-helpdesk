const ticketService = require('../services/ticket.service');
const { createTicketSchema } = require('../validators/ticket.validator');

async function createTicket(req, res, next) {
  try {
    const payload = createTicketSchema.parse(req.body);
    const studentId = req.user.id;
    const ticket = await ticketService.createTicket({ ...payload, studentId });
    res.status(201).json(ticket);
  } catch (err) { next(err); }
}

async function myTickets(req, res, next) {
  try {
    const page = parseInt(req.query.page || '1');
    const limit = parseInt(req.query.limit || '20');
    const result = await ticketService.getMyTickets({ studentId: req.user.id, page, limit });
    res.json(result);
  } catch (err) { next(err); }
}

async function getTicket(req, res, next) {
  try {
    const result = await ticketService.getTicketById({ id: req.params.id, user: req.user });
    res.json(result);
  } catch (err) { next(err); }
}

async function queue(req, res, next) {
  try {
    const departmentId = req.query.departmentId || null;
    const page = parseInt(req.query.page || '1');
    const limit = parseInt(req.query.limit || '20');
    const tickets = await ticketService.getQueue({ departmentId, page, limit });
    res.json(tickets);
  } catch (err) { next(err); }
}

async function assign(req, res, next) {
  try {
    const ticketId = req.params.id;
    const { assigneeId } = req.body;
    const updated = await ticketService.assignTicket({ ticketId, assigneeId, actor: req.user });
    res.json(updated);
  } catch (err) { next(err); }
}

module.exports = { createTicket, myTickets, getTicket, queue, assign };