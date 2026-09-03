const { Op } = require("sequelize");
const {
    sequelize,
    EquipmentApprover,
    Equipment,
    User,
    Office,
} = require("../models");
const { logErrorToFile } = require("../functions/logErrorToFile");
const activeDirectory = require("../services/activeDirectory");

// Everything the frontend needs to render an approver chip. Deliberately not
// the whole user row — this endpoint is readable by any signed-in user.
const APPROVER_USER_ATTRIBUTES = [
    "id",
    "first_name",
    "last_name",
    "email",
    "username",
];

const APPROVER_INCLUDE = [
    {
        model: User,
        as: "ApproverUser",
        attributes: APPROVER_USER_ATTRIBUTES,
    },
];

/**
 * The fallback authority for any equipment with no approvers configured.
 * Used by both GetApproverEmails and CanUserApprove so the two can never
 * disagree about who is in charge.
 */
const isAdministrator = (user) =>
    !!(user && (user.admin || user.equipment_admin));

/**
 * A stable identity for an approver, so the same person or group coming from
 * the request and from the database compare equal. Matches the two filtered
 * unique indexes on the table.
 */
const approverKey = (approver) =>
    approver.approver_type === "user"
        ? `user:${approver.user_id}`
        : `group:${String(approver.ad_group_dn || "").toLowerCase()}`;

const loadApprovers = (equipmentId, transaction) =>
    EquipmentApprover.findAll({
        where: { equipment_id: equipmentId },
        include: APPROVER_INCLUDE,
        order: [["id", "ASC"]],
        transaction,
    });

/**
 * Administrator email addresses, for equipment that requires approval but has
 * nobody named against it.
 */
const getAdministratorEmails = async () => {
    const admins = await User.findAll({
        where: {
            [Op.or]: [{ admin: true }, { equipment_admin: true }],
        },
        attributes: ["id", "email", "active"],
    });

    // Filtered here rather than in the WHERE clause: rows predating the
    // `active` column have NULL, and `active = 1` would quietly drop every
    // administrator who hasn't been touched since. Same test as
    // middleware/auth.js — only an explicit false counts as deactivated.
    return admins
        .filter((u) => u.email && u.active !== false && u.active !== 0)
        .map((u) => u.email.toLowerCase());
};

/**
 * Accepts either an Equipment instance or a bare id, because callers hold one
 * or the other depending on what they already had to load.
 */
const toEquipmentId = (equipment) => {
    const raw =
        equipment && typeof equipment === "object" ? equipment.id : equipment;
    const id = Number(raw);
    return Number.isInteger(id) && id > 0 ? id : null;
};

/**
 * Everyone who should be told a reservation of this equipment needs approval.
 * AD group rows are resolved to their current members. De-duplicated,
 * lowercased.
 *
 * @param {object|number} equipment Equipment instance or id.
 * @returns {Promise<string[]>}
 */
const GetApproverEmails = async (equipment) => {
    try {
        const equipmentId = toEquipmentId(equipment);
        if (!equipmentId) {
            return [];
        }

        const rows = await EquipmentApprover.findAll({
            where: { equipment_id: equipmentId },
            include: APPROVER_INCLUDE,
        });

        const emails = new Set();

        for (const row of rows) {
            if (row.approver_type === "user") {
                if (row.ApproverUser?.email) {
                    emails.add(row.ApproverUser.email.toLowerCase());
                }
            } else if (row.ad_group_dn) {
                const members = await activeDirectory.getGroupMembers(
                    row.ad_group_dn,
                );
                members.forEach((m) => emails.add(m.email.toLowerCase()));
            }
        }

        if (emails.size === 0) {
            // Covers both "nobody was ever configured" and "the only approvers
            // are an AD group we currently can't read". Either way the
            // reservation must reach a human — turning requires_approval on
            // can never strand it with nobody able to act.
            (await getAdministratorEmails()).forEach((email) =>
                emails.add(email),
            );
        }

        return Array.from(emails);
    } catch (error) {
        logErrorToFile(error);
        return [];
    }
};

