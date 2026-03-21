const prisma = require('../prismaClient');
const AppError = require('../utils/AppError');

//used for GET /tickets/:id/audit
async function getAuditForTicket(req, res, next) {
  try {
    if (req.user.role === 'STUDENT') {
      throw new AppError('Forbidden', 403);
    }

    const ticketId = req.params.id;
    const logs = await prisma.auditLog.findMany({
      where: { ticketId },
      include: { actor: { select: { id: true, name: true, email: true, role: true } } },
      orderBy: { createdAt: 'desc' }
    });
    res.json(logs);
  } catch (err) { next(err); }
}

module.exports = { getAuditForTicket };