// import { useState } from "react";
// import reactLogo from "./assets/react.svg";
// import { invoke } from "@tauri-apps/api/core";
import { MyPlayer } from "@/components/player";
import "./App.css";

function App() {
  const videoUrl =
    "https://stream.mux.com/BV3YZtogl89mg9VcNBhhnHm02Y34zI1nlMuMQfAbl3dM/highest.mp4";
  return (
    <main className="h-screen overflow-hidden bg-[#090909] text-zinc-100">
      <MyPlayer src={videoUrl} />
    </main>
  );
}

export default App;