/**
 * May this user approve reservations of this equipment?
 *
 * Fails closed — anything unexpected is a "no".
 *
 * @param {object} user A req.user-shaped object (needs id, username, roles).
 * @param {object|number} equipment Equipment instance or id.
 * @returns {Promise<boolean>}
 */
const CanUserApprove = async (user, equipment) => {
    try {
        if (!user) {
            return false;
        }
        if (isAdministrator(user)) {
            return true;
        }

        const equipmentId = toEquipmentId(equipment);
        if (!equipmentId) {
            return false;
        }

        const rows = await EquipmentApprover.findAll({
            where: { equipment_id: equipmentId },
            attributes: ["approver_type", "user_id", "ad_group_dn"],
        });

        // No approvers configured falls back to the administrators, and this
        // user already failed that test above.
        if (rows.length === 0) {
            return false;
        }

        if (
            rows.some(
                (row) =>
                    row.approver_type === "user" && row.user_id === user.id,
            )
        ) {
            return true;
        }

        if (!user.username) {
            return false;
        }

        const groupDns = Array.from(
            new Set(
                rows
                    .filter(
                        (row) =>
                            row.approver_type === "ad_group" &&
                            row.ad_group_dn,
                    )
                    .map((row) => row.ad_group_dn),
            ),
        );

        for (const dn of groupDns) {
            if (await activeDirectory.isUserMemberOf(user.username, dn)) {
                return true;
            }
        }

        return false;
    } catch (error) {
        logErrorToFile(error);
        return false;
    }
};

/**
 * Bulk form of CanUserApprove, for scoping a list (the pending-approvals
 * queue) without one directory round trip per row.
 *
 * @param {object} user A req.user-shaped object.
 * @param {number[]} equipmentIds
 * @returns {Promise<Set<number>>} The subset this user may approve.
 */
const FilterApprovableEquipmentIds = async (user, equipmentIds) => {
    const approvable = new Set();

    try {
        const ids = Array.from(
            new Set(
                (equipmentIds || [])
                    .map(Number)
                    .filter((id) => Number.isInteger(id) && id > 0),
            ),
        );

        if (!user || ids.length === 0) {
            return approvable;
        }

        // Short-circuit: an administrator approves everything, so there is
        // nothing to look up.
        if (isAdministrator(user)) {
            ids.forEach((id) => approvable.add(id));
            return approvable;
        }

        // One query for the whole list.
        const rows = await EquipmentApprover.findAll({
            where: { equipment_id: { [Op.in]: ids } },
            attributes: [
                "equipment_id",
                "approver_type",
                "user_id",
                "ad_group_dn",
            ],
        });

        // Named-person rows need no directory at all.
        for (const row of rows) {
            if (row.approver_type === "user" && row.user_id === user.id) {
                approvable.add(row.equipment_id);
            }
        }

        const groupDns = Array.from(
            new Set(
                rows
                    .filter(
                        (row) =>
                            row.approver_type === "ad_group" &&
                            row.ad_group_dn,
                    )
                    .map((row) => row.ad_group_dn),
            ),
        );

        // At most one membership check per DISTINCT group, however many pieces
        // of equipment that group covers.
        const membership = new Map();
        if (user.username) {
            for (const dn of groupDns) {
                membership.set(
                    dn,
                    await activeDirectory.isUserMemberOf(user.username, dn),
                );
            }
        }

        for (const row of rows) {
            if (
                row.approver_type === "ad_group" &&
                membership.get(row.ad_group_dn)
            ) {
                approvable.add(row.equipment_id);
            }
        }

        // Equipment with no approver rows falls back to the administrator
        // test, which this user already failed — so those ids stay out.
        return approvable;
    } catch (error) {
        logErrorToFile(error);
        return approvable;
    }
};

/**
 * Turn whatever arrived on the request into a clean, de-duplicated list.
 *
 * Returns `{ error }` rather than throwing so both the HTTP handler and the
 * equipment create/update path can render it as a 400.
 */
