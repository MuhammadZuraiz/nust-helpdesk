const { z } = require('zod');

const createTicketSchema = z.object({
  title: z.string().min(5),
  description: z.string().min(10),
  departmentId: z.string().nullable().optional(),
  categoryId: z.string().nullable().optional(),
  priority: z.enum(['LOW','MED','HIGH','URGENT']).optional()
});

module.exports = { createTicketSchema };