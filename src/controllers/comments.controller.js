const commentsService = require('../services/comments.service');
const { z } = require('zod');

const createCommentSchema = z.object({
  content: z.string().min(1)
});

async function addPublicComment(req, res, next) {
  try {
    const parsed = createCommentSchema.parse(req.body);
    const ticketId = req.params.id;
    const authorId = req.user.id;
    const comment = await commentsService.addComment({ ticketId, authorId, content: parsed.content, isInternal: false });
    res.status(201).json(comment);
  } catch (err) { next(err); }
}

async function addInternalNote(req, res, next) {
  try {
    // staff only endpoint (route enforces)
    const parsed = createCommentSchema.parse(req.body);
    const ticketId = req.params.id;
    const authorId = req.user.id;
    const comment = await commentsService.addComment({ ticketId, authorId, content: parsed.content, isInternal: true });
    res.status(201).json(comment);
  } catch (err) { next(err); }
}

module.exports = { addPublicComment, addInternalNote };
