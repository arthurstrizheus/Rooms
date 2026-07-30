import { createTheme } from "@mui/material/styles";
import { concourse } from "./concourse";

// No one expects the S-E-A Inquisition!
// Your colors have been updated with the noble S-E-A palette,
// because apparently our previous blue and purple were far too sane.

const primary = {
  // === Primary Palette ===
  // And now for something completely red.
  // S-E-A Red: PANTONE 186 C — as flamboyant as the French Tauntauns in Holy Grail.
  light: "#F9DBDE", // Tint of S-E-A Red (a polite blush)
  lightHover: "#FCEEEF", // Hover tint, for the faint-of-heart
  main: "#C8102E", // The glorious S-E-A Red
  dark: "#93272C", // Dark Red — for when you need extra drama
  selected: "#D33F57", // Regular “selected” state (because main alone wasn’t dramatic enough)
  darkSelected: "#6D1A1E", // A deeper red for truly decisive clicks
  text: {
    main: "#FFFFFF", // Text that screams “STOP!” like the Knights who say “Ni!”
    light: "#F8B5BC", // Gentle red-tinged text
    dark: "#E37C8C", // Slightly more… assertive
  },
  contrastText: "#FFFFFF", // Because contrast is not just for relationships
};

const secondary = {
  // === Secondary Palette ===
  // Warm Gray: like the dusty path to Camelot
  light: "#D7D2CB", // Cozy Warm Gray
  lightHover: "#EFECE9", // Hover version — softer than a shrubbery
  selected: "#000000", // Regular “selected” – because nothing says “selected” like abyssal black
  main: "#333333", // Charcoal — the color of burnt toasters
  dark: "#000000", // Black — the void gazes also into your app
  text: {
    main: "#FFFFFF", // White text to taunt the darkness
    light: "#BDBDBD", // Mid-gray for half-hearted commentary
    dark: "#757575", // Dark-gray for proper disdain
  },
  contrastText: "#FFFFFF", // Always polite
};

const alerts = {
  // === Alerts ===
  // Error: red, because YOU SHALL NOT PASS.
  error: "#C8102E",
  // Warning: mustard yellow, like a polite “nim?” from the guards
  warning: "#E1D53F",
  // Success: green as the lush fields of Swamp Castle
  success: "#56BA33",
};

const fills = {
  // === Fills ===
  // Light and dark fills, for days when you can’t decide on mid-tones.
  light: {
    main: "#D7D2CB", // Warm Gray background
    light: "#FFFFFF", // When you absolutely need white
    dark: "#817F79", // Gray 2 — because variety is the spice of life
    lightHover: "#F7F4F1", // Hover fill: tender as a kitten
  },
  dark: {
    main: "#333333", // Charcoal — the abyss gazes back
    light: "#817F79", // Gray 2 — for rebellious contrast
    dark: "#000000", // Black — nightmare fuel
    secondary: "#93272C", // Dark Red — neighbor to the abyss
  },
  alert: {
    success: "#56BA33",
    successLight: "#D8F0D8", // Soft kudos
    successDark: "#3C7A26", // Serious praise
    error: "#C8102E",
    errorLight: "#F4B5B8", // Sympathy for mistakes
    errorDark: "#8E0F17", // Grim error mountaintop
    warning: "#E1D53F",
    warningLight: "#FAF3C9", // Subtle “tread carefully”
    warningDark: "#AFA12F", // “I told you so”
  },
};

const borders = {
  // === Borders ===
  // Frame things, as if there were any sense in that.
  main: "#C8102E", // Angry red frames
  secondary: "#333333", // Charcoal borders
  light: "#D7D2CB", // Gentle Warm Gray lines
};

const theme = (mode) =>
  createTheme({
    palette: {
      mode,
      primary: {
        light: primary.light,
        lightHover: primary.lightHover,
        main: primary.main,
        dark: primary.dark,
        selected: primary.selected,
        darkSelected: primary.darkSelected,
        text: primary.text,
        contrastText: primary.contrastText,
      },
      secondary: {
        light: secondary.light,
        lightHover: secondary.lightHover,
        main: secondary.main,
        dark: secondary.dark,
        text: secondary.text,
        contrastText: secondary.contrastText,
      },
      background: {
        default: mode === "light" ? "#FFFFFF" : "#2C2C2C",
        paper: mode === "light" ? "#FAF8F6" : "#333333",
        fill: fills,
      },
      border: borders,
      text: {
        primary: mode === "light" ? "#212121" : "#FFFFFF",
        secondary: mode === "light" ? "#757575" : "#BDBDBD",
      },
      alert: alerts,
    },
    typography: {
      button: {
        textTransform: "none", // Buttons speak softly
      },
    },
    components: {
      MuiButton: {
        styleOverrides: {
          root: {
            color: mode === "light" ? "#333333" : "#D7D2CB",
            "&:hover": {
              color: mode === "light" ? "#C8102E" : "#FFFFFF",
            },
          },
        },
      },
    },
    // Concourse design tokens (additive — see src/Utilites/concourse.js).
    // Nothing above this line changed; read as theme.concourse.* in sx.
    concourse: concourse(mode),
  });

export default theme;
