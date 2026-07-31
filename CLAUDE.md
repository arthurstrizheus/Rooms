# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## This repo holds two different apps on different branches

`c:\Code\Rooms` is a single git repo whose branches contain **unrelated applications**. Check the branch before assuming anything about the code.

- **`Work`** — the Rooms meeting/room-booking app (this branch). Deployed to `rooms.sealimited.com`; the API runs from `C:\inetpub\wwwroot\RoomsAPI`.
- **`Equiptment-Addition`** — an equipment/checkout/depreciation app. Diverged from `Work` at `ebe20d8` (Sept 2025) and shares no calendar or meeting code.
- **`master`, `Modernize`** — stale (last touched Oct 2024).

If a user reports a bug about meetings, rooms, or the booking calendar and the files aren't there, you are on the wrong branch.

## Commands

```bash
npm start              # concurrently: CRA dev server (:3000) + backend (:5000)
npm run start:frontend # react-scripts start only
npm run start:backend  # cd backend && node app.js
npm run build          # production build → build/
npm test               # react-scripts test (Jest watch mode)
```

The frontend proxies to the backend via `"proxy": "http://localhost:5000"` in `package.json`, so all frontend calls use relative `/api/...` paths.

**There are currently no test files in the repo.** `npm test` runs but collects nothing. If you add tests, the CRA convention applies: `npm test -- --testPathPattern=MyFile` for a single file, `npm test -- -t "name"` for a single case.

Dependencies install separately for each half — `npm install` at the root and again in `backend/`.

### Schema changes

The app calls `model.sync({ alter: false })` on boot (`backend/app.js`), so **new model columns are never created automatically**. Adding a column to a model in `backend/models/` is not enough — write a matching one-off script in `backend/migrations/` and run it manually:

```bash
node backend/migrations/add-it-support-to-meetings.js
```

Follow the existing pattern: raw `sequelize.query` guarded by `IF COL_LENGTH(...) IS NULL` so the script is idempotent. There is no migration framework or migrations table.

## Architecture

CRA (React 19 + MUI 5) frontend and an Express + Sequelize + MSSQL backend in one repo. Tables are prefixed `Rooms-` (e.g. `Rooms-Meetings`).

### Auth

JWT stored in `localStorage` under `authToken`, attached by a global axios request interceptor in `src/index.js`. On the server, `authenticateUser` (`backend/middleware/auth.js`) is mounted globally in `app.js` and populates `req.user`; it is bypassed only for the `publicRoutes` allowlist (login, AD login, `/api/locations`, etc.). Session state lives in `src/Utilites/AuthContext.js` (`useAuth()`), rehydrated from `localStorage` on load. Sockets authenticate separately via `backend/middleware/socketAuth.js`.

### Who can see and book what

Room access is group-mediated, and the chain matters — expect to read several files to answer any permission question:

```
User → GroupUser → Group (access: "Full" | "Read") → RoomGroup → Room
```

- `admin` and `office_admin` flags on `User` short-circuit most checks (`office_admin` holds a location id, and grants access to rooms at that location).
- A group literally named **`"All SEA Staff"`** is special-cased in queries as the everyone-group.
- `SpecialPermission` grants one user visibility of one specific meeting, outside the group chain. This is what the "Special Permissions" field on the booking form writes.
- The key helpers all live in `backend/controllers/meetingControler.js`: `CanUserBook`, `CanDelete`, `CanSeeMeet`, `GetMeetingStatus`.
- `GetMeetingStatus` decides whether a new booking is auto-`"Approved"` or `"Waiting on Approval"`. Meeting `status` values seen in queries: `Approved`, `Waiting on Approval`, `Canceled`, `Deleted`.

### Recurring meetings are synthetic — read this before touching meeting code

**Only the first meeting of a recurrence is a real database row.** Every later occurrence is generated on the fly per request by `CreateRepeatingMeetings` in `backend/controllers/meetingControler.js`, and returned with:

```js
{ ...meeting.toJSON(), id: -1, start_time, end_time, recurrence_id }
```

Consequences that bite constantly:

