/**
 * ClippyFigure — the animated paperclip, in twelve builds.
 *
 * THIS IS THE SWAP POINT. Everything else in this folder talks to Clippy through
 * `size` and `art` alone, so replacing the drawing with the real thing —
 * `npm i clippyjs`, `initAgent(Clippy)`, sprite sheets — means rewriting this
 * file and nothing else. Read the notes at the bottom first.
 *
 * TWELVE CLIPS, NOT ONE CLIP IN TWELVE COLOURS. Recolouring alone does not
 * distinguish a badge: at thumbnail size every tier read as the same grey
 * paperclip and the collection looked like a palette. So each tier bends the
 * wire differently and wears a different face. Silhouette carries the identity,
 * eyes confirm it, colour is third.
 *
 * Every shape keeps the same topology — three legs, a bottom U, a top U — so
 * they all still read as a paperclip. Five are the base clip under a transform;
 * seven rebuild the path.
 *
 * ⚠ MIRRORED as geometry in `backend/controllers/clippyBadgeArt.js`, which
 * rasterises the same twelve drawings to PNG for the support-ticket email. The
 * two are independent implementations of one picture; if a path changes here it
 * changes there.
 *
 * Motion: all keyframes are declared on the root and referenced from
 * descendants, which works because emotion serialises this whole `sx` as one
 * unit. Names are `clippy-` prefixed since object-syntax `@keyframes` are NOT
 * scoped by emotion — they land in the global keyframe namespace.
 *
 * Reduced motion needs no handling here: App.js mounts `concourseGlobalStyles`,
 * whose global `prefers-reduced-motion` rule collapses every animation in the
 * app to 0.001ms / one iteration. Per-component blocks are forbidden (ARBITER
 * §8/§15), so do not add one.
 */

import React, { useId } from "react";
import { Box } from "@mui/material";
import { cc } from "../Concourse/ConcourseDialogKit";
import { DEFAULT_ART, wireUnderlay } from "./clippyBadges";

/** The base clip. Three legs at x = 42, 14, 50; bottom U r14; top U r18. */
const BASE =
    "M 42 26 L 42 72 A 14 14 0 0 1 14 72 L 14 30 A 18 18 0 0 1 50 30 L 50 66";

/**
 * The twelve builds. `rot` / `sx` / `sy` are applied about (32, 50) to the whole
 * figure — wire, face and accessories together — so a leaning Clippy leans as
 * one object. `circles` are stroked in the wire colour; `dots` are filled.
 */
const SHAPES = {
    /** standard — the honest paperclip. */
    plain: { d: BASE },
    /** bronze — tilting under the strain. */
    lean: { d: BASE, rot: -12 },
    /** gold — drawn up to its full height. */
    tall: { d: BASE, sx: 0.86, sy: 1.15 },
    /** shades — reclining, entirely at ease. */
    recline: { d: BASE, rot: 14 },
    /** dizzy — squashed, as though it sat down hard. */
    squat: { d: BASE, sx: 1.22, sy: 0.85 },
    /** rainbow — every leg an S-curve. */
    wavy: {
        d: "M 42 26 L 46 37 L 38 48 L 46 60 L 42 72 A 14 14 0 0 1 14 72 L 10 61 L 18 50 L 10 39 L 14 30 A 18 18 0 0 1 50 30 L 54 42 L 46 54 L 50 66",
    },
    /** bolt — legs jagged, like the current went through it. */
    zigzag: {
        d: "M 42 26 L 47 36 L 37 46 L 47 56 L 42 72 A 14 14 0 0 1 14 72 L 9 62 L 19 52 L 9 42 L 14 30 A 18 18 0 0 1 50 30 L 55 40 L 45 50 L 50 66",
    },
    /** bandaged — one leg with a dent in it. */
    kinked: {
        d: "M 42 26 L 42 72 A 14 14 0 0 1 14 72 L 14 62 L 21 54 L 14 46 L 14 30 A 18 18 0 0 1 50 30 L 50 66",
    },
    /** void — wound into itself. */
    spiral: { d: BASE, circles: [[30, 52, 8, 5.2]] },
    /** ember — sagging, with drips coming off the bottom. */
    melting: {
        d: "M 42 26 L 42 66 A 14 14 0 0 1 14 66 L 14 30 A 18 18 0 0 1 50 30 L 50 60",
        dots: [[22, 86, 3.2], [22, 92, 1.9], [35, 84, 2.4]],
    },
    /** glitch — the wire itself dropping frames. The gaps are extra `M`s. */
    broken: {
        d: "M 42 26 L 42 46 M 42 56 L 42 72 A 14 14 0 0 1 14 72 L 14 54 M 14 44 L 14 30 A 18 18 0 0 1 50 30 L 50 66",
    },
    /** ascended — opened out, letting go. */
    unfurled: {
        d: "M 38 26 L 42 72 A 14 14 0 0 1 14 72 L 10 30 A 22 22 0 0 1 54 30 L 58 66",
    },
};

