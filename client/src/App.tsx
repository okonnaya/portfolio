import { useEffect, useState } from "react";
import { apiGet } from "./api/client";

type Health = { status: string; time: string };

type State =
  | { kind: "loading" }
  | { kind: "ok"; data: Health }
  | { kind: "error"; message: string };

function App() {
  const [state, setState] = useState<State>({ kind: "loading" });

  useEffect(() => {
    apiGet<Health>("/health")
      .then((data) => setState({ kind: "ok", data }))
      .catch((err: unknown) =>
        setState({
          kind: "error",
          message: err instanceof Error ? err.message : "unknown error",
        }),
      );
  }, []);

  return (
    <main
      style={{
        minHeight: "100%",
        display: "grid",
        placeItems: "center",
        padding: "2rem",
      }}
    >
      <div style={{ textAlign: "center" }}>
        <h1>портфолио — каркас</h1>
        <p style={{ opacity: 0.6, marginTop: ".5rem" }}>
          Vite + React + TypeScript · Rails API
        </p>

        <p style={{ marginTop: "2rem" }}>
          {state.kind === "loading" && "проверяю связь с API…"}
          {state.kind === "ok" && (
            <span style={{ color: "#7dd87d" }}>
              ✓ API на связи: {state.data.status} ({state.data.time})
            </span>
          )}
          {state.kind === "error" && (
            <span style={{ color: "#e57373" }}>
              ✗ API недоступен: {state.message}
            </span>
          )}
        </p>
      </div>
    </main>
  );
}

export default App;