- **`id === -1` means "this occurrence has no row yet."** Every update/cancel endpoint branches on it. `Update` *materialises* the occurrence — it creates a real `Meeting` from the request body. Any field missing from that create payload is silently lost to the model default. (This is exactly how `all_day` was being dropped; see `plan.md`.)
- Anything that resolves an occurrence back to its series must go through `MeetingRecurrence.findByPk(recurrence_id).meeting_id` — that's the pattern in `specialPermissionsController.GetAllForMeeting`.
- The frontend mirrors this in `transposeMeetingToEvent` (`src/Views/Pages/Calendar/index.jsx`), which assigns synthetic ids: `meeting.id === -1 ? \`meeting-${idx}\` : meeting.id`.
- The dedicated endpoints — `updatenext`, `updateall`, `parentonly`, `currentonly`, `cancelnext`, `cancelall` — exist because "edit this one" vs. "edit the series" require genuinely different row surgery (splitting a recurrence, stopping the old one via `repeat_until`, creating a new parent).

### Meeting listing

`GET /api/meetings/user/:id` (`GetAllUserCanSee`) takes `date` + `range` (`Day` | `Week` | `Month`), widens the window by a week on each side, runs a different query per role (admin / office_admin / group member), then appends the generated recurrence occurrences. The frontend calls it from the calendar's data `useEffect` with the range's start date.

### Frontend structure

- `src/Routes/Routes.js` — all routing. The calendar is mounted three times at `/schedule/type/{day,week,month}` with different `defaultView` (`timeGridDay` / `timeGridWeek` / `dayGridMonth`) and `range` props. **Behaviour genuinely differs per view**, so reproduce calendar bugs on the specific view reported.
- `src/Views/Pages/Calendar/` — FullCalendar v6 wrapper (`index.jsx`), booking/edit form (`MeetingForum.jsx`, exported as `MeetingFourm`), event rendering (`RenderEventContent.jsx`), styling (`CalendarStyled.jsx`).
- `src/Utilites/Functions/ApiFunctions/` — one module per resource. **Convention: these functions swallow errors and return `null` / `[]` / `false` rather than throwing**, usually surfacing a snackbar via `showError`. Callers generally don't try/catch, so a failed call shows up as empty state, not an exception.
- `src/Contexts/SocketContext.js` — `useSocket()`. The server pushes `message` events (e.g. `meeting_approved`, `meeting_declined`) and views respond by bumping an `updateTrigger` to refetch.
- `src/Components/` holds shared primitives (`ShortSelect`, `ShortTextField`, …); `src/Views/Components/` holds app-specific composites.

### Backend structure

`routes/*.js` are thin — they only map paths to controller functions. All logic lives in `controllers/`. Models are plain `sequelize.define` files; associations are declared centrally in `initModels()` (`backend/models/index.js`), which must run before any query.

## Gotchas

- **Two different date-fns majors.** Frontend is `^2.30.0`, backend is `^4.1.0`. In v2, `toDate`/`getTime` **do not accept strings** — they log a deprecation warning and return `NaN`. Since API timestamps arrive as ISO strings, `getTime(meeting.start_time)` silently evaluates falsy on the frontend. This caused a real bug (see `plan.md`). Use `new Date(str)` or `parseISO` on the frontend.
- **`all_day` vs `allDay`.** The column and model attribute are `all_day`; the API request body key the controllers destructure is `allDay`. Sending the wrong one is silent — Sequelize's instance `update()` runs `_.omitBy(values, v => v === undefined)`, so a mis-keyed field is skipped, not nulled.
- **Times must match the dropdown options exactly.** `MeetingForum.jsx` builds a 15-minute `times` array with a local `formatTime()` (hour `0` → `"12:00 AM"`). Format any time you push into that state with the same helper — `getHours()` in `CommonFunctions.js` returns `0` for midnight, producing `"00:00 AM"`, which is not a valid option and renders an empty MUI `Select`.
- **Typos are load-bearing.** `src/Utilites/` (not Utilities), `backend/controllers/meetingControler.js` (one `l`), `MeetingFourm` as the component name. Match them.
- `isUserDev` reads `process.env.DEV_IDS` and does a string `.includes()` on the id, so it depends on ids arriving as strings.

## plan.md

`plan.md` at the repo root is the living record of investigated issues — root causes, applied fixes, what was verified vs. only reasoned about, and open follow-ups. Read it before debugging the calendar, and add an entry whenever you change a feature or fix a non-trivial bug.
