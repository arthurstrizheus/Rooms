# Equipment Scheduler/Checkout System - AI Coding Instructions

## Architecture Overview

This is a full-stack equipment scheduling and checkout system with real-time updates:

- **Backend**: Node.js/Express REST API + Socket.IO (port 5000)
- **Frontend**: React 19 + Material-UI (port 3000)
- **Database**: SQL Server via Sequelize ORM
- **Auth**: JWT tokens + LDAP/Active Directory integration
- **Real-time**: Socket.IO for live updates and user presence

## System Purpose

Track equipment checkout/scheduling with:

- Calendar-based scheduling per equipment
- Conflict detection and approval workflows
- Calibration tracking with date notifications
- File/image management per equipment (manuals, calibration certificates)
- Equipment location and contact tracking
- Per-equipment, per-user alerts

## Data Model

### Equipment (core entity, replaces Room)

- Basic info: name, description, image, serial_number
- Location: physical location (building/room)
- Contact: contact_person (user_id or text)
- Status: available, checked_out, maintenance, retired
- Approval: requires_approval flag
- Calibration: calibration_due_date, calibration_interval_days, last_calibration_date

### Checkout (replaces Meeting)

- Foreign keys: equipment_id, user_id, approved_by_user_id
- Time: start_time, end_time
- Status: pending, approved, checked_out, returned, cancelled
- Details: notes/notes, approval_notes

### EquipmentFile

- Foreign keys: equipment_id, uploaded_by_user_id
- File: file_path, file_name, file_type
- Category: manual, calibration_cert, photo, other
- Metadata: upload_date, description, calibration_date (if cert)

### EquipmentAlert

- Foreign keys: equipment_id, user_id
- Alert types: checkout_due, calibration_due, status_change
- Settings: enabled, notification_days_before

### CalibrationHistory

- Foreign keys: equipment_id, performed_by_user_id, certificate_file_id
- Dates: calibration_date, next_due_date
- Details: notes, result (pass/fail/conditional)

### Simplified User Roles

- `admin`: Full system access
- Regular users: Can checkout equipment, view all equipment, manage own checkouts

**Removed Complexity**:

