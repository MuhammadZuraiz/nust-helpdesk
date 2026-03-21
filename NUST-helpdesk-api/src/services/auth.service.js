const prisma = require('../prismaClient');
const bcrypt = require('bcryptjs');
const AppError = require('../utils/AppError');
const { signAccessToken, signRefreshToken, verifyRefreshToken } = require('../utils/jwt');

async function register({ name, email, password }) {
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) throw new AppError('Email already in use', 409);

  const passwordHash = await bcrypt.hash(password, 10);

  // All self-registrations are STUDENT. Privileged roles are assigned by an admin.
  const user = await prisma.user.create({
    data: { name, email, passwordHash, role: 'STUDENT' }
  });

  const accessToken = signAccessToken({ userId: user.id, role: user.role });
  const refreshToken = signRefreshToken({ userId: user.id });

  await prisma.refreshToken.create({ data: { token: refreshToken, userId: user.id } });

  return {
    user: { id: user.id, name: user.name, email: user.email, role: user.role },
    accessToken,
    refreshToken
  };
}

async function login({ email, password }) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) throw new AppError('Invalid email or password', 401);

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!user) throw new AppError('Invalid email or password', 401);

  const accessToken = signAccessToken({ userId: user.id, role: user.role });
  const refreshToken = signRefreshToken({ userId: user.id });

  await prisma.refreshToken.create({ data: { token: refreshToken, userId: user.id } });

  return {
    user: { id: user.id, name: user.name, email: user.email, role: user.role },
    accessToken,
    refreshToken
  };
}

async function refresh({ refreshToken }) {
  // Verify the token is cryptographically valid first
  let payload;
  try {
    payload = verifyRefreshToken(refreshToken);
  } catch {
    throw new AppError('Invalid or expired refresh token', 401);
  }

  // Then check it exists in the DB and hasn't been revoked
  const stored = await prisma.refreshToken.findUnique({ where: { token: refreshToken } });
  if (!stored || stored.revoked) {
    throw new AppError('Refresh token revoked or not found', 401);
  }

  const user = await prisma.user.findUnique({
    where: { id: payload.userId },
    select: { id: true, name: true, email: true, role: true }
  });
  if (!user) throw new AppError('User not found', 401);

  // Rotate: revoke old token and issue a new pair
  await prisma.refreshToken.update({ where: { token: refreshToken }, data: { revoked: true } });

  const newAccessToken = signAccessToken({ userId: user.id, role: user.role });
  const newRefreshToken = signRefreshToken({ userId: user.id });
  await prisma.refreshToken.create({ data: { token: newRefreshToken, userId: user.id } });

  return { accessToken: newAccessToken, refreshToken: newRefreshToken };
}

async function logout({ refreshToken }) {
  // Revoke the provided refresh token; ignore if it doesn't exist
  await prisma.refreshToken.updateMany({
    where: { token: refreshToken, revoked: false },
    data: { revoked: true }
  });
}

module.exports = { register, login, refresh, logout };
