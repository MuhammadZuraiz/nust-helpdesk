//sla.service.js
const prisma = require('../prismaClient');
const { createAudit } = require('./audit.service');

/*
Run SLA checks:
- mark response breaches: tickets with no firstResponseAt and responseDueAt < now
- mark resolve breaches: tickets not resolved (status != RESOLVED && not CLOSED/CANCELLED) and resolveDueAt < now
- also check resolved tickets where resolvedAt > resolveDueAt (late resolution)
Returns an object summary of actions taken.
*/
async function runSlaChecks({ escalate = false } = {}) {
  const now = new Date();
  const actions = { responseBreaches: [], resolveBreaches: [] };

  // Response breaches
  const responseCandidates = await prisma.ticket.findMany({
    where: {
      firstResponseAt: null,
      responseDueAt: { lt: now },
      isResponseBreached: false,
      status: { in: ['OPEN', 'NEEDS_INFO'] } // only open/needs_info count
    }
  });

  for (const t of responseCandidates) {
    await prisma.ticket.update({
      where: { id: t.id },
      data: { isResponseBreached: true, responseBreachAt: now }
    });
    await createAudit({
      ticketId: t.id,
      actorId: null,
      action: 'SLA_RESPONSE_BREACHED',
      oldValue: null,
      newValue: JSON.stringify({ at: now.toISOString() })
    });
    actions.responseBreaches.push(t.id);

    // optional escalation: bump priority, notify, or reassign (not implemented by default)
    if (escalate) {
      // Example: escalate MED -> HIGH, HIGH -> URGENT
      const priorityMap = { 'LOW': 'MED', 'MED': 'HIGH', 'HIGH': 'URGENT' };
      const newPriority = priorityMap[t.priority] || t.priority;
      if (newPriority !== t.priority) {
        await prisma.ticket.update({
          where: { id: t.id },
          data: { priority: newPriority }
        });
        await createAudit({
          ticketId: t.id,
          actorId: null,
          action: 'SLA_ESCALATION_PRIORITY',
          oldValue: t.priority,
          newValue: newPriority,
          meta: { reason: 'response_breach', auto: true }
        });
      }
    }
  }

  // Resolve breaches (tickets not resolved yet)
  const resolveCandidates = await prisma.ticket.findMany({
    where: {
      status: { in: ['OPEN', 'NEEDS_INFO', 'IN_PROGRESS', 'REOPENED'] },
      resolveDueAt: { lt: now },
      isResolveBreached: false
    }
  });

  for (const t of resolveCandidates) {
    await prisma.ticket.update({
      where: { id: t.id },
      data: { isResolveBreached: true, resolveBreachAt: now }
    });
    await createAudit({
      ticketId: t.id,
      actorId: null,
      action: 'SLA_RESOLVE_BREACHED',
      oldValue: null,
      newValue: JSON.stringify({ at: now.toISOString() })
    });
    actions.resolveBreaches.push(t.id);

    if (escalate) {
      // Could reassign or notify supervisor - we simply log escalation
      await createAudit({
        ticketId: t.id,
        actorId: null,
        action: 'SLA_ESCALATION_NOTIFICATION',
        meta: { reason: 'resolve_breach', message: 'notify_supervisor' }
      });
    }
  }

  // Also check resolved tickets that were resolved late
  const resolvedLate = await prisma.ticket.findMany({
    where: {
      status: 'RESOLVED',
      resolvedAt: { lt: new Date('1000-01-01') } // no-op placeholder to avoid query issue; we'll compute differently below
    },
    take: 0
  });

  // Instead, find resolved tickets where resolvedAt > resolveDueAt
  const resolvedWithDue = await prisma.ticket.findMany({
    where: {
      status: 'RESOLVED',
      resolvedAt: { not: null },
      resolveDueAt: { not: null }
    }
  });

  for (const t of resolvedWithDue) {
    if (t.resolvedAt && t.resolveDueAt && new Date(t.resolvedAt) > new Date(t.resolveDueAt)) {
      // mark resolve breach if not already
      if (!t.isResolveBreached) {
        await prisma.ticket.update({
          where: { id: t.id },
          data: { isResolveBreached: true, resolveBreachAt: now }
        });
        await createAudit({
          ticketId: t.id,
          actorId: null,
          action: 'SLA_RESOLVE_LATE',
          oldValue: t.resolvedAt.toISOString(),
          newValue: now.toISOString()
        });
        actions.resolveBreaches.push(t.id);
      }
    }
  }

  return actions;
}

module.exports = { runSlaChecks };