const normalizeApproverList = (approvers) => {
    if (!Array.isArray(approvers)) {
        return { error: "approvers must be an array" };
    }

    const normalized = [];
    const seen = new Set();

    for (let index = 0; index < approvers.length; index++) {
        const raw = approvers[index];

        if (!raw || typeof raw !== "object") {
            return { error: `approvers[${index}] must be an object` };
        }

        let candidate;

        if (raw.approver_type === "user") {
            const userId = Number(raw.user_id);
            if (!Number.isInteger(userId) || userId <= 0) {
                return {
                    error: `approvers[${index}] has approver_type "user" but no valid user_id`,
                };
            }
            // The other column is nulled explicitly: the table's CHECK
            // constraint rejects a row that carries both.
            candidate = {
                approver_type: "user",
                user_id: userId,
                ad_group_name: null,
                ad_group_dn: null,
            };
        } else if (raw.approver_type === "ad_group") {
            const dn =
                typeof raw.ad_group_dn === "string"
                    ? raw.ad_group_dn.trim()
                    : "";
            const name =
                typeof raw.ad_group_name === "string"
                    ? raw.ad_group_name.trim()
                    : "";
            if (!dn) {
                return {
                    error: `approvers[${index}] has approver_type "ad_group" but no ad_group_dn`,
                };
            }
            if (!name) {
                return {
                    error: `approvers[${index}] has approver_type "ad_group" but no ad_group_name`,
                };
            }
            candidate = {
                approver_type: "ad_group",
                user_id: null,
                ad_group_name: name,
                ad_group_dn: dn,
            };
        } else {
            return {
                error: `approvers[${index}].approver_type must be "user" or "ad_group"`,
            };
        }

        // De-duplicated before it reaches the database: a caller sending the
        // same person twice would otherwise trip a filtered unique index and
        // get an opaque constraint error back.
        const key = approverKey(candidate);
        if (seen.has(key)) {
            continue;
        }
        seen.add(key);
        normalized.push(candidate);
    }

    return { approvers: normalized };
};

/**
 * The equipment routes are multer-wrapped (`upload.single("image")`), so a
 * multipart submission delivers every field as a string. The frontend sends
 * JSON today and this is a real array — but the moment an image input is added
 * it won't be, and a JSON string handed to Sequelize fails deep in the driver.
 */
const parseApproversInput = (value) => {
    if (typeof value !== "string") {
        return { approvers: value };
    }
    try {
        return { approvers: JSON.parse(value) };
    } catch {
        return {
            error: "approvers must be an array, or a JSON-encoded array",
        };
    }
};

/**
 * Parse, validate, and confirm every named person actually exists.
 *
 * Run before the equipment write, not after: an unknown user_id would
 * otherwise surface as a foreign-key violation with nothing in it to tell the
 * user which row was wrong.
 *
 * @returns {Promise<{error: string} | {approvers: object[]}>}
 */
const ValidateApproverInput = async (approversInput, transaction) => {
    const parsed = parseApproversInput(approversInput);
    if (parsed.error) {
        return { error: parsed.error };
    }

    const normalized = normalizeApproverList(parsed.approvers);
    if (normalized.error) {
        return { error: normalized.error };
    }

    const userIds = normalized.approvers
        .filter((a) => a.approver_type === "user")
        .map((a) => a.user_id);

    if (userIds.length > 0) {
        const found = await User.findAll({
            where: { id: { [Op.in]: userIds } },
            attributes: ["id"],
            transaction,
        });
        const foundIds = new Set(found.map((u) => u.id));
        const missing = userIds.filter((id) => !foundIds.has(id));
        if (missing.length > 0) {
            return {
                error: `Unknown user_id: ${missing.join(", ")}`,
            };
        }
    }

    return { approvers: normalized.approvers };
};

/**
 * Replace-the-set: remove the approvers that are gone, add the ones that are
 * new, and leave the unchanged ones alone so their created_by/createdAt stay
 * meaningful as "when this approver was granted".
 *
 * Creates its own transaction when the caller hasn't got one, because a
 * half-applied set is worse than no change at all.
 *
 * @param {number} equipmentId
 * @param {object[]} normalizedApprovers Output of ValidateApproverInput.
 * @param {number} actingUserId Taken from req.user, never from the body.
 * @param {object} [transaction]
 */
