import { useEffect, useState } from "react";
import { api } from "./api";

export default function App() {
  const [page, setPage] = useState("home");
  const [form, setForm] = useState({});     // reused for inputs
  const [token, setToken] = useState(localStorage.getItem("token"));
  const [me, setMe] = useState(null);
  const authed = !!token;

  useEffect(() => {
    if (token) localStorage.setItem("token", token);
    else localStorage.removeItem("token");
  }, [token]);

  async function register() {
    try {
      const body = {
        firstName: form.firstName || "",
        lastName: form.lastName || "",
        email: form.email || "",
        password: form.password || "",
        confirmPassword: form.confirmPassword || ""
      };
      const { data } = await api.post("/register", body);
      alert("Registered!");
      setToken(data.token);
      setPage("profile");
    } catch (e) {
      alert(e?.response?.data?.error || "Registration failed");
    }
  }

  async function login() {
    try {
      const { data } = await api.post("/login", { email: form.email, password: form.password });
      alert("Logged in!");
      setToken(data.token);
      setPage("profile");
    } catch (e) {
      alert(e?.response?.data?.error || "Login failed");
      setForm({ ...form, password: "" }); // clear after failure
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
      const { data } = await api.get("/me", { headers: { Authorization: `Bearer ${token}` } });
      setMe(data.user);
    } catch {
      alert("Please login again");
      setToken(null);
    }
  }

  async function saveMe() {
    try {
      const body = { firstName: form.firstName || me?.firstName, lastName: form.lastName || me?.lastName };
      const { data } = await api.put("/me", body, { headers: { Authorization: `Bearer ${token}` } });
      alert("Saved");
      await loadMe();
    } catch {
      alert("Save failed");
    }
  }

  async function requestReset() {
    const { data } = await api.post("/forgot", { email: form.email });
    alert("If the account exists, a reset was sent.\nDEMO code (for testing): " + (data.demoCode || "check email"));
    setPage("reset");
  }

  async function completeReset() {
    try {
      const body = {
        email: form.email,
        code: form.code,
        newPassword: form.newPassword,
        confirmPassword: form.confirmPassword
      };
      const { data } = await api.post("/reset", body);
      alert("Password updated + logged in");
      setToken(data.token);
      setPage("profile");
    } catch (e) {
      alert(e?.response?.data?.error || "Reset failed");
    }
  }

  async function googleLogin() {
    // DEMO: we just send an email and pretend Google verified it.
    const email = prompt("Enter your Google email for demo:");
    if (!email) return;
    const { data } = await api.post("/google", { email, firstName: "Google", lastName: "User" });
    setToken(data.token);
    alert("Google login OK");
    setPage("profile");
  }

  async function deleteAccount() {
    const password = prompt("Confirm your password (leave blank if you used Google):") || "";
    try {
      await api.post("/delete", { password }, { headers: { Authorization: `Bearer ${token}` } });
      alert("Account deleted");
      setToken(null);
      setMe(null);
      setPage("home");
    } catch (e) {
      alert(e?.response?.data?.error || "Delete failed");
    }
  }

  // UI
  return (
    <div style={{ maxWidth: 520, margin: "40px auto", fontFamily: "system-ui, Arial" }}>
      <h1>ATS — Auth (Group 1)</h1>

      <nav style={{ display: "flex", gap: 8, marginBottom: 20 }}>
        <button onClick={() => setPage("home")}>Home</button>
        <button onClick={() => setPage("register")}>Register</button>
        <button onClick={() => setPage("login")}>Login</button>
        <button onClick={() => setPage("forgot")}>Forgot</button>
        <button onClick={() => { setPage("profile"); if (authed) loadMe(); }}>Profile</button>
        {authed && <button onClick={logout}>Logout</button>}
      </nav>

      {page === "home" && (
        <div>
          <p>Welcome! Do UC-001..UC-009 here.</p>
          <ul>
            <li>Register → Login → Profile → Logout</li>
            <li>Forgot/Reset password</li>
            <li>Google login (demo)</li>
            <li>Delete account</li>
          </ul>
        </div>
      )}

      {page === "register" && (
        <div>
          <h2>Register</h2>
          <input placeholder="First name" onChange={e => setForm({ ...form, firstName: e.target.value })} /><br />
          <input placeholder="Last name" onChange={e => setForm({ ...form, lastName: e.target.value })} /><br />
          <input placeholder="Email" onChange={e => setForm({ ...form, email: e.target.value })} /><br />
          <input type="password" placeholder="Password" onChange={e => setForm({ ...form, password: e.target.value })} /><br />
          <input type="password" placeholder="Confirm password" onChange={e => setForm({ ...form, confirmPassword: e.target.value })} /><br />
          <button onClick={register}>Create Account</button>
        </div>
      )}

      {page === "login" && (
        <div>
          <h2>Login</h2>
          <input placeholder="Email" onChange={e => setForm({ ...form, email: e.target.value })} /><br />
          <input type="password" placeholder="Password" value={form.password || ""} onChange={e => setForm({ ...form, password: e.target.value })} /><br />
          <button onClick={login}>Login</button>
          <div style={{ height: 10 }} />
          <button onClick={googleLogin}>Sign in with Google (demo)</button>
          <p style={{ marginTop: 8 }}>
            Invalid credentials show “Invalid email or password”.<br />
            After failure, password field is cleared.
          </p>
        </div>
      )}

      {page === "forgot" && (
        <div>
          <h2>Forgot Password</h2>
          <input placeholder="Your account email" onChange={e => setForm({ ...form, email: e.target.value })} /><br />
          <button onClick={requestReset}>Send Reset Code</button>
          <p>We show a demo code so you can test immediately (real app would email it).</p>
        </div>
      )}

      {page === "reset" && (
        <div>
          <h2>Reset Password</h2>
          <input placeholder="Email (same as forgot)" onChange={e => setForm({ ...form, email: e.target.value })} /><br />
          <input placeholder="Code from email" onChange={e => setForm({ ...form, code: e.target.value })} /><br />
          <input type="password" placeholder="New password" onChange={e => setForm({ ...form, newPassword: e.target.value })} /><br />
          <input type="password" placeholder="Confirm new password" onChange={e => setForm({ ...form, confirmPassword: e.target.value })} /><br />
          <button onClick={completeReset}>Change Password</button>
        </div>
      )}

      {page === "profile" && (
        !authed ? (
          <p>You must log in to view your profile.</p>
        ) : (
          <div>
            <h2>My Profile</h2>
            <button onClick={loadMe}>Reload</button>
            <pre>{me ? JSON.stringify(me, null, 2) : "No data yet. Click Reload."}</pre>
            <h3>Edit</h3>
            <input placeholder="First name" onChange={e => setForm({ ...form, firstName: e.target.value })} /><br />
            <input placeholder="Last name" onChange={e => setForm({ ...form, lastName: e.target.value })} /><br />
            <button onClick={saveMe}>Save</button>
            <hr />
            <h3 style={{ color: "crimson" }}>Danger Zone</h3>
            <button onClick={deleteAccount}>Delete My Account</button>
          </div>
        )
      )}
    </div>
  );
}

