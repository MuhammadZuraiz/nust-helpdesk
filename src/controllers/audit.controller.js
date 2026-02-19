const prisma = require('../prismaClient');

// GET /tickets/:id/audit (staff only)
async function getAuditForTicket(req, res, next) {
  try {
    const ticketId = req.params.id;

    // Basic permission: students cannot access audit; staff allowed
    if (req.user.role === 'STUDENT') {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const logs = await prisma.auditLog.findMany({
      where: { ticketId },
      include: { actor: { select: { id: true, name: true, email: true, role: true } } },
      orderBy: { createdAt: 'desc' }
    });
    res.json(logs);
  } catch (err) { next(err); }
}

module.exports = { getAuditForTicket };
