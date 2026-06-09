const express = require('express');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { AppError, asyncHandler } = require('../middleware/errorHandler');
const { authenticateToken } = require('../middleware/auth');
const { Conversation, Message, User } = require('../models');
const { serializeConversation, serializeMessage } = require('../utils/messagingSerializer');

const router = express.Router();

const isServerless = process.env.VERCEL === '1' || !!process.env.NOW_REGION;
const messagingUploadsDir = path.join(__dirname, '..', 'uploads', 'messaging');

let storage;

if (isServerless) {
  // Vercel's /var/task FS is read-only; use in-memory storage and handle
  // attachments via buffer streaming (frontend can still send files when
  // running on Render/local).
  storage = multer.memoryStorage();
} else {
  fs.mkdirSync(messagingUploadsDir, { recursive: true });
  storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, messagingUploadsDir),
    filename: (req, file, cb) => {
      const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
      const ext = path.extname(file.originalname) || '';
      cb(null, `${unique}${ext}`);
    }
  });
}

const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10 MB
  }
});

const computeParticipantHash = (ids = []) => ids.slice().sort().join('__');

const dedupeParticipantIds = (ids = []) => Array.from(new Set((ids || []).map(String))).filter(Boolean);

const buildParticipantProfiles = async (ids = []) => {
  const users = await User.findAll({
    where: { id: ids },
    attributes: ['id', 'displayName', 'firstName', 'lastName', 'email', 'role']
  });
  const profileMap = users.reduce((acc, user) => {
    acc[user.id] = {
      id: user.id,
      displayName: user.displayName || [user.firstName, user.lastName].filter(Boolean).join(' ') || user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      role: user.role
    };
    return acc;
  }, {});
  return ids.map(id => profileMap[id] || { id });
};

const ensureParticipant = (conversation, userId) => {
  const ids = conversation.participantIds || [];
  if (!ids.includes(userId)) {
    throw new AppError('You are not a participant in this conversation', 403);
  }
};

const incrementUnreadCounts = (conversation, senderId) => {
  const counts = { ...(conversation.unreadCounts || {}) };
  (conversation.participantIds || []).forEach(id => {
    if (id === senderId) {
      counts[id] = 0;
    } else {
      counts[id] = (counts[id] || 0) + 1;
    }
  });
  return counts;
};

const markConversationRead = async (conversation, userId) => {
  const unreadCounts = { ...(conversation.unreadCounts || {}) };
  unreadCounts[userId] = 0;
  await conversation.update({ unreadCounts });
  return unreadCounts;
};

router.use(authenticateToken);

router.post('/conversations', asyncHandler(async (req, res) => {
  const { participants = [], orderId = null, metadata = {} } = req.body || {};
  const participantIds = dedupeParticipantIds(participants);

  if (!participantIds.includes(req.user.uid)) {
    participantIds.push(req.user.uid);
  }

  if (participantIds.length < 2) {
    throw new AppError('Conversations require at least two participants', 400);
  }

  const participantHash = computeParticipantHash(participantIds);
  const where = { participantHash };
  if (orderId) {
    where.orderId = orderId;
  } else {
    where.orderId = null;
  }

  let conversation = await Conversation.findOne({ where });
  if (!conversation) {
    const profiles = await buildParticipantProfiles(participantIds);
    const unreadCounts = participantIds.reduce((acc, id) => ({ ...acc, [id]: 0 }), {});
    conversation = await Conversation.create({
      participantIds,
      participantHash,
      participantProfiles: profiles,
      orderId: orderId || null,
      metadata,
      unreadCounts,
      createdBy: req.user.uid
    });
  }

  res.json(serializeConversation(conversation));
}));

router.get('/conversations/:conversationId', asyncHandler(async (req, res) => {
  const conversation = await Conversation.findByPk(req.params.conversationId);
  if (!conversation) {
    throw new AppError('Conversation not found', 404);
  }
  ensureParticipant(conversation, req.user.uid);
  res.json(serializeConversation(conversation));
}));

