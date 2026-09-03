import { useCallback, useEffect, useRef } from "react";
import { useAuth } from "../../../Utilites/AuthContext";
import { useSocket } from "../../../Contexts/SocketContext";
import { useSessionStorage } from "../../../hooks/useSessionStorage";
import {
    GetCheckoutApprovals,
    showSuccess,
    showWarning,
} from "../../../Utilites/Functions/ApiFunctions";

/**
 * Pending-approval count, kept live over the socket.
 *
 * Lifted out of SideBar so the desktop sidebar, the mobile drawer and the
 * mobile bottom bar all read one number instead of each fetching their own.
 */
export default function useApprovalCount() {
    const { user } = useAuth();
    const { socket } = useSocket();
    const [approvalCount, setApprovalCount] = useSessionStorage(
        "approvalCount",
        0,
    );

    // Tracks which approval IDs we've already told the user about, so a
    // refetch doesn't re-announce the same item.
    const knownIdsRef = useRef(new Set());

    const refresh = useCallback(
        async (source = "manual") => {
            if (!user?.id) return;
            try {
                const data = await GetCheckoutApprovals();
                if (!Array.isArray(data)) return;

                const currentIds = new Set(
                    data.map((c) => c.id).filter((id) => id != null),
                );
                let newIds = 0;
                currentIds.forEach((id) => {
                    if (!knownIdsRef.current.has(id)) newIds += 1;
                });

                if (source === "socket" && newIds > 0) {
                    showWarning(
                        `${newIds} new reservation approval${
                            newIds === 1 ? "" : "s"
                        } pending (total ${data.length})`,
                    );
                }

                knownIdsRef.current = currentIds;
                setApprovalCount(data.length);
            } catch {
                /* non-fatal: the badge just stays at its last value */
            }
        },
        [user?.id, setApprovalCount],
    );

    useEffect(() => {
        refresh();
    }, [refresh]);

    useEffect(() => {
        if (!socket || !user?.id) return undefined;

        const handler = (payload) => {
            const message = payload?.message;
            if (
                message !== "checkout_approval_requested" &&
                message !== "checkout_reapproval_requested" &&
                message !== "checkout_approved" &&
                message !== "checkout_declined"
            ) {
                return;
            }

            refresh("socket");

            if (payload?.data?.user_id !== user?.id) return;
            if (message === "checkout_declined") {
                showWarning("One of your reservations was declined");
            } else if (message === "checkout_approved") {
                const title =
                    payload?.data?.equipment_name ||
                    `Reservation #${payload?.data?.checkoutId || ""}`;
                showSuccess(`${title} was approved`);
            }
        };

        socket.on("message", handler);
        return () => socket.off("message", handler);
    }, [socket, user?.id, refresh]);

    return { approvalCount, refreshApprovalCount: refresh };
}
