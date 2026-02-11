/**
 * Application Entry Point
 * 
 * This file is the root of the React application. It:
 * 1. Mounts the React application to the DOM.
 * 2. Wraps the App component with global providers like GoogleOAuthProvider.
 * 3. Imports global styles.
 */
import { createRoot } from "react-dom/client";
import { GoogleOAuthProvider } from "@react-oauth/google";
import App from "./App.tsx";
import "./index.css";

const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || "";

createRoot(document.getElementById("root")!).render(
    <GoogleOAuthProvider clientId={googleClientId}>
        <App />
    </GoogleOAuthProvider>
);
