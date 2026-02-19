const prisma = require('../prismaClient');

async function createAudit({ ticketId = null, actorId = null, action, oldValue = null, newValue = null, meta = null }) {
  return prisma.auditLog.create({
    data: {
      ticketId,
      actorId,
      action,
      oldValue,
      newValue,
      meta
    }
  });
}

module.exports = { createAudit };