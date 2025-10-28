import { useEffect, useState } from "react";
import { api } from "./api";
import "./design/base.css";
import "./design/form.css";
import NavBar from "./components/NavBar";
import Spinner from "./components/Spinner";

export default function App() {
  const [page, setPage] = useState("home");
  const [form, setForm] = useState({});
  const [token, setToken] = useState(localStorage.getItem("token"));
  const [me, setMe] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [employment, setEmployment] = useState([]);
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

  async function googleLogin() {
    try {
      const email = prompt("Enter your Google email for demo:") || "";
      if (!email) return;
      const { data } = await api.post("/google", { email });
      alert("Google login demo successful!");
      setToken(data.token);
      setPage("profile");
    } catch (e) {
      alert(e?.response?.data?.error || "Google login failed");
    }
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
    setMe(null);
    setProfile(null);
    setPage("home");
  }

  async function loadMe() {
    try {
      const { data } = await api.get("/me", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setMe(data.user);
    } catch {
      alert("Session expired, please log in again.");
      setToken(null);
    }
  }

  async function deleteAccount() {
    const password = prompt("Enter your password to confirm deletion:") || "";
    try {
      await api.post(
        "/delete",
        { password },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      alert("Account deleted successfully.");
      setToken(null);
      setMe(null);
      setProfile(null);
      setPage("home");
    } catch (e) {
      alert(e?.response?.data?.error || "Delete failed");
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

  // ---------- PICTURE ----------
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
    <div>
      <NavBar authed={authed} onNavigate={setPage} onLogout={logout} />
      <main
        style={{
          display: "flex",
          justifyContent: "center",
          paddingTop: "2rem",
          minHeight: "80vh",
        }}
      >
        <div className="card" style={{ width: "90%", maxWidth: "700px" }}>
          {loading && <Spinner />}

          {/* ---------- HOME ---------- */}
          {page === "home" && (
            <>
              <h2>Welcome to ATS for Candidates</h2>
              <p>
                This is your all-in-one platform for managing applications,
                resumes, and profiles.
              </p>
            </>
          )}
          {/* ---------- REGISTER ---------- */}
          {page === "register" && (
            <>
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
                onChange={(e) => setForm({ ...form, lastName: e.target.value })}
              />
              <input
                placeholder="Email"
                value={form.email || ""}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
              <input
                type="password"
                placeholder="Password"
                value={form.password || ""}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
              />
              <input
                type="password"
                placeholder="Confirm password"
                value={form.confirmPassword || ""}
                onChange={(e) =>
                  setForm({ ...form, confirmPassword: e.target.value })
                }
              />
              <button onClick={register}>Register</button>

              <p style={{ marginTop: "10px" }}>
                Already have an account?{" "}
                <a
                  href="#"
                  onClick={() => setPage("login")}
                  style={{ color: "var(--color-primary)" }}
                >
                  Login here
                </a>
              </p>
            </>
          )}

          {/* ---------- LOGIN ---------- */}
          {page === "login" && (
            <>
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

              <div style={{ marginTop: "10px" }}>
                <a
                  href="#"
                  onClick={() => setPage("forgot")}
                  style={{
                    fontSize: "14px",
                    color: "var(--color-primary)",
                  }}
                >
                  Forgot password?
                </a>
              </div>

              <button
                onClick={googleLogin}
                style={{
                  marginTop: 15,
                  background: "#DB4437",
                  color: "white",
                  width: "100%",
                  padding: "8px 0",
                  borderRadius: 5,
                  border: "none",
                  cursor: "pointer",
                }}
              >
                Sign in with Google (Demo)
              </button>
            </>
          )}

          {/* ---------- PROFILE ---------- */}
          {page === "profile" &&
            (authed ? (
              <>
                <h2>My Profile</h2>
                {profile && (
                  <>
                    <div style={{ textAlign: "center" }}>
                      <img
                        src={
                          preview ||
                          profile.picture_url ||
                          "/uploads/default-avatar.png"
                        }
                        alt="Profile"
                        style={{
                          width: 120,
                          height: 120,
                          borderRadius: "50%",
                          objectFit: "cover",
                        }}
                      />
                    </div>

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
                    <label>Location (City, State) *</label>
                    <input
                      value={profile.location || ""}
                      onChange={(e) =>
                        setProfile({ ...profile, location: e.target.value })
                      }
                    />
                    <label>Professional Headline / Title</label>
                    <input
                      value={profile.title || ""}
                      onChange={(e) =>
                        setProfile({ ...profile, title: e.target.value })
                      }
                    />
                    <label>Short Bio (max 500 chars)</label>
                    <textarea
                      maxLength={500}
                      value={profile.bio || ""}
                      onChange={(e) =>
                        setProfile({ ...profile, bio: e.target.value })
                      }
                    />
                    <p style={{ textAlign: "right", fontSize: 12 }}>
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

                    <div style={{ display: "flex", gap: "1rem" }}>
                      <button onClick={saveProfile}>Save</button>
                      <button
                        onClick={() => loadProfile()}
                        style={{ background: "#888" }}
                      >
                        Cancel
                      </button>
                    </div>

                    <hr />
                    <h3>Profile Picture</h3>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => setSelectedFile(e.target.files[0])}
                    />
                    {preview && (
                      <img
                        src={preview}
                        alt="Preview"
                        style={{
                          width: 120,
                          height: 120,
                          borderRadius: "50%",
                          marginTop: 10,
                        }}
                      />
                    )}
                    {uploading && <p>Uploading... {uploadProgress}%</p>}
                    <div style={{ display: "flex", gap: "1rem" }}>
                      <button onClick={uploadPicture} disabled={uploading}>
                        Replace Picture
                      </button>
                      <button
                        onClick={removePicture}
                        style={{ background: "gray" }}
                      >
                        Remove
                      </button>
                    </div>

                    <hr />
                    <h3>Employment History</h3>
                    <button onClick={loadEmployment}>Load Employment</button>
                    {employment.length === 0 ? (
                      <p>No employment history yet.</p>
                    ) : (
                      <ul>
                        {employment.map((job) => (
                          <li key={job.id}>
                            <strong>{job.title}</strong> at {job.company} (
                            {job.start_date} - {job.end_date || "Present"})
                          </li>
                        ))}
                      </ul>
                    )}

                    <hr />
                    <h3 style={{ color: "crimson" }}>Danger Zone</h3>
                    <button onClick={deleteAccount}>Delete Account</button>
                  </>
                )}
              </>
            ) : (
              <div className="card">
                <p>You must log in to view your profile.</p>
              </div>
            ))}
        </div>
      </main>
    </div>
  );
}
