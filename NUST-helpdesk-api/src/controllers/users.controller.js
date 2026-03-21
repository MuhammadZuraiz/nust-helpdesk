const prisma = require('../prismaClient');

async function getAgents(req, res, next) {
  try {
    const agents = await prisma.user.findMany({
      where: {
        role: 'AGENT',
        ...(req.user.departmentId
          ? { departmentId: req.user.departmentId }
          : {})
      },
      select: {
        id: true,
        name: true,
        email: true,
        departmentId: true,
        department: {
          select: { name: true }
        }
      },
      orderBy: { name: 'asc' }
    });

    res.json(agents);
  } catch (err) {
    next(err);
  }
};

async function getSystemStats (req, res, next) {
  try {
    const [
      totalTickets,
      openTickets,
      inProgressTickets,
      resolvedTickets,
      responseBreaches,
      resolveBreaches,
      totalUsers,
    ] = await Promise.all([
      prisma.ticket.count(),
      prisma.ticket.count({ where: { status: 'OPEN' } }),
      prisma.ticket.count({ where: { status: 'IN_PROGRESS' } }),
      prisma.ticket.count({ where: { status: 'RESOLVED' } }),
      prisma.ticket.count({ where: { isResponseBreached: true } }),
      prisma.ticket.count({ where: { isResolveBreached: true } }),
      prisma.user.count(),
    ]);

    res.json({
      totalTickets,
      openTickets,
      inProgressTickets,
      resolvedTickets,
      responseBreaches,
      resolveBreaches,
      totalUsers,
    });
  } catch (err) {
    next(err);
  }
};

module.exports = { getAgents, getSystemStats };