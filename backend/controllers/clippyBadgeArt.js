const zlib = require("zlib");
const { TIERS, tierFor } = require("./clippyBadges");

/**
 * Renders a badge Clippy as a real PNG, served from a public URL and embedded in
 * a support ticket with a plain `<img>`.
 *
 * WHY A PNG BEHIND A PUBLIC LINK — the other four routes all fail:
 *
 *   - Inline `<svg>` is dropped by Outlook (which renders mail through Word) and
 *     stripped by Gmail. Between them, that is the whole mail estate.
 *   - `<img src="cid:…">` pointing at an SVG shows a broken-image icon in
 *     Outlook; `cid` only helps if the payload is already a raster.
 *   - `data:` URIs are blocked by both Outlook and Gmail.
 *   - An attachment is not embedded — the reader has to go and open it.
 *
 * A `<img>` pointing at an ordinary https PNG is the one thing that renders
 * everywhere. Gmail proxies it through googleusercontent, which is exactly why
 * the route serving these is unauthenticated: the fetcher is a mail client or an
 * image proxy, and it has no JWT. That is safe because a badge PNG is a picture
 * of a paperclip — there are twelve of them, they are identical for every user,
 * and they carry no personal data whatsoever.
 *
 * NO RASTERISER DEPENDENCY. `sharp` and `canvas` are both native modules and
 * this is an easter egg. Node ships `zlib`, and a PNG is four chunks around a
 * deflate stream, so the encoder at the bottom of this file is ~40 lines and the
 * rasteriser above it is exact rather than traced: the shapes are the SAME
 * geometry as `src/Views/Components/Clippy/ClippyFigure.jsx` — the identical
 * three segments and two arcs — and a pixel is filled when it falls inside one.
 * Nothing was redrawn by hand, so nothing can drift out of proportion.
 *
 * Accessories are approximations. Sparkles become dots and flames become stacked
 * dots; at this size that is all the resolution can carry, and a badge's
 * identity is mostly its colour and silhouette. `glitch` is the exception that
 * survives perfectly, because it is just the wire drawn twice.
 */

/* ------------------------------------------------------------- geometry --- */

/** The render window in ClippyFigure's own coordinate space. */
const BOX = { x: 6, y: -2, w: 52, h: 94 };

/** Output resolution. 3 device pixels per design unit. */
const SCALE = 3;
const WIDTH = BOX.w * SCALE; // 156
const HEIGHT = BOX.h * SCALE; // 282

/** Displayed size in the email — half the raster, so it stays crisp on HiDPI. */
const DISPLAY_WIDTH = Math.round(WIDTH / 2);
const DISPLAY_HEIGHT = Math.round(HEIGHT / 2);

/** 2x2 supersampling. The difference between smooth curves and a staircase. */
const SUB = 2;

const SRF = [255, 255, 255];
const INK = [35, 26, 29];

const BROWS = {
    concerned: { left: -14, right: 14 },
    cheerful: { left: 10, right: -10 },
    furious: { left: 24, right: -24 },
};

const hexToRgb = (hex) => {
    const h = String(hex).replace("#", "");
    const n = parseInt(h, 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};

const rotate = (x, y, deg, cx, cy) => {
    const r = (deg * Math.PI) / 180;
    const dx = x - cx;
    const dy = y - cy;
    return [
        cx + dx * Math.cos(r) - dy * Math.sin(r),
        cy + dx * Math.sin(r) + dy * Math.cos(r),
    ];
};

/* ------------------------------------------------------------ primitives --- */
/* Each returns a predicate: does this point lie inside the shape? */

const seg = (x1, y1, x2, y2, half) => (px, py) => {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const len2 = dx * dx + dy * dy;
    const t =
        len2 === 0
            ? 0
            : Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / len2));
    return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy)) <= half;
};

/**
 * An arc of a circle, `a0`..`a1` in degrees, measured the way SVG measures with
 * y pointing DOWN: 0 is east, 90 is south, 270 is north.
 */
const arc = (cx, cy, r, a0, a1, half) => (px, py) => {
    let a = (Math.atan2(py - cy, px - cx) * 180) / Math.PI;
    if (a < 0) a += 360;
    const inSweep = a1 >= a0 ? a >= a0 && a <= a1 : a >= a0 || a <= a1;
    if (!inSweep) return false;
    return Math.abs(Math.hypot(px - cx, py - cy) - r) <= half;
};

const disc = (cx, cy, r) => (px, py) => Math.hypot(px - cx, py - cy) <= r;

