import React, { useState, useEffect } from "react";
import  { api }  from "../api";
import "../design/form.css";

export default function ProfileForm({ token }) {
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    phone: "",
    location: "",
    title: "",
    bio: "",
    industry: "",
    experience: "",
  });
  const [charCount, setCharCount] = useState(0);

  // Load saved profile
  useEffect(() => {
    async function fetchProfile() {
      try {
        const { data } = await api.get("/profile", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (data.profile) {
          setForm(data.profile);
          setCharCount(data.profile.bio?.length || 0);
        }
      } catch {
        console.warn("No profile yet");
      }
    }
    fetchProfile();
  }, [token]);

  function handleChange(e) {
    const { name, value } = e.target;
    if (name === "bio" && value.length > 500) return;
    setForm({ ...form, [name]: value });
    if (name === "bio") setCharCount(value.length);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    try {
      await api.post("/profile", form, {
        headers: { Authorization: `Bearer ${token}` },
      });
      alert("Profile saved successfully!");
    } catch (err) {
      alert("Error saving profile");
    }
  }

  function handleCancel() {
    setForm({
      fullName: "",
      email: "",
      phone: "",
      location: "",
      title: "",
      bio: "",
      industry: "",
      experience: "",
    });
  }

  return (
    <div className="card">
      <h2>Basic Profile Information</h2>
      <form onSubmit={handleSubmit}>
        <input name="fullName" placeholder="Full Name" value={form.fullName} onChange={handleChange} required />
        <input type="email" name="email" placeholder="Email" value={form.email} onChange={handleChange} required />
        <input name="phone" placeholder="Phone" value={form.phone} onChange={handleChange} required />
        <input name="location" placeholder="City, State" value={form.location} onChange={handleChange} required />
        <input name="title" placeholder="Professional Headline" value={form.title} onChange={handleChange} />
        <textarea name="bio" placeholder="Brief bio (max 500 chars)" value={form.bio} onChange={handleChange} />
        <small>{charCount}/500 characters</small>

        <select name="industry" value={form.industry} onChange={handleChange} required>
          <option value="">Select Industry</option>
          <option>Technology</option>
          <option>Finance</option>
          <option>Healthcare</option>
          <option>Education</option>
          <option>Other</option>
        </select>

        <select name="experience" value={form.experience} onChange={handleChange} required>
          <option value="">Select Experience Level</option>
          <option>Entry</option>
          <option>Mid</option>
          <option>Senior</option>
          <option>Executive</option>
        </select>

        <div className="form-actions">
          <button type="submit">Save</button>
          <button type="button" className="cancel" onClick={handleCancel}>Cancel</button>
        </div>
      </form>
    </div>
  );
}

