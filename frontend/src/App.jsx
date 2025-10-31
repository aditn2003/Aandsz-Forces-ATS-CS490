// App.jsx
import { useEffect, useState } from "react";
import { api } from "./api";
import "./App.css";
import NavBar from "./components/NavBar";
import Spinner from "./components/Spinner";
import EmploymentForm from "./components/EmploymentForm";
import SkillsSection from "./components/SkillsSection";
import EducationSection from "./components/EducationSection";
import CertificationSection from "./components/CertificationSection";
import ProjectSection from "./components/ProjectSection";
import { GoogleLogin } from "@react-oauth/google";
import { jwtDecode } from "jwt-decode";

export default function App() {
  const [page, setPage] = useState("home");
  const [form, setForm] = useState({});
  const [token, setToken] = useState(localStorage.getItem("token"));
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [employment, setEmployment] = useState([]);
  const [employmentForm, setEmploymentForm] = useState(null);
  const [darkMode, setDarkMode] = useState(false);
  const authed = !!token;

  // ✅ Persist token
  useEffect(() => {
    if (token) localStorage.setItem("token", token);
    else localStorage.removeItem("token");
  }, [token]);

  // ✅ Load profile automatically when logged in
  useEffect(() => {
    if (authed && page === "profile") {
      loadProfile();
      loadEmployment();
    }
  }, [authed, page]);

  // ✅ Toggle dark mode theme class
  useEffect(() => {
    document.body.classList.toggle("dark", darkMode);
  }, [darkMode]);

  // ---------- AUTH ----------
  async function register() {
    try {
      setLoading(true);
      const { data } = await api.post("/register", {
        firstName: form.firstName || "",
        lastName: form.lastName || "",
        email: form.email || "",
        password: form.password || "",
        confirmPassword: form.confirmPassword || "",
      });
      alert("Registered successfully!");
      setToken(data.token);
      setPage("profile");
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
    } catch (e) {
      alert(e?.response?.data?.error || "Login failed");
      setForm({ ...form, password: "" });
    } finally {
      setLoading(false);
    }
  }

  // ---------- GOOGLE LOGIN (real) ----------
  async function handleGoogleSuccess(credentialResponse) {
    try {
      const credential = credentialResponse?.credential;
      if (!credential) {
        alert("Google credential missing");
        return;
      }

      // Optional: inspect decoded info locally
      try {
        const decoded = jwtDecode(credential);
        console.log("Google user (decoded):", decoded);
      } catch {
        // decoding is optional; ignore errors
      }

      // Send credential to backend for verification + JWT creation
      const { data } = await api.post("/google", { credential });
      alert("Google login successful!");
      setToken(data.token);
      setPage("profile");
    } catch (e) {
      console.error(e);
      alert(e?.response?.data?.error || "Google login failed");
    }
  }

  function handleGoogleError() {
    alert("Google Sign-In failed");
  }

  async function forgotPassword() {
    try {
      setLoading(true);
      const { data } = await api.post("/forgot", { email: form.email });
      alert(
        data.demoCode
          ? `Demo reset code: ${data.demoCode}`
          : "If that email exists, a reset link/code was sent."
      );
      setPage("reset");
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
    } catch (e) {
      alert(e?.response?.data?.error || "Reset failed");
    } finally {
      setLoading(false);
    }
  }

  async function logout() {
    await api.post("/logout");
    setToken(null);
    setProfile(null);
    setPage("home");
  }

  async function deleteAccount() {
    const confirmDelete = window.confirm(
      "⚠️ WARNING: Deleting your account is immediate and permanent.\n\n" +
        "All of your data, including your profile, employment history, and documents, " +
        "will be permanently removed and cannot be recovered.\n\n" +
        "Are you absolutely sure you want to continue?"
    );
    if (!confirmDelete) return;

    const password = prompt("Enter your password to confirm deletion:") || "";
    if (!password) {
      alert("Account deletion cancelled. Password is required.");
      return;
    }

    try {
      await api.post(
        "/delete",
        { password },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      alert("✅ Account deleted successfully. We're sorry to see you go!");
      setToken(null);
      setProfile(null);
      setPage("home");
    } catch (e) {
      alert(e?.response?.data?.error || "❌ Account deletion failed.");
    }
  }

  // ---------- PROFILE ----------
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

  // ---------- EMPLOYMENT ----------
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
      console.error("❌ Delete error:", err);
      alert("Could not delete employment entry.");
    }
  }

  // ---------- PROFILE PICTURE ----------
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
      setUploadProgress(0);

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
      console.error("❌ Upload failed:", err);
      alert("Upload failed");
    } finally {
      setUploading(false);
    }
  }

  function removePicture() {
    setProfile((prev) => ({ ...prev, picture_url: null }));
    alert("Profile picture removed (default avatar restored)");
  }

  // ---------- MAIN UI ----------
  return (
    <div className={`app-wrapper ${darkMode ? "dark" : ""}`}>
      <NavBar
        authed={authed}
        onNavigate={setPage}
        onLogout={() => setToken(null)}
        currentPage={page}
      />

      {/* 🌙 Dark Mode Toggle */}
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
                  Your all-in-one platform to manage job applications, resumes,
                  and professional profiles — built to make your career journey
                  easier.
                </p>
                <p className="coming-soon">
                  🚀 Exciting new updates and features are coming soon — stay
                  tuned!
                </p>
              </div>
            </section>
          )}

          {/* ---------- REGISTER ---------- */}
          {page === "register" && (
            <section>
              <h2>Create an Account</h2>
              <label>First Name *</label>
              <input
                placeholder="First name"
                value={form.firstName || ""}
                onChange={(e) =>
                  setForm({ ...form, firstName: e.target.value })
                }
              />
              <label>Last Name *</label>
              <input
                placeholder="Last name"
                value={form.lastName || ""}
                onChange={(e) => setForm({ ...form, lastName: e.target.value })}
              />
              <label>Email *</label>
              <input
                type="email"
                placeholder="Email"
                value={form.email || ""}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
              <label>Password *</label>
              <input
                type="password"
                placeholder="Password"
                value={form.password || ""}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
              />
              <label>Confirm Password *</label>
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
                onChange={(e) => setForm({ ...form, password: e.target.value })}
              />
              <button onClick={login}>Login</button>

              <div className="text-small">
                <a href="#" onClick={() => setPage("forgot")}>
                  Forgot password?
                </a>
              </div>

              {/* ✅ Real Google Login Button (replaces the old demo button) */}
              <div style={{ marginTop: "1rem" }}>
                <GoogleLogin
                  onSuccess={handleGoogleSuccess}
                  onError={handleGoogleError}
                />
              </div>
            </section>
          )}

          {/* ---------- FORGOT PASSWORD ---------- */}
          {page === "forgot" && (
            <section>
              <h2>Forgot Password</h2>
              <p>Enter your email to receive a reset code.</p>
              <input
                placeholder="Email"
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
              <button onClick={forgotPassword}>Send Reset Code</button>
            </section>
          )}

          {/* ---------- RESET PASSWORD ---------- */}
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
                {profile && (
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

                    {/* 🟣 UPDATE INFO BOX */}
                    <div className="profile-box">
                      <h3>Update Info</h3>
                      <label>Full Name *</label>
                      <input
                        value={profile.full_name || ""}
                        onChange={(e) =>
                          setProfile({ ...profile, full_name: e.target.value })
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
                      <label>Professional Headline</label>
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
                      <p className="char-count">
                        {profile.bio?.length || 0}/500
                      </p>

                      <label>Industry</label>
                      <select
                        value={profile.industry || ""}
                        onChange={(e) =>
                          setProfile({ ...profile, industry: e.target.value })
                        }
                      >
                        <option value="">Select Industry</option>
                        <option value="Technology">Technology</option>
                        <option value="Finance">Finance</option>
                        <option value="Healthcare">Healthcare</option>
                        <option value="Education">Education</option>
                      </select>

                      <label>Experience Level</label>
                      <select
                        value={profile.experience || ""}
                        onChange={(e) =>
                          setProfile({ ...profile, experience: e.target.value })
                        }
                      >
                        <option value="">Select Level</option>
                        <option value="Entry">Entry</option>
                        <option value="Mid">Mid</option>
                        <option value="Senior">Senior</option>
                        <option value="Executive">Executive</option>
                      </select>

                      <div className="button-group">
                        <button onClick={saveProfile}>Save</button>
                        <button
                          className="btn-secondary"
                          onClick={() => loadProfile()}
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

                    {/* 🟣 EMPLOYMENT HISTORY BOX */}
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
                            <li key={job.id} className="employment-item">
                              <div>
                                <strong>{job.title}</strong> — {job.company}
                              </div>
                              <small>
                                {job.location ? `${job.location} • ` : ""}
                                {job.start_date} –{" "}
                                {job.current
                                  ? "Present"
                                  : job.end_date || "N/A"}
                              </small>
                              <p>{job.description || "No description."}</p>
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

                    {/* 🟣 SKILLS BOX */}
                    <div className="profile-box">
                      <h3>Skills</h3>
                      <SkillsSection token={token} />
                    </div>

                    {/* 🟣 EDUCATION BOX */}
                    <div className="profile-box">
                      <h3>Education</h3>
                      <EducationSection token={token} />
                    </div>

                    {/* 🟣 CERTIFICATION BOX */}
                    <div className="profile-box">
                      <h3>Certifications</h3>
                      <CertificationSection token={token} />
                    </div>

                    {/* 🟣 PROJECT BOX */}
                    <div className="profile-box">
                      <h3>Projects</h3>
                      <ProjectSection token={token} />
                    </div>

                    {/* 🔴 DANGER ZONE BOX */}
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
                  </>
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
