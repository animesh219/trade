const { z } = require('zod');
const walletModel = require('../models/walletModel');
const transactionModel = require('../models/transactionModel');
const notificationModel = require('../models/notificationModel');

async function getMyWallets(req, res) {
  const wallets = await walletModel.getWallets(req.user.id);
  return res.json({ wallets });
}

const depositSchema = z.object({
  asset: z.string().min(2),
  amount: z.number().positive(),
  reference: z.string().optional(),
});

/**
 * Records a deposit request. In production this would be triggered by a
 * blockchain deposit watcher or a payment gateway webhook (for fiat), then
 * verified before crediting the wallet. Here it's queued for admin approval.
 */
async function requestDeposit(req, res) {
  const parsed = depositSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.errors[0].message });

  const tx = await transactionModel.createTransaction({
    userId: req.user.id,
    type: 'deposit',
    asset: parsed.data.asset,
    amount: parsed.data.amount,
    reference: parsed.data.reference,
  });
  return res.status(201).json({ transaction: tx, message: 'Deposit request submitted for review' });
}

const withdrawSchema = z.object({
  asset: z.string().min(2),
  amount: z.number().positive(),
  destination: z.string().min(3),
});

async function requestWithdrawal(req, res) {
  const parsed = withdrawSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.errors[0].message });

  const wallets = await walletModel.getWallets(req.user.id);
  const wallet = wallets.find((w) => w.asset === parsed.data.asset);
  if (!wallet || parseFloat(wallet.balance) < parsed.data.amount) {
    return res.status(400).json({ error: 'Insufficient balance for withdrawal' });
  }

  await walletModel.lockFunds(req.user.id, parsed.data.asset, parsed.data.amount);
  const tx = await transactionModel.createTransaction({
    userId: req.user.id,
    type: 'withdrawal',
    asset: parsed.data.asset,
    amount: parsed.data.amount,
    reference: parsed.data.destination,
  });
  return res.status(201).json({ transaction: tx, message: 'Withdrawal request submitted for review' });
}

async function getMyTransactions(req, res) {
  const transactions = await transactionModel.getUserTransactions(req.user.id);
  return res.json({ transactions });
}

module.exports = { getMyWallets, requestDeposit, requestWithdrawal, getMyTransactions };
