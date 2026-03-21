const authService = require('../services/auth.service');
const { registerSchema, loginSchema } = require('../validators/auth.validator');
const { z } = require('zod');

const refreshSchema = z.object({ refreshToken: z.string().min(1) });
const logoutSchema  = z.object({ refreshToken: z.string().min(1) });

async function register(req, res, next) {
  try {
    const parsed = registerSchema.parse(req.body);
    const result = await authService.register(parsed);
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
}

async function login(req, res, next) {
  try {
    const parsed = loginSchema.parse(req.body);
    const result = await authService.login(parsed);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

async function refresh(req, res, next) {
  try {
    const { refreshToken } = refreshSchema.parse(req.body);
    const result = await authService.refresh({ refreshToken });
    res.json(result);
  } catch (err) {
    next(err);
  }
}

async function logout(req, res, next) {
  try {
    const { refreshToken } = logoutSchema.parse(req.body);
    await authService.logout({ refreshToken });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
}

module.exports = { register, login, refresh, logout };
