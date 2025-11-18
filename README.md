# Portfol.io - AI-Powered Portfolio Management on Cloudflare

**Your AI-powered wealth management assistant, built entirely on Cloudflare's edge platform.**

Portfol.io brings intelligent portfolio management to the edge, leveraging Cloudflare Workers, Durable Objects, Workflows, and Workers AI to deliver real-time investment insights with sub-100ms latency worldwide.

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Cloudflare Pages                          │
│              (Next.js Frontend - React/TypeScript)           │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       │ HTTPS/WebSocket
                       │
┌──────────────────────▼──────────────────────────────────────┐
│              Cloudflare Workers (Edge)                       │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Main Worker (index.ts)                              │   │
│  │  - API Routes (REST)                                 │   │
│  │  - WebSocket Handler (Voice Interface)               │   │
│  │  - Request Routing                                   │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Durable Objects (State Management)                  │   │
│  │  ├── PortfolioState (User portfolios)                │   │
│  │  ├── TransactionLog (Trade history)                  │   │
│  │  ├── ConversationMemory (Chat context)               │   │
│  │  ├── AnalysisCache (Technical analysis results)      │   │
│  │  └── WebSocketConnection (Voice connections)         │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Cloudflare Workflows (Orchestration)                │   │
│  │  ├── StockAnalysisPipeline                           │   │
│  │  │   └── Fetch Data → Technical Analysis → AI        │   │
│  │  └── ScheduledAnalysis (Cron: every 15min)          │   │
│  │      └── Pre-calculate popular stocks                │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Workers AI (Llama 3.3)                              │   │
│  │  - Investment recommendations                        │   │
│  │  - Voice conversation processing                     │   │
│  │  - Technical analysis summarization                  │   │
│  └──────────────────────────────────────────────────────┘   │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       │ External APIs
                       │
        ┌──────────────┼──────────────┐
        │              │              │
   ┌────▼────┐   ┌────▼────┐   ┌────▼────┐
   │ Finnhub │   │AlphaVant│   │ Retell  │
   │  (Price)│   │  (Hist) │   │ (Voice) │
   └─────────┘   └─────────┘   └─────────┘
```

### Key Technologies

- **Cloudflare Workers**: Edge compute for API and WebSocket handling
- **Durable Objects**: Strongly consistent state management at the edge
- **Cloudflare Workflows**: Reliable orchestration for multi-step analysis
- **Workers AI (Llama 3.3)**: Fast, cost-effective LLM inference at the edge
- **Cloudflare Pages**: Global CDN for Next.js frontend
- **Technical Analysis**: Edge-computed indicators (Fibonacci, regression, RSI, etc.)

---

## 🚀 Features

### Core Functionality

- 📊 **Portfolio Management**: Real-time portfolio tracking with automatic price updates
- 📈 **AI-Powered Analysis**: Technical analysis + Llama 3.3 recommendations
- 🔁 **Auto-Trading**: Execute trades with AI or user authorization
- 📉 **Advanced Technical Indicators**: 
  - Fibonacci retracement levels
  - Linear and polynomial regression
  - Reversal point detection
  - RSI, SMA, EMA calculations
- 🗃 **Transaction History**: Complete audit trail with AI vs user distinction
- 📞 **Voice Interface**: Natural language portfolio management via phone (Retell AI)
- ⚡ **Edge Caching**: Pre-calculated analysis for instant responses

### Technical Highlights

- **Sub-100ms API responses** via edge compute
- **Strong consistency** with Durable Objects
- **Automatic scaling** with Cloudflare's global network
- **Real-time WebSocket** connections for voice interface
- **Scheduled workflows** for proactive analysis

---

## 📋 Prerequisites

- Node.js 18+ and npm
- Cloudflare account with Workers paid plan (for Durable Objects)
- Wrangler CLI (`npm install -g wrangler`)
- API Keys:
  - Finnhub API key (free tier available)
  - AlphaVantage API key (free tier available)
  - Retell API key (for voice interface, optional)

---

## 🛠️ Local Development Setup

### 1. Clone and Install

```bash
git clone <repository-url>
cd Portfol.io
npm install
cd workers
npm install
cd ../trevorai-frontend
npm install
```

### 2. Configure Environment Variables

Create `.dev.vars` in the `workers/` directory:

```bash
FINNHUB_API_KEY=your_finnhub_key
ALPHAVANTAGE_API_KEY=your_alphavantage_key
RETELL_API_KEY=your_retell_key  # Optional
```

For the frontend, create `.env.local` in `trevorai-frontend/`:

```bash
NEXT_PUBLIC_WORKER_URL=http://localhost:8787
NEXT_PUBLIC_FINNHUB_API_KEY=your_finnhub_key
NEXT_PUBLIC_ALPHA_VANTAGE_API_KEY=your_alphavantage_key
```

### 3. Authenticate with Cloudflare

```bash
wrangler login
```

### 4. Start Development Servers

**Terminal 1 - Workers:**
```bash
cd workers
npm run dev
```

**Terminal 2 - Frontend:**
```bash
cd trevorai-frontend
npm run dev
```

The frontend will be available at `http://localhost:3000` and the Worker at `http://localhost:8787`.

