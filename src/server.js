require('dotenv').config();
const express = require('express');
const cors = require('cors');
const prisma = require('./prismaClient');
const authRoutes = require('./routes/auth.routes');
const ticketRoutes = require('./routes/tickets.routes');
const statusRoutes = require('./routes/status.routes');
const commentsRoutes = require('./routes/comments.routes');
const auditRoutes = require('./routes/audit.routes');
const jobsRoutes = require('./routes/jobs.routes');
const cron = require('node-cron');
const { runSlaChecks } = require('./services/sla.service');


const app = express();
app.use(cors());
app.use(express.json());

//routes
app.use('/auth', authRoutes);

//ticket
app.use('/tickets', ticketRoutes);
app.use('/tickets', statusRoutes);        // status endpoints
app.use('/tickets', commentsRoutes);      // comments & notes
app.use('/tickets', auditRoutes);         // audit logs

//jobs
app.use('/jobs', jobsRoutes);

//health
app.get('/health', (req,res) => res.json({ ok: true }));

//error handler
app.use((err, req, res, next) => {
  console.error(err);
  if (err.name === 'ZodError') {
    return res.status(400).json({ error: err.errors });
  }
  res.status(400).json({ error: err.message || 'Bad request' });
});

//run sla check every 5 minutes

// cron.schedule('*/5 * * * *', async () => {
/*  try {
    const res = await runSlaChecks({ escalate: true });
    if (res.responseBreaches.length || res.resolveBreaches.length) {
      console.log('SLA check results:', res);
    }
  } catch (e) {
    console.error('SLA cron error', e);
  }
});
*/

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

//shutdown
process.on('SIGINT', async () => {
  await prisma.$disconnect();
  process.exit(0);
});
