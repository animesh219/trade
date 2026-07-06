const walletModel = require('../models/walletModel');
const orderModel = require('../models/orderModel');
const binance = require('../services/binanceService');

async function getOverview(req, res) {
  const userId = req.user.id;
  const wallets = await walletModel.getWallets(userId);
  const recentOrders = await orderModel.getUserOrders(userId, { limit: 5 });

  let portfolioValueUsd = 0;
  const holdings = [];

  for (const w of wallets) {
    const totalQty = parseFloat(w.balance) + parseFloat(w.locked_balance);
    if (w.asset === 'USDT') {
      portfolioValueUsd += totalQty;
      holdings.push({ asset: w.asset, quantity: totalQty, valueUsd: totalQty, price: 1 });
      continue;
    }
    try {
      const { price } = await binance.getPrice(`${w.asset}USDT`);
      const value = totalQty * price;
      portfolioValueUsd += value;
      holdings.push({ asset: w.asset, quantity: totalQty, valueUsd: value, price });
    } catch {
      holdings.push({ asset: w.asset, quantity: totalQty, valueUsd: null, price: null });
    }
  }

  return res.json({
    portfolioValueUsd,
    holdings,
    recentOrders,
  });
}

module.exports = { getOverview };
