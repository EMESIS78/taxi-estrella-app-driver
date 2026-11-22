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
- **S10** Backend b701796: "GET /informes/mis-servicios, solo para CONDUCTOR, pagina las carreras del conductor autenticado"; `/informes/**` "sigue reservado al panel".
  Acceptance: "Mis carreras" loads from `/informes/mis-servicios` and no longer filters `/informes/general` on the phone.
- **S11** Backend 7384476: "Asi el cliente puede dejar de reconectar cuando el token es rechazado".
  Acceptance: a STOMP ERROR with header `message: No autenticado` stops reconnection and ends the local session like an HTTP 401, showing the reason from the frame body.
- **S12** Backend bad3a2b: "GET /mapas/geocodificar (direccion o latlng) usa la Geocoding API y GET /mapas/ruta (origen, destino) usa la Routes API computeRoutes"; "La clave sale de GOOGLE_MAPS_API_KEY".
  Acceptance: the app calls the backend proxy with the JWT and no longer reads `GOOGLE_API_KEY`; Google status handling (S8) still applies.
- Assumption (not requested by the user): the JWT is stored with `expo-secure-store` instead of plaintext `AsyncStorage`, and the persisted `user` object no longer contains `token`/`sessionToken`.

- **S7** Roadmap phase 5: "Avisar al conductor cuando aceptar, finalizar o cancelar falla. Hoy el error se ignora sin avisar."
  Acceptance: a failed accept, finish or cancel shows an alert with the reason; an accepted ride stays active even if its route cannot be computed.
