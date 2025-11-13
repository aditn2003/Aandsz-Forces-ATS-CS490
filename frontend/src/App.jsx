// src/App.jsx
import React, { useState } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  useNavigate,
} from "react-router-dom";
import NavBar from "./components/NavBar";
import Spinner from "./components/Spinner";

// ---------- Pages ----------
import Home from "./pages/Home";
import Register from "./pages/Register";
import Login from "./pages/Login";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import ProfileLayout from "./pages/Profile/ProfileLayout";
import Jobs from "./pages/Jobs";

// ---------- Resume Flow ----------
import ResumeBuilder from "./pages/Profile/ResumeBuilder";
import ResumeSetup from "./pages/Profile/ResumeSetup";
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

// ---------- Layout Shell (NavBar + Routes) ----------
function MainLayout() {
  const [loading] = useState(false);
  const navigate = useNavigate();

  return (
    <div className="app-wrapper">
      <NavBar />

      <main className="app-container">
        {loading && <Spinner />}

        <Routes>
          {/* --- Public Routes --- */}
          <Route path="/" element={<Home />} />
          <Route path="/register" element={<Register />} />
          <Route path="/login" element={<Login />} />
          <Route path="/forgot" element={<ForgotPassword />} />
          <Route path="/reset" element={<ResetPassword />} />

          {/* --- Profile Routes --- */}
          <Route path="/profile/*" element={<ProfileLayout />} />

          {/* --- Resume Builder Pipeline --- */}
          {/* Entry from navbar */}
          <Route path="/resume" element={<ResumeBuilder />} />
          {/* Step 2: JD + options */}
          <Route path="/resume/setup" element={<ResumeSetup />} />
          {/* Step 3: Editor */}
          <Route path="/resume/editor" element={<ResumeEditor />} />

          {/* --- Jobs Dashboard --- */}
          <Route path="/jobs" element={<Jobs />} />

          {/* --- Legacy /alias (optional) --- */}
          <Route
            path="/resume/templates"
            element={<Navigate to="/resume" replace />}
          />

          {/* --- Fallback --- */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
}
