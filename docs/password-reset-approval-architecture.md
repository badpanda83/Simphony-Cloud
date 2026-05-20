# Password-reset approval architecture (email first, Slack later)

This document defines a safe-by-default architecture for handling Oracle/Simphony password-reset emails with explicit operator approval before any reset execution or token flow.

## Goals

- Support a dedicated Gmail inbox as the first inbound channel.
- Require human approval before reset execution.
- Start with email approvals and keep Slack as a pluggable second approval channel.
- Preserve existing Simphony functionality.
- Keep destructive reset execution disabled by default.

## High-level flow

1. Oracle reset email arrives in dedicated Gmail inbox.
2. Inbound provider converts the message into a normalized `InboundResetMessage`.
3. Orchestrator creates a `pending` reset approval request and audit record.
4. Email approval provider sends approve/deny links with signed short-lived tokens.
5. Operator clicks approve or deny link.
6. Approval endpoint verifies token signature, expiry, and single-use state.
7. On approve:
   - request transitions to `approved`
   - guarded execution pipeline is invoked
   - scaffolding marks execution completed with `execution_disabled_scaffold_only` while destructive execution is disabled
8. On deny: request transitions to `denied`.
9. Status endpoint exposes sanitized request/audit state.

## Components in repository

- `src/reset-automation/types.ts`
  - Shared contracts for inbound providers, approval providers, execution pipeline, and request state.
- `src/reset-automation/approval-token.ts`
  - HMAC-SHA256 signed approval tokens with action scoping (`approve`/`deny`) and TTL.
- `src/reset-automation/store.ts`
  - In-memory request store for pending/approved/denied/completed/failed state, duplicate suppression, and single-use token replay protection.
- `src/reset-automation/providers.ts`
  - `EmailApprovalProvider` scaffold (logs delivery details).
  - `SlackApprovalProvider` scaffold (future channel adapter).
  - `GmailInboundResetProvider` scaffold for mailbox runtime model.
  - `GuardedResetExecutionPipeline` to ensure reset execution is disabled unless explicitly enabled.
- `src/reset-automation/orchestrator.ts`
  - Orchestration logic for inbound handling, approval request fan-out, decision resolution, and execution invocation.
- `src/routes/password-reset-approval.ts`
  - Workflow endpoints for inbound messages and approval actions.

## Endpoint scaffolding

- `POST /workflows/password-reset/inbound`
  - Ingests normalized inbound messages.
  - Accepts `externalMessageId`, `sender`, `subject`, optional `resetLink`, optional `receivedAt`.
  - Rejects unsupported sources (email-first scaffolding supports Gmail source).
- `GET /workflows/password-reset/approve?token=...`
- `GET /workflows/password-reset/deny?token=...`
- `GET /workflows/password-reset/status/:requestId`

All endpoints are guarded by:

- existing API-key middleware (same as other protected routes)
- `PASSWORD_RESET_APPROVAL_ENABLED=true`

## Gmail inbound model (email first)

Recommended first production path:

- Dedicated Gmail account only for Oracle reset messages.
- Gmail API poller or push-notification worker running as a background process.
- Normalize each reset email into `InboundResetMessage` and call inbound endpoint.

Mailbox hardening:

- Do not reuse for personal traffic.
- Enable MFA on mailbox owner.
- Restrict forwarding/delegation.
- Keep API credentials for Gmail access in secret storage.

## Slack extensibility model (later)

Approval transport is abstracted by `ApprovalProvider`.

- Email currently implemented as first channel.
- Slack remains a channel adapter (`SlackApprovalProvider`) without changing orchestrator logic.
- Future Slack implementation can post interactive button approvals that call the same approve/deny endpoints.

## Token/link design

Approval links contain signed tokens with:

- request subject (`sub`)
- unique token id (`jti`) for one-time use
- action binding (`approve` or `deny`)
- expiration (`exp`)

Security controls:

- HMAC signature validation
- action mismatch rejection
- token expiry enforcement
- replay rejection via consumed `jti` tracking

Operational recommendation:

- set `PASSWORD_RESET_APPROVAL_TOKEN_SECRET` in production so tokens survive process restart
- keep `PASSWORD_RESET_APPROVAL_TOKEN_TTL_SECONDS` short (default 15 minutes)

## Reset execution and auth/token pipeline structure

The reset/auth sequence is intentionally scaffolded, not fully automated yet:

1. `approve` decision received.
2. `GuardedResetExecutionPipeline.executeApprovedReset()` invoked.
3. With default config (`PASSWORD_RESET_EXECUTION_ENABLED=false`), execution is skipped safely.
4. Future implementation should:
   - open reset link
   - rotate password in secret manager
   - run existing Simphony PKCE flow (`authorize -> signin -> token`)
   - persist resulting token set
   - append audited step results

This structure keeps the existing working auth flow reusable without enabling destructive behavior by default.

## Secret handling and auditability

- Never commit mailbox, password, or token secrets.
- Use environment variables or external secret manager for:
  - Gmail credentials
  - approval-token signing secret
  - Slack bot token
  - rotated Simphony credentials/tokens
- Avoid logging raw reset links, passwords, and tokens in production.
- Keep immutable audit events for:
  - inbound received
  - approval sent
  - approved/denied
  - execution completed/failed

## Deployment/runtime recommendation

For this repository, a practical runtime split is:

- API service (current Express app) handles orchestration and approval endpoints.
- Background worker handles Gmail polling and invokes inbound endpoint.

Why:

- Existing app remains stable and backwards compatible.
- Worker lifecycle is explicit and restartable.
- Slack can be added as another approval adapter without route changes.

Current scaffolding uses in-memory request storage. For production readiness, move to a persistent datastore before enabling real execution.
