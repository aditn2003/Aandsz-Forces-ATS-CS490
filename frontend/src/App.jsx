// src/App.jsx
import React, { useState, useEffect } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  useNavigate,
} from "react-router-dom";
import NavBar from "./components/NavBar";
import Spinner from "./components/Spinner";
import { api } from "./api";

// ---------- Pages ----------
import Home from "./pages/Home";
import Register from "./pages/Register";
import Login from "./pages/Login";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import ProfileLayout from "./pages/Profile/ProfileLayout";

// ---------- Resume Pipeline ----------
import ResumeTemplateChooser from "./components/ResumeTemplateChooser";
import ResumeEditor from "./components/ResumeEditor";

// ---------- Context Providers ----------
import { AuthProvider } from "./contexts/AuthContext";
import { ProfileProvider } from "./contexts/ProfileContext";

// ---------- Root App ----------
export default function App() {
  return (
    <AuthProvider>
      <ProfileProvider>
        <Router>
          <MainLayout />
        </Router>
      </ProfileProvider>
    </AuthProvider>
  );
}

// ---------- Layout Shell (NavBar + DarkMode + Routes) ----------
function MainLayout() {
  const [darkMode, setDarkMode] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // Apply dark mode class to <body>
  useEffect(() => {
    document.body.classList.toggle("dark", darkMode);
  }, [darkMode]);

  return (
    <div className={`app-wrapper ${darkMode ? "dark" : ""}`}>
      <NavBar />
      <div className="theme-toggle">
        <label>
          <input
            type="checkbox"
            checked={darkMode}
            onChange={() => setDarkMode(!darkMode)}
          />{" "}
          🌙 Dark Mode
        </label>
      </div>

      <main className="app-container">
        {loading && <Spinner />}

        <Routes>
          {/* --- Public Routes --- */}
          <Route path="/" element={<Home />} />
          <Route path="/register" element={<Register />} />
          <Route path="/login" element={<Login />} />
          <Route path="/forgot" element={<ForgotPassword />} />
          <Route path="/reset" element={<ResetPassword />} />

          {/* --- Protected Profile Routes --- */}
          <Route path="/profile/*" element={<ProfileLayout />} />

          {/* --- Resume Builder Pipeline --- */}
          <Route path="/resume/templates" element={<ResumeTemplateChooser />} />
          <Route path="/resume/editor" element={<ResumeEditor />} />

          {/* --- Fallback --- */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
}
