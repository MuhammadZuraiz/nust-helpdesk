const { z } = require('zod');

const queueQuerySchema = z.object({
  status: z.enum([
    'OPEN',
    'NEEDS_INFO',
    'IN_PROGRESS',
    'RESOLVED',
    'CLOSED',
    'CANCELLED',
    'REOPENED'
  ]).optional(),

  priority: z.enum(['LOW', 'MED', 'HIGH', 'URGENT']).optional(),

  departmentId: z.string().optional(),
  categoryId: z.string().optional(),
  assigneeId: z.string().optional(),

  createdFrom: z.string().datetime().optional(),
  createdTo: z.string().datetime().optional(),

  search: z.string().min(1).optional(),

  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),

  sortBy: z.enum([
    'createdAt',
    'priority',
    'responseDueAt',
    'resolveDueAt',
    'slaDueSoon'
  ]).default('createdAt'),

  sortOrder: z.enum(['asc', 'desc']).default('desc')
});

module.exports = { queueQuerySchema };