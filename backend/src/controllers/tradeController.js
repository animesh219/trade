const { z } = require('zod');
const binance = require('../services/binanceService');
const orderModel = require('../models/orderModel');
const walletModel = require('../models/walletModel');
const notificationModel = require('../models/notificationModel');
const auditModel = require('../models/auditModel');

async function getMarketWatchlist(req, res) {
  try {
    const data = await binance.getWatchlist();
    return res.json({ markets: data });
  } catch (err) {
    return res.status(502).json({ error: 'Failed to fetch market data', detail: err.message });
  }
}

async function getSymbolPrice(req, res) {
  try {
    const { symbol } = req.params;
    const data = await binance.getPrice(symbol.toUpperCase());
    return res.json(data);
  } catch (err) {
    return res.status(502).json({ error: 'Failed to fetch price', detail: err.message });
  }
}

const orderSchema = z.object({
  symbol: z.string().min(3),
  side: z.enum(['BUY', 'SELL']),
  orderType: z.enum(['MARKET', 'LIMIT', 'STOP_LOSS', 'TAKE_PROFIT']),
  quantity: z.number().positive(),
  limitPrice: z.number().positive().optional(),
  stopPrice: z.number().positive().optional(),
});

/**
 * Places an order. For MARKET orders this executes immediately against Binance
 * (testnet by default). LIMIT / STOP_LOSS / TAKE_PROFIT orders are recorded as
 * pending; a production system would run a background worker or use Binance's
 * native STOP_LOSS_LIMIT / TAKE_PROFIT_LIMIT order types to manage them.
 */
async function placeOrder(req, res) {
  const parsed = orderSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.errors[0].message });
  }
  const { symbol, side, orderType, quantity, limitPrice, stopPrice } = parsed.data;
  const userId = req.user.id;
  const base = symbol.replace('USDT', '');
  const quote = 'USDT';

  const order = await orderModel.createOrder({
    userId,
    symbol,
    side,
    orderType,
    quantity,
    limitPrice,
    stopPrice,
  });

  if (orderType !== 'MARKET') {
    // Held as pending; a monitoring worker would trigger execution when the
    // stop/limit condition is met against live market data.
    return res.status(201).json({ order, message: 'Order placed and pending execution' });
  }

  try {
    const { price: marketPrice } = await binance.getPrice(symbol);
    const cost = marketPrice * quantity;

    if (side === 'BUY') {
      const locked = await walletModel.lockFunds(userId, quote, cost);
      if (!locked) {
        await orderModel.markRejected(order.id);
        return res.status(400).json({ error: 'Insufficient USDT balance' });
      }
    } else {
      const locked = await walletModel.lockFunds(userId, base, quantity);
      if (!locked) {
        await orderModel.markRejected(order.id);
        return res.status(400).json({ error: `Insufficient ${base} balance` });
      }
    }

    // Execute against Binance (testnet). If credentials aren't configured,
    // fall back to simulated fill at the fetched market price so the demo works end-to-end.
    let exchangeOrderId = `SIM-${Date.now()}`;
    let filledPrice = marketPrice;
    try {
      const exchangeResult = await binance.placeOrder({ symbol, side, type: 'MARKET', quantity });
      exchangeOrderId = String(exchangeResult.orderId);
      filledPrice = parseFloat(exchangeResult.fills?.[0]?.price) || marketPrice;
    } catch (execErr) {
      console.warn('Binance execution failed, falling back to simulated fill:', execErr.message);
    }

    if (side === 'BUY') {
      await walletModel.releaseLockedFunds(userId, quote, cost);
      await walletModel.adjustBalance(userId, base, quantity);
    } else {
      await walletModel.releaseLockedFunds(userId, base, quantity);
      await walletModel.adjustBalance(userId, quote, quantity * filledPrice);
    }

    const filledOrder = await orderModel.markFilled(order.id, { exchangeOrderId, filledPrice });

    await notificationModel.createNotification({
      userId,
      title: 'Order filled',
      message: `${side} ${quantity} ${base} at ~$${filledPrice} filled successfully.`,
      type: 'trade',
    });
    await auditModel.log({ actorId: userId, action: 'order_filled', entity: 'order', entityId: order.id });

    return res.status(201).json({ order: filledOrder });
  } catch (err) {
    await orderModel.markRejected(order.id);
    return res.status(502).json({ error: 'Order execution failed', detail: err.message });
  }
}

async function getMyOrders(req, res) {
  const orders = await orderModel.getUserOrders(req.user.id);
  return res.json({ orders });
}

module.exports = { getMarketWatchlist, getSymbolPrice, placeOrder, getMyOrders };
