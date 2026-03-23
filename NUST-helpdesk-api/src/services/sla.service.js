const prisma = require('../prismaClient');
const { createAudit } = require('./audit.service');
const { sendEmail } = require('./email.service');
const { createNotification } = require('./notification.service');

async function runSlaChecks({ escalate = false } = {}) {
  const now = new Date();
  const actions = { responseBreaches: [], resolveBreaches: [] };

  // ── Response breaches ──────────────────────────────────────────────────────
  const responseCandidates = await prisma.ticket.findMany({
    where: {
      firstResponseAt:    null,
      responseDueAt:      { lt: now },
      isResponseBreached: false,
      status:             { in: ['OPEN', 'NEEDS_INFO'] }
    }
  });

  for (const t of responseCandidates) {
    await prisma.ticket.update({
      where: { id: t.id },
      data:  { isResponseBreached: true, responseBreachAt: now }
    });

    await createAudit({
      ticketId: t.id,
      actorId:  null,
      action:   'SLA_RESPONSE_BREACHED',
      newValue: JSON.stringify({ at: now.toISOString() })
    });

    if (t.assigneeId) {
      await createNotification({
        userId:   t.assigneeId,
        ticketId: t.id,
        type:     'SLA_BREACHED',
        message:  `SLA response deadline missed on ticket "${t.title}".`
      });
    }

    try {
      if (t.assigneeId) {
        const assignee = await prisma.user.findUnique({ where: { id: t.assigneeId } });
        if (assignee) {
          await sendEmail({
            to:      assignee.email,
            subject: `SLA BREACH — Response overdue: ${t.title}`,
            text:    `Hi ${assignee.name},\n\nTicket "${t.title}" has breached its response SLA.\n\nTicket ID: ${t.id}`,
            html:    `<h2 style="color:red;">SLA Response Breach</h2>
                      <p>Hi ${assignee.name},</p>
                      <p>Ticket "<strong>${t.title}</strong>" has breached its response SLA.</p>
                      <p>Priority: ${t.priority} | ID: ${t.id}</p>`
          });
        }
      }
    } catch (err) {
      console.error('SLA response breach email failed:', err.message);
    }

    actions.responseBreaches.push(t.id);

    if (escalate) {
      const priorityMap = { LOW: 'MED', MED: 'HIGH', HIGH: 'URGENT' };
      const newPriority = priorityMap[t.priority] || t.priority;
      if (newPriority !== t.priority) {
        await prisma.ticket.update({
          where: { id: t.id },
          data:  { priority: newPriority }
        });
        await createAudit({
          ticketId: t.id,
          actorId:  null,
          action:   'SLA_ESCALATION_PRIORITY',
          oldValue: t.priority,
          newValue: newPriority,
          meta:     { reason: 'response_breach', auto: true }
        });
      }
    }
  }

  // ── Resolve breaches ───────────────────────────────────────────────────────
  const resolveCandidates = await prisma.ticket.findMany({
    where: {
      status:           { in: ['OPEN', 'NEEDS_INFO', 'IN_PROGRESS', 'REOPENED'] },
      resolveDueAt:     { lt: now },
      isResolveBreached: false
    }
  });

  for (const t of resolveCandidates) {
    await prisma.ticket.update({
      where: { id: t.id },
      data:  { isResolveBreached: true, resolveBreachAt: now }
    });

    await createAudit({
      ticketId: t.id,
      actorId:  null,
      action:   'SLA_RESOLVE_BREACHED',
      newValue: JSON.stringify({ at: now.toISOString() })
    });

    if (t.assigneeId) {
      await createNotification({
        userId:   t.assigneeId,
        ticketId: t.id,
        type:     'SLA_BREACHED',
        message:  `SLA resolve deadline missed on ticket "${t.title}".`
      });
    }

    try {
      if (t.assigneeId) {
        const assignee = await prisma.user.findUnique({ where: { id: t.assigneeId } });
        if (assignee) {
          await sendEmail({
            to:      assignee.email,
            subject: `SLA BREACH — Resolve overdue: ${t.title}`,
            text:    `Hi ${assignee.name},\n\nTicket "${t.title}" has breached its resolve SLA.\n\nTicket ID: ${t.id}`,
            html:    `<h2 style="color:red;">SLA Resolve Breach</h2>
                      <p>Hi ${assignee.name},</p>
                      <p>Ticket "<strong>${t.title}</strong>" has breached its resolve SLA.</p>
                      <p>Priority: ${t.priority} | ID: ${t.id}</p>`
          });
        }
      }
    } catch (err) {
      console.error('SLA resolve breach email failed:', err.message);
    }

    actions.resolveBreaches.push(t.id);

    if (escalate) {
      await createAudit({
        ticketId: t.id,
        actorId:  null,
        action:   'SLA_ESCALATION_NOTIFICATION',
        meta:     { reason: 'resolve_breach', message: 'notify_supervisor' }
      });
    }
  }

  // ── Late resolutions ───────────────────────────────────────────────────────
  const resolvedWithDue = await prisma.ticket.findMany({
    where: {
      status:           'RESOLVED',
      resolvedAt:       { not: null },
      resolveDueAt:     { not: null },
      isResolveBreached: false
    }
  });

  for (const t of resolvedWithDue) {
    if (t.resolvedAt && t.resolveDueAt && new Date(t.resolvedAt) > new Date(t.resolveDueAt)) {
      await prisma.ticket.update({
        where: { id: t.id },
        data:  { isResolveBreached: true, resolveBreachAt: now }
      });
      await createAudit({
        ticketId: t.id,
        actorId:  null,
        action:   'SLA_RESOLVE_LATE',
        oldValue: t.resolvedAt.toISOString(),
        newValue: now.toISOString()
      });
      actions.resolveBreaches.push(t.id);
    }
  }

  return actions;
}

module.exports = { runSlaChecks };