/**
 * Rotate-then-scale about (32, 50). SVG applies a transform list right-to-left,
 * so this reads backwards: translate to origin, rotate, scale, translate back.
 * The backend inverts exactly this, in that order.
 */
const transformFor = ({ rot = 0, sx = 1, sy = 1 }) =>
    !rot && sx === 1 && sy === 1
        ? undefined
        : `translate(32 50) scale(${sx} ${sy}) rotate(${rot}) translate(-32 -50)`;

/** Brow angles. The entire emotional range of a paperclip, in two numbers. */
const BROWS = {
    concerned: { left: -14, right: 14 },
    cheerful: { left: 10, right: -10 },
    furious: { left: 24, right: -24 },
};

/** A four-point sparkle centred on (cx, cy). Used by three accessories. */
const star = (cx, cy, r) =>
    `M ${cx} ${cy - r} L ${cx + r * 0.28} ${cy - r * 0.28} L ${cx + r} ${cy} L ${
        cx + r * 0.28
    } ${cy + r * 0.28} L ${cx} ${cy + r} L ${cx - r * 0.28} ${cy + r * 0.28} L ${
        cx - r
    } ${cy} L ${cx - r * 0.28} ${cy - r * 0.28} Z`;

/* --------------------------------------------------------------- the eyes --- */

const Pupil = (props) => <circle fill={cc.ink} {...props} />;
const White = ({ cx, cy, r = 7 }) => (
    <ellipse cx={cx} cy={cy} rx={r} ry={r * 1.086} fill={cc.srf} stroke={cc.ink} strokeWidth="2.2" />
);

/**
 * A second axis of difference on top of the silhouette. At thumbnail size the
 * face is the first thing read, so two badges in the same colour family still
 * tell apart instantly if one is cross-eyed and the other serene.
 */
const Eyes = ({ kind }) => {
    switch (kind) {
        case "spiral":
            return (
                <>
                    <White cx={24} cy={27} />
                    <White cx={40} cy={27} />
                    <g className="clippy-pupils" fill="none" stroke={cc.ink} strokeWidth="1.7">
                        <circle cx="24" cy="27.5" r="4.4" />
                        <circle cx="24" cy="27.5" r="1.8" />
                        <circle cx="40" cy="27.5" r="4.4" />
                        <circle cx="40" cy="27.5" r="1.8" />
                    </g>
                </>
            );
        case "cross":
            return (
                <>
                    <White cx={24} cy={27} />
                    <White cx={40} cy={27} />
                    <g className="clippy-pupils">
                        <Pupil cx="28.5" cy="28" r="3.1" />
                        <Pupil cx="35.5" cy="28" r="3.1" />
                    </g>
                </>
            );
        case "wide":
            return (
                <>
                    <White cx={24} cy={27} r={8.4} />
                    <White cx={40} cy={27} r={8.4} />
                    <g className="clippy-pupils">
                        <Pupil cx="24.8" cy="27.6" r="2.2" />
                        <Pupil cx="40.8" cy="27.6" r="2.2" />
                    </g>
                </>
            );
        case "offset":
            return (
                <>
                    <White cx={23} cy={25.5} />
                    <White cx={41} cy={29} r={6.4} />
                    <g className="clippy-pupils">
                        <Pupil cx="20.8" cy="23.5" r="3.1" />
                        <Pupil cx="43.4" cy="30.5" r="2.7" />
                    </g>
                </>
            );
        case "wink":
            return (
                <>
                    {/* Left eye shut: an upward arc where the circle would be. */}
                    <path
                        d="M 17.42 24.61 A 7 7 0 0 1 30.58 24.61"
                        fill="none"
                        stroke={cc.ink}
                        strokeWidth="2.6"
                        strokeLinecap="round"
                    />
                    <White cx={40} cy={27} />
                    <g className="clippy-pupils">
                        <Pupil cx="41.4" cy="28" r="3.1" />
                    </g>
                </>
            );
        case "serene":
            // Both shut. No whites at all — just two contented curves.
            return (
                <g fill="none" stroke={cc.ink} strokeWidth="2.8" strokeLinecap="round">
                    <path d="M 30.58 26.39 A 7 7 0 0 1 17.42 26.39" />
                    <path d="M 46.58 26.39 A 7 7 0 0 1 33.42 26.39" />
                </g>
            );
        default:
            return (
                <>
                    <White cx={24} cy={27} />
                    <White cx={40} cy={27} />
                    <g className="clippy-pupils">
                        <Pupil cx="25.4" cy="28" r="3.1" />
                        <Pupil cx="41.4" cy="28" r="3.1" />
                    </g>
                </>
            );
    }
};

