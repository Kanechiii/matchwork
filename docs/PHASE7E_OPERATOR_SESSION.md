# Phase 7E — Opt-in operator browser session

This is an **operator-only proof-of-concept** for same-origin browser access,
not public user authentication, identity management or a hard cost cap. No React
code was changed. Existing bearer-only `/api/insights` and
`/api/agents/insights` remain unchanged. The new browser endpoints are OFF by
default and cannot operate unless all required environment variables exist.

- POST `/api/browser/session` with JSON `{"access_code":"..."}`, an exact
  `Origin` matching `MATCHWORK_PUBLIC_ORIGIN`. On success, receives a Secure,
  HttpOnly, SameSite=Strict, 15-minute operator cookie and a per-session CSRF
  token in response JSON.
- POST `/api/browser/agents/insights` with the same-origin `Origin` header,
  the session cookie and `X-Matchwork-CSRF` header; body is the normal trusted
  `{match_id, as_of_seconds, evidence_ids, audience}` request.
- POST `/api/browser/logout` with the same session and CSRF header deletes
  the browser cookie. Logout does not server-revoke stateless signed tokens:
  copied cookies remain usable until 15-minute expiry.

Required server-only environment variables:
`MATCHWORK_BROWSER_SESSION_ENABLED=true`,
`MATCHWORK_PUBLIC_ORIGIN=https://<exact-app-host>`,
`MATCHWORK_BROWSER_LOGIN_TOKEN=<separate random 32+-char secret>`,
`MATCHWORK_SESSION_SIGNING_KEY=<separate random 32+-char signing secret>`.
Tokens and signing key **must be different** from `MATCHWORK_API_ACCESS_TOKEN`.
Never put these in frontend build variables, source, screenshots or URLs.
Never enable this in publicly reachable staging until the login flow is
reviewed and protected against brute-force attempts.

Security limitations: login has no durable rate limiting, CAPTCHA, identity,
audit/revocation store or per-user attribution. The CSRF token is held in browser
memory, not persistent storage. Same-origin policy and signing mitigate cookie
forgery but do not prevent access-code brute force, replay of stolen signed
cookies, XSS, abuse by any holder of the operator password, or account sharing.
The original agent budget is process-local, not a hard spending cap.

For security, `MATCHWORK_BROWSER_SESSION_ENABLED` remains `false` on the
existing Japan East staging app and production. The added code and mocked
tests are solely an implementation step toward a later authenticated UI.
Before enabling real inference publicly, implement proper user login
(Entra External ID / equivalent), durable per-user quotas, abuse controls and
Azure spending protections. Approval is required for Azure environment changes.
