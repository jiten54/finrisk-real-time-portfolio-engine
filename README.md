# ⚡ FinRisk Engine — Real-Time Portfolio & Risk Analytics Platform
<img width="1913" height="857" alt="Screenshot 2026-04-21 093212" src="https://github.com/user-attachments/assets/054bdc1b-5ed0-4696-b890-51bb8a7598c0" />
<img width="1898" height="866" alt="Screenshot 2026-04-21 093250" src="https://github.com/user-attachments/assets/0c701e8e-c959-4151-9321-c7add72cfd6a" />
<img width="1920" height="864" alt="Screenshot 2026-04-21 093329" src="https://github.com/user-attachments/assets/5c2687f5-e678-49b2-8346-dffe25b877bb" />
<img width="1920" height="854" alt="Screenshot 2026-04-21 093433" src="https://github.com/user-attachments/assets/eecea69e-cfca-454a-93e8-f8fa45e5437c" />

<p align="center">
  <img src="https://capsule-render.vercel.app/api?type=waving&color=0f1115&height=200&section=header&text=FinRisk%20Engine&fontSize=42&fontColor=38bdf8&animation=fadeIn"/>
</p>

<p align="center">
  <b>Production-grade fintech system for real-time portfolio tracking, risk analytics, and event-driven financial computation.</b>
</p>

---

## 🧠 What is FinRisk Engine?

FinRisk Engine is a **low-latency, event-driven financial system** designed to:

* Track multi-asset portfolios in real-time
* Process high-frequency market data streams
* Compute advanced risk metrics (PnL, VaR, concentration risk)
* Deliver live insights via WebSockets

👉 Built to simulate how **modern fintech / trading platforms** operate internally.

---

## 🏗️ System Architecture (Interactive View)

<p align="center">
  <img src="https://skillicons.dev/icons?i=nodejs,ts,react,redis,postgres,docker" />
</p>

```id="arch001"
          ┌────────────────────┐
          │   Client (React)   │
          │  Live Dashboard    │
          └────────┬───────────┘
                   │ WebSocket Stream
                   ▼
          ┌────────────────────┐
          │   API Gateway      │
          │  (Express Server)  │
          └────────┬───────────┘
                   │
        ┌──────────▼──────────┐
        │   Redis Queue       │
        │ (Async Processing)  │
        └──────────┬──────────┘
                   │
                   ▼
          ┌────────────────────┐
          │   Risk Worker      │
          │ (Computation Core) │
          └────────┬───────────┘
                   │
        ┌──────────▼──────────┐
        │   Redis Cache       │
        │ (Fast State Access) │
        └──────────┬──────────┘
                   │
                   ▼
          ┌────────────────────┐
          │ PostgreSQL DB      │
          │ (Transactions)     │
          └────────────────────┘
```

---

## ⚙️ Core Features

### 📡 Real-Time Market Ingestion

* WebSocket-based price streaming
* High-frequency updates (simulated or live feeds)
* Data normalization + caching

---

### 💼 Portfolio Management

* Multi-asset tracking (crypto + equities)
* BUY / SELL trade execution
* Average price + holdings calculation

---

### 📊 Risk Analytics Engine

#### 🔹 PnL (Profit & Loss)

* Real-time unrealized gain/loss
* Portfolio-level aggregation

#### 🔹 Value at Risk (VaR)

* 95% confidence interval
* Rolling window risk estimation

#### 🔹 Concentration Risk

* Detect overexposure to single assets
* Portfolio diversification monitoring

---

### 🚨 Risk Alerts

* Triggered on:

  * Excessive loss
  * High volatility
  * Asset concentration

---

### ⚡ Event-Driven Processing

* Async queue (Redis/BullMQ)
* Worker-based computation
* Non-blocking API responses (202 Accepted)

---

### 🔁 Real-Time Streaming

* WebSocket push updates
* Live:

  * Portfolio value
  * Risk metrics
  * Alerts

---

## 🛠️ Tech Stack

| Layer      | Technology                       |
| ---------- | -------------------------------- |
| Backend    | Node.js, Express, TypeScript     |
| Frontend   | React 19, Tailwind CSS, Recharts |
| Queue      | Redis (BullMQ)                   |
| Database   | PostgreSQL                       |
| Realtime   | WebSockets (Socket.io)           |
| Precision  | Decimal.js                       |
| Deployment | Docker                           |

---

## 📡 API Endpoints

### 🔹 Add Asset

```bash id="api01"
POST /portfolio/add
```

### 🔹 Execute Trade

```bash id="api02"
POST /portfolio/trade
```

### 🔹 Get Portfolio

```bash id="api03"
GET /portfolio/:userId
```

### 🔹 Get Risk Metrics

```bash id="api04"
GET /risk/:userId
```

---

## 📊 Live Dashboard Features

* 📈 Portfolio Value Stream
* 📊 Risk Allocation Pie Chart
* ⚠️ Real-Time Alerts Feed
* 📡 Market Price Ticker
* 📉 Historical Performance

---

## 🧪 Example Trade Request

```json id="ex01"
{
  "userId": "U101",
  "asset": "BTC",
  "type": "BUY",
  "quantity": 0.5,
  "price": 65000
}
```

---

## 🐳 Run Locally (Docker)

```bash id="run01"
docker-compose up --build
```

---

## ⚡ Performance Highlights

* ⚡ Sub-200ms risk computation
* 🔄 Real-time streaming architecture
* 📦 Async event-driven processing
* 📊 High-frequency data handling

---

## 🧠 Engineering Highlights

* Event-driven system design
* Financial correctness with atomic DB transactions
* Precision-safe calculations using Decimal.js
* Modular, scalable backend architecture

---

## 🎯 Why This Project Matters

This project demonstrates:

* Real-world **fintech backend architecture**
* Ability to handle **real-time systems**
* Understanding of **financial risk modeling**
* Strong **system design and scalability thinking**

---

## 👨‍💻 Author

**Jiten Moni Das**
🔗 LinkedIn: https://www.linkedin.com/in/jiten-moni-das-01b3a032b
💻 GitHub: https://github.com/jiten54

---

<p align="center">
  <img src="https://capsule-render.vercel.app/api?type=waving&color=0f1115&height=120&section=footer"/>
</p>
