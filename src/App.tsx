import { useState } from "react";
import reactLogo from "./assets/react.svg";
import { invoke } from "@tauri-apps/api/core";
import "./App.css";

function App() {
  const [greetMsg, setGreetMsg] = useState("");
  const [name, setName] = useState("");

  async function greet() {
    // Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
    setGreetMsg(await invoke("greet", { name }));
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-8 p-8">
      <h1 className="text-3xl font-bold underline">Hello world!</h1>

      <div className="flex items-center justify-center gap-8">
        <a href="https://vite.dev" target="_blank">
          <img
            src="/vite.svg"
            className="h-16 w-16 transition hover:drop-shadow-lg hover:scale-110"
            alt="Vite logo"
          />
        </a>
        <a href="https://tauri.app" target="_blank">
          <img
            src="/tauri.svg"
            className="h-16 w-16 transition hover:drop-shadow-lg hover:scale-110"
            alt="Tauri logo"
          />
        </a>
        <a href="https://react.dev" target="_blank">
          <img
            src={reactLogo}
            className="h-16 w-16 transition hover:drop-shadow-lg hover:scale-110"
            alt="React logo"
          />
        </a>
      </div>

      <p className="text-muted-foreground text-sm">
        Click on the Tauri, Vite, and React logos to learn more.
      </p>

      <form
        className="flex items-center gap-3 w-full max-w-md"
        onSubmit={(e) => {
          e.preventDefault();
          greet();
        }}
      >
        <input
          id="greet-input"
          className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          onChange={(e) => setName(e.currentTarget.value)}
          placeholder="Enter a name..."
        />
        <button
          type="submit"
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:bg-primary/90"
        >
          Greet
        </button>
      </form>

      <p className="text-lg font-medium">{greetMsg}</p>
    </main>
  );
}

export default App;
