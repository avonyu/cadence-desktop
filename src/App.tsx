import { Outlet } from "react-router";
import { ThemeProvider } from "@/components/theme-provider";
import "./App.css";

function App() {
  return (
    <ThemeProvider defaultTheme="system" storageKey="cadence-theme">
      <Outlet />
    </ThemeProvider>
  );
}

export default App;