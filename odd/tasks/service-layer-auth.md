# Service layer with JWT auth (roadmap phase 5)

Objective: route every backend call through one API client that sends the JWT, so protected endpoints stop answering 401.
Branch: `dev` · Delivery: single-pr · Runner: `npm test` (jest-expo) · Test-first: RED before each behavior.

## Specs

- **S1** Bearer token on every protected HTTP request. Backend contract (user, 2026-11-21): "En Authorization: Bearer va token." / "Authorization: Bearer <token>" / "Va en todas las peticiones HTTP protegidas".
  Acceptance: after login, every request except `POST /conductor/login` carries `Authorization: Bearer <token>` taken from the login response field `token`.
- **S2** Bearer token on the STOMP CONNECT frame: "y también en el CONNECT de STOMP como cabecera nativa: `stompClient.connect({ Authorization: \`Bearer ${token}\` }, onConnect, onError);`"
  Acceptance: the STOMP client connects with `connectHeaders.Authorization = "Bearer <token>"`, refreshed before each (re)connection.
- **S3** `sessionToken` is never sent: "sessionToken no se envía nunca." / "La app puede ignorar sessionToken o guardarlo solo para depurar. No hace falta para autenticar."
  Acceptance: no request header or body contains `sessionToken`.
- **S4** Session closed elsewhere. Backend answers `401 {"error":"No autenticado","mensaje":"La sesion fue cerrada o iniciada en otro dispositivo"}` once another device logs in.
  Acceptance: a 401 on an authenticated request clears the local session (user + token) without calling the backend again, and shows the backend `mensaje` to the driver.
- **S5** Logout clears local data even when the network fails (agreed phase 5 plan, handoff 2026-11-16).
  Acceptance: `logout()` calls `PUT /conductor/cerrar-sesion?dni=<dni>` with the Bearer token, and removes the user and token locally whether that call succeeds or fails.
- **S6** One API client: base URL, request timeout via `AbortController`, `Authorization` header, normalized errors (agreed phase 5 plan). Endpoint wrappers grouped in `conductorService` (login, logout, estado, ubicacion) and `servicioService` (tomar, finalizar, cancelar, historial). No `fetch` to the backend outside `src/services/`.
- Assumption (not requested by the user): the JWT is stored with `expo-secure-store` instead of plaintext `AsyncStorage`, and the persisted `user` object no longer contains `token`/`sessionToken`.

Out of scope for this slice (rest of phase 5, later): user-facing notification on every failed request; `ZERO_RESULTS`/`OVER_QUERY_LIMIT`/`REQUEST_DENIED` handling in `geolocation.js`.

## Tasks

- [x] **T1** S1, S3, S6 — `tokenStore` + `apiClient` + services; migrate all call sites. Route: inline. RED: module missing → GREEN 10/10.
- [x] **T2** S4, S5 — AuthContext: token persistence, unauthorized handler, logout that always clears. Route: inline. RED 6/6 failing (old logout sent `sessionToken` as `Authorization`) → GREEN.
- [x] **T3** S2 — STOMP `connectHeaders` with the token. Route: inline. RED 2 → GREEN.
- [x] **T4** Device check with the user: location PUT returns 200 every 8 s; STOMP log shows CONNECTED. Confirmed on a physical phone (L6, L7).

Risk: item 2 (auth/credentials: token storage and transmission) → independent verifier after T1–T3.

## Log

- **L1** (2026-11-21, user) "ok ya esta, ahora en los Logs esta dando el error de envio de ubicacion, supongo que es por lo del mapa"
- **L2** (2026-11-21) Evidence: `PUT /conductor/actualizarUbicacionConductor` without token → `HTTP 401 {"error":"No autenticado","mensaje":"Se requiere un token de acceso valido"}`. Swagger declares `bearerAuth` (JWT) on every endpoint used by the app; request/response shapes already match the app.
- **L4** (2026-11-21) Independent verifier: S1–S6 met. Blocker B1: stompjs `debug` printed the CONNECT frame with the JWT → fixed (redact `Authorization`, debug only in `__DEV__`) + regression test; recheck confirmed against a real stompjs `FrameImpl`. Also fixed advisory: one "Sesión finalizada" alert per expired session. Open advisories: STOMP 401/ERROR not routed to the logout handler (location PUT triggers it within 8 s); timeout does not cover body read; voluntary logout can show the alert if `cerrar-sesion` returns 401. `npm test`: 52/52; eslint: 0 errors (8 pre-existing warnings).
- **L5** (2026-11-21) Commit 74bd83a. Native review (user granted; lenses risk/resilience/reliability; untracked logos excluded) → approved and acknowledged, lineage review-7433a4bd703682e2. 14 non-blocking advisories for follow-up; main ones: STOMP retries every 5 s with a rejected or null token (`Bearer null`) and never ends the session; voluntary logout can show "Sesión finalizada"; body read outside the timeout; legacy installs drop the local session without calling `cerrar-sesion`; service wrapper payloads untested.
- **L6** (2026-11-21, user) "ya probé, la ubicación se envía bien" — T4 location half confirmed on device; STOMP CONNECTED still unconfirmed.
- **L7** (2026-11-21, user log) STOMP on device: `>>> CONNECT` with `Authorization:Bearer ***` (redacted) → `<<< CONNECTED` as `AuthenticatedUser[..., rol=CONDUCTOR, sid=...]`, then SUBSCRIBE `/topic/servicios` and `/topic/servicio-tomado`. Server answers `heart-beat:0,0` (no heartbeats: a silently dropped connection is not detected; follow-up).
- **L3** (2026-11-21, user) Backend auth contract: token in `Authorization: Bearer`, also on STOMP CONNECT; `sessionToken` never sent; it travels inside the JWT as claim `sid`; a login on another device makes the old token receive `401 ... "La sesion fue cerrada o iniciada en otro dispositivo"`.
