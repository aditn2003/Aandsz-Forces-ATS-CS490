import React, { createContext, useContext, useState } from "react";
import { api } from "../api";
import { useAuth } from "./AuthContext";

const ProfileContext = createContext();
export const useProfile = () => useContext(ProfileContext);

export function ProfileProvider({ children }) {
  const { token } = useAuth();
  const [profile, setProfile] = useState(null);

  async function loadProfile() {
    if (!token) return;
    const { data } = await api.get("/api/profile", {
      headers: { Authorization: `Bearer ${token}` },
    });
    setProfile(data.profile);
  }

  async function saveProfile() {
    await api.post("/api/profile", profile, {
      headers: { Authorization: `Bearer ${token}` },
    });
  }

  return (
    <ProfileContext.Provider
      value={{ profile, setProfile, loadProfile, saveProfile }}
    >
      {children}
    </ProfileContext.Provider>
  );
}