/* ------------------------------------------------------------ accessories --- */

/**
 * Three layers, and each accessory belongs to exactly one:
 *
 *   "ghost" — under the wire. Only the glitch ghosts, which have to be
 *             overlapped by the real wire for the aberration to read.
 *   "decor" — ON the wire. Behind it, a crown showed only its tips through the
 *             top curl and read as a pair of cat ears.
 *   "over"  — over the face. Only shades and the bandage.
 */
const Accessory = ({ kind, colour, layer, wire, clipPath }) => {
    if (layer === "ghost") {
        if (kind !== "glitch") return null;
        // Chromatic ghosts of the wire itself, offset either way.
        return (
            <g className="clippy-glitch" fill="none" strokeWidth="5.6" strokeLinecap="round">
                <path d={clipPath} stroke={colour} opacity="0.6" transform="translate(-6 3)" />
                <path d={clipPath} stroke={wire} opacity="0.5" transform="translate(6 -3)" />
            </g>
        );
    }

    if (layer === "over") {
        if (kind === "shades") {
            return (
                <g>
                    <rect x="16.5" y="21" width="15" height="12" rx="5" fill={colour} />
                    <rect x="32.5" y="21" width="15" height="12" rx="5" fill={colour} />
                    <path d="M 31.5 25 L 32.5 25" stroke={colour} strokeWidth="2.6" strokeLinecap="round" />
                    <path d="M 19.5 30 L 24 23.5" stroke={cc.srf} strokeWidth="1.8" strokeLinecap="round" opacity="0.5" />
                    <path d="M 35.5 30 L 40 23.5" stroke={cc.srf} strokeWidth="1.8" strokeLinecap="round" opacity="0.5" />
                </g>
            );
        }
        if (kind === "bandage") {
            return (
                <g transform="rotate(-24 24 13)">
                    <rect x="9" y="7.5" width="30" height="11" rx="4" fill={colour} stroke={cc.mute} strokeWidth="1" />
                    <g fill={cc.mute} opacity="0.55">
                        <circle cx="20" cy="11" r="1.1" />
                        <circle cx="24" cy="13" r="1.1" />
                        <circle cx="28" cy="11" r="1.1" />
                        <circle cx="24" cy="9" r="1.1" />
                    </g>
                </g>
            );
        }
        return null;
    }

    switch (kind) {
        case "crown":
            return (
                <path
                    d="M 22 12 L 25 5 L 32 10 L 39 5 L 42 12 Z"
                    fill={colour}
                    stroke={colour}
                    strokeWidth="1.7"
                    strokeLinejoin="round"
                />
            );
        case "halo":
            return (
                <g className="clippy-sparkles">
                    <ellipse cx="32" cy="4" rx="15" ry="4.6" fill="none" stroke={colour} strokeWidth="3.6" />
                </g>
            );
        case "sweat":
            return <circle cx="53" cy="20.5" r="3.6" fill={colour} opacity="0.92" />;
        case "sparkles":
            return (
                <g fill={colour} className="clippy-sparkles">
                    <path d={star(54, 14, 5)} />
                    <path d={star(9.5, 24, 3.8)} opacity="0.85" />
                    <path d={star(56, 46, 3.2)} opacity="0.7" />
                </g>
            );
        case "stars":
            return (
                <g fill={colour} className="clippy-orbit">
                    <path d={star(19, 7, 4.2)} />
                    <path d={star(32, 3, 4.8)} />
                    <path d={star(45, 7, 4.2)} />
                </g>
            );
        case "bolt":
            return (
                <g className="clippy-sparkles">
                    <path
                        d="M 56 9 L 49 25 L 53 25 L 46 41"
                        fill="none"
                        stroke={colour}
                        strokeWidth="3.4"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    />
                </g>
            );
        case "flames":
            return (
                <g className="clippy-flicker" fill={colour}>
                    <circle cx="26" cy="13" r="3.6" />
                    <circle cx="25.5" cy="7.5" r="2.6" />
                    <circle cx="25" cy="3" r="1.7" />
                    <circle cx="41" cy="13" r="2.8" opacity="0.85" />
                    <circle cx="40.5" cy="8" r="2" opacity="0.85" />
                </g>
            );
        default:
            // `glitch` lands here and renders nothing: it is a "ghost"-layer
            // accessory and has already been drawn under the wire.
            return null;
    }
};

