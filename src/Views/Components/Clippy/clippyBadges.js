/**
 * The Clippy badge catalogue — client copy.
 *
 * ⚠ MIRRORS `backend/controllers/clippyBadges.js`. Keys, thresholds and names
 * must match it exactly; that file is authoritative for what actually gets
 * awarded, and this one only decides what is DRAWN.
 *
 * The duplication is real and unavoidable. The client has to switch Clippy's
 * appearance the instant the count crosses a threshold — mid-tantrum, with no
 * round-trip — and the server can never take the client's word for a badge. Two
 * independent deciders need two copies. There is no shared module path between
 * `src/` and `backend/`: CRA refuses imports from outside `src/`.
 *
 * `art` is client-only and has no server counterpart.
 */

import { alpha } from "../../../Utilites/concourse";
import { cc } from "../Concourse/ConcourseDialogKit";

/**
 * Metal colours are fixed hex, not tokens, on purpose: bronze and gold are
 * supposed to look like bronze and gold in both schemes. Each was picked to sit
 * legibly on `srf` (#FFFFFF) and on dark `srf` (#211C1F) alike.
 */
export const BADGES = [
    {
        key: "standard",
        at: 6,
        name: "Standard Issue",
        flavour: "Six clicks and a dream.",
        art: {
            wire: cc.mute,
            accent: cc.mute,
            accessory: "none",
            mood: "concerned",
            shape: "plain",
            eyes: "normal",
        },
    },
    {
        key: "bronze",
        at: 12,
        name: "Bronze Clip",
        flavour: "A dozen clicks. The button remains unmoved.",
        art: {
            wire: "#B0764A",
            accent: "#5B9DD9",
            accessory: "sweat",
            mood: "concerned",
            shape: "lean",
            eyes: "normal",
        },
    },
    {
        key: "gold",
        at: 20,
        name: "Gold Clip",
        flavour: "Twenty clicks. Somebody get this person a coffee.",
        art: {
            wire: "#D9A521",
            accent: "#D9A521",
            accessory: "crown",
            mood: "cheerful",
            shape: "tall",
            eyes: "normal",
        },
    },
    {
        key: "rainbow",
        at: 32,
        name: "Rainbow Clip",
        flavour: "Thirty-two clicks. This is now a hobby.",
        art: {
            wire: "rainbow",
            accent: "#8E5BD9",
            accessory: "sparkles",
            mood: "cheerful",
            shape: "wavy",
            eyes: "normal",
        },
    },
    {
        key: "void",
        at: 50,
        name: "Void Clip",
        flavour:
            "Fifty clicks. Clippy has stopped taking notes and started taking sides.",
        art: {
            wire: cc.red,
            accent: cc.red,
            accessory: "spiral",
            mood: "furious",
            shape: "spiral",
            eyes: "spiral",
        },
    },
    {
        key: "bandaged",
        at: 75,
        name: "Field Repair",
        flavour: "Seventy-five. We've had to tape the mouse back together.",
        art: {
            wire: "#8A9BA8",
            accent: "#F0E2CE",
            accessory: "bandage",
            mood: "concerned",
            shape: "kinked",
            eyes: "wink",
        },
    },
    {
        key: "shades",
        at: 110,
        name: "Unbothered",
        flavour:
            "A hundred and ten clicks, and an expression of total calm. Nobody is fooled.",
        art: {
            wire: "#3A4550",
            accent: "#1D242B",
            accessory: "shades",
            mood: "cheerful",
            shape: "recline",
            eyes: "normal",
        },
    },
    {
        key: "dizzy",
        at: 160,
        name: "Seeing Stars",
        flavour: "A hundred and sixty. The room is spinning, slightly.",
        art: {
            wire: "#6A8FBF",
            accent: "#E0B62E",
            accessory: "stars",
            mood: "furious",
            shape: "squat",
            eyes: "cross",
        },
    },
    {
        key: "bolt",
        at: 250,
        name: "Overclocked",
        flavour: "Two hundred and fifty clicks. Your mouse has filed its own ticket.",
        art: {
            wire: "#3B7FD4",
            accent: "#F2C230",
            accessory: "bolt",
            mood: "furious",
            shape: "zigzag",
            eyes: "wide",
        },
    },
    {
        key: "ember",
        at: 400,
        name: "Combustion",
        flavour: "Four hundred. Something is smoking and we think it's the desk.",
        art: {
            wire: "#E0562E",
            accent: "#F2A03D",
            accessory: "flames",
            mood: "furious",
            shape: "melting",
            eyes: "normal",
        },
    },
    {
        key: "glitch",
        at: 650,
        name: "Kernel Panic",
        flavour: "Six hundred and fifty. Clippy has begun to flicker.",
        art: {
            wire: "#35D6A0",
            accent: "#FF4FD8",
            accessory: "glitch",
            mood: "furious",
            shape: "broken",
            eyes: "offset",
        },
    },
    {
        key: "ascended",
        at: 1000,
        name: "Ascended",
        flavour:
            "One thousand clicks. You have transcended the software. It still doesn't work.",
        art: {
            wire: "#E4D9A6",
            accent: "#F5E27A",
            accessory: "halo",
            mood: "cheerful",
            shape: "unfurled",
            eyes: "serene",
        },
    },
];

/** The badge a click count currently qualifies for, or null below the first. */
export const badgeFor = (clicks) => {
    let found = null;
    for (const badge of BADGES) {
        if (clicks >= badge.at) found = badge;
    }
    return found;
};

/*
 * There is deliberately no `nextBadgeAfter` helper. Nothing in the UI names the
 * next tier or counts down to it: this is an easter egg, and a visible ladder
 * would turn discovering it into grinding it.
 */

/** Look one up by key — how a server-sent catalogue finds its art. */
export const badgeByKey = (key) => BADGES.find((badge) => badge.key === key) || null;

/** The default figure: what Clippy looks like before any tier is reached. */
export const DEFAULT_ART = BADGES[0].art;

/** The soft underlay stroke behind the wire. Works for hex and for `var()`. */
export const wireUnderlay = (colour) => alpha(colour, 0.28);
