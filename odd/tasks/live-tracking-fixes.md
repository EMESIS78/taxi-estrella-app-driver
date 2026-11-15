# Live tracking fixes (roadmap phase 3)

Objective: make driver tracking actually work — location reporting, socket
delivery, arrival detection, heading — by fixing effects that restart on every
location update (every 2s).
Branch: `rama-para-el-despliegue-en-android` · Delivery: single-pr ·
Runner: `npm test` (jest-expo) · Test-first: RED before each fix.

## Specs

- **S1** `useEnviarUbicacionConductor`: create the 8s interval once and read the
  current location from a `useRef`. Today the interval is destroyed every 2s by
  a location-dependent effect and never fires, so the server never receives the
  driver position while the car is moving.
  Acceptance: with fake timers, advancing 8s while the location changes every 2s
  calls `fetch` at least once with the latest coordinates.
- **S2** `useDistancias`: same pattern for its 4s interval. Today distances stay
  `null`, so arrival at pickup and at destination is never detected.
  Acceptance: with fake timers, the computed distances update after the interval
  fires while the location keeps changing.
- **S3** `useServicioSocket`: connect once. Remove `location` and
  `nuevoServicio` from the effect dependencies so the STOMP client is not torn
  down and reconnected every 2s, which drops services that arrive in that
  window. Also wire the "servicio tomado" notification: `TrackerScreen.jsx:43`
  passes 2 of the 4 arguments the hook expects, so the handler never runs and
  two drivers can accept the same ride.
  Acceptance: a test asserts a single connection across several location
  updates, and that the servicio-tomado callback clears the pending offer.
- **S4** `useLiveLocation`: keep the previous position in a `useRef`. Today the
  computed heading is always 0.
  Acceptance: feeding two successive positions yields a non-zero heading.
- **S5** `TrackerScreen`: run `restaurarServicio` only on mount. Today its
  effect depends on `[location]`, so each location update triggers 2 geocoding
  and 2 directions requests against the Google quota.
  Acceptance: restoring a stored ride performs its lookups once.
- **S6** `AlertaServicio`: release the sound with `unloadAsync` after playback.

Out of scope: design tokens (phase 4), service layer (phase 5), ride state
machine (phase 6), backend trust (phase 7). Do not touch `assets/images/`
(pending user decision) or any `.env*` file.

## Tasks

| ID | Specs | Route | Status | Evidence |
| --- | --- | --- | --- | --- |
| T1 | S1 | delegated | done | RED `src/hooks/__tests__/useEnviarUbicacionConductor.test.js`: "sends the latest coordinates when the 8s interval fires while the location keeps changing" — `toHaveBeenCalledTimes` expected 1, received 0. GREEN 4/4. |
| T2 | S2 | delegated | done | RED `src/hooks/__tests__/useDistancias.test.js`: 2 failures — `toBeCloseTo` "Matcher error: received value must be a number / Received has value: null". GREEN 4/4. |
| T3 | S3 | delegated | done | RED `src/hooks/__tests__/useServicioSocket.test.js`: `Client` expected 1 call, received 5 (and 2). RED `src/screens/__tests__/TrackerScreen.test.jsx`: "drops the pending offer when another driver takes the ride" — `queryByText('Aceptar')` not null. GREEN 6/6 and 2/2. |
| T4 | S4 | delegated | done | RED `src/hooks/__tests__/useLiveLocation.test.js`: "computes a non-zero heading from two successive positions" — expected 90.00103955844838, received 0. GREEN 5/5. |
| T5 | S5 | delegated | done | RED `src/screens/__tests__/TrackerScreen.test.jsx`: "restores a stored ride with a single round of geocoding and route lookups" — `AsyncStorage.getItem` expected 1 call, received 4. GREEN 4/4. |
| T6 | S6 | delegated | done | RED `src/components/__tests__/AlertaServicio.test.jsx`: `setOnPlaybackStatusUpdate` expected 1 call, received 0; `unloadAsync` expected 1, received 0; `TypeError: notificarEstado is not a function`. GREEN 6/6. |

## Log

- **L1** (user, 2026-09-18, verbatim): "dale, hacé los commits y seguí con la fase 3"
- **L2** (2026-11-15): Phases 0-2 committed as `992b66b`, `64fcaca`, `820538e`.
  Phase 3 starts from `820538e`.
- **L3** Source of specs: roadmap artifact "Hoja de ruta Estrellas Tours Driver"
  (phase 3, concept 1: effects and refs), based on the audit of commit `a22658e`.
- **L4** Known lint evidence from phase 2 — exhaustive-deps warnings at
  `useServicioSocket.js:49`, `useLiveLocation.js:57`, `TrackerScreen.jsx:166`,
  `EstadoConductor.jsx:49`, `useServiciosConductor.js:27`. The S1/S2 interval
  defects produce no warning: their dependency arrays are complete.
- **L5** (2026-11-15) Spec discrepancy, S3: the hook call with 2 of 4 arguments
  is at `src/screens/TrackerScreen.jsx:40`, not `:43` (`:43` is the
  `restaurarServicio` effect of S5). Both were fixed as specified; only the
  line number in S3 was stale.
- **L6** (2026-11-15) S5 implemented as a one-shot guard
  (`servicioRestauradoRef`) inside the existing `[location]` effect rather than
  an empty dependency array: `location` is `null` on the first mount, so a
  mount-only effect would never restore the ride and would call
  `getRutaGoogleMaps(null, partida)`. The restore now runs on the first
  location received and never again, which is what S5's acceptance measures.
- **L7** (2026-11-15) Concept applied in S1, S2, S3, S4: the interval or
  connection lives in a mount-only effect and a separate effect keeps a
  `useRef` in sync with the values that change every ~2s. `useDistancias` keeps
  `navegacionActiva` as its only dependency so the interval still starts and
  stops with navigation.
- **L8** (2026-11-15) Test-harness note: `rerender` with a referentially
  identical element makes React bail out of re-rendering, so the first S5 test
  passed without RED. `src/screens/__tests__/TrackerScreen.test.jsx` builds a
  fresh element per render (`trackerTree()`).
- **L9** (2026-11-15) Verification: `npm test` 7 suites / 32 tests passed;
  `npm run lint` 0 errors, 13 warnings (all pre-existing; the
  `useServicioSocket.js:49` and `useLiveLocation.js:57` exhaustive-deps
  warnings from L4 are gone, `TrackerScreen.jsx:166` moved to `:173` and is the
  untouched arrival effect); `npx expo export --platform android` bundled
  (4.49 MB hbc). No commit made.