const ring = (cx, cy, r, half) => (px, py) =>
    Math.abs(Math.hypot(px - cx, py - cy) - r) <= half;

const ellipseRing = (cx, cy, rx, ry, half) => (px, py) => {
    const k = Math.hypot((px - cx) / rx, (py - cy) / ry);
    return Math.abs(k - 1) * Math.min(rx, ry) <= half;
};

const rect =
    (x, y, w, h, deg = 0, ox = x + w / 2, oy = y + h / 2) =>
    (px, py) => {
        const [rx, ry] = deg ? rotate(px, py, -deg, ox, oy) : [px, py];
        return rx >= x && rx <= x + w && ry >= y && ry <= y + h;
    };

/** Round-capped polyline — what an SVG stroke over several points actually is. */
const poly = (points, half) => {
    const segs = [];
    for (let i = 0; i < points.length - 1; i++) {
        segs.push(
            seg(points[i][0], points[i][1], points[i + 1][0], points[i + 1][1], half)
        );
    }
    return (px, py) => segs.some((hit) => hit(px, py));
};

/* ----------------------------------------------------------------- paths --- */

/**
 * TWELVE CLIPS, NOT ONE CLIP IN TWELVE COLOURS.
 *
 * Recolouring alone does not distinguish a badge — at thumbnail size every tier
 * read as the same grey paperclip and the collection looked like a palette. So
 * each tier bends the wire differently: the silhouette carries the identity and
 * the colour only confirms it.
 *
 * Five are the base clip under a transform (cheap, and still clearly a different
 * object); seven genuinely rebuild the path. Every one keeps the same topology —
 * three legs, a bottom U, a top U — so they all still read as a paperclip.
 *
 * `rot` / `sx` / `sy` are applied about (32, 50) to EVERYTHING, wire and face and
 * accessories alike, so a leaning Clippy leans as one object.
 *
 * ⚠ MIRRORED as SVG path strings in `src/Views/Components/Clippy/ClippyFigure.jsx`.
 */
const ORIGIN = { x: 32, y: 50 };

/** The base clip. Three legs at x = 42, 14, 50; bottom U r14; top U r18. */
const basePath = (half) => [
    seg(42, 26, 42, 72, half),
    arc(28, 72, 14, 0, 180, half), // bottom U, through +y
    seg(14, 72, 14, 30, half),
    arc(32, 30, 18, 180, 360, half), // top U, through -y
    seg(50, 30, 50, 66, half),
];

/**
 * Shifts a set of predicates by testing the offset point instead.
 *
 * This exists because the glitch ghosts need the wire drawn twice, displaced.
 * An earlier version threaded `dx`/`dy` down into the path builders — but only
 * `basePath` ever used them, so every rebuilt shape silently ignored the offset
 * and drew its ghosts exactly under the wire, where they were invisible. The
 * `glitch` badge uses `broken`, so that was precisely the one badge affected.
 * Doing it out here means it cannot be forgotten by a new shape.
 */
const translated = (shapes, dx, dy) =>
    !dx && !dy ? shapes : shapes.map((hit) => (px, py) => hit(px - dx, py - dy));

