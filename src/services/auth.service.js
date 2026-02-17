const prisma = require('../prismaClient');
const bcrypt = require('bcryptjs');
const { signAccessToken, signRefreshToken } = require('../utils/jwt');

async function register({ name, email, password, role ='STUDENT', departmentId = null }) {
    const existing = await prisma.user.findUnique({ where: { email }});
    if (existing) throw new Error('Email already in use');

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
        data: { name, email, passwordHash, role, departmentId }
    });

    const accessToken = signAccessToken({ userId: user.id, role: user.role });
    const refreshToken = signRefreshToken({ userId: user.id });

    await prisma.refreshToken.create({ data: { token: refreshToken, userId: user.id }});
    
  return { user: { id: user.id, name: user.name, email: user.email, role: user.role }, accessToken, refreshToken };
}

async function login({ email, password }) {
    const user = await prisma.user.findUnique({ where: { email }});
    if (!user) throw new Error('Email does not exist!');

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) throw new Error('Incorrect password');

    const accessToken = signAccessToken({ userId: user.id, role: user.role });
    const refreshToken = signRefreshToken({ userId: user.id });

    await prisma.refreshToken.create({ data: { token: refreshToken, userId: user.id }});

    return { user: { id: user.id, name: user.name, email: user.email, role: user.role }, accessToken, refreshToken };
}

module.exports = { register, login };