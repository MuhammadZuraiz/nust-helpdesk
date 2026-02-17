
const jwtUtil = require('../utils/jwt');
const prisma = require('../prismaClient');

async function authMiddleware(req, res, next) {
  try {
    const header = req.headers.authorization;
    if (!header) return res.status(401).json({ error: 'Missing authorization' });
    const token = header.replace('Bearer ', '');
    const payload = jwtUtil.verify(token);
    const user = await prisma.user.findUnique({ where: { id: payload.userId }, select: { id: true, email: true, role: true, name: true }});
    if (!user) return res.status(401).json({ error: 'Invalid token user' });
    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

module.exports = authMiddleware;
