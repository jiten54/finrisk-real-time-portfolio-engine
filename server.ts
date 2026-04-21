import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import fs from 'fs';
import { randomUUID } from 'node:crypto';
import Database from 'better-sqlite3';
import { z } from 'zod';
import PQueue from 'p-queue';
import { Decimal } from 'decimal.js';
import * as math from 'mathjs';

// --- Database Setup ---
const db = new Database('finance.db');

// Initialize schema
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS portfolios (
    userId TEXT NOT NULL,
    asset TEXT NOT NULL,
    quantity REAL NOT NULL,
    avg_price REAL NOT NULL,
    PRIMARY KEY (userId, asset)
  );

  CREATE TABLE IF NOT EXISTS transactions (
    id TEXT PRIMARY KEY,
    userId TEXT NOT NULL,
    asset TEXT NOT NULL,
    quantity REAL NOT NULL,
    price REAL NOT NULL,
    side TEXT CHECK(side IN ('BUY', 'SELL')) NOT NULL,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS asset_prices (
    asset TEXT PRIMARY KEY,
    price REAL NOT NULL,
    last_updated DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

// Seed default user if not exists
const seedUser = db.prepare('INSERT OR IGNORE INTO users (id, name) VALUES (?, ?)');
seedUser.run('user_01', 'Default Portfolio');

// --- Types & Schemas ---
const TradeSchema = z.object({
  userId: z.string(),
  asset: z.string(),
  quantity: z.number().positive(),
  price: z.number().positive(),
  side: z.enum(['BUY', 'SELL']),
});

// --- In-Memory State ---
const marketData: Record<string, { price: number; last_updated: number }> = {
  'BTC': { price: 65000, last_updated: Date.now() },
  'ETH': { price: 3500, last_updated: Date.now() },
  'SOL': { price: 140, last_updated: Date.now() },
  'AAPL': { price: 180, last_updated: Date.now() },
  'TSLA': { price: 175, last_updated: Date.now() },
};

// --- Risk Engine ---
const riskQueue = new PQueue({ concurrency: 2 });

async function calculateRisk(userId: string, io: Server) {
  // Fetch portfolio and prices
  const portfolio = db.prepare('SELECT * FROM portfolios WHERE userId = ?').all(userId) as any[];
  
  if (portfolio.length === 0) {
    io.emit(`risk:${userId}`, { value: 0, pnl: 0, pnlPercent: 0, riskScore: 0 });
    return;
  }

  let totalValue = new Decimal(0);
  let totalCost = new Decimal(0);
  const allocations: Record<string, number> = {};

  portfolio.forEach(pos => {
    const currentPrice = marketData[pos.asset]?.price || pos.avg_price;
    const value = new Decimal(pos.quantity).mul(currentPrice);
    const cost = new Decimal(pos.quantity).mul(pos.avg_price);
    
    totalValue = totalValue.plus(value);
    totalCost = totalCost.plus(cost);
    allocations[pos.asset] = value.toNumber();
  });

  const pnl = totalValue.minus(totalCost);
  const pnlPercent = totalCost.gt(0) ? pnl.div(totalCost).mul(100) : new Decimal(0);

  // Simplified Risk Metrics (VaR simulation based on volatility)
  // In real systems, this would use historical returns or Monte Carlo
  const concentration = Object.values(allocations).map(v => v / totalValue.toNumber());
  const maxConcentration = Math.max(...concentration);
  
  // Fake VaR (95% confidence) - simplified
  const simulatedVolatility = 0.05; 
  const var95 = totalValue.mul(simulatedVolatility).mul(1.65);

  const riskMetrics = {
    userId,
    totalValue: totalValue.toNumber(),
    pnl: pnl.toNumber(),
    pnlPercent: pnlPercent.toNumber(),
    var95: var95.toNumber(),
    maxConcentration: maxConcentration,
    allocations,
    timestamp: Date.now()
  };

  // Push to clients
  io.emit(`metrics:${userId}`, riskMetrics);
  
  // Risk Alerts
  if (pnlPercent.lt(-10)) {
    io.emit(`alert:${userId}`, { type: 'HIGH_LOSS', message: `Portfolio down ${pnlPercent.toFixed(2)}%!` });
  }
}

// --- Express App ---
async function startServer() {
  const app = express();
  const httpServer = createServer(app);
  const io = new Server(httpServer, {
    cors: { origin: '*' }
  });
  const PORT = 3000;

  app.use(express.json());

  // --- API Routes ---
  
  app.get('/api/portfolio/:userId', (req, res) => {
    const { userId } = req.params;
    const rows = db.prepare('SELECT * FROM portfolios WHERE userId = ?').all(userId);
    res.json(rows);
  });

  app.post('/api/portfolio/trade', (req, res) => {
    try {
      const trade = TradeSchema.parse(req.body);
      const { userId, asset, quantity, price, side } = trade;

      // Atomic Update logic
      const tx = db.transaction(() => {
        // Record transaction
        db.prepare('INSERT INTO transactions (id, userId, asset, quantity, price, side) VALUES (?, ?, ?, ?, ?, ?)')
          .run(randomUUID(), userId, asset, quantity, price, side);

        // Update portfolio
        const pos = db.prepare('SELECT * FROM portfolios WHERE userId = ? AND asset = ?').get(userId, asset) as any;

        if (side === 'BUY') {
          if (pos) {
            const newQty = pos.quantity + quantity;
            const newAvg = (pos.avg_price * pos.quantity + price * quantity) / newQty;
            db.prepare('UPDATE portfolios SET quantity = ?, avg_price = ? WHERE userId = ? AND asset = ?')
              .run(newQty, newAvg, userId, asset);
          } else {
            db.prepare('INSERT INTO portfolios (userId, asset, quantity, avg_price) VALUES (?, ?, ?, ?)')
              .run(userId, asset, quantity, price);
          }
        } else {
          if (!pos || pos.quantity < quantity) throw new Error('Insufficient holdings');
          const newQty = pos.quantity - quantity;
          if (newQty === 0) {
            db.prepare('DELETE FROM portfolios WHERE userId = ? AND asset = ?').run(userId, asset);
          } else {
            db.prepare('UPDATE portfolios SET quantity = ? WHERE userId = ? AND asset = ?')
              .run(newQty, userId, asset);
          }
        }
      });

      tx();

      // Trigger Risk Calc async
      riskQueue.add(() => calculateRisk(userId, io));

      res.json({ status: 'success' });
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  });

  app.get('/api/market', (req, res) => {
    res.json(marketData);
  });

  // --- Market Data Simulation ---
  setInterval(() => {
    Object.keys(marketData).forEach(asset => {
      const current = marketData[asset].price;
      const change = current * (Math.random() * 0.002 - 0.001); // 0.1% volatility
      marketData[asset] = {
        price: Number((current + change).toFixed(4)),
        last_updated: Date.now()
      };
    });

    // Broadcast prices
    io.emit('prices', marketData);

    // Trigger risk update for all active portfolios (in local memory for demo)
    // In prod, this would only trigger for users with open connections
    riskQueue.add(() => calculateRisk('user_01', io));
  }, 1000);

  // --- Vite Setup ---
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.use('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 FinRisk Engine running on http://localhost:${PORT}`);
  });
}

startServer();
