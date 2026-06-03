import { BrowserRouter, Routes, Route } from "react-router";
import { PlayerPage } from "@/pages/PlayerPage";
import "./App.css";

function App() {
  const videoUrl =
    "https://stream.mux.com/BV3YZtogl89mg9VcNBhhnHm02Y34zI1nlMuMQfAbl3dM/highest.mp4";
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<PlayerPage src={videoUrl} />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