const SHAPES = {
    /** standard — the honest paperclip. */
    plain: { build: basePath },

    /** bronze — tilting under the strain. */
    lean: { build: basePath, rot: -12 },

    /** gold — drawn up to its full height. */
    tall: { build: basePath, sx: 0.86, sy: 1.15 },

    /** shades — reclining, entirely at ease. */
    recline: { build: basePath, rot: 14 },

    /** dizzy — squashed, as though it sat down hard. */
    squat: { build: basePath, sx: 1.22, sy: 0.85 },

    /** rainbow — every leg an S-curve. */
    wavy: {
        build: (half) => [
            poly([[42, 26], [46, 37], [38, 48], [46, 60], [42, 72]], half),
            arc(28, 72, 14, 0, 180, half),
            poly([[14, 72], [10, 61], [18, 50], [10, 39], [14, 30]], half),
            arc(32, 30, 18, 180, 360, half),
            poly([[50, 30], [54, 42], [46, 54], [50, 66]], half),
        ],
    },

    /** bolt — legs jagged, like the current went through it. */
    zigzag: {
        build: (half) => [
            poly([[42, 26], [47, 36], [37, 46], [47, 56], [42, 72]], half),
            arc(28, 72, 14, 0, 180, half),
            poly([[14, 72], [9, 62], [19, 52], [9, 42], [14, 30]], half),
            arc(32, 30, 18, 180, 360, half),
            poly([[50, 30], [55, 40], [45, 50], [50, 66]], half),
        ],
    },

    /** bandaged — one leg with a dent in it. */
    kinked: {
        build: (half) => [
            seg(42, 26, 42, 72, half),
            arc(28, 72, 14, 0, 180, half),
            poly([[14, 72], [14, 62], [21, 54], [14, 46], [14, 30]], half),
            arc(32, 30, 18, 180, 360, half),
            seg(50, 30, 50, 66, half),
        ],
    },

    /** void — wound into itself. */
    spiral: {
        build: (half) => [...basePath(half), ring(30, 52, 8, half * 0.8)],
    },

    /** ember — sagging, with drips coming off the bottom. */
    melting: {
        build: (half) => [
            seg(42, 26, 42, 66, half),
            arc(28, 66, 14, 0, 180, half),
            seg(14, 66, 14, 30, half),
            arc(32, 30, 18, 180, 360, half),
            seg(50, 30, 50, 60, half),
            disc(22, 86, 3.2),
            disc(22, 92, 1.9),
            disc(35, 84, 2.4),
        ],
    },

    /** glitch — the wire itself dropping frames. */
    broken: {
        build: (half) => [
            seg(42, 26, 42, 46, half),
            seg(42, 56, 42, 72, half),
            arc(28, 72, 14, 0, 180, half),
            seg(14, 72, 14, 54, half),
            seg(14, 44, 14, 30, half),
            arc(32, 30, 18, 180, 360, half),
            seg(50, 30, 50, 66, half),
        ],
    },

    /** ascended — opened out, letting go. */
    unfurled: {
        build: (half) => [
            seg(38, 26, 42, 72, half),
            arc(28, 72, 14, 0, 180, half),
            seg(14, 72, 10, 30, half),
            arc(32, 30, 22, 180, 360, half),
            seg(54, 30, 58, 66, half),
        ],
    },
};

const wirePath = (shape, half = 3.25, dx = 0, dy = 0) =>
    translated((SHAPES[shape] || SHAPES.plain).build(half), dx, dy);

/**
 * Wraps predicates so they are tested in the shape's own untransformed space.
 * Forward is rotate-then-scale about ORIGIN, so the inverse is unscale then
 * unrotate.
 */
const applyTransform = (shapes, shape) => {
    const { rot = 0, sx = 1, sy = 1 } = SHAPES[shape] || {};
    if (!rot && sx === 1 && sy === 1) return shapes;
    const r = (-rot * Math.PI) / 180;
    const cos = Math.cos(r);
    const sin = Math.sin(r);
    return shapes.map((hit) => (px, py) => {
        const ux = (px - ORIGIN.x) / sx;
        const uy = (py - ORIGIN.y) / sy;
        return hit(
            ORIGIN.x + ux * cos - uy * sin,
            ORIGIN.y + ux * sin + uy * cos
        );
    });
};

/** Accessory shapes drawn BEFORE the wire. */
const underShapes = (kind) => {
    switch (kind) {
        case "crown":
            return [poly([[22, 12], [25, 5], [32, 10], [39, 5], [42, 12], [22, 12]], 1.7)];
        case "halo":
            return [ellipseRing(32, 4, 15, 4.6, 1.8)];
        case "sweat":
            return [disc(53, 20.5, 3.6)];
        case "sparkles":
            return [disc(54, 14, 3), disc(9.5, 24, 2.3), disc(56, 46, 2)];
        case "stars":
            return [disc(19, 7, 2.8), disc(32, 3, 3.2), disc(45, 7, 2.8)];
        case "bolt":
            return [poly([[56, 9], [49, 25], [53, 25], [46, 41]], 1.7)];
        case "flames":
            // A flame at this size is a stack of shrinking discs.
            return [
                disc(26, 13, 3.6),
                disc(25.5, 7.5, 2.6),
                disc(25, 3, 1.7),
                disc(41, 13, 2.8),
                disc(40.5, 8, 2),
            ];
        default:
            return [];
    }
};

/** Accessory shapes drawn AFTER the eyes — the ones that cover the face. */
const overShapes = (kind) => {
    if (kind === "shades") {
        return [rect(16.5, 21, 15, 12), rect(32.5, 21, 15, 12), rect(31, 24, 3, 2)];
    }
    if (kind === "bandage") {
        return [rect(9, 7.5, 30, 11, -24, 24, 13)];
    }
    return [];
};

/* ------------------------------------------------------------ rendering --- */

/** Rainbow is a horizontal gradient; every other wire is one flat colour. */
const RAINBOW = ["#E0433F", "#E08A2E", "#3F9E5B", "#3B7FD4", "#8E5BD9"].map(hexToRgb);

