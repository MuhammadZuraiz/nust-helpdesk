require('dotenv').config();
const express = require('express');
const cors = require('cors');
const prisma = require('./prismaClient');
const authRoutes = require('./routes/auth.routes');
const ticketRoutes = require('./routes/tickets.routes');

const app = express();
app.use(cors());
app.use(express.json());

//routes
app.use('/auth', authRoutes);

//ticket
app.use('/tickets', ticketRoutes);

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

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

//shutdown
process.on('SIGINT', async () => {
  await prisma.$disconnect();
  process.exit(0);
});
