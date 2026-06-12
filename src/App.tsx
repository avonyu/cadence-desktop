import { Outlet } from "react-router";
import { useEffect, useState } from "react";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { SplashScreen } from "@/components/SplashScreen";
import "./App.css";

function App() {
  const [splashVisible, setSplashVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setSplashVisible(false), 1500);
    return () => clearTimeout(timer);
  }, []);

  // Prevent non-input elements from holding focus (desktop app behavior)
  useEffect(() => {
    const handleFocus = (e: FocusEvent) => {
      const target = e.target as HTMLElement;
      const inputTags = ["INPUT", "TEXTAREA", "SELECT"];
      if (
        !inputTags.includes(target.tagName) &&
        !target.isContentEditable
      ) {
        target.blur();
      }
    };
    document.addEventListener("focus", handleFocus, true);
    return () => document.removeEventListener("focus", handleFocus, true);
  }, []);

  return (
    <ThemeProvider defaultTheme="system" storageKey="cadence:theme">
      <SplashScreen visible={splashVisible} />
      <Outlet />
      <Toaster />
    </ThemeProvider>
  );
}

export default App;
