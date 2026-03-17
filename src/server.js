require('dotenv').config();
const express = require('express');
const cors = require('cors');
const prisma = require('./prismaClient');
const authRoutes    = require('./routes/auth.routes');
const ticketRoutes  = require('./routes/tickets.routes');
const statusRoutes  = require('./routes/status.routes');
const commentsRoutes = require('./routes/comments.routes');
const auditRoutes   = require('./routes/audit.routes');
const jobsRoutes    = require('./routes/jobs.routes');
const cron = require('node-cron');
const { runSlaChecks } = require('./services/sla.service');
const { generalLimiter } = require('./middleware/rateLimiter');

const app = express();
app.use(cors());
app.use(express.json());
app.use(generalLimiter);
// Routes
app.use('/auth', authRoutes);
app.use('/tickets', ticketRoutes);
app.use('/tickets', statusRoutes);
app.use('/tickets', commentsRoutes);
app.use('/tickets', auditRoutes);
app.use('/jobs', jobsRoutes);

// Health
app.get('/health', (req, res) => res.json({ ok: true }));

// Error handler
app.use((err, req, res, next) => {
  // Zod validation errors come from parsing request bodies.
  // They have a different shape so we handle them first.
  if (err.name === 'ZodError') {
    return res.status(400).json({ error: err.errors });
  }

  // If isOperational is true, this is an AppError we threw on purpose.
  // Trust its statusCode and message completely.
  if (err.isOperational) {
    return res.status(err.statusCode).json({ error: err.message });
  }

  // If we get here, it's an unexpected programmer error — a bug.
  // Log the full error so you can debug it, but don't leak
  // internal details to the caller. Always return 500.
  console.error('UNEXPECTED ERROR:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Fix: SLA cron was commented out so breaches were only detected when an
// admin manually hit POST /jobs/run-sla-check. Now runs every 5 minutes.
cron.schedule('*/5 * * * *', async () => {
  try {
    const result = await runSlaChecks({ escalate: true });
    if (result.responseBreaches.length || result.resolveBreaches.length) {
      console.log('[SLA cron] Breaches detected:', result);
    }
  } catch (e) {
    console.error('[SLA cron] Error:', e);
  }
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

// Graceful shutdown
process.on('SIGINT', async () => {
  await prisma.$disconnect();
  process.exit(0);
});
