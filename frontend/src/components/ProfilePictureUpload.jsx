import React, { useState, useEffect } from "react";
import { api } from "../api";

export default function ProfilePictureUpload({ token }) {
  const [preview, setPreview] = useState(null);
  const [error, setError] = useState("");
  const [progress, setProgress] = useState(0);

  // Load saved picture
  useEffect(() => {
    async function fetchPicture() {
      try {
        const { data } = await api.get("/profile/picture", {
          headers: { Authorization: `Bearer ${token}` },
        });
        setPreview(data.url);
      } catch {
        setPreview("/default-avatar.png");
      }
    }
    fetchPicture();
  }, [token]);

  async function handleFile(e) {
    const file = e.target.files[0];
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/gif"].includes(file.type)) return setError("Invalid file type");
    if (file.size > 5 * 1024 * 1024) return setError("File too large (max 5MB)");

    setError("");
    const formData = new FormData();
    formData.append("image", file);

    try {
      const { data } = await api.post("/upload-profile-pic", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
          Authorization: `Bearer ${token}`,
        },
        onUploadProgress: (e) => setProgress(Math.round((e.loaded * 100) / e.total)),
      });

      setPreview(data.url);
      await api.post("/profile/picture", { url: data.url }, {
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch (err) {
      setError("Upload failed");
    }
  }

  return (
    <div className="card">
      <h2>Profile Picture</h2>
      <input type="file" accept="image/*" onChange={handleFile} />
      {progress > 0 && progress < 100 && <p>Uploading... {progress}%</p>}
      {error && <p style={{ color: "red" }}>{error}</p>}
      <img src={preview || "/default-avatar.png"} alt="Profile" style={{ width: "120px", borderRadius: "50%" }} />
    </div>
  );
}