const lerp = (a, b, t) => a + (b - a) * t;

const rainbowAt = (px) => {
    const t = Math.max(0, Math.min(1, (px - BOX.x) / BOX.w));
    const pos = t * (RAINBOW.length - 1);
    const i = Math.min(RAINBOW.length - 2, Math.floor(pos));
    const f = pos - i;
    return [0, 1, 2].map((c) => lerp(RAINBOW[i][c], RAINBOW[i + 1][c], f));
};

/**
 * Eye variants. A second axis of difference on top of the silhouette: at
 * thumbnail size the face is the first thing read, so two badges sharing a
 * colour family still tell apart instantly if one is cross-eyed and the other
 * serene.
 */
const eyeShapes = (kind) => {
    const whites = [disc(24, 27, 7), disc(40, 27, 7)];
    const rings = [ring(24, 27, 7, 1.15), ring(40, 27, 7, 1.15)];

    switch (kind) {
        case "spiral":
            return {
                whites,
                rings,
                pupils: [
                    ring(24, 27.5, 4.4, 0.85),
                    ring(24, 27.5, 1.8, 0.85),
                    ring(40, 27.5, 4.4, 0.85),
                    ring(40, 27.5, 1.8, 0.85),
                ],
            };
        case "cross":
            // Both pupils dragged toward the nose.
            return { whites, rings, pupils: [disc(28.5, 28, 3.1), disc(35.5, 28, 3.1)] };
        case "wide":
            // Big whites, tiny pupils — the look of pure alarm.
            return {
                whites: [disc(24, 27, 8.4), disc(40, 27, 8.4)],
                rings: [ring(24, 27, 8.4, 1.15), ring(40, 27, 8.4, 1.15)],
                pupils: [disc(24.8, 27.6, 2.2), disc(40.8, 27.6, 2.2)],
            };
        case "offset":
            // Mismatched, as though the two halves are on different frames.
            return {
                whites: [disc(23, 25.5, 7), disc(41, 29, 6.4)],
                rings: [ring(23, 25.5, 7, 1.15), ring(41, 29, 6.4, 1.15)],
                pupils: [disc(20.8, 23.5, 3.1), disc(43.4, 30.5, 2.7)],
            };
        case "wink":
            // Left eye shut — a bracket instead of a circle.
            return {
                whites: [disc(40, 27, 7)],
                rings: [ring(40, 27, 7, 1.15), arc(24, 27, 7, 200, 340, 1.5)],
                pupils: [disc(41.4, 28, 3.1)],
            };
        case "serene":
            // Both shut. No whites at all — just two contented arcs.
            return {
                whites: [],
                rings: [arc(24, 24, 7, 20, 160, 1.6), arc(40, 24, 7, 20, 160, 1.6)],
                pupils: [],
            };
        default:
            return { whites, rings, pupils: [disc(25.4, 28, 3.1), disc(41.4, 28, 3.1)] };
    }
};

/** The layer stack, in the same z-order the React component draws in. */
const layersFor = (art) => {
    const { wire, accent, accessory, mood, shape = "plain", eyes = "normal" } = art;
    const brow = BROWS[mood] || BROWS.concerned;
    const accentRgb = hexToRgb(accent);
    const isRainbow = wire === "rainbow";
    const wireRgb = isRainbow ? null : hexToRgb(wire);
    const { whites, rings, pupils } = eyeShapes(eyes);

    const browShape = (x1, x2, deg, ox) => {
        const [ax, ay] = rotate(x1, 17, deg, ox, 17);
        const [bx, by] = rotate(x2, 17, deg, ox, 17);
        return seg(ax, ay, bx, by, 1.35);
    };

    return [
        // Chromatic ghosts, offset either way — the one accessory that survives
        // at any resolution, because it IS the wire.
        ...(accessory === "glitch"
            ? [
                  { shapes: wirePath(shape, 2.8, -6, 3), rgb: accentRgb },
                  { shapes: wirePath(shape, 2.8, 6, -3), rgb: hexToRgb("#9BEBD2") },
              ]
            : []),
        { shapes: wirePath(shape, 3.25), rgb: wireRgb, rainbow: isRainbow },
        // Decorations sit ON the wire, not behind it. Behind, a crown showed
        // only its tips through the top curl and read as a pair of cat ears.
        { shapes: underShapes(accessory), rgb: accentRgb },
        { shapes: [browShape(19, 28, brow.left, 23.5), browShape(36, 45, brow.right, 40.5)], rgb: INK },
        { shapes: whites, rgb: SRF },
        { shapes: rings, rgb: INK },
        { shapes: pupils, rgb: INK },
        { shapes: overShapes(accessory), rgb: accentRgb },
    ].map((layer) => ({ ...layer, shapes: applyTransform(layer.shapes, shape) }));
};

