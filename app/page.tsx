"use client";

import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import GradientMesh from "@/components/GradientMesh";
import AnimatedScore from "@/components/AnimatedScore";
import RequirementCard from "@/components/RequirementCard";
import AnalysisLoader from "@/components/AnalysisLoader";
import FileUpload from "@/components/FileUpload";
import ResumeRealigner from "@/components/ResumeRealigner";

type Coverage = "strong" | "weak" | "missing";
interface Match {
  requirement: string;
  bestSentence: string | null;
  score: number;
  coverage: Coverage;
}
interface Result {
  score: number;
  strengths: Match[];
  weaknesses: Match[];
  missing: Match[];
  requirements: Match[];
  narrative: string;
}

const ease = [0.16, 1, 0.3, 1] as const;

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.7, delay: i * 0.1, ease: ease as unknown as [number, number, number, number] },
  }),
};

export default function Home() {
  const [resume, setResume] = useState("");
  const [jd, setJd] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState<string | null>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!resume.trim() || !jd.trim()) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ resume, jd }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Analysis failed");
      setResult(data);
      setTimeout(() => {
        resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 200);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <GradientMesh />
      <div className="page">
        <div className="container">
          {/* ====== HERO ====== */}
          <motion.section
            className="hero"
            initial="hidden"
            animate="visible"
          >
            <motion.div className="hero-badge" variants={fadeUp} custom={0}>
              <span className="dot" />
              AI-powered resume analysis
            </motion.div>

            <motion.h1 variants={fadeUp} custom={1}>
              Know your{" "}
              <span className="gradient-text">fit score</span>
              <br />
              before you apply.
            </motion.h1>

            <motion.p className="hero-sub" variants={fadeUp} custom={2}>
              Paste your resume and a job description. Get an instant semantic
              analysis — requirement-by-requirement — so you can target the gaps
              that actually matter.
            </motion.p>
          </motion.section>

          {/* ====== FORM ====== */}
          <motion.form
            onSubmit={submit}
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="glass">
              <div className="form-grid">
                <div className="form-group">
                  <label>Your resume</label>
                  <FileUpload onTextExtracted={setResume} />
                  <textarea
                    placeholder="Or paste your resume here — plain text, bullet points, anything..."
                    value={resume}
                    onChange={(e) => setResume(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label>Job description</label>
                  <FileUpload onTextExtracted={setJd} />
                  <textarea
                    placeholder="Or paste the target job description here..."
                    value={jd}
                    onChange={(e) => setJd(e.target.value)}
                  />
                </div>
              </div>

              <div className="btn-center">
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={loading || !resume.trim() || !jd.trim()}
                >
                  {!loading && <span className="shimmer" />}
                  {loading ? "Analyzing..." : "Analyze fit"}
                  {!loading && (
                    <svg
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M5 12h14M12 5l7 7-7 7" />
                    </svg>
                  )}
                </button>
              </div>
            </div>
          </motion.form>

          {/* ====== LOADER ====== */}
          <AnimatePresence>
            {loading && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.4 }}
              >
                <AnalysisLoader />
              </motion.div>
            )}
          </AnimatePresence>

          {/* ====== ERROR ====== */}
          <AnimatePresence>
            {error && (
              <motion.div
                className="glass glass-sm error-card"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                style={{ marginTop: "2rem" }}
              >
                {error}
              </motion.div>
            )}
          </AnimatePresence>

          {/* ====== RESULTS ====== */}
          <AnimatePresence>
            {result && (
              <motion.div
                ref={resultsRef}
                className="results"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.6 }}
              >
                {/* Score */}
                <motion.div
                  className="glass"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                  style={{ textAlign: "center", marginBottom: "2rem" }}
                >
                  <AnimatedScore score={result.score} />
                </motion.div>

                {/* Stats strip */}
                <motion.div
                  className="stats-strip"
                  initial="hidden"
                  animate="visible"
                >
                  {[
                    {
                      value: result.strengths.length,
                      label: "Strong matches",
                      color: "var(--emerald)",
                    },
                    {
                      value: result.weaknesses.length,
                      label: "Partial coverage",
                      color: "var(--amber)",
                    },
                    {
                      value: result.missing.length,
                      label: "Gaps found",
                      color: "var(--red)",
                    },
                  ].map((stat, i) => (
                    <motion.div
                      key={stat.label}
                      className="stat-card glass"
                      variants={fadeUp}
                      custom={i}
                    >
                      <div className="stat-value" style={{ color: stat.color }}>
                        {stat.value}
                      </div>
                      <div className="stat-label">{stat.label}</div>
                    </motion.div>
                  ))}
                </motion.div>

                {/* Narrative */}
                {result.narrative && (
                  <motion.div
                    className="glass narrative-card"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.3 }}
                  >
                    <h3>
                      <svg
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="var(--primary)"
                        strokeWidth="2"
                        strokeLinecap="round"
                      >
                        <path d="M12 2a10 10 0 110 20 10 10 0 010-20zM12 16v-4M12 8h.01" />
                      </svg>
                      Analysis
                    </h3>
                    <p className="narrative-text">{result.narrative}</p>
                  </motion.div>
                )}

                {/* Requirements breakdown */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.4 }}
                >
                  <div className="results-header">
                    <h2 className="section-title">Requirement breakdown</h2>
                    <p className="section-sub">
                      Each JD requirement scored against your closest resume
                      match
                    </p>
                  </div>

                  <div className="req-grid">
                    {result.requirements.map((m, i) => (
                      <RequirementCard
                        key={i}
                        requirement={m.requirement}
                        bestSentence={m.bestSentence}
                        score={m.score}
                        coverage={m.coverage}
                        index={i}
                      />
                    ))}
                  </div>
                </motion.div>

                {/* ====== REALIGNER ====== */}
                <ResumeRealigner
                  resume={resume}
                  jd={jd}
                  analysis={result}
                  onRevalidated={(newScore) => {
                    // Could update UI state if needed
                  }}
                />
              </motion.div>
            )}
          </AnimatePresence>

          {/* ====== FOOTER ====== */}
          <footer className="footer">
            Built by Punith Gowda
          </footer>
        </div>
      </div>
    </>
  );
}
