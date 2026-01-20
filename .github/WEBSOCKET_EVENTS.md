# WebSocket Events Documentation

## Overview

The system uses Socket.IO for real-time updates across all major entities. All events follow a standard format:

```javascript
{
    message: "entity_action",
    data: { ...entityData }
}
```

## Event Categories

### Equipment Events

**Emitted by**: `equipmentController.js`

| Event               | Trigger             | Data            |
| ------------------- | ------------------- | --------------- |
| `equipment_created` | New equipment added | `{ equipment }` |
| `equipment_updated` | Equipment modified  | `{ equipment }` |
| `equipment_deleted` | Equipment deleted   | `{ id }`        |

**Frontend Listeners**: Equipment list, equipment details, calendar views

---

### Checkout Events

**Emitted by**: `checkoutController.js`

| Event               | Trigger                                | Data           |
| ------------------- | -------------------------------------- | -------------- |
| `checkout_created`  | New checkout created                   | `{ checkout }` |
| `checkout_updated`  | Checkout modified (time, status, etc.) | `{ checkout }` |
| `checkout_approved` | Checkout approved by admin             | `{ checkout }` |

**Frontend Listeners**: Calendar views, checkout history, pending approvals

**Special Cases**:

-   Recurring checkout edits (this/following/all) emit `checkout_updated`
-   Status changes (cancelled, returned, checked_out) emit `checkout_updated`
-   Virtual occurrence edits create/update multiple checkouts, each emits event

---

### Equipment File Events

**Emitted by**: `equipmentFileController.js`

| Event                    | Trigger               | Data                   |
| ------------------------ | --------------------- | ---------------------- |
| `equipment_file_created` | File uploaded         | `{ file }`             |
| `equipment_file_updated` | File metadata changed | `{ file }`             |
| `equipment_file_deleted` | File deleted          | `{ id, equipment_id }` |

**Frontend Listeners**: Equipment details file list, file galleries

---

### Calibration Events

**Emitted by**: `calibrationController.js`

| Event                 | Trigger                | Data                   |
| --------------------- | ---------------------- | ---------------------- |
| `calibration_created` | New calibration record | `{ calibration }`      |
| `calibration_updated` | Calibration modified   | `{ calibration }`      |
| `calibration_deleted` | Calibration deleted    | `{ id, equipment_id }` |

**Frontend Listeners**: Equipment details calibration history

---

### Alert Subscription Events

**Emitted by**: `equipmentAlertController.js`

| Event              | Trigger                                    | Data                                 |
| ------------------ | ------------------------------------------ | ------------------------------------ |
| `alert_subscribed` | User subscribes to alert                   | `{ alert, equipment_id, user_id }`   |
| `alert_updated`    | Alert enabled/disabled or settings changed | `{ alert, equipment_id, user_id }`   |
| `alert_deleted`    | Alert subscription deleted                 | `{ alertId, equipment_id, user_id }` |

**Frontend Listeners**: Equipment details alert card, user alert management

---

### Checkout Recurrence Events

**Emitted by**: `checkoutRecurrenceController.js`

| Event                | Trigger                    | Data             |
| -------------------- | -------------------------- | ---------------- |
| `recurrence_created` | Recurring pattern created  | `{ recurrence }` |
| `recurrence_updated` | Recurring pattern modified | `{ recurrence }` |
| `recurrence_deleted` | Recurring pattern deleted  | `{ id }`         |

**Frontend Listeners**: Calendar views (for regenerating virtual occurrences)

---

## Standard Frontend Pattern

### Listening for Events

```javascript
import { useSocket } from "./Contexts/SocketContext";

function MyComponent() {
    const { socket } = useSocket();

    useEffect(() => {
        if (!socket?.connected) return;

        const handleMessage = (payload) => {
            switch (payload.message) {
                case "equipment_updated":
                    // Refresh equipment data
                    fetchEquipment();
                    break;
                case "checkout_created":
                case "checkout_updated":
                    // Refetch calendar events
                    refetchCheckouts();
                    break;
                // ... other cases
            }
        };

        socket.on("message", handleMessage);
        return () => socket.off("message", handleMessage);
    }, [socket]);
}
```

### Best Practices

1. **Always check connection**: `if (!socket?.connected) return;`
2. **Clean up listeners**: Return cleanup function from useEffect
3. **Debounce rapid updates**: Use lodash debounce for high-frequency events
4. **Filter by ID**: Check if the updated entity matches your current view
5. **Optimistic updates**: Update UI immediately, then refresh from server

---

## Backend Emission Pattern

### Standard Implementation

```javascript
const SomeAction = async (req, res, next) => {
    try {
        // Perform database operation
        const entity = await Model.create(data);

        // Send response
        res.status(201).json(entity);

        // Emit socket event (non-blocking)
        const io = req.app.get("io");
        if (io) {
            io.emit("message", {
                message: "entity_action",
                data: entity,
            });
        }
    } catch (error) {
        next(error);
    }
};
```

### Key Points

1. **Always emit AFTER response**: `res.json()` before socket emit
2. **Non-blocking**: Socket emission shouldn't affect response
3. **Check io exists**: `if (io)` guard
4. **Include relevant IDs**: Always include entity_id, user_id for filtering
5. **Use standard message format**: `{ message: "...", data: {...} }`

---

## Event Flow Examples

### Creating a Checkout

```
1. User submits checkout form
2. POST /api/checkouts
3. Backend creates checkout in DB
4. Backend responds with checkout data
5. Backend emits: { message: "checkout_created", data: checkout }
6. All connected clients receive event
7. Clients filter by equipment_id
8. Matching clients refresh calendar
```

### Cancelling Recurring Checkout (All)

```
1. User clicks "Cancel All" on recurring event
2. PATCH /api/checkouts/:id (with updateMode: "all")
3. Backend updates base checkout status to "cancelled"
4. Backend responds with updated checkout
5. Backend emits: { message: "checkout_updated", data: checkout }
6. All clients with that equipment calendar refresh
7. Virtual occurrences no longer generated
```

---

## Troubleshooting

### Events Not Received

1. Check socket connection: `socket?.connected`
2. Verify backend emitted: Check server logs
3. Check event name: Must be "message" with payload.message
4. Verify auth: Socket requires valid JWT token
5. Check room subscription: Some events may be room-specific

### Duplicate Events

1. Multiple listeners registered (missing cleanup)
2. Component re-renders causing re-subscription
3. Multiple tabs open (expected behavior)

### Delayed Updates

1. Network latency (check connection)
2. Server processing time (check backend logs)
3. Frontend debouncing (check debounce timeout)
4. Race condition (response arrives before socket event)

---

## Future Enhancements

-   [ ] Add room-based targeting for better performance
-   [ ] Implement event acknowledgment for critical updates
-   [ ] Add reconnection handling with state sync
-   [ ] Create typed event interfaces for TypeScript
-   [ ] Add event metrics and monitoring
