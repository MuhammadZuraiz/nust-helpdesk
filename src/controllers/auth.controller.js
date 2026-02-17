const authService = require('../services/auth.service');
const { registerSchema, loginSchema } = require('../validators/auth.validator');

async function register (req, res, next) {
    try {
        const parsed = registerSchema.parse(req.body);
        const result = await authService.register(parsed);
        res.status(201).json(result);
    }
    catch (err) {
        next(err);
    }
}

async function login(req, res, next) {
    try{
        const parsed = loginSchema.parse(req.body);
        const result = await authService.login(parsed);
        res.json(result);
    }    
    catch (err) {
        next(err);
    }
}

module.exports = { register, login };