/** RGBA pixel buffer for one badge. Later layers win; misses stay transparent. */
const rasterise = (art) => {
    const layers = layersFor(art);
    const pixels = Buffer.alloc(WIDTH * HEIGHT * 4);

    for (let y = 0; y < HEIGHT; y++) {
        for (let x = 0; x < WIDTH; x++) {
            let r = 0;
            let g = 0;
            let b = 0;
            let hits = 0;

            // Supersample: SUB x SUB probes per pixel, averaged. Coverage becomes
            // the alpha, which is what turns a staircase into a curve.
            for (let sy = 0; sy < SUB; sy++) {
                for (let sx = 0; sx < SUB; sx++) {
                    const px = BOX.x + (x + (sx + 0.5) / SUB) / SCALE;
                    const py = BOX.y + (y + (sy + 0.5) / SUB) / SCALE;
                    let rgb = null;
                    for (const layer of layers) {
                        if (layer.shapes.some((hit) => hit(px, py))) {
                            rgb = layer.rainbow ? rainbowAt(px) : layer.rgb;
                        }
                    }
                    if (rgb) {
                        r += rgb[0];
                        g += rgb[1];
                        b += rgb[2];
                        hits++;
                    }
                }
            }

            if (!hits) continue;
            const i = (y * WIDTH + x) * 4;
            pixels[i] = Math.round(r / hits);
            pixels[i + 1] = Math.round(g / hits);
            pixels[i + 2] = Math.round(b / hits);
            pixels[i + 3] = Math.round((hits / (SUB * SUB)) * 255);
        }
    }
    return pixels;
};

/* ----------------------------------------------------------- PNG encoder --- */

const CRC_TABLE = (() => {
    const table = new Int32Array(256);
    for (let n = 0; n < 256; n++) {
        let c = n;
        for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
        table[n] = c;
    }
    return table;
})();

const crc32 = (buf) => {
    let c = 0xffffffff;
    for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
    return (c ^ 0xffffffff) >>> 0;
};

/** length | type | data | crc(type+data) — the PNG chunk layout. */
const chunk = (type, data) => {
    const head = Buffer.alloc(4);
    head.writeUInt32BE(data.length, 0);
    const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(body), 0);
    return Buffer.concat([head, body, crc]);
};

/** 8-bit RGBA, no interlace. Every scanline uses filter 0 (None). */
const encodePng = (pixels, width, height) => {
    const ihdr = Buffer.alloc(13);
    ihdr.writeUInt32BE(width, 0);
    ihdr.writeUInt32BE(height, 4);
    ihdr[8] = 8; // bit depth
    ihdr[9] = 6; // colour type: RGBA
    ihdr[10] = 0; // deflate
    ihdr[11] = 0; // adaptive filtering
    ihdr[12] = 0; // no interlace

    const stride = width * 4;
    const raw = Buffer.alloc((stride + 1) * height);
    for (let y = 0; y < height; y++) {
        raw[y * (stride + 1)] = 0; // filter: None
        pixels.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
    }

    return Buffer.concat([
        Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
        chunk("IHDR", ihdr),
        chunk("IDAT", zlib.deflateSync(raw, { level: 9 })),
        chunk("IEND", Buffer.alloc(0)),
    ]);
};

/* -------------------------------------------------------------- exports --- */

/**
 * Generated once per process and kept. Twelve badges, identical for every user,
 * and the rasteriser is the only expensive thing here (~1.7M point-in-shape
 * tests per badge) — so it must never run per request.
 */
const cache = new Map();

/** The PNG for a badge key, or null if the key is not one of ours. */
const badgePngForKey = (key) => {
    if (cache.has(key)) return cache.get(key);
    const tier = TIERS.find((t) => t.key === key);
    if (!tier) return null;
    const png = encodePng(rasterise(tier.art), WIDTH, HEIGHT);
    cache.set(key, png);
    return png;
};

/** The badge a click count earns, as a PNG. Null below the lowest threshold. */
const badgePngForClicks = (clicks) => {
    const tier = tierFor(clicks);
    return tier ? badgePngForKey(tier.key) : null;
};

module.exports = {
    badgePngForKey,
    badgePngForClicks,
    WIDTH,
    HEIGHT,
    DISPLAY_WIDTH,
    DISPLAY_HEIGHT,
};
