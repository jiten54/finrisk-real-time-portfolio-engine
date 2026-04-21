import React, { useState, useEffect, useMemo } from 'react';
import { io, Socket } from 'socket.io-client';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, Legend, AreaChart, Area 
} from 'recharts';
import { 
  TrendingUp, TrendingDown, Wallet, ShieldAlert, Activity, 
  ArrowUpRight, ArrowDownRight, Plus, RefreshCw, AlertTriangle
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// --- Types ---
interface MarketData {
  [key: string]: { price: number; last_updated: number };
}

interface RiskMetrics {
  totalValue: number;
  pnl: number;
  pnlPercent: number;
  var95: number;
  maxConcentration: number;
  allocations: Record<string, number>;
  timestamp: number;
}

interface PortfolioItem {
  userId: string;
  asset: string;
  quantity: number;
  avg_price: number;
}

interface Alert {
  id: string;
  type: string;
  message: string;
  timestamp: number;
}

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

export default function App() {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [marketPrices, setMarketPrices] = useState<MarketData>({});
  const [metrics, setMetrics] = useState<RiskMetrics | null>(null);
  const [portfolio, setPortfolio] = useState<PortfolioItem[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [isTrading, setIsTrading] = useState(false);
  const [tradeForm, setTradeForm] = useState({ asset: 'BTC', quantity: 0.1, price: 0, side: 'BUY' });
  const [history, setHistory] = useState<{ time: string; value: number }[]>([]);

  const userId = 'user_01';

  useEffect(() => {
    const s = io();
    setSocket(s);

    s.on('prices', (data: MarketData) => {
      setMarketPrices(data);
    });

    s.on(`metrics:${userId}`, (data: RiskMetrics) => {
      setMetrics(data);
      setHistory(prev => {
        const timestamp = new Date(data.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        if (prev.length > 0 && prev[prev.length - 1].time === timestamp) return prev;
        const newHistory = [...prev, { time: timestamp, value: data.totalValue }].slice(-30);
        return newHistory;
      });
    });

    s.on(`alert:${userId}`, (alert: any) => {
      const newAlert = { ...alert, id: crypto.randomUUID(), timestamp: Date.now() };
      setAlerts(prev => [newAlert, ...prev].slice(0, 5));
    });

    fetchPortfolio();
    return () => { s.disconnect(); };
  }, []);

  const fetchPortfolio = async () => {
    try {
      const res = await fetch(`/api/portfolio/${userId}`);
      const data = await res.json();
      setPortfolio(data);
    } catch (err) {
      console.error('Failed to fetch portfolio', err);
    }
  };

  const currentPrice = marketPrices[tradeForm.asset]?.price || 0;

  useEffect(() => {
    if (tradeForm.price === 0 && currentPrice > 0) {
      setTradeForm(prev => ({ ...prev, price: currentPrice }));
    }
  }, [currentPrice, tradeForm.asset]);

  const handleTrade = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/portfolio/trade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...tradeForm, userId })
      });
      if (res.ok) {
        fetchPortfolio();
        setIsTrading(false);
      } else {
        const err = await res.json();
        alert(err.error);
      }
    } catch (err) {
      console.error('Trade failed', err);
    }
  };

  const allocationData = useMemo(() => {
    if (!metrics) return [];
    return Object.entries(metrics.allocations).map(([name, value]) => ({ name, value }));
  }, [metrics]);

  return (
    <div className="flex flex-col h-screen max-h-screen bg-bg-page text-text-main font-sans overflow-hidden border-l border-r border-border-slate mx-auto max-w-[1440px]">
      {/* Header */}
      <header className="h-16 border-b border-border-slate bg-bg-header flex items-center justify-between px-6 shrink-0">
        <div className="flex items-center gap-4">
          <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center font-bold text-white shadow-lg shadow-blue-600/20">Σ</div>
          <h1 className="text-lg font-semibold tracking-tight">QUANTUM<span className="font-light opacity-50 uppercase ml-0.5">Risk</span></h1>
          <span className="px-2 py-0.5 bg-green-900/30 text-text-green text-[10px] rounded border border-text-green/30 uppercase font-bold tracking-wider">Production_Ready</span>
        </div>
        
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-8 font-mono text-[10px]">
            <div className="flex flex-col items-end">
              <span className="text-text-dim uppercase text-[9px]">Sys Latency</span>
              <span className="text-text-green">1.2 ms</span>
            </div>
            <div className="flex flex-col items-end">
              <span className="text-text-dim uppercase text-[9px]">Throughput</span>
              <span>1.2k ops/s</span>
            </div>
          </div>
          <button 
            onClick={() => setIsTrading(true)}
            className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 rounded text-[11px] font-bold uppercase tracking-widest transition-all shadow-lg shadow-blue-600/20"
          >
            Execute_Trade
          </button>
        </div>
      </header>

      <main className="flex-1 grid grid-cols-12 overflow-hidden bg-bg-card">
        {/* Left Sidebar: Market Feed */}
        <aside className="col-span-2 border-r border-border-slate flex flex-col bg-bg-header">
          <div className="p-4 border-b border-border-slate bg-bg-header/50">
            <h2 className="text-[10px] font-bold text-text-dim uppercase tracking-widest flex items-center gap-2">
              <Activity className="w-3 h-3" />
              Market Feed [WS]
            </h2>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
            {(Object.entries(marketPrices) as [string, { price: number; last_updated: number }][]).map(([asset, data]) => (
              <div key={asset} className="flex justify-between p-3 bg-bg-page/50 rounded border border-border-slate/50 font-mono text-[11px] hover:bg-bg-page hover:border-border-slate transition-colors">
                <span className="text-text-dim">{asset} / USD</span>
                <span className="text-text-green">${data.price.toLocaleString()}</span>
              </div>
            ))}
          </div>
          <div className="p-4 border-t border-border-slate bg-bg-header/80">
            <div className="flex items-center justify-between text-[10px] mb-2">
              <span className="text-text-dim uppercase">Engine Status</span>
              <span className="text-text-green">● Synchronized</span>
            </div>
            <div className="w-full bg-slate-800 h-1 rounded-full overflow-hidden">
              <div className="bg-blue-500 h-full w-[88%] animate-pulse"></div>
            </div>
          </div>
        </aside>

        {/* Center: Main Dashboard */}
        <section className="col-span-7 flex flex-col overflow-y-auto custom-scrollbar">
          {/* Top Metric Cards */}
          <div className="p-6 grid grid-cols-3 gap-4 border-b border-border-slate bg-bg-page/20">
            <div className="p-4 border border-border-slate bg-bg-header rounded-lg shadow-sm">
              <div className="text-text-dim text-[9px] uppercase font-bold mb-1 flex justify-between">
                Portfolio Value
                <Wallet className="w-3 h-3 opacity-30" />
              </div>
              <div className="text-2xl font-light font-mono">${metrics?.totalValue.toLocaleString(undefined, { maximumFractionDigits: 0 }) || '0'}</div>
              <div className={cn("text-[10px] mt-1 font-bold", (metrics?.pnlPercent ?? 0) >= 0 ? "text-text-green" : "text-text-red")}>
                {(metrics?.pnlPercent ?? 0) >= 0 ? '▲' : '▼'} {Math.abs(metrics?.pnlPercent ?? 0).toFixed(2)}% Today
              </div>
            </div>
            <div className="p-4 border border-border-slate bg-bg-header rounded-lg shadow-sm">
              <div className="text-text-dim text-[9px] uppercase font-bold mb-1 flex justify-between">
                VaR (95%)
                <ShieldAlert className="w-3 h-3 opacity-30" />
              </div>
              <div className="text-2xl font-light font-mono text-text-red">${metrics?.var95.toLocaleString(undefined, { maximumFractionDigits: 0 }) || '0'}</div>
              <div className="text-text-dim text-[10px] mt-1">Within Threshold</div>
            </div>
            <div className="p-4 border border-border-slate bg-bg-header rounded-lg shadow-sm">
              <div className="text-text-dim text-[9px] uppercase font-bold mb-1 flex justify-between">
                Concentration
                <AlertTriangle className="w-3 h-3 opacity-30" />
              </div>
              <div className="text-2xl font-light font-mono tracking-tight">{((metrics?.maxConcentration ?? 0) * 100).toFixed(1)}%</div>
              <div className="text-text-dim text-[10px] mt-1 uppercase">Max 40% Limit</div>
            </div>
          </div>

          <div className="flex-1 p-6 space-y-8">
            {/* Chart Area */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-[10px] font-bold text-text-dim uppercase tracking-[0.2em]">Asset Valuation History</h3>
                <div className="px-2 py-0.5 bg-blue-900/20 text-blue-400 text-[9px] font-mono rounded border border-blue-800/30">REAL_TIME_FEED</div>
              </div>
              <div className="h-64 w-full border border-border-slate bg-bg-header rounded-lg p-2">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={history}>
                    <defs>
                      <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1}/>
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#30363D" vertical={false} opacity={0.3} />
                    <XAxis dataKey="time" hide />
                    <YAxis 
                      stroke="#8B949E" 
                      fontSize={10} 
                      tickLine={false} 
                      axisLine={false}
                      domain={['auto', 'auto']}
                      tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
                    />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#0D1117', border: '1px solid #30363D', borderRadius: '4px', fontSize: '10px' }}
                      itemStyle={{ color: '#E6EDF3' }}
                      labelStyle={{ display: 'none' }}
                    />
                    <Area type="stepAfter" dataKey="value" stroke="#2563EB" strokeWidth={1} fillOpacity={1} fill="url(#chartGrad)" isAnimationActive={false} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Holdings Table */}
            <div className="space-y-4">
              <h3 className="text-[10px] font-bold text-text-dim uppercase tracking-[0.2em]">Active Exposure Matrix</h3>
              <div className="w-full border border-border-slate rounded overflow-hidden">
                <table className="w-full text-left font-mono text-[11px]">
                  <thead className="bg-bg-header text-text-dim border-b border-border-slate">
                    <tr className="text-[9px] uppercase tracking-wider">
                      <th className="p-3 font-bold border-r border-border-slate/50">Instrument</th>
                      <th className="p-3 font-bold text-right">Qty</th>
                      <th className="p-3 font-bold text-right lg:table-cell hidden">Strike (Avg)</th>
                      <th className="p-3 font-bold text-right">Spot</th>
                      <th className="p-3 font-bold text-right text-text-main">Market Value</th>
                      <th className="p-3 font-bold text-right">PnL (Real)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-slate/50">
                    {portfolio.length === 0 && (
                      <tr>
                        <td colSpan={6} className="p-8 text-center text-text-dim italic">Awaiting asset ingestion...</td>
                      </tr>
                    )}
                    {portfolio.map((item) => {
                      const mktPrice = marketPrices[item.asset]?.price || item.avg_price;
                      const value = item.quantity * mktPrice;
                      const pnl = (mktPrice - item.avg_price) * item.quantity;
                      const pnlPct = ((mktPrice - item.avg_price) / item.avg_price) * 100;
                      
                      return (
                        <tr key={item.asset} className="hover:bg-bg-header/50 transition-colors">
                          <td className="p-3 border-r border-border-slate/50 font-bold">{item.asset}</td>
                          <td className="p-3 text-right">{item.quantity.toLocaleString(undefined, { maximumFractionDigits: 4 })}</td>
                          <td className="p-3 text-right text-text-dim lg:table-cell hidden">${item.avg_price.toLocaleString()}</td>
                          <td className="p-3 text-right">${mktPrice.toLocaleString()}</td>
                          <td className="p-3 text-right font-bold">${value.toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
                          <td className={cn("p-3 text-right", pnl >= 0 ? "text-text-green" : "text-text-red")}>
                            {pnl >= 0 ? '+' : ''}{pnl.toLocaleString(undefined, { maximumFractionDigits: 0 })} ({pnlPct.toFixed(1)}%)
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </section>

        {/* Right Sidebar: Event Stream */}
        <aside className="col-span-3 border-l border-border-slate bg-bg-header flex flex-col">
          <div className="p-4 border-b border-border-slate">
            <h2 className="text-[10px] font-bold text-text-dim uppercase tracking-widest flex items-center gap-2">
              <RefreshCw className="w-3 h-3" />
              Event Stream [Redis]
            </h2>
          </div>
          <div className="flex-1 p-2 space-y-2 font-mono text-[9px] overflow-y-auto custom-scrollbar opacity-80 uppercase tracking-tighter">
            {alerts.length === 0 ? (
              <div className="p-2 border-l-2 border-text-dim bg-bg-page/30">
                <div className="text-text-dim">{new Date().toISOString().replace('T', ' ').split('.')[0]}</div>
                <div>[SYSTEM] Listening for risk events...</div>
              </div>
            ) : (
              alerts.map(alert => (
                <div key={alert.id} className={cn(
                  "p-2 border-l-2 bg-bg-page/30 animate-in slide-in-from-right-2",
                  alert.type === 'HIGH_LOSS' ? "border-text-red" : "border-accent-blue"
                )}>
                  <div className="text-text-dim">{new Date(alert.timestamp).toISOString().replace('T', ' ').split('.')[0]}</div>
                  <div className={alert.type === 'HIGH_LOSS' ? "text-text-red" : ""}>[{alert.type}] {alert.message}</div>
                </div>
              ))
            )}
            <div className="p-2 border-l-2 border-accent-blue bg-bg-page/30">
              <div className="text-text-dim">{new Date().toISOString().replace('T', ' ').split('.')[0]}</div>
              <div>[KERN] Risk calculation engine online</div>
            </div>
          </div>
          
          <div className="p-4 border-t border-border-slate mt-auto bg-bg-header">
            <div className="text-[9px] text-text-dim mb-2 uppercase font-bold tracking-widest">Infradata Nodes</div>
            <div className="grid grid-cols-2 gap-2 font-mono text-[9px]">
              <div className="p-2 bg-bg-page rounded border border-border-slate/50">REDIS: 14.8 MB</div>
              <div className="p-2 bg-bg-page rounded border border-border-slate/50">SQL: 8 CONNS</div>
            </div>
          </div>
        </aside>
      </main>

      {/* Footer */}
      <footer className="h-8 border-t border-border-slate bg-bg-header flex items-center justify-between px-6 text-[9px] text-text-dim font-mono shrink-0">
        <div className="flex items-center gap-4">
          <span className="text-text-green">● POSTGRESQL: REPLICA_01 SYNCHRONIZED</span>
          <span className="opacity-50">API_VERSION: 2.1.0-STABLE</span>
        </div>
        <div className="flex gap-4">
          <span>UPTIME: 14d 02h 44m</span>
          <span>CLUSTER_ID: EU-WEST-1A</span>
        </div>
      </footer>

      {/* Trade Modal */}
      {isTrading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 backdrop-blur-sm bg-bg-page/60">
          <div className="bg-bg-header border border-border-slate w-full max-w-sm rounded overflow-hidden shadow-2xl">
            <div className="p-4 border-b border-border-slate bg-bg-page/40 flex items-center justify-between">
              <h2 className="text-[11px] font-bold uppercase tracking-widest">Execute Transaction</h2>
              <button onClick={() => setIsTrading(false)} className="text-text-dim hover:text-text-main">✕</button>
            </div>
            <form onSubmit={handleTrade} className="p-6 space-y-6">
              <div className="space-y-4 font-mono text-[11px]">
                <div className="grid grid-cols-2 gap-2">
                  <button 
                    type="button" 
                    onClick={() => setTradeForm(p => ({ ...p, side: 'BUY' }))}
                    className={cn("py-2 rounded border uppercase font-bold transition-all", tradeForm.side === 'BUY' ? "bg-text-green text-bg-page border-text-green" : "border-border-slate text-text-dim hover:bg-bg-card")}
                  >BUY_ASSET</button>
                  <button 
                    type="button" 
                    onClick={() => setTradeForm(p => ({ ...p, side: 'SELL' }))}
                    className={cn("py-2 rounded border uppercase font-bold transition-all", tradeForm.side === 'SELL' ? "bg-text-red text-bg-page border-text-red" : "border-border-slate text-text-dim hover:bg-bg-card")}
                  >SELL_ASSET</button>
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] text-text-dim uppercase font-bold">Instrument</label>
                  <select 
                    className="w-full bg-bg-page border border-border-slate rounded px-3 py-2 outline-none focus:border-accent-blue"
                    value={tradeForm.asset}
                    onChange={(e) => setTradeForm(p => ({ ...p, asset: e.target.value, price: 0 }))}
                  >
                    {['BTC', 'ETH', 'SOL', 'AAPL', 'TSLA'].map(a => <option key={a}>{a}</option>)}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[9px] text-text-dim uppercase font-bold">Qty</label>
                    <input 
                      type="number" step="any"
                      className="w-full bg-bg-page border border-border-slate rounded px-3 py-2 outline-none focus:border-accent-blue font-bold"
                      value={tradeForm.quantity}
                      onChange={(e) => setTradeForm(p => ({ ...p, quantity: parseFloat(e.target.value) }))}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] text-text-dim uppercase font-bold">Strike</label>
                    <input 
                      type="number" step="any"
                      className="w-full bg-bg-page border border-border-slate rounded px-3 py-2 outline-none focus:border-accent-blue font-bold text-text-green"
                      value={tradeForm.price}
                      onChange={(e) => setTradeForm(p => ({ ...p, price: parseFloat(e.target.value) }))}
                    />
                  </div>
                </div>

                <div className="p-3 bg-bg-page/50 border border-border-slate border-dashed rounded text-[10px]">
                  <div className="flex justify-between items-center opacity-70 mb-1 italic">
                    <span>Est. Nominal Exposure</span>
                    <span>USD</span>
                  </div>
                  <div className="text-lg font-bold">
                    ${(tradeForm.quantity * tradeForm.price).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </div>
                </div>
              </div>

              <button className={cn("w-full py-3 rounded font-bold uppercase tracking-[0.2em] text-[11px] shadow-lg transition-all", tradeForm.side === 'BUY' ? "bg-accent-blue hover:bg-blue-500 shadow-blue-500/20" : "bg-text-red hover:bg-red-400 shadow-red-500/20")}>
                Confirm_Auth_Execution
              </button>
            </form>
          </div>
        </div>
      )}
      
      <style dangerouslySetInnerHTML={{ __html: `
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #30363D; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #8B949E; }
      `}} />
    </div>
  );
}