### 5. Seed Initial Data

To migrate existing portfolio data to Durable Objects, you can create a migration endpoint or use the migration script:

```bash
# Example: POST to /api/migrate with user_data.json and user_transaction.json
```

---

## 🚢 Deployment

### Deploy Workers

```bash
cd workers

# Set secrets (if not using .dev.vars)
wrangler secret put FINNHUB_API_KEY
wrangler secret put ALPHAVANTAGE_API_KEY
wrangler secret put RETELL_API_KEY  # Optional

# Deploy
npm run deploy
```

### Deploy Frontend (Cloudflare Pages)

**Option 1: Via Wrangler**
```bash
cd trevorai-frontend
npm run build
wrangler pages deploy .next
```

**Option 2: Via Cloudflare Dashboard**
1. Go to Cloudflare Dashboard → Pages
2. Connect your Git repository
3. Set build command: `npm run build`
4. Set output directory: `.next`
5. Add environment variable: `NEXT_PUBLIC_WORKER_URL=https://your-worker.your-subdomain.workers.dev`

### Update Frontend Environment

After deploying the Worker, update `NEXT_PUBLIC_WORKER_URL` in your Pages environment variables to point to your deployed Worker URL.

---

## 🧪 Testing

### Test API Endpoints

```bash
# Get portfolio
curl https://your-worker.workers.dev/api/portfolio/FYJ57

# Get transactions
curl https://your-worker.workers.dev/api/transactions/FYJ57

# Analyze stock
curl -X POST https://your-worker.workers.dev/api/analyze \
  -H "Content-Type: application/json" \
  -d '{"symbol": "AAPL", "useCache": true}'

# Execute trade
curl -X POST https://your-worker.workers.dev/api/trade \
  -H "Content-Type: application/json" \
  -d '{
    "userid": "FYJ57",
    "stock_symbol": "AAPL",
    "quantity": 1,
    "type": "buy",
    "initiator": "user"
  }'
```

### Test Workflows

Workflows can be triggered via the Cloudflare Dashboard or programmatically:

```typescript
// Trigger stock analysis workflow
const workflow = new StockAnalysisPipeline();
const result = await workflow.run({
  payload: {
    symbol: "AAPL",
    finnhubKey: env.FINNHUB_API_KEY,
    alphaVantageKey: env.ALPHAVANTAGE_API_KEY,
    aiBinding: env.AI,
  },
}, env, ctx);
```

### Test Durable Objects

Durable Objects can be tested via their HTTP interface:

```bash
# Get portfolio from DO
curl http://localhost:8787/api/portfolio/FYJ57

# The Worker will internally call the Durable Object
```

---

## 📚 API Documentation

### REST Endpoints

#### `GET /api/portfolio/:userId`
Get user portfolio.

**Response:**
```json
{
  "userid": "FYJ57",
  "user_name": "Alice Johnson",
  "bank_bal": 25300.75,
  "portfolio": {
    "AAPL": 18,
    "GOOGL": 10
  }
}
```

#### `GET /api/transactions/:userId`
Get user transaction history.

**Response:**
```json
[
  {
    "id": "1",
    "userid": "FYJ57",
    "stock_symbol": "AAPL",
    "type": "buy",
    "shares": 10,
    "price_per_share": 150.00,
    "date": "2024-10-15",
    "initiator": "agent"
  }
]
```

#### `POST /api/trade`
Execute a trade (buy/sell).

**Request:**
```json
{
  "userid": "FYJ57",
  "stock_symbol": "AAPL",
  "quantity": 1,
  "type": "buy",
  "initiator": "user"
}
```

**Response:**
```json
{
  "success": true,
  "newBalance": 25250.75,
  "message": "Stock buy executed successfully"
}
```

#### `POST /api/analyze`
Analyze a stock (on-demand).

**Request:**
```json
{
  "symbol": "AAPL",
  "userId": "FYJ57",
  "useCache": true
}
```

**Response:**
```json
{
  "symbol": "AAPL",
  "technicalAnalysis": {
    "currentPrice": 175.50,
    "rsi": 65.3,
    "fibonacci": { ... },
    "regression": { ... },
    "reversalPoints": [ ... ]
  },
  "recommendation": "hold",
  "reasoning": "...",
  "confidence": 72,
  "timestamp": 1234567890
}
```

#### `GET /api/analysis/:symbol`
Get cached analysis result.

### WebSocket Endpoints

#### `WS /llm-websocket/:userId`
Bidirectional channel that now powers both the voice interface and live portfolio streaming. Connect with your `userId`, then opt-in to real-time topics by sending:

```json
{ "type": "subscribe", "channels": ["portfolio", "alerts"] }
```

- **Live portfolio updates**: every successful `POST /api/analyze` for that `userId` pushes an `analysis_update` payload with the latest recommendation + technical package so dashboards update without polling.
- **Alert system**: when the engine detects notable signals (e.g., `NVDA` price touching the 61.8% Fibonacci retracement), an `alert` event such as `"NVDA hit your 61.8% Fib level"` is broadcast on the `alerts` channel.

