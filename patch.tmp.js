const fs = require("fs");

// shape + eyes per badge key. Silhouette is the primary identifier; eyes the second.
const EXTRA = {
  standard: 'shape: "plain",    eyes: "normal"',
  bronze:   'shape: "lean",     eyes: "normal"',
  gold:     'shape: "tall",     eyes: "normal"',
  rainbow:  'shape: "wavy",     eyes: "normal"',
  void:     'shape: "spiral",   eyes: "spiral"',
  bandaged: 'shape: "kinked",   eyes: "wink"',
  shades:   'shape: "recline",  eyes: "normal"',
  dizzy:    'shape: "squat",    eyes: "cross"',
  bolt:     'shape: "zigzag",   eyes: "wide"',
  ember:    'shape: "melting",  eyes: "normal"',
  glitch:   'shape: "broken",   eyes: "offset"',
  ascended: 'shape: "unfurled", eyes: "serene"',
};

for (const file of [
  "backend/controllers/clippyBadges.js",
  "src/Views/Components/Clippy/clippyBadges.js",
]) {
  let s = fs.readFileSync(file, "utf8");
  let n = 0;
  s = s.replace(
    /art: \{ wire: ("(?:[^"]*)"), accent: ("(?:[^"]*)"), accessory: "([a-z]+)", mood: ("[a-z]+") \}/g,
    (m, wire, accent, accessory, mood) => {
      // Find which key this belongs to by looking backwards is fiddly; instead
      // key off the accessory, which is unique per tier.
      const byAccessory = {
        none: "standard", sweat: "bronze", crown: "gold", sparkles: "rainbow",
        spiral: "void", bandage: "bandaged", shades: "shades", stars: "dizzy",
        bolt: "bolt", flames: "ember", glitch: "glitch", halo: "ascended",
      };
      const key = byAccessory[accessory];
      if (!key) throw new Error("unknown accessory " + accessory);
      n++;
      return `art: {\n            wire: ${wire},\n            accent: ${accent},\n            accessory: "${accessory}",\n            mood: ${mood},\n            ${EXTRA[key]},\n        }`;
    }
  );
  if (n !== 12) throw new Error(`${file}: patched ${n}, expected 12`);
  fs.writeFileSync(file, s);
  console.log(`${file}: 12 tiers given shape + eyes`);
}
