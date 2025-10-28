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
  const [loading, setLoading] = useState(false);
  const authed = !!token;

  // Manage token persistence
  useEffect(() => {
    if (token) localStorage.setItem("token", token);
    else localStorage.removeItem("token");
  }, [token]);

  // === AUTH FUNCTIONS ===
  async function register() {
    try {
      setLoading(true);
      const body = {
        firstName: form.firstName || "",
        lastName: form.lastName || "",
        email: form.email || "",
        password: form.password || "",
        confirmPassword: form.confirmPassword || "",
      };
      const { data } = await api.post("/register", body);
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
      const body = {
        email: form.email || "",
        code: form.code || "",
        newPassword: form.newPassword || "",
        confirmPassword: form.confirmPassword || "",
      };
      const { data } = await api.post("/reset", body);
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
      setPage("home");
    } catch (e) {
      alert(e?.response?.data?.error || "Delete failed");
    }
  }

  // === MAIN UI ===
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
        <div className="card">
          {loading && <Spinner />}

          {page === "home" && (
            <>
              <h2>Welcome to ATS for Candidates</h2>
              <p>
                This is your all-in-one platform for managing applications,
                resumes, and profiles. Use the navigation bar above to register,
                log in, or view your profile.
              </p>
            </>
          )}

          {page === "register" && (
            <>
              <h2>Create an Account</h2>
              <input
                placeholder="First name"
                onChange={(e) =>
                  setForm({ ...form, firstName: e.target.value })
                }
              />
              <input
                placeholder="Last name"
                onChange={(e) => setForm({ ...form, lastName: e.target.value })}
              />
              <input
                placeholder="Email"
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
              <input
                type="password"
                placeholder="Password"
                onChange={(e) => setForm({ ...form, password: e.target.value })}
              />
              <input
                type="password"
                placeholder="Confirm password"
                onChange={(e) =>
                  setForm({ ...form, confirmPassword: e.target.value })
                }
              />
              <button onClick={register}>Register</button>
            </>
          )}

          {page === "login" && (
            <>
              <h2>Login to Your Account</h2>
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
                  style={{ fontSize: "14px", color: "var(--color-primary)" }}
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

          {page === "forgot" && (
            <>
              <h2>Forgot Password</h2>
              <p>Enter your registered email to receive a reset code.</p>
              <input
                placeholder="Email"
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
              <button onClick={forgotPassword}>Send Reset Code</button>
            </>
          )}

          {page === "reset" && (
            <>
              <h2>Reset Password</h2>
              <input
                placeholder="Email"
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
              <input
                placeholder="Reset code"
                onChange={(e) => setForm({ ...form, code: e.target.value })}
              />
              <input
                type="password"
                placeholder="New password"
                onChange={(e) =>
                  setForm({ ...form, newPassword: e.target.value })
                }
              />
              <input
                type="password"
                placeholder="Confirm new password"
                onChange={(e) =>
                  setForm({ ...form, confirmPassword: e.target.value })
                }
              />
              <button onClick={resetPassword}>Reset Password</button>
            </>
          )}

          {page === "profile" &&
            (authed ? (
              <>
                <h2>My Profile</h2>
                <button onClick={loadMe}>Reload Profile</button>
                <pre>{me ? JSON.stringify(me, null, 2) : "No data loaded."}</pre>
                <hr />
                <h3>Edit Profile</h3>
                <input
                  placeholder="First name"
                  onChange={(e) =>
                    setForm({ ...form, firstName: e.target.value })
                  }
                />
                <input
                  placeholder="Last name"
                  onChange={(e) =>
                    setForm({ ...form, lastName: e.target.value })
                  }
                />
                <button onClick={loadMe}>Save</button>
                <hr />
                <h3 style={{ color: "crimson" }}>Danger Zone</h3>
                <button onClick={deleteAccount}>Delete Account</button>
              </>
            ) : (
              <p>You must log in to view your profile.</p>
            ))}
        </div>
      </main>
    </div>
  );
}