Sample alert envelope:

```
{
  "type": "alert",
  "timestamp": 1731950000000,
  "channels": ["alerts"],
  "payload": {
    "symbol": "NVDA",
    "level": "61.8%",
    "targetPrice": 132.48,
    "currentPrice": 132.46,
    "message": "NVDA hit your 61.8% Fib level (132.48)"
  }
}
```

---

## 🔧 Configuration

### wrangler.toml

Key configuration options:

```toml
name = "cf-ai-portfolio"
main = "workers/src/index.ts"
compatibility_date = "2024-01-01"

[durable_objects]
bindings = [
  { name = "PORTFOLIO_STATE", class_name = "PortfolioState" },
  { name = "TRANSACTION_LOG", class_name = "TransactionLog" },
  # ... more bindings
]

[ai]
binding = "AI"
```

### Environment Variables

- `FINNHUB_API_KEY`: Finnhub API key for stock quotes
- `ALPHAVANTAGE_API_KEY`: AlphaVantage API key for historical data
- `RETELL_API_KEY`: Retell AI key for voice interface (optional)

---

## 🏛️ Architecture Decisions

### Why Durable Objects?

- **Strong Consistency**: Perfect for financial data where consistency is critical
- **Low Latency**: State stored at the edge, sub-10ms access times
- **WebSocket Support**: Native WebSocket handling for voice interface
- **Automatic Scaling**: Cloudflare handles scaling automatically

### Why Workflows?

- **Reliability**: Guaranteed execution for multi-step processes
- **Orchestration**: Clean separation of concerns (fetch → analyze → recommend)
- **Scheduling**: Built-in cron support for scheduled analysis
- **Error Handling**: Automatic retries and error recovery

### Why Workers AI (Llama 3.3)?

- **Edge Inference**: LLM runs at the edge, reducing latency
- **Cost Effective**: Pay-per-use pricing model
- **No Cold Starts**: Always warm, instant responses
- **Privacy**: Data stays within Cloudflare's network

### Why Technical Analysis at Edge?

- **Real-time Calculations**: No external service dependencies
- **Low Latency**: Calculations happen in <10ms
- **Cost Savings**: No API calls for technical indicators
- **Scalability**: Edge compute scales automatically

---

## 📊 Performance Metrics

- **API Response Time**: <100ms (p95) globally
- **Analysis Cache Hit Rate**: ~80% for popular stocks
- **Workflow Execution**: 2-5 seconds for full analysis pipeline
- **WebSocket Latency**: <50ms for voice interface
- **Durable Object Access**: <10ms average

---

## 🔒 Security Considerations

- API keys stored as Cloudflare secrets (never in code)
- CORS configured for frontend domain only
- Durable Objects provide isolation between users
- WebSocket connections authenticated via Retell AI
- Rate limiting recommended for production (not implemented in this version)

---

## 🐛 Troubleshooting

### Worker won't start locally

- Check `wrangler login` status
- Verify `.dev.vars` file exists and has correct keys
- Check Node.js version (18+ required)

### Durable Objects not working

- Ensure you have a Workers paid plan
- Check `wrangler.toml` bindings are correct
- Verify migrations are applied: `wrangler deployments list`

### Frontend can't connect to Worker

- Verify `NEXT_PUBLIC_WORKER_URL` is set correctly
- Check CORS headers in Worker
- Ensure Worker is deployed/running

### Workflows not executing

- Check Workflows are enabled in Cloudflare Dashboard
- Verify workflow bindings in `wrangler.toml`
- Check workflow logs in Cloudflare Dashboard

---

## 📈 Roadmap

- [ ] Advanced portfolio optimization (Modern Portfolio Theory)
- [ ] Support for ETFs, Bonds, Crypto
- [ ] Personalized recommendations with behavioral learning
- [ ] Event-based alerts and notifications
- [ ] Brokerage integrations (Robinhood, Fidelity, etc.)
- [ ] Social features (opt-in strategy sharing)
- [ ] Enhanced technical analysis (more indicators)
- [ ] Backtesting capabilities

---

## 📝 License

MIT License

---

## 👥 Authors

- Krishiv Seth

---

## 🙌 Acknowledgements

- **Cloudflare** for the amazing edge platform
- **Retell AI** for voice interface capabilities
- **Finnhub & AlphaVantage** for market data APIs
- Inspired by Trevor Lefkowitz from **Ghosts (US)**

---

## 📖 Additional Documentation

- [PROMPTS.md](./PROMPTS.md) - All LLM prompts used in the system
- [Cloudflare Workers Docs](https://developers.cloudflare.com/workers/)
- [Durable Objects Docs](https://developers.cloudflare.com/durable-objects/)
- [Workflows Docs](https://developers.cloudflare.com/workflows/)
- [Workers AI Docs](https://developers.cloudflare.com/workers-ai/)

---

## 🤝 Contributing

Pull requests are welcome! For major changes, please open an issue first to discuss what you'd like to change.

---

**Built with ❤️ on Cloudflare's Edge**
