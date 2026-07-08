import { createTheme } from '@mui/material/styles';

const theme = createTheme({
  palette: {
    primary: { main: '#1976d2' },
    secondary: { main: '#ff9800' },
    background: { default: '#f5f5f5' },
  },
  typography: {
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "PingFang SC", "Microsoft YaHei", sans-serif',
    h6: { fontWeight: 600 },
  },
  components: {
    MuiBottomNavigationAction: {
      styleOverrides: {
        label: { fontSize: '0.7rem' },
      },
    },
  },
});

export default theme;
