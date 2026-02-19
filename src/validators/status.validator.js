const { z } = require('zod');

const changeStatusSchema = z.object({
  newStatus: z.enum(['OPEN','NEEDS_INFO','IN_PROGRESS','RESOLVED','CLOSED','CANCELLED','REOPENED']),
  reason: z.string().optional().nullable()
});

module.exports = { changeStatusSchema };