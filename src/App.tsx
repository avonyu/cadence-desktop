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

  return (
    <ThemeProvider defaultTheme="system" storageKey="cadence:theme">
      <SplashScreen visible={splashVisible} />
      <Outlet />
      <Toaster />
    </ThemeProvider>
  );
}

export default App;
