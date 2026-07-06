const db = require('../config/db');
const userModel = require('../models/userModel');
const kycModel = require('../models/kycModel');
const transactionModel = require('../models/transactionModel');
const walletModel = require('../models/walletModel');
const orderModel = require('../models/orderModel');
const notificationModel = require('../models/notificationModel');
const auditModel = require('../models/auditModel');

async function getAnalytics(req, res) {
  const [{ rows: userCount }, { rows: orderCount }, { rows: volume }, { rows: pendingKyc }, { rows: pendingTx }] =
    await Promise.all([
      db.query('SELECT COUNT(*) FROM users'),
      db.query("SELECT COUNT(*) FROM orders WHERE status = 'filled'"),
      db.query("SELECT COALESCE(SUM(quantity * filled_price), 0) AS total FROM orders WHERE status = 'filled'"),
      db.query("SELECT COUNT(*) FROM kyc_documents WHERE status = 'pending'"),
      db.query("SELECT COUNT(*) FROM transactions WHERE status = 'pending'"),
    ]);

  return res.json({
    totalUsers: parseInt(userCount[0].count, 10),
    filledOrders: parseInt(orderCount[0].count, 10),
    totalTradingVolumeUsd: parseFloat(volume[0].total),
    pendingKycCount: parseInt(pendingKyc[0].count, 10),
    pendingTransactionCount: parseInt(pendingTx[0].count, 10),
  });
}

async function listUsers(req, res) {
  const { limit, offset } = req.query;
  const users = await userModel.listUsers({ limit: Number(limit) || 50, offset: Number(offset) || 0 });
  return res.json({ users });
}

async function setUserStatus(req, res) {
  const { status } = req.body; // active | suspended | banned
  await userModel.updateStatus(req.params.id, status);
  await auditModel.log({ actorId: req.user.id, action: 'user_status_changed', entity: 'user', entityId: req.params.id, metadata: { status } });
  return res.json({ message: `User status set to ${status}` });
}

async function listPendingKyc(req, res) {
  const docs = await kycModel.getPendingDocuments();
  return res.json({ documents: docs });
}

async function reviewKyc(req, res) {
  const { status, note, userId } = req.body; // status: approved | rejected
  const doc = await kycModel.reviewDocument(req.params.id, { status, adminId: req.user.id, note, userId });
  await notificationModel.createNotification({
    userId,
    title: `KYC ${status}`,
    message: status === 'approved' ? 'Your KYC documents have been approved.' : `Your KYC submission was rejected: ${note || 'no reason given'}`,
    type: 'kyc',
  });
  await auditModel.log({ actorId: req.user.id, action: 'kyc_reviewed', entity: 'kyc_document', entityId: doc.id, metadata: { status } });
  return res.json({ document: doc });
}

async function listPendingTransactions(req, res) {
  const transactions = await transactionModel.getPendingTransactions();
  return res.json({ transactions });
}

async function reviewTransaction(req, res) {
  const { status, note } = req.body; // approved | rejected
  const tx = await transactionModel.findById(req.params.id);
  if (!tx) return res.status(404).json({ error: 'Transaction not found' });

  const updated = await transactionModel.reviewTransaction(req.params.id, { status, adminId: req.user.id, note });

  if (status === 'approved') {
    if (tx.type === 'deposit') {
      await walletModel.adjustBalance(tx.user_id, tx.asset, parseFloat(tx.amount));
    } else if (tx.type === 'withdrawal') {
      await walletModel.releaseLockedFunds(tx.user_id, tx.asset, parseFloat(tx.amount));
    }
  } else if (status === 'rejected' && tx.type === 'withdrawal') {
    // Return the locked funds since the withdrawal didn't go through
    await walletModel.releaseLockedFunds(tx.user_id, tx.asset, parseFloat(tx.amount));
    await walletModel.adjustBalance(tx.user_id, tx.asset, parseFloat(tx.amount));
  }

  await notificationModel.createNotification({
    userId: tx.user_id,
    title: `${tx.type} ${status}`,
    message: `Your ${tx.type} of ${tx.amount} ${tx.asset} was ${status}.`,
    type: 'wallet',
  });
  await auditModel.log({ actorId: req.user.id, action: 'transaction_reviewed', entity: 'transaction', entityId: tx.id, metadata: { status } });

  return res.json({ transaction: updated });
}

async function listAllOrders(req, res) {
  const orders = await orderModel.getAllOrders();
  return res.json({ orders });
}

async function broadcastNotification(req, res) {
  const { title, message, type } = req.body;
  await notificationModel.broadcast({ title, message, type });
  await auditModel.log({ actorId: req.user.id, action: 'notification_broadcast', metadata: { title } });
  return res.json({ message: 'Notification broadcast to all users' });
}

async function getAuditLogs(req, res) {
  const logs = await auditModel.getRecent();
  return res.json({ logs });
}

module.exports = {
  getAnalytics,
  listUsers,
  setUserStatus,
  listPendingKyc,
  reviewKyc,
  listPendingTransactions,
  reviewTransaction,
  listAllOrders,
  broadcastNotification,
  getAuditLogs,
};
