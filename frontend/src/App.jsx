// App.jsx
import React, { useEffect, useMemo, useState } from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  useNavigate,
  useParams,
  useLocation,
  Navigate,
  Link,
} from "react-router-dom";
import { api } from "./api";
import "./App.css";
import NavBar from "./components/NavBar";
import JobEntryForm from "./components/JobEntryForm";
import Spinner from "./components/Spinner";
import EmploymentForm from "./components/EmploymentForm";
import SkillsSection from "./components/SkillsSection";
import EducationSection from "./components/EducationSection";
import CertificationSection from "./components/CertificationSection";
import ProjectSection from "./components/ProjectSection";
import ProfileNavBar from "./components/ProfileNavBar";
import { GoogleLogin } from "@react-oauth/google";
// no process.env references here!
import ProfileDashboard from "./components/ProfileDashboard";
import ProfileCompletenessMeter from "./components/ProfileCompleteness";
import SkillDistributionChart from "./components/SkillDist";
import JobsTab from "./components/JobsTabs";
import JobPipeline from "./components/JobPipeLine";
import UpcomingDeadlinesWidget from "./components/UpcomingDeadlinesWidget";
import JobsCalendar from "./components/JobsCalendar";


// jwtDecode is imported in your file; keeping in case you use later
import { jwtDecode } from "jwt-decode";