/* ---------------------------------------------------------------- figure --- */

const ClippyFigure = ({ size = 72, art = DEFAULT_ART, sx, ...rest }) => {
    // Gradients need document-unique ids or several figures on one page share
    // the first one's fill.
    const gradientId = `clippy-rainbow-${useId()}`;
    const isRainbow = art.wire === "rainbow";
    const wire = isRainbow ? `url(#${gradientId})` : art.wire;
    const brow = BROWS[art.mood] || BROWS.concerned;
    const shape = SHAPES[art.shape] || SHAPES.plain;
    const transform = transformFor(shape);

    return (
        <Box
            aria-hidden="true"
            sx={{
                width: size,
                height: (size * 96) / 64,
                flex: "none",
                display: "block",
                // Entrance, then a permanent idle bob. `backwards` on the
                // entrance for the same reason every Concourse entrance uses it
                // (see the `anim` note in concourse.js): an animated
                // `transform: none` left behind by `forwards` makes the element
                // a containing block for fixed descendants.
                animation: "clippy-arrive 620ms var(--cc-sp) backwards",
                "& .clippy-body": {
                    animation: "clippy-bob 3400ms ease-in-out infinite",
                    transformBox: "fill-box",
                    transformOrigin: "center",
                },
                "& .clippy-eyes": {
                    animation: "clippy-blink 5200ms ease-in-out infinite",
                    transformBox: "fill-box",
                    transformOrigin: "center",
                },
                "& .clippy-pupils": {
                    animation: "clippy-glance 4100ms ease-in-out infinite",
                    transformBox: "fill-box",
                    transformOrigin: "center",
                },
                "& .clippy-sparkles": {
                    animation: "clippy-twinkle 2200ms ease-in-out infinite",
                    transformBox: "fill-box",
                    transformOrigin: "center",
                },
                "& .clippy-orbit": {
                    animation: "clippy-orbit 3000ms linear infinite",
                    transformBox: "fill-box",
                    transformOrigin: "center",
                },
                "& .clippy-flicker": {
                    animation: "clippy-flicker 900ms ease-in-out infinite",
                    transformBox: "fill-box",
                    transformOrigin: "bottom center",
                },
                "& .clippy-glitch": {
                    animation: "clippy-glitch 1600ms steps(1, end) infinite",
                },
                "@keyframes clippy-arrive": {
                    "0%": { opacity: 0, transform: "translateY(16px) scale(.7) rotate(-12deg)" },
                    "60%": { opacity: 1, transform: "translateY(-4px) scale(1.04) rotate(4deg)" },
                    "100%": { opacity: 1, transform: "none" },
                },
                "@keyframes clippy-bob": {
                    "0%, 100%": { transform: "translateY(0) rotate(0deg)" },
                    "50%": { transform: "translateY(-4px) rotate(-2.5deg)" },
                },
                "@keyframes clippy-blink": {
                    // Open for 92% of the cycle. Two frames 3% apart is what
                    // makes it read as a blink rather than a pulse.
                    "0%, 92%, 100%": { transform: "scaleY(1)" },
                    "95%": { transform: "scaleY(.08)" },
                },
                "@keyframes clippy-glance": {
                    "0%, 40%, 100%": { transform: "translateX(0)" },
                    "55%, 75%": { transform: "translateX(2.4px)" },
                },
                "@keyframes clippy-twinkle": {
                    "0%, 100%": { opacity: 1, transform: "scale(1)" },
                    "50%": { opacity: 0.45, transform: "scale(.78)" },
                },
                "@keyframes clippy-orbit": {
                    from: { transform: "rotate(0deg)" },
                    to: { transform: "rotate(360deg)" },
                },
                "@keyframes clippy-flicker": {
                    "0%, 100%": { transform: "scaleY(1) scaleX(1)", opacity: 1 },
                    "45%": { transform: "scaleY(1.14) scaleX(.92)", opacity: 0.85 },
                    "70%": { transform: "scaleY(.94) scaleX(1.06)", opacity: 1 },
                },
                "@keyframes clippy-glitch": {
                    // `steps(1, end)` above: the jump between offsets is the
                    // effect. Interpolating it would look like a wobble.
                    "0%, 100%": { transform: "translate(0,0)", opacity: 0.9 },
                    "25%": { transform: "translate(2px,-1px)", opacity: 0.5 },
                    "50%": { transform: "translate(-2px,1px)", opacity: 1 },
                    "75%": { transform: "translate(1px,2px)", opacity: 0.6 },
                },
                ...sx,
            }}
            {...rest}
        >
            <Box
                component="svg"
                viewBox="0 0 64 96"
                sx={{ width: "100%", height: "100%", overflow: "visible" }}
            >
                {isRainbow ? (
                    <defs>
                        <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
                            <stop offset="0%" stopColor="#E0433F" />
                            <stop offset="28%" stopColor="#E08A2E" />
                            <stop offset="52%" stopColor="#3F9E5B" />
                            <stop offset="76%" stopColor="#3B7FD4" />
                            <stop offset="100%" stopColor="#8E5BD9" />
                        </linearGradient>
                    </defs>
                ) : null}

                <g className="clippy-body">
                    <g transform={transform}>
                        <Accessory
                            kind={art.accessory}
                            colour={art.accent}
                            wire={wire}
                            clipPath={shape.d}
                            layer="ghost"
                        />

                        {/* The wire, twice: a soft underlay for weight, then the
                            stroke on top. The underlay is an alpha of the wire
                            itself, so it works for a hex, a `var()` and a
                            gradient alike. */}
                        <path
                            d={shape.d}
                            fill="none"
                            stroke={isRainbow ? wire : wireUnderlay(art.wire)}
                            strokeWidth="9.5"
                            strokeLinecap="round"
                            opacity={isRainbow ? 0.28 : 1}
                        />
                        <path
                            d={shape.d}
                            fill="none"
                            stroke={wire}
                            strokeWidth="6.5"
                            strokeLinecap="round"
                        />
                        {(shape.circles || []).map(([cx, cy, r, w], i) => (
                            <circle
                                key={i}
                                cx={cx}
                                cy={cy}
                                r={r}
                                fill="none"
                                stroke={wire}
                                strokeWidth={w}
                                strokeLinecap="round"
                            />
                        ))}
                        {(shape.dots || []).map(([cx, cy, r], i) => (
                            <circle key={i} cx={cx} cy={cy} r={r} fill={wire} />
                        ))}

                        <Accessory
                            kind={art.accessory}
                            colour={art.accent}
                            wire={wire}
                            clipPath={shape.d}
                            layer="decor"
                        />

                        {/* Brows. Rotated about their own centres, so `mood` is
                            a two-number change and nothing else moves. */}
                        <g stroke={cc.ink} strokeWidth="2.6" strokeLinecap="round">
                            <path d="M 19 17 L 28 17" transform={`rotate(${brow.left} 23.5 17)`} />
                            <path d="M 36 17 L 45 17" transform={`rotate(${brow.right} 40.5 17)`} />
                        </g>

                        <g className="clippy-eyes">
                            <Eyes kind={art.eyes} />
                        </g>

                        <Accessory
                            kind={art.accessory}
                            colour={art.accent}
                            wire={wire}
                            clipPath={shape.d}
                            layer="over"
                        />
                    </g>
                </g>
            </Box>
        </Box>
    );
};