const ReplaceApproversForEquipment = async (
    equipmentId,
    normalizedApprovers,
    actingUserId,
    transaction = null,
) => {
    const apply = async (t) => {
        const existing = await EquipmentApprover.findAll({
            where: { equipment_id: equipmentId },
            transaction: t,
        });

        const desired = new Map(
            normalizedApprovers.map((a) => [approverKey(a), a]),
        );

        // Deletes go first and in the same transaction, so swapping one group
        // for another — or re-adding a group under a new display name — can't
        // collide with the filtered unique indexes part-way through.
        const removals = existing.filter(
            (row) => !desired.has(approverKey(row)),
        );
        if (removals.length > 0) {
            await EquipmentApprover.destroy({
                where: { id: removals.map((row) => row.id) },
                transaction: t,
            });
        }

        const kept = new Set(
            existing
                .map(approverKey)
                .filter((key) => desired.has(key)),
        );

        const additions = [];
        for (const [key, approver] of desired) {
            if (kept.has(key)) {
                continue;
            }
            additions.push({
                ...approver,
                equipment_id: equipmentId,
                created_by: actingUserId || null,
                updated_by: actingUserId || null,
            });
        }

        if (additions.length > 0) {
            await EquipmentApprover.bulkCreate(additions, { transaction: t });
        }
    };

    if (transaction) {
        return apply(transaction);
    }
    return sequelize.transaction(apply);
};

/**
 * Who may change the approver list for a piece of equipment.
 */
const canManageApprovers = async (user, equipment) => {
    if (!user) {
        return false;
    }
    if (user.admin || user.equipment_admin) {
        return true;
    }

    // `Rooms-Users.equipment_office_admin` holds an office ID (integer) while
    // `Equipment-Items.location` holds that office's Alias (string), so
    // comparing the two directly — as mailController.js does — matches nothing,
    // ever. Resolve the ID through Offices first.
    const officeId = Number(user.equipment_office_admin);
    if (!Number.isInteger(officeId) || officeId <= 0 || !equipment?.location) {
        return false;
    }

    const office = await Office.findByPk(officeId, {
        attributes: ["officeid", "Alias"],
    });
    if (!office?.Alias) {
        return false;
    }

    return (
        String(office.Alias).trim().toLowerCase() ===
        String(equipment.location).trim().toLowerCase()
    );
};

/**
 * GET /api/equipment-approvers/equipment/:equipmentId
 *
 * Readable by any signed-in user: a requester whose reservation is stuck
 * pending needs to know who to chase, and the attribute list above keeps this
 * to a name and a work address.
 */
const GetByEquipmentId = async (req, res, next) => {
    try {
        const { equipmentId } = req.params;

        const approvers = await loadApprovers(equipmentId);

        res.status(200).json(approvers);
    } catch (error) {
        logErrorToFile(error);
        next(error);
    }
};

/**
 * PUT /api/equipment-approvers/equipment/:equipmentId
 * Body: { approvers: [...] }
 */
const SetForEquipment = async (req, res, next) => {
    try {
        const { equipmentId } = req.params;

        const equipment = await Equipment.findByPk(equipmentId);
        if (!equipment) {
            return res.status(404).json({ message: "Equipment not found" });
        }

        if (!(await canManageApprovers(req.user, equipment))) {
            return res.status(403).json({
                message:
                    "Administrator privileges required to change approvers.",
            });
        }

        const validated = await ValidateApproverInput(req.body?.approvers);
        if (validated.error) {
            return res.status(400).json({ message: validated.error });
        }

        await ReplaceApproversForEquipment(
            equipment.id,
            validated.approvers,
            req.user?.id,
        );

        const approvers = await loadApprovers(equipment.id);

        res.status(200).json(approvers);

        // Emit socket event
        const io = req.app.get("io");
        if (io) {
            io.emit("message", {
                message: "equipment_approvers_updated",
                data: { equipment_id: equipment.id, approvers },
            });
        }
    } catch (error) {
        logErrorToFile(error);
        next(error);
    }
};

module.exports = {
    GetByEquipmentId,
    SetForEquipment,
    // Non-HTTP helpers, imported directly by other controllers.
    GetApproverEmails,
    CanUserApprove,
    FilterApprovableEquipmentIds,
    ValidateApproverInput,
    ReplaceApproversForEquipment,
};
