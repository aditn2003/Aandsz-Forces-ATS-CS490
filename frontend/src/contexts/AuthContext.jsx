import React, { createContext, useContext, useState, useEffect } from "react";
import { api } from "../api";

const AuthContext = createContext();
export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(localStorage.getItem("token"));
  const authed = !!token;

  useEffect(() => {
    if (token) localStorage.setItem("token", token);
    else localStorage.removeItem("token");
  }, [token]);

  async function login(email, password) {
    const { data } = await api.post("/login", { email, password });
    setToken(data.token);
  }

  async function register(payload) {
    const { data } = await api.post("/register", payload);
    setToken(data.token);
  }

  function logout() {
    setToken(null);
  }

  return (
    <AuthContext.Provider
      value={{ token, setToken, authed, login, register, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}
