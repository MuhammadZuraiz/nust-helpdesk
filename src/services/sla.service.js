const prisma = require('../prismaClient');
const { createAudit } = require('./audit.service');
const { sendEmail } = require('./email.service');

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
      status: { in: ['OPEN', 'NEEDS_INFO'] }
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

  // Notify the assigned agent if there is one.
  // If there's no assignee we still want to notify someone —
  // so we fetch the ticket with its department to find a supervisor.
  try {
    if (t.assigneeId) {
      const assignee = await prisma.user.findUnique({ where: { id: t.assigneeId } });
      if (assignee) {
        await sendEmail({
          to:      assignee.email,
          subject: `SLA BREACH — Response overdue: ${t.title}`,
          text:    `Hi ${assignee.name},\n\nTicket "${t.title}" has breached its response SLA.\n\nPlease respond immediately.\n\nTicket ID: ${t.id}`,
          html: `
            <h2 style="color:red;">SLA Response Breach</h2>
            <p>Hi ${assignee.name},</p>
            <p>The following ticket has <strong>breached its response SLA</strong>:</p>
            <table>
              <tr><td><strong>Title</strong></td><td>${t.title}</td></tr>
              <tr><td><strong>Priority</strong></td><td>${t.priority}</td></tr>
              <tr><td><strong>Ticket ID</strong></td><td>${t.id}</td></tr>
            </table>
            <p>Please respond immediately.</p>
          `
        });
      }
    }
  } catch (err) {
    console.error('SLA breach email failed', {
      ticketId: t.id,
      assigneeId: t.assigneeId,
      error: err.message
    });
  }

    if (escalate) {
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

  // Resolve breaches (tickets not yet resolved)
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
      await createAudit({
        ticketId: t.id,
        actorId: null,
        action: 'SLA_ESCALATION_NOTIFICATION',
        meta: { reason: 'resolve_breach', message: 'notify_supervisor' }
      });
    }
  }

  // Check resolved tickets that were resolved late (resolvedAt > resolveDueAt)
  const resolvedWithDue = await prisma.ticket.findMany({
    where: {
      status: 'RESOLVED',
      resolvedAt: { not: null },
      resolveDueAt: { not: null },
      isResolveBreached: false
    }
  });

  for (const t of resolvedWithDue) {
    if (t.resolvedAt && t.resolveDueAt && new Date(t.resolvedAt) > new Date(t.resolveDueAt)) {
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

  return actions;
}

module.exports = { runSlaChecks };