router.get('/conversations/:conversationId/messages', asyncHandler(async (req, res) => {
  const { conversationId } = req.params;
  const limit = Math.min(parseInt(req.query.limit, 10) || 40, 200);

  const conversation = await Conversation.findByPk(conversationId);
  if (!conversation) {
    throw new AppError('Conversation not found', 404);
  }
  ensureParticipant(conversation, req.user.uid);

  const messages = await Message.findAll({
    where: { conversationId },
    order: [['createdAt', 'DESC']],
    limit
  });

  const items = messages.reverse().map(serializeMessage);
  res.json({ success: true, items });
}));

router.post('/conversations/:conversationId/messages', asyncHandler(async (req, res) => {
  const { conversationId } = req.params;
  const { senderId, content, type = 'text', timestamp } = req.body || {};

  if (!senderId || senderId !== req.user.uid) {
    throw new AppError('Sender mismatch', 403);
  }

  if (!content) {
    throw new AppError('Message content is required', 400);
  }

  const conversation = await Conversation.findByPk(conversationId);
  if (!conversation) {
    throw new AppError('Conversation not found', 404);
  }
  ensureParticipant(conversation, senderId);

  const message = await Message.create({
    conversationId,
    senderId,
    content,
    type,
    sentAt: timestamp ? new Date(timestamp) : new Date()
  });

  const unreadCounts = incrementUnreadCounts(conversation, senderId);
  const lastMessageSnapshot = serializeMessage(message);

  await conversation.update({
    lastMessageId: message.id,
    lastMessageSnapshot,
    lastMessageAt: lastMessageSnapshot.timestamp,
    unreadCounts,
    updatedAt: new Date()
  });

  res.json(lastMessageSnapshot);
}));

router.post('/conversations/:conversationId/read', asyncHandler(async (req, res) => {
  const { conversationId } = req.params;
  const { userId = req.user.uid } = req.body || {};

  if (userId !== req.user.uid && req.user.role !== 'admin') {
    throw new AppError('Not authorized to mark as read for this user', 403);
  }

  const conversation = await Conversation.findByPk(conversationId);
  if (!conversation) {
    throw new AppError('Conversation not found', 404);
  }
  ensureParticipant(conversation, userId);

  const unreadCounts = await markConversationRead(conversation, userId);
  res.json({ success: true, unreadCounts });
}));

router.post('/conversations/:conversationId/typing', asyncHandler(async (req, res) => {
  const { conversationId } = req.params;
  const { userId = req.user.uid } = req.body || {};

  const conversation = await Conversation.findByPk(conversationId);
  if (!conversation) {
    throw new AppError('Conversation not found', 404);
  }
  ensureParticipant(conversation, userId);

  res.json({ success: true, message: 'Typing indicator accepted' });
}));

router.post('/conversations/:conversationId/files', upload.single('file'), asyncHandler(async (req, res) => {
  const { conversationId } = req.params;
  const senderId = req.body.senderId || req.user.uid;

  if (!req.file) {
    throw new AppError('File is required', 400);
  }

  if (senderId !== req.user.uid && req.user.role !== 'admin') {
    throw new AppError('Not authorized to send files for another user', 403);
  }

  const conversation = await Conversation.findByPk(conversationId);
  if (!conversation) {
    throw new AppError('Conversation not found', 404);
  }
  ensureParticipant(conversation, senderId);

  const relativePath = `/uploads/messaging/${req.file.filename}`;

  const message = await Message.create({
    conversationId,
    senderId,
    type: 'file',
    content: req.file.originalname,
    attachments: {
      url: relativePath,
      mimeType: req.file.mimetype,
      size: req.file.size,
      filename: req.file.filename
    }
  });

  const unreadCounts = incrementUnreadCounts(conversation, senderId);
  const snapshot = serializeMessage(message);

  await conversation.update({
    lastMessageId: message.id,
    lastMessageSnapshot: snapshot,
    lastMessageAt: snapshot.timestamp,
    unreadCounts,
    updatedAt: new Date()
  });

  res.json(snapshot);
}));

module.exports = router;