export default ClippyFigure;

/* ---------------------------------------------------------------------------
 * SWAPPING IN THE REAL clippyjs — four things that will bite:
 *
 * 1. ASSETS. `clippyjs` resolves sprite sheets and sounds from jsDelivr at
 *    runtime. This app is served from an internal host behind a proxy, so plan
 *    on copying the Clippy agent folder into `public/clippy/` and pointing the
 *    library at it. A CDN fetch that silently fails leaves you with an invisible
 *    agent and no error.
 *
 * 2. CRA + ESM. The package ships `dist/index.mjs` only. react-scripts 5's
 *    webpack config has known `fullySpecified` trouble resolving `.mjs`
 *    sub-imports; budget for a resolve tweak, which in CRA means ejecting or
 *    CRACO. Verify `npm run build`, not just `npm start`.
 *
 * 3. DARK MODE. The sprites are fixed art on a light-ish palette. Whatever
 *    surface you sit the agent on has to stay light in both schemes, or Clippy
 *    arrives glowing.
 *
 * 4. THE BADGES. Twelve builds out of one recolourable, re-bendable drawing is
 *    the thing a sprite sheet cannot give you. If you swap in the real Clippy,
 *    either keep THIS component for the badge grid in My Account, or pick
 *    different AGENTS (Clippy / Merlin / Rover / Genie / Bonzi / Peedy / Links /
 *    Rocky / F1 / Genius) as the tiers — there are ten, and twelve badges.
 *
 * The props to keep: `size` and `art`. `art.mood` maps cleanly onto the
 * library's animations — concerned → `play("GetAttention")`, cheerful →
 * `play("Congratulate")`, furious → `play("GetArtsy")`.
 * ------------------------------------------------------------------------- */
