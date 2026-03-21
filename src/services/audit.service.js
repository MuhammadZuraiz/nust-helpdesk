const prisma = require('../prismaClient');

/**
 * Creates an immutable audit log entry.
 *
 * @param {object} params
 * @param {string|null}  params.ticketId
 * @param {string|null}  params.actorId
 * @param {string}       params.action
 * @param {string|null}  params.oldValue
 * @param {string|null}  params.newValue
 * @param {object|null}  params.meta    - any plain JS object; stored as JSON.
 *                                        Previously some callers passed a raw
 *                                        object while others passed null, which
 *                                        was inconsistent. We now always pass
 *                                        it straight through — Prisma accepts
 *                                        plain objects for Json fields — but
 *                                        we guard against non-object values.
 */
async function createAudit({
  ticketId = null,
  actorId  = null,
  action,
  oldValue = null,
  newValue = null,
  meta     = null
}) {
  // Coerce meta: only plain objects (or null) are valid Json field values.
  // If something other than a plain object or null was passed, discard it.
  const safeMeta =
    meta !== null && typeof meta === 'object' && !Array.isArray(meta)
      ? meta
      : meta === null
        ? null
        : null; // discard unexpected types silently

  return prisma.auditLog.create({
    data: {
      ticketId,
      actorId,
      action,
      oldValue,
      newValue,
      meta: safeMeta
    }
  });
}

module.exports = { createAudit };
