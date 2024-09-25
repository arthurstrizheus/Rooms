import { createTheme } from '@mui/material/styles';

// Define your primary and secondary colors using blue and purple
const primary = {
  light: '#7986cb', // light blue
  main: '#3f51b5',  // modern blue
  dark: '#303f9f',  // dark blue
  darkSelected: '#1a237e', // selected dark blue
  text: { main: '#ffffff', light: '#c5cae9', dark: '#9fa8da' }, // text colors for light and dark
  contrastText: '#ffffff'
};

const secondary = {
  light: '#ce93d8',  // light purple
  main: '#9c27b0',   // modern purple
  dark: '#6a1b9a',   // dark purple
  text: { main: '#ffffff', light: '#e1bee7', dark: '#ab47bc' },
  contrastText: '#ffffff'
};

const fills = {
  light: { main: '#f3e5f5', light: '#ede7f6', dark: '#e0e0e0', lightHover: '#fafbfc' }, // light purples and soft greys
  dark: { main: '#3f51b5', light: '#7986cb', dark: '#303f9f', secondary: '#6a1b9a' }   // deep blue and purple tones
};

const borders = {
  main: '#9c27b0',       // purple border for accents
  secondary: '#3f51b5',  // blue border for secondary items
  light: '#e0f7fa'       // very light cyan for subtle borders
};

// Create the theme configuration
const theme = (mode) => createTheme({
  palette: {
    mode: mode,
    primary: {
      light: primary.light,
      main: primary.main,
      dark: primary.dark,
      darkSelected: primary.darkSelected,
      text: primary.text,
      contrastText: primary.contrastText
    },
    secondary: {
      light: secondary.light,
      main: secondary.main,
      dark: secondary.dark,
      text: secondary.text,
      contrastText: secondary.contrastText
    },
    background: {
      default: mode === 'light' ? '#fafafa' : '#2C3E50',  // light grey for light mode, dark greyish-blue for dark mode
      paper: mode === 'light' ? '#ffffff' : '#34495E',     // light background for panels in light mode, darker grey-blue in dark mode
      fill: fills
    },
    border: borders,
    text: {
      primary: mode === 'light' ? '#212121' : '#ffffff',  // text color for light and dark modes
      secondary: mode === 'light' ? '#757575' : '#bdbdbd' // secondary text color
    },
  },
  typography: {
    button: {
      textTransform: 'none'
    }
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          color: mode === 'light' ? '#000000' : secondary.light, // Default text color: black in light, light purple in dark
          '&:hover': {
            color: mode === 'light' ? secondary.dark : '#ffffff', // Hover: light purple in light mode, white in dark mode
          },
        },
      },
    },
  },
});

export default theme;
