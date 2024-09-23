import { createTheme } from '@mui/material/styles';

// Define your primary and secondary colors
const primary = {
  light: '#706866',
  main: '#453b39',
  dark: '#292321',
  darkSelected: '#1c1817',
  text: {main:'#c9b3af', light: "#e6ceca", dark: "#b59893"},
  contrastText: '#fff'
};

const secondary = {
  light: '#bf1900',
  main: '#751000',
  dark: '#590e02',
  text: {main:'#c9b3af', light: "#e6ceca", dark: "#b59893"},
  contrastText: '#fff'
};

const fills = {
  light: {main:'#f0e0df', light:'#f2eded', dark:'#e5d2d1', lightHover:'#fafafa'},
  dark: {main: '#453b39', light: '#574c4a', dark:'#292321', secondary: '#423b39'}
}

const borders = {
  main:'rgb(232, 101, 84)',
  secondary: '#d6b9b5',
  light:'#e3c1c1'
}

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
      default: mode === 'light' ? '#fafafa' : '#303030',
      paper: mode === 'light' ? '#fff' : '#424242',
      fill: fills
    },
    border: borders,
    text: {
      primary: mode === 'light' ? '#000' : '#fff',
      secondary: mode === 'light' ? '#757575' : '#bdbdbd',
    },
  },
  typography: {
    button: {
      textTransform: 'none'
    }
  }
});

export default theme;