- **S8** Roadmap phase 5: "En `geolocation.js`, manejar las respuestas `ZERO_RESULTS`, `OVER_QUERY_LIMIT` y `REQUEST_DENIED`." Done-when: "`rg "fetch\(" src` solo encuentra resultados en `src/services/`."
  Acceptance: Google calls live in `src/services/`; each Google status becomes a typed error with a readable message instead of a crash on `results[0]`.
- **S9** Roadmap phase 5 done-when: "Los servicios tienen pruebas con `fetch` simulado."
  Acceptance: `conductorService` and `servicioService` have tests asserting method, URL and body of each call.

## Tasks

- [x] **T1** S1, S3, S6 — `tokenStore` + `apiClient` + services; migrate all call sites. Route: inline. RED: module missing → GREEN 10/10.
- [x] **T2** S4, S5 — AuthContext: token persistence, unauthorized handler, logout that always clears. Route: inline. RED 6/6 failing (old logout sent `sessionToken` as `Authorization`) → GREEN.
- [x] **T3** S2 — STOMP `connectHeaders` with the token. Route: inline. RED 2 → GREEN.
- [x] **T5** S8 — `googleMapsService` in `src/services/` (geocoding + routes) with Google status handling. Route: inline. RED: module missing → GREEN. Commit 88ba7cb.
- [x] **T6** S7 — alerts on failed accept/finish/cancel; keep an accepted ride when its route fails. Route: inline. RED 4 → GREEN. Commit 8b822fb.
- [x] **T7** S9 — payload tests for `conductorService` and `servicioService`. Route: inline. Characterization tests (behavior already existed, no RED possible).
- [x] **T8** S10 — history from `/informes/mis-servicios`. Route: inline. RED 2 → GREEN. Commit 0b5287e.
- [x] **T9** S11 — stop STOMP reconnection on `No autenticado`. Route: inline. RED 1 → GREEN. Commit 58c825d.
- [x] **T10** S12 — Google calls through the backend proxy. Route: inline. RED 8 → GREEN. Commit: feat(mapas) proxy.
- [x] **T4** Device check with the user: location PUT returns 200 every 8 s; STOMP log shows CONNECTED. Confirmed on a physical phone (L6, L7).

Risk: item 2 (auth/credentials: token storage and transmission) → independent verifier after T1–T3.

## Log

- **L1** (2026-11-21, user) "ok ya esta, ahora en los Logs esta dando el error de envio de ubicacion, supongo que es por lo del mapa"
- **L2** (2026-11-21) Evidence: `PUT /conductor/actualizarUbicacionConductor` without token → `HTTP 401 {"error":"No autenticado","mensaje":"Se requiere un token de acceso valido"}`. Swagger declares `bearerAuth` (JWT) on every endpoint used by the app; request/response shapes already match the app.
- **L4** (2026-11-21) Independent verifier: S1–S6 met. Blocker B1: stompjs `debug` printed the CONNECT frame with the JWT → fixed (redact `Authorization`, debug only in `__DEV__`) + regression test; recheck confirmed against a real stompjs `FrameImpl`. Also fixed advisory: one "Sesión finalizada" alert per expired session. Open advisories: STOMP 401/ERROR not routed to the logout handler (location PUT triggers it within 8 s); timeout does not cover body read; voluntary logout can show the alert if `cerrar-sesion` returns 401. `npm test`: 52/52; eslint: 0 errors (8 pre-existing warnings).
- **L5** (2026-11-21) Commit 74bd83a. Native review (user granted; lenses risk/resilience/reliability; untracked logos excluded) → approved and acknowledged, lineage review-7433a4bd703682e2. 14 non-blocking advisories for follow-up; main ones: STOMP retries every 5 s with a rejected or null token (`Bearer null`) and never ends the session; voluntary logout can show "Sesión finalizada"; body read outside the timeout; legacy installs drop the local session without calling `cerrar-sesion`; service wrapper payloads untested.
- **L6** (2026-11-21, user) "ya probé, la ubicación se envía bien" — T4 location half confirmed on device; STOMP CONNECTED still unconfirmed.
- **L7** (2026-11-21, user log) STOMP on device: `>>> CONNECT` with `Authorization:Bearer ***` (redacted) → `<<< CONNECTED` as `AuthenticatedUser[..., rol=CONDUCTOR, sid=...]`, then SUBSCRIBE `/topic/servicios` and `/topic/servicio-tomado`. Server answers `heart-beat:0,0` (no heartbeats: a silently dropped connection is not detected; follow-up).
- **L8** (2026-11-21, user) "sí, sigue con esas tres" — close phase 5: S7, S8, S9.
- **L9** (2026-11-21) Phase 5 closed: `rg "fetch(" src` only matches `src/services/apiClient.js` and `src/services/googleMapsService.js`; services tested with mocked `fetch`. `npm test` 83/83, eslint 0 errors. Not yet seen on device: failure alerts (need a forced failure). `react-native-geocoding` is no longer imported but still in package.json.
- **L10** (2026-11-21, user) "sí, avanza con los tres" — adapt the app to backend commits b701796, 7384476, bad3a2b. Verified: heartbeats already on the backend (10 s) and requested by the app CONNECT (`heart-beat:10000,10000`).
- **L11** (2026-11-21) T8–T10 done, `npm test` 87/87, eslint 0 errors. Proxy accepts at most 8 decimals per coordinate (`MapasService.java:37`) → app rounds to 6. Pending on device: Mis carreras list, route through proxy (backend needs `GOOGLE_MAPS_API_KEY`), STOMP stop on a rejected token.
- **L12** (2026-11-21) Native review of 9f50839..af31fee (user granted; lenses risk/resilience/reliability) → approved and acknowledged, lineage review-ece972af482ff209. Advisories: `latLng` throws a raw TypeError on a non-numeric coordinate instead of a GoogleMapsError (googleMapsService.js:36); network message path untested; STOMP ERROR with empty body passes `undefined` (falls back to the generic alert); possible double session-end notify from STOMP + HTTP (the handler dedupes); history fallback for a missing `contenido` untested.
- **L3** (2026-11-21, user) Backend auth contract: token in `Authorization: Bearer`, also on STOMP CONNECT; `sessionToken` never sent; it travels inside the JWT as claim `sid`; a login on another device makes the old token receive `401 ... "La sesion fue cerrada o iniciada en otro dispositivo"`.
