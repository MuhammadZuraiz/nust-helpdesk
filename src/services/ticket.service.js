const prisma = require('../prismaClient');

async function createTicket({ title, description, departmentId = null, categoryId = null, priority = 'MED', studentId }) {
  const ticket = await prisma.ticket.create({
    data: {
      title,
      description,
      studentId,
      departmentId,
      categoryId,
      priority
    }
  });
  return ticket;
}

async function getMyTickets({ studentId, page = 1, limit = 20 }) {
  const take = Math.min(limit, 100);
  const skip = (Math.max(page, 1) - 1) * take;
  const [tickets, total] = await Promise.all([
    prisma.ticket.findMany({
      where: { studentId },
      include: { category: true, department: true, assignee: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'desc' },
      skip, take
    }),
    prisma.ticket.count({ where: { studentId } })
  ]);
  return { tickets, meta: { total, page, limit: take } };
}

async function getTicketById({ id, user }) {
  //students can only access their own ticket. Staff can access dept tickets or whatever assigned
  const ticket = await prisma.ticket.findUnique({
    where: { id },
    include: { category: true, department: true, assignee: { select: { id: true, name: true } }, student: { select: { id: true, name: true, email: true } } }
  });
  if (!ticket) throw new Error('Ticket not found');

  if (user.role === 'STUDENT' && ticket.studentId !== user.id) {
    throw new Error('Forbidden');
  }

  //AGENT/SUPERVISOR/ADMIN: allowed but need to add queue checks later
  return ticket;
}

async function getQueue({ departmentId, page = 1, limit = 20 }) {
  const take = Math.min(limit, 100);
  const skip = (Math.max(page, 1) - 1) * take;
  const where = departmentId ? { departmentId } : {};
  const tickets = await prisma.ticket.findMany({
    where,
    include: { student: { select: { id: true, name: true } }, category: true, assignee: { select: { id: true, name: true } }},
    orderBy: { createdAt: 'desc' },
    skip, take
  });
  return tickets;
}

async function assignTicket({ ticketId, assigneeId, actor }) {
  //only Supervisor/Admin can call assign endpoint (done in middleware)
  const ticket = await prisma.ticket.findUnique({ where: { id: ticketId }});
  if (!ticket) throw new Error('Ticket not found');
  const updated = await prisma.ticket.update({
    where: { id: ticketId },
    data: { assigneeId }
  });
  //add audit log creation later
  return updated;
}

module.exports = { createTicket, getMyTickets, getTicketById, getQueue, assignTicket };
