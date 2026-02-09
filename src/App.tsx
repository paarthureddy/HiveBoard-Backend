import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { GuestProvider } from "@/contexts/GuestContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import Landing from "./pages/Landing";
import Canvas from "./pages/Canvas";
import Auth from "./pages/Auth";
import Home from "./pages/Home";
import JoinSession from "./pages/JoinSession";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  // Provide React Query client for data fetching and caching
  <QueryClientProvider client={queryClient}>
    {/* AuthProvider handles user authentication state (login, logout, user data) */}
    <AuthProvider>
      {/* GuestProvider manages temporary guest sessions for non-registered users */}
      <GuestProvider>
        {/* TooltipProvider enables tooltip functionality across the app */}
        <TooltipProvider>
          {/* Toast notifications for user feedback */}
          <Toaster />
          <Sonner />

          {/* Client-side routing */}
          <BrowserRouter>
            <Routes>
              {/* Public Routes */}
              <Route path="/" element={<Landing />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/join/:token" element={<JoinSession />} />

              {/* Protected Routes (Require Login) */}
              <Route
                path="/home"
                element={
                  <ProtectedRoute>
                    <Home />
                  </ProtectedRoute>
                }
              />

              {/* Canvas Route (Accessed by both users and guests) */}
              <Route
                path="/canvas"
                element={<Canvas />}
              />

              {/* Catch-all 404 Route */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </GuestProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