- No Groups, GroupUsers, RoomGroups (equipment approval is simpler: direct approval or auto-approve)
- No meeting Types (checkout notes is free text)
- No office_admin role (equipment doesn't belong to offices, only has location field)
- No Resources tied to rooms
- No MeetingRecurrence (equipment checkouts are typically one-time or manually repeated)
- No SpecialPermissions (approval is equipment-level, not per-checkout)

## Critical Developer Workflows

### Start Development

```bash
npm start              # Runs both frontend and backend concurrently
npm run start:frontend # React dev server only
npm run start:backend  # Backend API only (from ./backend)
```

### Database Connection

- Config: [backend/config/database.js](backend/config/database.js)
- Uses environment variables: `DB_DATABASE`, `DB_USER`, `DB_PASSWORD`, `DB_SERVER`, `DB_PORT`
- Sequelize models sync with `{ alter: false }` - manual migrations required for schema changes
- Connection uses MSSQL dialect with `encrypt: true` and `trustServerCertificate: true`

### Authentication Flow

1. User logs in via `/api/users/login` (local) or `/api/users/loginAd` (LDAP)
2. JWT token issued with user data (id, username, first_name, last_name, email, location, admin flags)
3. Token stored in localStorage as `authToken`, user data as `user`
4. All API requests include token in `Authorization: Bearer <token>` header
5. Backend middleware [backend/middleware/auth.js](backend/middleware/auth.js) validates on ALL routes except publicRoutes array
6. Socket.IO connections require token in auth handshake ([backend/middleware/socketAuth.js](backend/middleware/socketAuth.js))

### Socket.IO Integration Pattern

**Backend Setup** ([backend/sockets/socketHandler.js](backend/sockets/socketHandler.js)):

- Socket instance initialized in app.js and passed to routes via `app.set("io", io)`
- Access in controllers: `const io = req.app.get("io");`
- Use helper [backend/utils/socketUtils.js](backend/utils/socketUtils.js) `SendMessage()` for flexible targeting:
    ```javascript
    SendMessage({ message: "meeting_updated", data: {...} }, 12)           // to location 12
    SendMessage({ message: "...", data: {...} }, { userIds: [1,2] })       // to specific users
    SendMessage({ message: "...", data: {...} }, { location: 3, userIds: [1] }) // both
    ```
- Users auto-join room `location_${user.location}` on connect
- Connected users tracked in Map with socket references for force logout capability

**Frontend Pattern** ([src/Contexts/SocketContext.js](src/Contexts/SocketContext.js)):

- `SocketProvider` wraps App, provides `useSocket()` hook
- Auto-connects when authenticated, passes JWT token in auth handshake
- Listens for `force_logout` and `token_expired` events for session management
- Components subscribe to `message` event and filter by payload structure
- Always check `socket?.connected` before emitting

## Project Conventions

### Error Handling

- Backend: Controllers use `next(err)` to pass errors to global error handler middleware
- Routes wrap async controllers with `asyncHandler` HOF to catch promise rejections
- Frontend: Centralized error display via `showError()` from [src/Utilites/Functions/ApiFunctions.js](src/Utilites/Functions/ApiFunctions.js)

### Database Models ([backend/models/](backend/models/))

- All models defined in separate files, imported in [backend/models/index.js](backend/models/index.js)
- Associations defined in `initModels()` function
- Table naming: kebab-case prefixed with "Equipment-" (e.g., `Equipment-Checkouts`, `Equipment-Users`, `Equipment-Items`)
- Foreign keys use snake_case (e.g., `user_id`, `equipment_id`, `approved_by_user_id`)
- Always use `onDelete: "CASCADE"` for dependent records

### API Route Structure

- Routes in [backend/routes/](backend/routes/), controllers in [backend/controllers/](backend/controllers/)
- Route naming: `/api/<resource>` (e.g., `/api/equipment`, `/api/checkouts`, `/api/calibrations`)
- Controller methods: `GetAll`, `GetById`, `Post`, `Update`, `Delete` (PascalCase)
- File upload handling via multer, files stored in `uploads/` directory with subdirs per equipment

### Frontend Patterns

- Custom storage hooks: `useLocalStorage`, `useSessionStorage` (built on [src/hooks/useStorageBase.js](src/hooks/useStorageBase.js))
- State management: React Context for auth ([src/Utilites/AuthContext.js](src/Utilites/AuthContext.js)) and sockets
- API calls centralized in [src/Utilites/Functions/ApiFunctions.js](src/Utilites/Functions/ApiFunctions.js)
- Material-UI theming in [src/Utilites/theme.js](src/Utilites/theme.js)
- Mobile detection via `react-device-detect` for responsive behavior
- Calendar UI: FullCalendar for equipment scheduling (same as original room booking)

### Equipment Checkout Authorization

- Two user types: `admin` (full system access) and regular users
- Equipment-level approval: `requires_approval` flag on equipment determines if checkouts need approval
- Approval workflow: Users with admin flag can approve pending checkouts
- Auto-approval: Equipment without `requires_approval` flag are auto-approved on checkout
- Conflict detection: Calendar prevents double-booking same equipment for overlapping times

### Calibration Management

- Each equipment has `calibration_due_date` and `calibration_interval_days`
- Alerts triggered X days before due date (configurable per user per equipment)
- Calibration history tracked with certificates stored as equipment files
- Past calibration records maintained for audit trail
- File categories: manual, calibration_cert, photo, other

## Key Files to Reference

- [backend/app.js](backend/app.js) - Server initialization, middleware order, socket setup
- [backend/models/index.js](backend/models/index.js) - Database schema and relationships
- [backend/utils/socketUtils.js](backend/utils/socketUtils.js) - Real-time messaging utility
- [src/Contexts/SocketContext.js](src/Contexts/SocketContext.js) - Frontend WebSocket lifecycle
- [backend/ldapConfig.js](backend/ldapConfig.js) - Active Directory integration config

## Environment Variables Required

```
# Database
DB_DATABASE, DB_USER, DB_PASSWORD, DB_SERVER, DB_PORT

# Auth
JWT_SECRET

# LDAP (optional if not using AD auth)
LDAP_URL, LDAP_BASE_DN, LDAP_USER, LDAP_PASS, LDAP_CA_PATH

# Email (optional for notifications)
EMAIL_HOST, EMAIL_PORT, EMAIL_USER, EMAIL_PASS
```

## Common Pitfalls

1. **Socket authentication**: Token must be valid AND not expired; check with `isTokenExpired()` before connecting
2. **Model sync order**: Models must be synced before server starts; see app.js startServer() for correct sequence
3. **CORS**: Production URLs hardcoded in socket.io cors config - update for new domains
4. **File uploads**: Ensure `uploads/` directory exists (auto-created on startup but may be gitignored)
5. **Cascading deletes**: Missing `onDelete: "CASCADE"` causes orphaned records; always add to associations
6. **Route authentication**: New routes are protected by default; add to `publicRoutes` array in [backend/middleware/auth.js](backend/middleware/auth.js) to bypass
7. **Date handling**: Backend uses `date-fns` v4, frontend uses v2 - API differs slightly
8. **Calibration alerts**: Alert scheduling happens on server startup and when calibration dates are updated
9. **File organization**: Each equipment should have its own subdirectory in `uploads/equipment_{id}/`
