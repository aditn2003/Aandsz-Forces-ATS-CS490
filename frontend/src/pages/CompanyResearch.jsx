import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { fetchCompanyResearch, api } from "../api";
import CompanyResearchCard from "../components/CompanyResearchCard";
import "./CompanyResearch.css";

export default function CompanyResearch() {
  const [companies, setCompanies] = useState([]);
  const [researchResults, setResearchResults] = useState({});
  const [activeCompany, setActiveCompany] = useState("");
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  /* 🧭 Fetch job companies */
  useEffect(() => {
    const fetchJobs = async () => {
      setLoading(true);
      try {
        const res = await api.get("/api/jobs");
        const uniqueCompanies = [
          ...new Set(res.data.jobs.map((job) => job.company?.trim()).filter(Boolean)),
        ];
        setCompanies(uniqueCompanies);
        if (uniqueCompanies.length > 0) setActiveCompany(uniqueCompanies[0]);
      } catch (err) {
        setError("Failed to fetch jobs.");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchJobs();
  }, []);

  /* ⚡ Fetch research data */
  const fetchResearchData = async (company, isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      const data = await fetchCompanyResearch(company, isRefresh);
      setResearchResults((prev) => ({ ...prev, [company]: data }));
    } catch (err) {
      console.error(err);
      setResearchResults((prev) => ({
        ...prev,
        [company]: { error: err.message },
      }));
    } finally {
      if (isRefresh) setRefreshing(false);
    }
  };

  useEffect(() => {
    const fetchAll = async () => {
      if (companies.length === 0) return;
      setLoading(true);
      await Promise.all(companies.map((c) => fetchResearchData(c)));
      setLoading(false);
    };
    fetchAll();
  }, [companies]);

  const handleRefresh = async () => {
    if (!activeCompany) return;
    await fetchResearchData(activeCompany, true);
  };

  if (error) return <p className="error-text">{error}</p>;
  if (companies.length === 0)
    return <p className="no-data">No companies found in your Jobs tab yet.</p>;

  const currentData = researchResults[activeCompany];

  return (
    <div className="research-wrapper">
      <h1 className="research-header">Automated Company Research</h1>

      {/* 🧭 Company Navbar */}
      <div className="company-nav">
        {companies.map((company) => (
          <button
            key={company}
            className={`company-tab ${
              activeCompany === company ? "active" : ""
            }`}
            onClick={() => setActiveCompany(company)}
          >
            {company}
          </button>
        ))}
      </div>

      {/* 🔄 Refresh Button */}
      <div className="refresh-container">
        <button
          className="refresh-btn"
          onClick={handleRefresh}
          disabled={refreshing}
        >
          {refreshing ? "Refreshing..." : "🔁 Refresh Research"}
        </button>
      </div>

      {/* 🧾 Animated Company Data */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeCompany}
          initial={{ opacity: 0, x: 40 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -40 }}
          transition={{ duration: 0.4 }}
          className="company-content"
        >
          <h2 className="company-title">
            {activeCompany}
            <span className="verify-badge">
              ✅ Verified + AI Enriched
            </span>
          </h2>

          <CompanyResearchCard
            data={currentData}
            loading={!currentData}
            error={currentData?.error}
          />
        </motion.div>
      </AnimatePresence>

      {loading && <p className="loading-msg">Fetching company insights...</p>}
    </div>
  );
}
