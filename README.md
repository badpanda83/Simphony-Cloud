# Simphony-Cloud

Integration service for [Oracle Simphony Transaction Services Gen2](https://docs.oracle.com/en/industries/food-beverage/simphony/omsstsg2api/index.html) — read APIs, open checks, order items, pay checks, and receive webhooks.

Repository: https://github.com/badpanda83/Simphony-Cloud

Designed for deployment on [Railway](https://railway.com) (GitHub-connected) with [Postman](postman/) for API testing. Webhook events can be mirrored to [webhook.site](https://webhook.site/283f6329-4f7a-4a97-bb56-5b1b065d4bef) during development.

## Features

- **Read APIs**: Organizations, configuration (menus, tenders, taxes, …), checks, employees
- **Write APIs**: Open check, add items (round), pay (tenders), calculator
- **Auth**: OIDC PKCE flow + token refresh (or env tokens)
- **Webhooks**: `POST /webhooks/simphony` — HMAC verification + optional forward
- **Notifications**: `POST /workflows/notifications/setup` registers HMAC + subscriptions
- **Generic read proxy**: `GET /proxy/api/v1/...`

## Quick start

```bash
cp .env.example .env
# Edit .env with Simphony host, credentials, location refs

npm install
npm run dev
```

Health: `GET http://localhost:3000/health`

### Environment variables

See [.env.example](.env.example). Required for live Simphony calls:

| Variable | Purpose |
|----------|---------|
| `SIMPHONY_HOST` | Your STS Gen2 base URL |
| `SIMPHONY_CLIENT_ID` | API account client ID |
| `SIMPHONY_ORG_SHORT_NAME`, `SIMPHONY_LOC_REF`, `SIMPHONY_RVC_REF` | Default location context |
| `WEBHOOK_FORWARD_URL` | Dev mirror (default: your webhook.site URL) |
| `PUBLIC_BASE_URL` | Railway URL for notification callbacks |

### Authentication

**Fastest (Postman):** set `SIMPHONY_ID_TOKEN` and `SIMPHONY_REFRESH_TOKEN`, or call `POST /auth/login` after setting username/password in `.env`.

**Manual PKCE:** `GET /auth/authorize` → `POST /auth/signin` → `POST /auth/token`

### Check workflow

1. `GET /api/v1/tenders/collection`
2. `POST /workflows/checks/open`
3. `POST /workflows/checks/{checkRef}/items`
4. `POST /workflows/checks/{checkRef}/pay`

Use headers `Simphony-OrgShortName`, `Simphony-LocRef`, `Simphony-RvcRef` or include `orgShortName`, `locRef`, `rvcRef` in the JSON body.

### Webhooks

**Dev (webhook.site only):**

```http
POST /workflows/notifications/setup
Content-Type: application/json

{
  "orgShortName": "yourorg",
  "locRef": "yourloc",
  "rvcRef": "1",
  "callbackUri": "https://webhook.site/283f6329-4f7a-4a97-bb56-5b1b065d4bef"
}
```

**Production (Railway):** set `PUBLIC_BASE_URL`, deploy, then run the same setup without `callbackUri` (uses `{PUBLIC_BASE_URL}/webhooks/simphony`). Keep `WEBHOOK_FORWARD_URL` to mirror to webhook.site while testing.

## Setup wizard (GitHub Pages)

A credential form on GitHub Pages calls your Railway API to authenticate and validate Simphony connectivity.

### Enable GitHub Pages

1. Repo **Settings → Pages**
2. **Build and deployment** → Source: **Deploy from a branch**
3. Branch: `main`, folder: **`/docs`**
4. Save — site URL: `https://badpanda83.github.io/Simphony-Cloud/`

### Run validation

1. Deploy this service to Railway and copy the public URL.
2. Open the GitHub Pages site (or `http://localhost:3000/setup` locally).
3. Enter **Integration API URL** = your Railway URL.
4. Fill in Simphony host, API account, and location (`orgShortName`, `locRef`, `rvcRef`).
5. Click **Run validation**.

The API runs `POST /workflows/setup/validate`, which:

| Step | Simphony source |
|------|-----------------|
| Authentication | OIDC PKCE → `id_token` |
| Revenue centers | `GET .../revenueCenters` |
| Tables | `GET .../revenueCenters/{rvcRef}` → `tables[]` |
| Categories | `GET /api/v2/menus/{menuId}` → `familyGroups[]` |
| **Tickets** | `GET /api/v1/checks?sinceTime=7d&includeClosed=true` — **must find ≥1 check in last 7 days** |

Overall pass requires all data steps plus the tickets rule.

## Railway deploy

1. Push this repo to `badpanda83/Simphony-Cloud`
2. Railway → New Project → Deploy from GitHub → select this repo
3. Add environment variables from `.env.example`
4. Generate a public domain; set `PUBLIC_BASE_URL` to that URL and redeploy

Uses `Dockerfile` and `railway.json` (health check: `/health`).

## Postman

Import:

- `postman/Simphony-Integration.postman_collection.json`
- `postman/Simphony-Integration.postman_environment.json`

Set `baseUrl` to `http://localhost:3000` or your Railway URL.

## API reference

[Oracle STS Gen2 REST endpoints](https://docs.oracle.com/en/industries/food-beverage/simphony/omsstsg2api/rest-endpoints.html)
