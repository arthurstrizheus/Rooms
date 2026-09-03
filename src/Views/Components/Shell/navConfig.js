import BuildOutlinedIcon from "@mui/icons-material/BuildOutlined";
import AssignmentOutlinedIcon from "@mui/icons-material/AssignmentOutlined";
import PlaylistAddCheckOutlinedIcon from "@mui/icons-material/PlaylistAddCheckOutlined";
import AccountBoxOutlinedIcon from "@mui/icons-material/AccountBoxOutlined";
import PeopleAltOutlinedIcon from "@mui/icons-material/PeopleAltOutlined";
import DeveloperModeIcon from "@mui/icons-material/DeveloperMode";
import AccountBalanceOutlinedIcon from "@mui/icons-material/AccountBalanceOutlined";
import AssessmentOutlinedIcon from "@mui/icons-material/AssessmentOutlined";

// ============================================================================
// Navigation
// ----------------------------------------------------------------------------
// One declaration drives the desktop sidebar, the mobile drawer, the mobile
// bottom bar and the page title in the top bar. Previously the sidebar's menu,
// the route table and the banner's title logic each had their own copy of this
// list, which is why /approve had working badge code but no way to reach it.
//
// `can(user)` mirrors the route guards in Routes.js. Keep the two in step.
// `primary: true` marks an item for the mobile bottom bar (max 4).
// ============================================================================

export const NAV_SECTIONS = [
    {
        id: "equipment",
        label: "Equipment",
        items: [
            {
                id: "all-equipment",
                label: "All Equipment",
                shortLabel: "Equipment",
                icon: BuildOutlinedIcon,
                path: "/equipment",
                // /equipment/:id and /equipment/calendar/... are children, so
                // the parent stays highlighted while you're inside them.
                match: (p) => p === "/" || p.startsWith("/equipment"),
                primary: true,
            },
            {
                id: "reservations",
                label: "My Reservations",
                shortLabel: "Bookings",
                icon: AssignmentOutlinedIcon,
                path: "/reservations",
                match: (p) => p.startsWith("/reservations"),
                primary: true,
            },
            {
                id: "approve",
                label: "Approval Queue",
                shortLabel: "Approvals",
                icon: PlaylistAddCheckOutlinedIcon,
                path: "/approve",
                match: (p) => p.startsWith("/approve"),
                badge: "approvals",
                primary: true,
                // Approvers only. Anyone with a pending item also sees it, so
                // an emailed approval link never lands on a hidden page.
                can: (user, ctx) =>
                    Boolean(
                        user?.admin ||
                            user?.equipment_admin ||
                            user?.equipment_office_admin ||
                            ctx?.approvalCount > 0,
                    ),
            },
        ],
    },
    {
        id: "account",
        label: "Account",
        items: [
            {
                id: "account",
                label: "My Account",
                shortLabel: "Account",
                icon: AccountBoxOutlinedIcon,
                path: "/account",
                match: (p) => p.startsWith("/account"),
                primary: true,
            },
            {
                id: "admin-dashboard",
                label: "Admin Dashboard",
                shortLabel: "Admin",
                icon: DeveloperModeIcon,
                path: "/admin-dashboard",
                match: (p) => p.startsWith("/admin-dashboard"),
                can: (user) => Boolean(user?.admin),
            },
        ],
    },
    {
        id: "admin",
        label: "Administration",
        items: [
            {
                id: "users",
                label: "Users",
                icon: PeopleAltOutlinedIcon,
                path: "/manage/users",
                match: (p) => p.startsWith("/manage/users"),
                can: (user) =>
                    Boolean(user?.admin || user?.equipment_admin),
            },
            {
                id: "depreciation",
                label: "Depreciation Reports",
                icon: AccountBalanceOutlinedIcon,
                path: "/depreciation",
                match: (p) => p.startsWith("/depreciation"),
                can: (user) => Boolean(user?.admin || user?.tax_admin),
            },
            {
                id: "usage-report",
                label: "Usage Report",
                icon: AssessmentOutlinedIcon,
                path: "/usage-report",
                match: (p) => p.startsWith("/usage-report"),
                can: (user) =>
                    Boolean(
                        user?.admin ||
                            user?.equipment_admin ||
                            user?.equipment_office_admin ||
                            user?.tax_admin,
                    ),
            },
        ],
    },
];

/** Sections and items the given user is allowed to see. */
export function visibleSections(user, ctx = {}) {
    return NAV_SECTIONS.map((section) => ({
        ...section,
        items: section.items.filter((item) => !item.can || item.can(user, ctx)),
    })).filter((section) => section.items.length > 0);
}

/** Flat list of every permitted item. */
export function visibleItems(user, ctx = {}) {
    return visibleSections(user, ctx).flatMap((s) => s.items);
}

/** The up-to-four items shown in the mobile bottom bar. */
export function bottomBarItems(user, ctx = {}) {
    return visibleItems(user, ctx)
        .filter((item) => item.primary)
        .slice(0, 4);
}

/** The nav item matching a pathname, or undefined. */
export function itemForPath(pathname, user, ctx = {}) {
    return visibleItems(user, ctx).find((item) => item.match(pathname));
}

/**
 * May this user open this path?
 *
 * Routes.js calls this instead of restating each item's `can`, which is the
 * only way the two actually stay in step — a hand-copied guard drifted almost
 * immediately, and the divergence hid the approval queue from exactly the
 * people who had something waiting in it.
 *
 * Unknown paths are permitted: this answers "is this item hidden from you",
 * and pages with no nav entry (equipment detail, calendars) are not.
 */
export function canAccessPath(pathname, user, ctx = {}) {
    const item = NAV_SECTIONS.flatMap((section) => section.items).find((i) =>
        i.match(pathname),
    );
    if (!item) return true;
    return item.can ? Boolean(item.can(user, ctx)) : true;
}

// ---------------------------------------------------------------------------
// Page titles
// ---------------------------------------------------------------------------
// More specific than the nav items: sub-pages get their own title even though
// they highlight a parent nav entry.

const TITLE_RULES = [
    [(p) => p.startsWith("/equipment/compare"), "Compare Schedules"],
    [(p) => p.startsWith("/equipment/calendar"), "Equipment Schedule"],
    [(p) => /\/equipment\/\d+$/.test(p), "Equipment Details"],
    [(p) => p === "/" || p.startsWith("/equipment"), "Equipment"],
    [(p) => p.startsWith("/reservations"), "My Reservations"],
    [(p) => p.startsWith("/approve"), "Approval Queue"],
    [(p) => p.startsWith("/account"), "My Account"],
    [(p) => p.startsWith("/manage/users"), "Users"],
    [(p) => p.startsWith("/admin-dashboard"), "Admin Dashboard"],
    [(p) => p.startsWith("/depreciation"), "Depreciation Reports"],
    [(p) => p.startsWith("/usage-report"), "Usage Report"],
];

export function titleForPath(pathname) {
    const hit = TITLE_RULES.find(([test]) => test(pathname));
    return hit ? hit[1] : "Page Not Found";
}
