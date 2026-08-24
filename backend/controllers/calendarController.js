const jwt = require("jsonwebtoken");
const { Checkout, Equipment, User, CheckoutRecurrence } = require("../models");
const {
    ICS_FILENAME,
    buildCheckoutIcs,
    verifyCheckoutSignature,
} = require("../utils/icsUtils");

// This controller is mounted ahead of the global auth middleware so that
// "Add to Calendar" links inside notification emails work in a browser that has
// no app session. Access requires either the HMAC signature carried by those
// links or a normal JWT, so reservation details are never publicly readable.
const isAuthorized = (req, eventId) => {
    if (verifyCheckoutSignature(eventId, req.query.sig)) return true;

    const token =
        req.header("Authorization")?.replace("Bearer ", "") || req.query.token;
    if (!token) return false;

    try {
        jwt.verify(token, process.env.JWT_SECRET);
        return true;
    } catch {
        return false;
    }
};

/**
 * Serves a reservation as an iCalendar file.
 *
 * Accepts a base checkout id ("12") or a virtual recurring-occurrence id
 * ("12_3"). Cancelled reservations are returned as METHOD:CANCEL so opening the
 * file removes the event from the recipient's calendar.
 */
const GetCheckoutIcs = async (req, res, next) => {
    try {
        const eventId = String(req.params.id).replace(/\.ics$/i, "");

        if (!isAuthorized(req, eventId)) {
            return res
                .status(401)
                .json({ message: "Invalid or missing calendar credentials." });
        }

        const [baseId, occurrenceRaw] = eventId.split("_");
        if (!/^\d+$/.test(baseId)) {
            return res.status(400).json({ message: "Invalid reservation id." });
        }

        const occurrenceIndex =
            occurrenceRaw !== undefined && /^\d+$/.test(occurrenceRaw)
                ? Number(occurrenceRaw)
                : null;

        const checkout = await Checkout.findByPk(baseId, {
            include: [
                {
                    model: Equipment,
                    attributes: [
                        "id",
                        "name",
                        "serial_number",
                        "asset_number",
                        "location",
                    ],
                },
                {
                    model: User,
                    as: "User",
                    attributes: [
                        "id",
                        "username",
                        "first_name",
                        "last_name",
                        "email",
                    ],
                },
                {
                    model: CheckoutRecurrence,
                    as: "Recurrence",
                    required: false,
                },
            ],
        });

        if (!checkout) {
            return res.status(404).json({ message: "Reservation not found." });
        }

        // Occurrence ids only exist for recurring reservations, and only up to
        // the number of occurrences the series actually generates
        if (occurrenceIndex !== null) {
            const recurrence = checkout.Recurrence;
            if (
                !recurrence ||
                (recurrence.max_occurrences &&
                    occurrenceIndex >= recurrence.max_occurrences)
            ) {
                return res
                    .status(404)
                    .json({ message: "Reservation occurrence not found." });
            }
        }

        const method = checkout.status === "cancelled" ? "CANCEL" : "PUBLISH";

        const ics = buildCheckoutIcs({
            checkout,
            equipment: checkout.Equipment,
            user: checkout.User,
            recurrence: checkout.Recurrence,
            method,
            occurrenceIndex,
            eventId,
        });

        if (!ics) {
            return res
                .status(400)
                .json({ message: "Reservation cannot be exported." });
        }

        res.setHeader(
            "Content-Type",
            `text/calendar; charset=utf-8; method=${method}`,
        );
        res.setHeader(
            "Content-Disposition",
            `attachment; filename="${ICS_FILENAME}"`,
        );
        res.setHeader("Cache-Control", "no-store");
        return res.send(ics);
    } catch (err) {
        return next(err);
    }
};

module.exports = { GetCheckoutIcs };
