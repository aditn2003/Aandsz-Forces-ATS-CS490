import { useState, useEffect } from "react";
import { api } from "../api";
import EmploymentSection from "./EmploymentSection";

export default function ProfileSection({ token }) {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  async function loadProfile() {
    try {
      const { data } = await api.get("/api/profile", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setProfile(data.profile);
    } catch (err) {
      console.error(err);
    }
  }

  useEffect(() => {
    loadProfile();
  }, []);

  async function saveProfile() {
    try {
      setLoading(true);
      await api.post("/api/profile", profile, {
        headers: { Authorization: `Bearer ${token}` },
      });
      alert("Profile saved!");
    } catch (e) {
      alert(e?.response?.data?.error || "Save failed");
    } finally {
      setLoading(false);
    }
  }

  // Upload logic
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
      alert("✅ Profile picture uploaded!");
      setSelectedFile(null);
      setPreview(null);
    } catch (err) {
      alert("Upload failed");
    } finally {
      setUploading(false);
    }
  }

  function removePicture() {
    setProfile((prev) => ({ ...prev, picture_url: null }));
    alert("Profile picture removed");
  }

  return (
    <div>
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
            onChange={(e) => setProfile({ ...profile, email: e.target.value })}
          />
          <label>Phone *</label>
          <input
            value={profile.phone || ""}
            onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
          />
          <label>Location *</label>
          <input
            value={profile.location || ""}
            onChange={(e) =>
              setProfile({ ...profile, location: e.target.value })
            }
          />
          <label>Professional Title</label>
          <input
            value={profile.title || ""}
            onChange={(e) => setProfile({ ...profile, title: e.target.value })}
          />
          <label>Bio (max 500 chars)</label>
          <textarea
            maxLength={500}
            value={profile.bio || ""}
            onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
          />
          <p style={{ textAlign: "right", fontSize: 12 }}>
            {profile.bio?.length || 0}/500
          </p>

          <button onClick={saveProfile}>Save</button>

          <hr />
          <h3>Profile Picture</h3>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setSelectedFile(e.target.files[0])}
          />
          {uploading && <p>Uploading... {uploadProgress}%</p>}
          <div style={{ display: "flex", gap: "1rem" }}>
            <button onClick={uploadPicture}>Replace Picture</button>
            <button onClick={removePicture} style={{ background: "gray" }}>
              Remove
            </button>
          </div>

          <hr />
          <EmploymentSection token={token} />
        </>
      )}
    </div>
  );
}

