import { createBrowserRouter } from "react-router";
import App from "@/App";
import { PlayerPage } from "@/pages/PlayerPage";
import { RootErrorBoundary } from "@/components/ErrorBoundary";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: App,
    ErrorBoundary: RootErrorBoundary,
    children: [{ index: true, Component: PlayerPage }],
  },
]);
