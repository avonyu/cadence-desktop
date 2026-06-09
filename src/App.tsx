import { Outlet } from "react-router";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import "./App.css";

function App() {
  return (
    <ThemeProvider defaultTheme="system" storageKey="cadence-theme">
      <Outlet />
      <Toaster />
    </ThemeProvider>
  );
}

export default App;