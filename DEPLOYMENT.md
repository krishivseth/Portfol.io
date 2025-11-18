# Deployment Guide

Quick reference for deploying Portfol.io to Cloudflare.

## Prerequisites

1. Cloudflare account with Workers paid plan (required for Durable Objects)
2. Wrangler CLI installed: `npm install -g wrangler`
3. API keys ready:
   - Finnhub API key
   - AlphaVantage API key
   - Retell API key (optional, for voice interface)

## Step-by-Step Deployment

### 1. Authenticate with Cloudflare

```bash
wrangler login
```

### 2. Set Environment Secrets

```bash
cd workers

# Set secrets (these are encrypted and stored securely)
wrangler secret put FINNHUB_API_KEY
# Enter your Finnhub API key when prompted

wrangler secret put ALPHAVANTAGE_API_KEY
# Enter your AlphaVantage API key when prompted

wrangler secret put RETELL_API_KEY
# Enter your Retell API key when prompted (optional)
```

### 3. Deploy Workers

```bash
cd workers
npm run deploy
```

This will:
- Build the TypeScript code
- Deploy to Cloudflare Workers
- Create Durable Objects (first deployment)
- Bind Workers AI

**Note:** First deployment may take a few minutes as Durable Objects are created.

### 4. Get Your Worker URL

After deployment, you'll see output like:
```
✨  Deployed to https://cf-ai-portfolio.your-subdomain.workers.dev
```

Save this URL - you'll need it for the frontend.

### 5. Deploy Frontend to Cloudflare Pages

**Option A: Via Wrangler**

```bash
cd trevorai-frontend
npm run build
wrangler pages deploy .next --project-name=portfol-io
```

**Option B: Via Git Integration (Recommended)**

1. Push your code to GitHub/GitLab
2. Go to Cloudflare Dashboard → Pages
3. Click "Create a project" → "Connect to Git"
4. Select your repository
5. Configure build settings:
   - **Framework preset:** Next.js
   - **Build command:** `npm run build`
   - **Build output directory:** `.next`
   - **Root directory:** `trevorai-frontend`
6. Add environment variables:
   - `NEXT_PUBLIC_WORKER_URL`: `https://cf-ai-portfolio.your-subdomain.workers.dev`
   - `NEXT_PUBLIC_FINNHUB_API_KEY`: Your Finnhub key
   - `NEXT_PUBLIC_ALPHA_VANTAGE_API_KEY`: Your AlphaVantage key
7. Click "Save and Deploy"

### 6. Update CORS (if needed)

If your frontend is on a different domain, update CORS in `workers/src/index.ts`:

```typescript
function corsHeaders(): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": "https://your-frontend-domain.pages.dev",
    // ... rest of headers
  };
}
```

### 7. Seed Initial Data

After deployment, you may want to seed initial portfolio data. Create a migration endpoint or use the migration script:

```bash
# Example: Create a POST endpoint /api/migrate that accepts JSON data
# Then call it with your user_data.json and user_transaction.json
```

## Post-Deployment Checklist

- [ ] Worker is accessible at the deployed URL
- [ ] Frontend can connect to Worker (check browser console)
- [ ] API endpoints return expected responses
- [ ] Durable Objects are storing data correctly
- [ ] Workers AI is responding (test /api/analyze endpoint)
- [ ] WebSocket connections work (if using voice interface)
- [ ] Environment variables are set correctly

## Monitoring

### View Logs

```bash
# Real-time logs
wrangler tail

# Filter by level
wrangler tail --format=pretty
```

### Cloudflare Dashboard

- **Workers & Pages** → View analytics, logs, and errors
- **Durable Objects** → Monitor storage usage and requests
- **Workers AI** → View AI usage and costs

## Troubleshooting

### Worker returns 500 errors

1. Check logs: `wrangler tail`
2. Verify secrets are set: `wrangler secret list`
3. Check Durable Objects are created (first deployment)

### Frontend can't connect

1. Verify `NEXT_PUBLIC_WORKER_URL` is correct
2. Check CORS headers in Worker
3. Verify Worker is deployed and accessible

### Durable Objects not working

1. Ensure you have Workers paid plan
2. Check migrations are applied
3. Verify bindings in `wrangler.toml`

### Workflows not executing

Note: Cloudflare Workflows are in beta. If not available:
- Workflows will run as regular async functions
- Scheduled workflows can be replaced with Cron Triggers
- See `workers/src/workflows/` for implementation

## Scaling Considerations

- **Durable Objects**: Automatically scale, but monitor storage usage
- **Workers**: Scale automatically, but watch for CPU time limits
- **Workers AI**: Pay-per-use, monitor costs in dashboard
- **Pages**: Unlimited bandwidth, scales automatically

## Cost Estimation

**Free Tier:**
- 100,000 requests/day (Workers)
- 10ms CPU time per request
- Limited Durable Object storage

**Paid Plan ($5/month):**
- 10 million requests/month
- 50ms CPU time per request
- 10GB Durable Object storage
- Workers AI: Pay-per-use (~$0.11 per 1M tokens)

**Estimated Monthly Cost (moderate usage):**
- Workers: $5 (base plan)
- Durable Objects: Included
- Workers AI: $5-20 (depending on usage)
- Pages: Free
- **Total: ~$10-25/month**

## Security Best Practices

1. **Never commit secrets** - Use `wrangler secret put`
2. **Enable CORS restrictions** - Limit to your frontend domain
3. **Add rate limiting** - Prevent abuse (not implemented in this version)
4. **Monitor usage** - Set up alerts in Cloudflare Dashboard
5. **Regular updates** - Keep dependencies updated

## Rollback

If you need to rollback:

```bash
# List deployments
wrangler deployments list

# Rollback to previous version
wrangler rollback
```

## Custom Domain

### For Workers

1. Go to Workers & Pages → Your Worker → Settings → Triggers
2. Add Custom Domain
3. Follow DNS setup instructions

### For Pages

1. Go to Pages → Your Project → Custom Domains
2. Add domain
3. Update DNS records as instructed

---

**Need Help?** Check the main [README.md](./README.md) or Cloudflare documentation.

