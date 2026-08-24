import { StrictMode } from "react";
import { createRoot, hydrateRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import "./styles/global.css";
import App from "./App.tsx";

const root = document.getElementById("root")!;
const app = (
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>
);

// Production build already contains prerendered markup. Hydration attaches
// handlers without throwing that HTML away; dev keeps the ordinary SPA path.
if (root.hasChildNodes()) hydrateRoot(root, app);
else createRoot(root).render(app);