// -----------------------
// Routing Shell
// -----------------------
function AppInner() {
  // ===== your original state =====
  const [page, setPage] = useState("home");
  const [form, setForm] = useState({});
  const [token, setToken] = useState(localStorage.getItem("token"));
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [employment, setEmployment] = useState([]);
  const [employmentForm, setEmploymentForm] = useState(null);
  const [darkMode, setDarkMode] = useState(false);
  const [activeTab, setActiveTab] = useState("info");
  const [refreshKey, setRefreshKey] = useState(Date.now());
  const [showJobForm, setShowJobForm] = useState(false);


  const authed = !!token;

  const navigate = useNavigate();
  const location = useLocation();
  const params = useParams();
  const urlTab = params?.tab;

  // -----------------------
  // URL <-> state sync
  // -----------------------

  // Map page -> path
  
  const pageToPath = useMemo(
    () => ({
      home: "/",
      register: "/register",
      login: "/login",
      forgot: "/forgot",
      reset: "/reset",
      profile: (tab) => `/profile/${tab || "info"}`,
    }),
    []
  );

  // On first load & every URL change: derive page + activeTab from URL
  useEffect(() => {
    const path = location.pathname;
    if (path.startsWith("/profile")) {
      if (page !== "profile") setPage("profile");
      const nextTab = urlTab || "info";
      if (activeTab !== nextTab) setActiveTab(nextTab);
    } else if (path === "/") {
      if (page !== "home") setPage("home");
    } else if (path === "/register") {
      if (page !== "register") setPage("register");
    } else if (path === "/login") {
      if (page !== "login") setPage("login");
    } else if (path === "/forgot") {
      if (page !== "forgot") setPage("forgot");
    } else if (path === "/reset") {
      if (page !== "reset") setPage("reset");
    }
  }, [location.pathname, urlTab]); // eslint-disable-line

  // When page changes (via NavBar or auth flow), push URL
  useEffect(() => {
    if (page === "profile") {
      // ensure we always have a tab
      const path = pageToPath.profile(activeTab);
      if (location.pathname !== path) navigate(path, { replace: false });
    } else if (page && pageToPath[page] && typeof pageToPath[page] === "string") {
      const path = pageToPath[page];
      if (location.pathname !== path) navigate(path, { replace: false });
    }
  }, [page]); // eslint-disable-line

  // When activeTab changes inside profile, push URL
  useEffect(() => {
    if (page === "profile") {
      const path = pageToPath.profile(activeTab);
      if (location.pathname !== path) navigate(path);
    }
  }, [activeTab]); // eslint-disable-line

  // Persist token
  useEffect(() => {
    if (token) localStorage.setItem("token", token);
    else localStorage.removeItem("token");
  }, [token]);

  // Load profile data / employment when needed
  useEffect(() => {
    if (authed && page === "profile") {
      loadProfile();
      loadEmployment();
    }
  }, [authed, page]);

  // Dark mode toggle
  useEffect(() => {
    document.body.classList.toggle("dark", darkMode);
  }, [darkMode]);

  // -----------------------
  // AUTH
  // -----------------------
  async function register() {
    try {
      setLoading(true);
      const { data } = await api.post("/register", form);
      alert("Registered successfully!");
      setToken(data.token);
      setPage("profile");
      setActiveTab("info");
    } catch (e) {
      alert(e?.response?.data?.error || "Registration failed");
    } finally {
      setLoading(false);
    }
  }

  async function login() {
    try {
      setLoading(true);
      const { data } = await api.post("/login", {
        email: form.email,
        password: form.password,
      });
      alert("Login successful!");
      setToken(data.token);
      setPage("profile");
      setActiveTab("info");
    } catch (e) {
      alert(e?.response?.data?.error || "Login failed");
      setForm({ ...form, password: "" });
    } finally {
      setLoading(false);
    }
  }

  async function googleLoginSuccess(credentialResponse) {
    try {
      const idToken = credentialResponse.credential;
      const { data } = await api.post("/google", { idToken });
      alert("Google login successful!");
      setToken(data.token);
      setPage("profile");
      setActiveTab("info");
    } catch (e) {
      alert(e?.response?.data?.error || "Google login failed");
    }
  }

  function googleLoginError() {
    alert("Google sign-in failed. Try again.");
  }

  async function forgotPassword() {
    try {
      setLoading(true);
      const { data } = await api.post("/forgot", { email: form.email });
      alert(data.message || "Check your email for the reset code.");
      // navigate("/reset"); // if you’re using Router
      setPage("reset"); // if you're still using your page state
    } catch (e) {
      alert(e?.response?.data?.error || "Request failed");
    } finally {
      setLoading(false);
    }
  }
  
  

  async function resetPassword() {
    try {
      setLoading(true);
      const { data } = await api.post("/reset", {
        email: form.email,
        code: form.code,
        newPassword: form.newPassword,
        confirmPassword: form.confirmPassword,
      });
      alert("Password reset successful!");
      setToken(data.token);
      setPage("profile");
      setActiveTab("info");
    } catch (e) {
      alert(e?.response?.data?.error || "Reset failed");
    } finally {
      setLoading(false);
    }
  }

  async function logout() {
    try {
      await api.post("/logout");
    } catch (_) {}
    setToken(null);
    setProfile(null);
    setPage("home");
  }

  async function deleteAccount() {
    const confirmDelete = window.confirm(
      "⚠️ WARNING: Deleting your account is immediate and permanent.\n\n" +
        "All of your data, including your profile, employment history, and documents, will be removed permanently.\n\n" +
        "Are you absolutely sure you want to continue?"
    );
    if (!confirmDelete) return;

    const password = prompt("Enter your password to confirm deletion:") || "";
    if (!password) return alert("Password is required.");

    try {
      await api.post(
        "/delete",
        { password },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      alert("✅ Account deleted successfully.");
      setToken(null);
      setProfile(null);
      setPage("home");
    } catch (e) {
      alert(e?.response?.data?.error || "❌ Account deletion failed.");
    }
  }

  // -----------------------
  // PROFILE DATA
  // -----------------------
  async function loadProfile() {
    try {
      const { data } = await api.get("/api/profile", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setProfile(data.profile);
    } catch (e) {
      console.error("Profile fetch failed", e);
    }
  }

  async function saveProfile() {
    try {
      setLoading(true);
      await api.post("/api/profile", profile, {
        headers: { Authorization: `Bearer ${token}` },
      });
      alert("Profile saved successfully!");
    } catch (e) {
      alert(e?.response?.data?.error || "Save failed");
    } finally {
      setLoading(false);
    }
  }

  // -----------------------
  // EMPLOYMENT
  // -----------------------
  async function loadEmployment() {
    try {
      const { data } = await api.get("/api/employment", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setEmployment(data.employment || []);
    } catch (e) {
      console.error("Failed to load employment", e);
    }
  }

  async function handleDelete(id) {
    if (!window.confirm("Are you sure you want to delete this entry?")) return;
    try {
      await api.delete(`/api/employment/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      alert("✅ Employment entry deleted successfully!");
      loadEmployment();
    } catch (err) {
      alert("Could not delete employment entry.");
    }
  }
  function getDuration(start, end) {
    const s = new Date(start);
    const e = end ? new Date(end) : new Date();
    const months = (e.getFullYear() - s.getFullYear()) * 12 + (e.getMonth() - s.getMonth());
    const years = Math.floor(months / 12);
    const remMonths = months % 12;
    if (years && remMonths)
      return `${years} yr${years > 1 ? "s" : ""} ${remMonths} mo${remMonths > 1 ? "s" : ""}`;
    if (years) return `${years} yr${years > 1 ? "s" : ""}`;
    if (remMonths) return `${remMonths} mo${remMonths > 1 ? "s" : ""}`;
    return "Less than a month";
  }
  

  // -----------------------
  // PROFILE PICTURE
  // -----------------------
  const [selectedFile, setSelectedFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  useEffect(() => {
    if (!selectedFile) {
      setPreview(undefined);
      return;
    }
    const objUrl = URL.createObjectURL(selectedFile);
    setPreview(objUrl);
    return () => URL.revokeObjectURL(objUrl);
  }, [selectedFile]);

  async function uploadPicture() {
    if (!selectedFile) return alert("Please choose a file first!");
    if (selectedFile.size > 5 * 1024 * 1024)
      return alert("Max file size is 5MB.");

    const formData = new FormData();
    formData.append("image", selectedFile);

    try {
      setUploading(true);
      const { data } = await api.post("/api/upload-profile-pic", formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "multipart/form-data",
        },
        onUploadProgress: (p) =>
          setUploadProgress(Math.round((p.loaded / p.total) * 100)),
      });

      await api.post(
        "/api/profile/picture",
        { url: data.url },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      await loadProfile();
      alert("✅ Profile picture uploaded successfully!");
      setSelectedFile(null);
      setPreview(null);
      setUploadProgress(0);
    } catch (err) {
      alert("Upload failed");
    } finally {
      setUploading(false);
    }
  }

  function removePicture() {
    setProfile((prev) => ({ ...prev, picture_url: null }));
    alert("Profile picture removed (default avatar restored)");
  }

  // -----------------------
  // UI
  // -----------------------
  return (
    <div className={`app-wrapper ${darkMode ? "dark" : ""}`}>
      <NavBar
        authed={authed}
        onNavigate={(p) => setPage(p)} // keeps your existing NavBar API
        onLogout={logout}
        currentPage={page}
      />

      {/* 🌙 Dark Mode */}
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
        <div className="card-container">
          {loading && <Spinner />}

          {/* ---------- HOME ---------- */}
          {page === "home" && (
            <section className="home-section">
              <div className="home-content">
                <h2>
                  Welcome to <span>ATS for Candidates</span>
                </h2>
                <p>
                  Manage job applications, resumes, and professional profiles —
                  all in one place.
                </p>
                <p className="coming-soon">🚀 Exciting updates are coming soon!</p>
                {!authed && (
                  <p style={{ marginTop: 12 }}>
                    <Link to="/login">Login</Link> or{" "}
                    <Link to="/register">Create an account</Link>
                  </p>
                )}
              </div>
            </section>
          )}

          {/* ---------- REGISTER ---------- */}
          {page === "register" && (
            <section>
              <h2>Create an Account</h2>
              <input
                placeholder="First name"
                value={form.firstName || ""}
                onChange={(e) =>
                  setForm({ ...form, firstName: e.target.value })
                }
              />
              <input
                placeholder="Last name"
                value={form.lastName || ""}
                onChange={(e) =>
                  setForm({ ...form, lastName: e.target.value })
                }
              />
              <input
                type="email"
                placeholder="Email"
                value={form.email || ""}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
              <input
                type="password"
                placeholder="Password"
                value={form.password || ""}
                onChange={(e) =>
                  setForm({ ...form, password: e.target.value })
                }
              />
              <input
                type="password"
                placeholder="Confirm password"
                value={form.confirmPassword || ""}
                onChange={(e) =>
                  setForm({ ...form, confirmPassword: e.target.value })
                }
              />
              <div className="button-group">
                <button onClick={register}>Register</button>
                <button
                  className="btn-secondary"
                  onClick={() => setPage("login")}
                >
                  Have an account? Login
                </button>
              </div>
            </section>
          )}

          {/* ---------- LOGIN ---------- */}
          {page === "login" && (
            <section>
              <h2>Login</h2>
              <input
                placeholder="Email"
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
              <input
                type="password"
                placeholder="Password"
                value={form.password || ""}
                onChange={(e) =>
                  setForm({ ...form, password: e.target.value })
                }
              />
              <button onClick={login}>Login</button>
              <div className="text-small">
                <a href="#" onClick={() => setPage("forgot")}>
                  Forgot password?
                </a>
              </div>
              <div style={{ marginTop: "10px" }}>
                <GoogleLogin
                  onSuccess={googleLoginSuccess}
                  onError={googleLoginError}
                  shape="pill"
                  theme={darkMode ? "filled_black" : "outline"}
                />
              </div>
            </section>
          )}

          {/* ---------- FORGOT / RESET ---------- */}
          {page === "forgot" && (
            <section>
              <h2>Forgot Password</h2>
              <input
                placeholder="Email"
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
              <button onClick={forgotPassword}>Send Reset Code</button>
            </section>
          )}

          {page === "reset" && (
            <section>
              <h2>Reset Password</h2>
              <input
                placeholder="Email"
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
              <input
                placeholder="Reset Code"
                onChange={(e) => setForm({ ...form, code: e.target.value })}
              />
              <input
                type="password"
                placeholder="New Password"
                onChange={(e) =>
                  setForm({ ...form, newPassword: e.target.value })
                }
              />
              <input
                type="password"
                placeholder="Confirm New Password"
                onChange={(e) =>
                  setForm({ ...form, confirmPassword: e.target.value })
                }
              />
              <button onClick={resetPassword}>Reset Password</button>
            </section>
          )}

          {/* ---------- PROFILE ---------- */}
          {page === "profile" &&
            (authed ? (
              <section>
                <h2>My Profile</h2>

                {/* 🧭 Tab Navigation */}
                <ProfileNavBar
                  activeTab={activeTab}
                  onNavigate={(tab) => setActiveTab(tab)}
                />

                {/* === INFO TAB === */}
                {activeTab === "dashboard" && (
                  <div className="profile-box">
                    <ProfileDashboard token={token} setActiveTab={setActiveTab} />
                  </div>
                )}

                {activeTab === "info" && profile && (
                  <>
                    <div className="profile-picture">
                      <img
                        src={
                          preview ||
                          profile.picture_url ||
                          "/uploads/default-avatar.png"
                        }
                        alt="Profile"
                        className="profile-pic"
                      />
                    </div>
                    <div className="profile-box">
                      <h3>Update Info</h3>
                      <label>Full Name *</label>
                      <input
                        value={profile.full_name || ""}
                        onChange={(e) =>
                          setProfile({
                            ...profile,
                            full_name: e.target.value,
                          })
                        }
                      />
                      <label>Email *</label>
                      <input
                        value={profile.email || ""}
                        onChange={(e) =>
                          setProfile({ ...profile, email: e.target.value })
                        }
                      />
                      <label>Phone *</label>
                      <input
                        value={profile.phone || ""}
                        onChange={(e) =>
                          setProfile({ ...profile, phone: e.target.value })
                        }
                      />
                      <label>Location *</label>
                      <input
                        value={profile.location || ""}
                        onChange={(e) =>
                          setProfile({ ...profile, location: e.target.value })
                        }
                      />
                      <label>Headline</label>
                      <input
                        value={profile.title || ""}
                        onChange={(e) =>
                          setProfile({ ...profile, title: e.target.value })
                        }
                      />
                      <label>Short Bio</label>
                      <textarea
                        maxLength={500}
                        value={profile.bio || ""}
                        onChange={(e) =>
                          setProfile({ ...profile, bio: e.target.value })
                        }
                      />
                      <div className="button-group">
                        <button onClick={saveProfile}>Save</button>
                        <button
                          className="btn-secondary"
                          onClick={loadProfile}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>

                    {/* 🟣 PROFILE PICTURE BOX */}
                    <div className="profile-box">
                      <h3>Profile Picture</h3>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => setSelectedFile(e.target.files[0])}
                      />
                      {preview && <img src={preview} className="preview" />}
                      {uploading && <p>Uploading... {uploadProgress}%</p>}
                      <div className="button-group">
                        <button onClick={uploadPicture} disabled={uploading}>
                          Replace Picture
                        </button>
                        <button
                          className="btn-secondary"
                          onClick={removePicture}
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  </>
                )}

                {/* === EMPLOYMENT === */}
                {activeTab === "employment" && (
                  <div className="profile-box">
                    <h3>Employment History</h3>
                    <button
                      className="btn-success"
                      onClick={() => setEmploymentForm({})}
                    >
                      ➕ Add Employment
                    </button>
                    {employmentForm && (
                      <EmploymentForm
                        job={employmentForm}
                        token={token}
                        onCancel={() => setEmploymentForm(null)}
                        onSaved={() => {
                          setEmploymentForm(null);
                          loadEmployment();
                        }}
                      />
                    )}
                    {employment.length === 0 ? (
                      <p>No employment history yet.</p>
                    ) : (
                      <ul className="employment-list">
                        {employment.map((job) => (
                          <li key={job.id}>
                            <strong>{job.title}</strong> — {job.company}
                            <div className="employment-meta">
                              {job.start_date && (
                                <span>
                                  {new Date(job.start_date).toLocaleDateString(undefined, {
                                    year: "numeric",
                                    month: "short",
                                  })}{" "}
                                  -{" "}
                                  {job.end_date
                                    ? new Date(job.end_date).toLocaleDateString(undefined, {
                                        year: "numeric",
                                        month: "short",
                                      })
                                    : "Present"}{" "}
                                  ({getDuration(job.start_date, job.end_date)})
                                </span>
                              )}
                            </div>
                            <div className="employment-actions">
                              <button
                                className="btn-edit"
                                onClick={() => setEmploymentForm(job)}
                              >
                                ✏️ Edit
                              </button>
                              <button
                                className="btn-delete"
                                onClick={() => handleDelete(job.id)}
                              >
                                🗑️ Delete
                              </button>
                            </div>
                          </li>
                        ))}
                      </ul>

                    )}
                  </div>
                )}

                {/* === SKILLS === */}
                {activeTab === "skills" && (
                  <div className="profile-box">
                    <h3>Skills</h3>
                    <SkillsSection token={token} />
                  </div>
                )}
                {/* === JOBS === */}
                {activeTab === "jobs" && (
  <div className="jobs-layout">
    {/* Main Section */}
    <div className="jobs-main">
      <div className="profile-box">
        <h2>💼 Job Opportunities</h2>
        {!showJobForm && (
          <button
            className="btn-success"
            onClick={() => setShowJobForm(true)}
          >
            ➕ Add New Job
          </button>
        )}
        {showJobForm && (
          <JobEntryForm
            token={token}
            onSaved={() => {
              setShowJobForm(false);
              setRefreshKey(Date.now());
            }}
            onCancel={() => setShowJobForm(false)}
          />
        )}
      </div>

      <div className="profile-box">
        <h3>📊 Job Pipeline</h3>
        <JobPipeline key={refreshKey} token={token} />
      </div>
      <div className="profile-box">
      <JobsCalendar token={token} />
    </div>

    </div>

    {/* Sidebar Section */}
    <aside className="sidebar-widget">
      <UpcomingDeadlinesWidget token={token} />
    </aside>
  </div>
)}









                {/* === EDUCATION === */}
                {activeTab === "education" && (
                  <div className="profile-box">
                    <h3>Education</h3>
                    <EducationSection token={token} />
                  </div>
                )}

                {/* === CERTIFICATIONS === */}
                {activeTab === "certifications" && (
                  <div className="profile-box">
                    <h3>Certifications</h3>
                    <CertificationSection token={token} />
                  </div>
                )}

                {/* === PROJECTS === */}
                {activeTab === "projects" && (
                  <div className="profile-box">
                    <h3>Projects</h3>
                    <ProjectSection token={token} />
                  </div>
                )}

                {/* === DANGER ZONE === */}
                {activeTab === "danger" && (
                  <div
                    className="profile-box"
                    style={{
                      border: "1px solid #ffb3b3",
                      background: "#fff5f5",
                    }}
                  >
                    <h3 className="danger-zone">Danger Zone</h3>
                    <button className="btn-danger" onClick={deleteAccount}>
                      Delete Account
                    </button>
                  </div>
                )}
              </section>
            ) : (
              <p>You must log in to view your profile.</p>
            ))}
        </div>
      </main>
    </div>
  );
}

// Wrap once with <BrowserRouter/> and define actual routes.
// We intentionally map *all* app routes to AppInner so your single-file layout stays intact.
export default function App() {
    
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<AppInner />} />
        <Route path="/register" element={<AppInner />} />
        <Route path="/login" element={<AppInner />} />
        <Route path="/forgot" element={<AppInner />} />
        <Route path="/reset" element={<AppInner />} />
        <Route path="/profile" element={<Navigate to="/profile/info" replace />} />
        <Route path="/profile/:tab" element={<AppInner />} />
        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
