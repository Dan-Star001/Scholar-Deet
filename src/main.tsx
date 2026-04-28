import { createRoot } from "react-dom/client";
import { ThemeProvider as MuiThemeProvider, StyledEngineProvider } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import { getMuiTheme } from "./theme/mui-theme";
import App from "./App.tsx";
import "./index.css";
import { useTheme } from "next-themes";
import { useEffect, useState, useMemo } from "react";

const MuiThemeWrapper = () => {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Avoid hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  const theme = useMemo(() => {
    return getMuiTheme((resolvedTheme as "light" | "dark") || "light");
  }, [resolvedTheme]);

  if (!mounted) {
    return null;
  }

  return (
    <MuiThemeProvider theme={theme}>
      <CssBaseline />
      <App />
    </MuiThemeProvider>
  );
};

createRoot(document.getElementById("root")!).render(
  <StyledEngineProvider injectFirst>
    <MuiThemeWrapper />
  </StyledEngineProvider>
);
