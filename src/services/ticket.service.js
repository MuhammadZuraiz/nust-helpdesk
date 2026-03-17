const prisma = require('../prismaClient');
const { createAudit } = require('./audit.service');
const AppError = require('../utils/AppError');

function addMinutes(date, mins) {
  return new Date(date.getTime() + mins * 60 * 1000);
}

async function getSlaPolicyForPriority(priority) {
  const policy = await prisma.slaPolicy.findFirst({ where: { priority } });
  return policy || null;
}

async function createTicket({
  title,
  description,
  departmentId = null,
  categoryId = null,
  priority = 'MED',
  studentId
}) {
  const now = new Date();
  const policy = await getSlaPolicyForPriority(priority);

  let responseDueAt = null;
  let resolveDueAt = null;

  if (policy) {
    responseDueAt = addMinutes(now, policy.responseMinutes);
    resolveDueAt  = addMinutes(now, policy.resolveMinutes);
  }

  const ticket = await prisma.ticket.create({
    data: {
      title,
      description,
      studentId,
      departmentId,
      categoryId,
      priority,
      responseDueAt,
      resolveDueAt
    }
  });

  await prisma.auditLog.create({
    data: {
      ticketId: ticket.id,
      actorId:  studentId,
      action:   'CREATED',
      newValue: JSON.stringify({ title: ticket.title, priority: ticket.priority })
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
      include: {
        category:   true,
        department: true,
        assignee:   { select: { id: true, name: true } }
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take
    }),
    prisma.ticket.count({ where: { studentId } })
  ]);

  return { tickets, meta: { total, page, limit: take } };
}

async function getTicketById({ id, user }) {
  const ticket = await prisma.ticket.findUnique({
    where: { id },
    include: {
      category:   true,
      department: true,
      assignee:   { select: { id: true, name: true } },
      student:    { select: { id: true, name: true, email: true } },
      comments: {
        include: {
          author: { select: { id: true, name: true, role: true } }
        },
        orderBy: { createdAt: 'asc' }
      }
    }
  });

  if (!ticket) throw new AppError('Ticket not found', 404);

  if (user.role === 'STUDENT' && ticket.studentId !== user.id) {
    throw new AppError('Forbidden', 403);
  }

  if (
    (user.role === 'AGENT' || user.role === 'SUPERVISOR') &&
    user.departmentId &&
    ticket.departmentId !== user.departmentId
  ) {
    throw new AppError('Forbidden', 403);
  }

  // Strip internal notes from student view
  if (user.role === 'STUDENT') {
    ticket.comments = ticket.comments.filter(c => !c.isInternal);
  }

  return ticket;
}

function buildQueueWhere(filters, user) {
  const where = {};

  if (filters.status)       where.status       = filters.status;
  if (filters.priority)     where.priority     = filters.priority;
  if (filters.departmentId) where.departmentId = filters.departmentId;
  if (filters.categoryId)   where.categoryId   = filters.categoryId;
  if (filters.assigneeId)   where.assigneeId   = filters.assigneeId;

  if (filters.createdFrom || filters.createdTo) {
    where.createdAt = {};
    if (filters.createdFrom) where.createdAt.gte = new Date(filters.createdFrom);
    if (filters.createdTo)   where.createdAt.lte = new Date(filters.createdTo);
  }

  if (filters.search) {
    where.OR = [
      { title:       { contains: filters.search, mode: 'insensitive' } },
      { description: { contains: filters.search, mode: 'insensitive' } }
    ];
  }

  // Agents and supervisors are restricted to their own department
  if (user.role === 'AGENT' || user.role === 'SUPERVISOR') {
    where.departmentId = user.departmentId || '__NO_MATCH__';
  }

  return where;
}

const PRIORITY_RANK = { URGENT: 1, HIGH: 2, MED: 3, LOW: 4 };

const TICKET_INCLUDE = {
  student:    { select: { id: true, name: true } },
  category:   true,
  department: true,
  assignee:   { select: { id: true, name: true } }
};

async function getQueue(filters, user) {
  const page  = filters.page  || 1;
  const limit = Math.min(filters.limit || 20, 100);
  const skip  = (page - 1) * limit;

  const where = buildQueueWhere(filters, user);

  // --- SLA due-soon sort: fetch all matching rows, sort, then paginate ---
  if (filters.sortBy === 'slaDueSoon') {
    const [allTickets, total] = await Promise.all([
      prisma.ticket.findMany({ where, include: TICKET_INCLUDE }),
      prisma.ticket.count({ where })
    ]);

    allTickets.sort((a, b) => {
      const aDue = a.responseDueAt || a.resolveDueAt || a.createdAt;
      const bDue = b.responseDueAt || b.resolveDueAt || b.createdAt;
      return new Date(aDue) - new Date(bDue);
    });

    return {
      tickets: allTickets.slice(skip, skip + limit),
      meta: { total, page, limit }
    };
  }

  // --- Priority sort: fetch the FULL filtered set first, sort, then paginate.
  //     Previously only the current page was fetched before sorting, which
  //     produced wrong results (e.g. page 2 was sorted independently of page 1). ---
  if (filters.sortBy === 'priority') {
    const [allTickets, total] = await Promise.all([
      prisma.ticket.findMany({ where, include: TICKET_INCLUDE }),
      prisma.ticket.count({ where })
    ]);

    allTickets.sort((a, b) => {
      const diff = PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority];
      return filters.sortOrder === 'asc' ? diff : -diff;
    });

    return {
      tickets: allTickets.slice(skip, skip + limit),
      meta: { total, page, limit }
    };
  }

  // --- Default: database-level sort + pagination ---
  const orderBy = { [filters.sortBy]: filters.sortOrder };

  const [tickets, total] = await Promise.all([
    prisma.ticket.findMany({ where, include: TICKET_INCLUDE, orderBy, skip, take: limit }),
    prisma.ticket.count({ where })
  ]);

  return { tickets, meta: { total, page, limit } };
}

async function assignTicket({ ticketId, assigneeId, actor }) {
  const ticket = await prisma.ticket.findUnique({ where: { id: ticketId } });
  if (!ticket) throw new AppError('Ticket not found', 404);

  const assignee = await prisma.user.findUnique({ where: { id: assigneeId } });
  if (!assignee) throw new AppError('Assignee not found', 404);
  if (assignee.role !== 'AGENT') throw new AppError('Assignee must be an AGENT', 400);

  if (ticket.departmentId && assignee.departmentId !== ticket.departmentId) {
    throw new AppError('Assignee must belong to the same department as the ticket', 400);
  }

  const updated = await prisma.ticket.update({
    where: { id: ticketId },
    data:  { assigneeId }
  });

  await prisma.auditLog.create({
    data: {
      ticketId,
      actorId:  actor.id,
      action:   'ASSIGNED',
      oldValue: ticket.assigneeId || null,
      newValue: assigneeId
    }
  });

  return updated;
}

module.exports = { createTicket, getMyTickets, getTicketById, getQueue, assignTicket };
