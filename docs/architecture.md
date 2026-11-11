# OctoFit Tracker architecture

OctoFit Tracker is a three-tier application for a school fitness program. The starter code includes API contracts and intentionally incomplete implementation points so you can use GitHub Copilot agent mode in a test-driven loop.

![Three-tier OctoFit architecture](../.github/images/octofit-architecture.svg)

## Tier boundaries

- **Presentation tier**: React 19, Vite, React Router, Bootstrap, and a shared API client in `octofit-tracker/frontend/src`.
- **Logic tier**: Express and TypeScript routes/services in `octofit-tracker/backend/src` expose `/api/*` behavior on port `8000`.
- **Data tier**: Mongoose models and seed data in `octofit-tracker/backend/src/models` and `src/scripts/seed.ts` persist to MongoDB on port `27017`.

## Ports and environment rules

- MongoDB: `27017`
- Express API: `8000`
- Vite frontend: `5173`
- The browser calls relative `/api` paths. Vite proxies them to `http://localhost:8000`, so the unauthenticated API port stays private in Codespaces. `VITE_API_BASE_URL` can override the base URL.

## API contract

| Capability | Method and path | Expected behavior |
| --- | --- | --- |
| Activity tracking | `GET /api/activities`, `POST /api/activities` | List and create valid activity records. POST accepts `userId`, `teamId`, `type`, and `minutes`; `userId` and `teamId` must be well-formed IDs for an existing user and team; otherwise respond with a deliberate 4xx (never a 500 from a cast error). A created activity stores the submitted `user`, `team`, `type`, and `minutes` plus computed `points` and `occurredAt`. |
| Teams | `GET /api/teams`, `POST /api/teams` | List and create teams with members. Created and listed teams keep the submitted `name` and `mascot`. Reject a team without a name with `400`. |
| Leaderboard | `GET /api/leaderboard` | Return teams ordered by the sum of their activity points, highest first. Each entry has `teamName`, `totalPoints`, and a 1-based `rank`. |
| Workout suggestions | `GET /api/workouts/suggestions/:userEmail` | Recommend workouts from recent activity patterns for the matching seeded user's email address. The first suggestion's `focus` matches that user's goal or recent activity, with a `reason` explaining why. An email with no matching user returns a deliberate 4xx (for example, `404`). |

## Implementation decisions

Implement from the data tier upward, validating each tier before wiring the next:

1. **Data tier:** Define required fields and sensible defaults in the Mongoose
   schemas, including an empty default for team members and required activity
   and workout fields. Keep seed data representative and idempotent; update only
   the exercise's own fixtures and retain unrelated records.
2. **Logic tier:** Keep HTTP behavior in Express routes and reusable
   calculations/query work in services. Validate request shape and referenced
   IDs before writes, and return deliberate 4xx responses for invalid or missing
   resources rather than leaking database cast errors as 500s.
3. **Presentation tier:** Use the shared API client and route components for
   rendering. Every data-backed view should communicate loading, empty, and
   API-error states accessibly, while continuing to use relative `/api` paths.

Capability-specific decisions:

- **Activity tracking:** Accept only `userId`, `teamId`, `type`, and `minutes`
  from the request; verify both IDs are well-formed and refer to existing
  records. Compute points on the server at one point per submitted minute and
  set `occurredAt` when creating the activity. Return the persisted values from
  both create and list operations.
- **Team management:** Require a non-empty name and preserve submitted `name`
  and `mascot` on create and list. Store member references as user IDs and use
  an empty members array when none are supplied.
- **Leaderboard:** Aggregate activity points by team, sort totals descending,
  and assign sequential 1-based ranks in the returned list.
- **Workout suggestions:** Find the user by email, use recent activity as the
  primary recommendation signal and the user's fitness goal as a fallback,
  and place a matching workout first with a human-readable reason. Return a
  deliberate 4xx response if no user matches.

Keep presentation, logic, and data responsibilities separate, preserve the
documented ports and unauthenticated API setup, and avoid adding authentication
as part of this exercise.

## Test plan

Run the focused checks in tier order, then run both builds:

| Tier/check | Command | A failure indicates |
| --- | --- | --- |
| Data contracts | `npm run test:data --prefix octofit-tracker/backend` | A schema constraint/default, model relationship, or seed idempotency/data-preservation contract is not met. |
| API contracts | `npm run test:api --prefix octofit-tracker/backend` | Route validation/status codes, persistence/response shape, leaderboard aggregation/ranking, or workout recommendation behavior is incorrect. |
| Presentation contracts | `npm test --prefix octofit-tracker/frontend` | A route is not requesting/rendering expected API data or omits loading, empty, or accessible error states. |
| Backend build | `npm run build --prefix octofit-tracker/backend` | Backend TypeScript does not type-check. |
| Frontend build | `npm run build --prefix octofit-tracker/frontend` | Frontend TypeScript or the Vite production build fails. |

Baseline observed before implementation in this checkout:

- Data contracts: **4 failed, 1 passed**. Required user, team, activity, and
  workout model validation assertions fail; the seed/idempotency test passes.
- API contracts: **4 failed**. Invalid activity and team requests return 501
  instead of 400, the leaderboard is empty, and the workout suggestion has no
  explanatory reason.
- Presentation contracts: **15 failed**. API data is not rendered as expected,
  and loading, empty, and accessible failure states are missing across routes.
- Both backend and frontend builds pass.
- The separate scaffold-validation suite was also run with
  `node --test tests/exercise-validation.test.mjs`: **4 failed, 36 passed**.
  Those failures concern exercise metadata/scaffolding (README badge target,
  missing `.github/steps/2-step.md`, workflow gating, and toolkit release
  pinning), not the OctoFit tier contracts.
