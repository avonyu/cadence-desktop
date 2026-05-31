// import { useState } from "react";
// import reactLogo from "./assets/react.svg";
// import { invoke } from "@tauri-apps/api/core";
import { MyPlayer } from "@/components/player";
import "./App.css";

function App() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-8 p-8">
      <MyPlayer src="https://stream.mux.com/BV3YZtogl89mg9VcNBhhnHm02Y34zI1nlMuMQfAbl3dM/highest.mp4" />
    </main>
  );
}

export default App;
