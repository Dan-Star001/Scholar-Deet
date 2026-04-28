import { createTheme, ThemeOptions } from "@mui/material/styles";

export const getMuiTheme = (mode: "light" | "dark") => {
  return createTheme({
    palette: {
      mode,
      primary: {
        main: "#2B2D42",
        contrastText: "#F8F7F9",
      },
      secondary: {
        main: "#92DCE5",
        contrastText: "#2B2D42",
      },
      background: {
        default: mode === "light" ? "#F8F7F9" : "#121212",
        paper: mode === "light" ? "#ffffff" : "#1E1E1E",
      },
      warning: {
        main: "#F7EC59",
        contrastText: "#2B2D42",
      },
      text: {
        primary: mode === "light" ? "#2B2D42" : "#F8F7F9",
        secondary: mode === "light" ? "#2B2D42cc" : "#F8F7F9cc",
      },
    },
    typography: {
      fontFamily: ['"Inter"', '"system-ui"', "sans-serif"].join(","),
      h1: { fontWeight: 700 },
      h2: { fontWeight: 700 },
      h3: { fontWeight: 600 },
      button: {
        textTransform: "none",
        fontWeight: 500,
      },
    },
    shape: {
      borderRadius: 12,
    },
    components: {
      MuiButton: {
        styleOverrides: {
          root: {
            borderRadius: "12px",
            padding: "8px 20px",
          },
        },
      },
      MuiTextField: {
        styleOverrides: {
          root: {
            "& .MuiOutlinedInput-root": {
              borderRadius: "12px",
            },
          },
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: {
            backgroundImage: "none",
          },
        },
      },
    },
  });
};

// Default export for backward compatibility if needed, though we will move to the function
export const theme = getMuiTheme("light");
