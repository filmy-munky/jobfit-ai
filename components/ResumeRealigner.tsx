"use client";

import { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface AnalysisResult {
  score: number;
  strengths: { requirement: string }[];
  weaknesses: { requirement: string }[];
  missing: { requirement: string }[];
}

interface RevalidationResult {
  score: number;
  strengths: { requirement: string }[];
  weaknesses: { requirement: string }[];
  missing: { requirement: string }[];
  requirements: {
    requirement: string;
    coverage: string;
    score: number;
  }[];
}

interface Props {
  resume: string;
  jd: string;
  analysis: AnalysisResult;
  onRevalidated: (newScore: number) => void;
}

type Phase = "idle" | "realigning" | "realigned" | "revalidating" | "validated";

export default function ResumeRealigner({ resume, jd, analysis, onRevalidated }: Props) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [realignedResume, setRealignedResume] = useState("");
  const [revalidation, setRevalidation] = useState<RevalidationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pdfLoading, setPdfLoading] = useState(false);
  const textRef = useRef<HTMLTextAreaElement>(null);

  const handleRealign = useCallback(async () => {
    setPhase("realigning");
    setError(null);
    setRealignedResume("");
    try {
      const res = await fetch("/api/realign", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ resume, jd, analysis }),
      });
      if (!res.ok) throw new Error(await res.text());
      const reader = res.body?.getReader();
      if (!reader) throw new Error("No response body");
      const dec = new TextDecoder();
      let text = "";
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        text += dec.decode(value, { stream: true });
        setRealignedResume(text);
      }
      setPhase("realigned");
    } catch (e) {
      setError((e as Error).message);
      setPhase("idle");
    }
  }, [resume, jd, analysis]);

  const handleRevalidate = useCallback(async () => {
    setPhase("revalidating");
    setError(null);
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ resume: realignedResume, jd, skipValidation: true }),
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setRevalidation(data);
      setPhase("validated");
      onRevalidated(data.score);
    } catch (e) {
      setError((e as Error).message);
      setPhase("realigned");
    }
  }, [realignedResume, jd, onRevalidated]);

  const handleDownloadPDF = useCallback(async () => {
    setPdfLoading(true);
    try {
      const { jsPDF } = await import("jspdf");
      const doc = new jsPDF({ unit: "mm", format: "a4" });
      const marginLeft = 22;
      const marginRight = 22;
      const pageWidth = doc.internal.pageSize.getWidth() - marginLeft - marginRight;
      const pageHeight = doc.internal.pageSize.getHeight();
      const bodyLineHeight = 5.5;
      const bulletIndent = 4;
      let y = 20;

      const checkPage = (needed: number) => {
        if (y + needed > pageHeight - 20) {
          doc.addPage();
          y = 20;
        }
      };

      // Parse the realigned resume into structured sections
      const rawLines = realignedResume.split("\n");
      let nameRendered = false;

      for (let i = 0; i < rawLines.length; i++) {
        const raw = rawLines[i];
        const trimmed = raw.trim();

        // Skip empty lines but add spacing
        if (!trimmed) {
          y += 2;
          continue;
        }

        // Detect if this is the candidate name (first substantial non-header line)
        if (!nameRendered && trimmed.length < 60 && !/^(SUMMARY|EXPERIENCE|EDUCATION|SKILLS|CERTIFICATIONS|PROJECTS|LANGUAGES|OBJECTIVE|PROFILE|AWARDS)/i.test(trimmed)) {
          checkPage(14);
          doc.setFont("helvetica", "bold");
          doc.setFontSize(18);
          doc.setTextColor(30, 30, 40);
          doc.text(trimmed, marginLeft, y);
          y += 7;
          // Draw a thin accent line under the name
          doc.setDrawColor(99, 102, 241);
          doc.setLineWidth(0.5);
          doc.line(marginLeft, y, marginLeft + pageWidth, y);
          y += 6;
          nameRendered = true;
          continue;
        }

        // Section headers: all-caps or known header keywords
        const isHeader = /^[A-Z][A-Z\s&\/,]{2,}$/.test(trimmed) ||
          /^(SUMMARY|EXPERIENCE|WORK HISTORY|EDUCATION|SKILLS|TECHNICAL SKILLS|CORE COMPETENCIES|CERTIFICATIONS|PROJECTS|AWARDS|LANGUAGES|VOLUNTEER|REFERENCES|PROFESSIONAL EXPERIENCE|OBJECTIVE|PROFILE|ABOUT)/i.test(trimmed);

        if (isHeader) {
          checkPage(12);
          y += 4;
          doc.setFont("helvetica", "bold");
          doc.setFontSize(11);
          doc.setTextColor(50, 50, 60);
          doc.text(trimmed.toUpperCase(), marginLeft, y);
          y += 1.5;
          // Subtle line under section header
          doc.setDrawColor(180, 180, 200);
          doc.setLineWidth(0.2);
          doc.line(marginLeft, y, marginLeft + pageWidth, y);
          y += 4;
          continue;
        }

        // Bullet points
        const isBullet = /^\s*[-•*▪·]\s/.test(raw);
        if (isBullet) {
          const bulletText = trimmed.replace(/^[-•*▪·]\s*/, "");
          doc.setFont("helvetica", "normal");
          doc.setFontSize(10);
          doc.setTextColor(40, 40, 50);
          const wrapped = doc.splitTextToSize(bulletText, pageWidth - bulletIndent - 3);
          checkPage(wrapped.length * bodyLineHeight + 1);
          // Bullet dot
          doc.setFontSize(7);
          doc.text("●", marginLeft + bulletIndent - 3, y);
          doc.setFontSize(10);
          for (let j = 0; j < wrapped.length; j++) {
            doc.text(wrapped[j], marginLeft + bulletIndent + 1, y);
            y += bodyLineHeight;
          }
          y += 0.5;
          continue;
        }

        // Job title / company lines (usually have dates like "2020 - 2023" or "Jan 2021")
        const hasDate = /\b(20\d{2}|19\d{2}|present|current)\b/i.test(trimmed);
        if (hasDate && trimmed.length < 120) {
          checkPage(8);
          doc.setFont("helvetica", "bold");
          doc.setFontSize(10);
          doc.setTextColor(40, 40, 50);
          const wrapped = doc.splitTextToSize(trimmed, pageWidth);
          for (const wl of wrapped) {
            doc.text(wl, marginLeft, y);
            y += bodyLineHeight;
          }
          y += 1;
          continue;
        }

        // Regular paragraph text
        doc.setFont("helvetica", "normal");
        doc.setFontSize(10);
        doc.setTextColor(50, 50, 60);
        const wrapped = doc.splitTextToSize(trimmed, pageWidth);
        checkPage(wrapped.length * bodyLineHeight);
        for (const wl of wrapped) {
          doc.text(wl, marginLeft, y);
          y += bodyLineHeight;
        }
        y += 0.5;
      }

      doc.save("optimized-resume.pdf");
    } catch (e) {
      setError(`PDF generation failed: ${(e as Error).message}`);
    } finally {
      setPdfLoading(false);
    }
  }, [realignedResume, analysis.score, revalidation?.score]);

  const scoreDelta =
    revalidation && analysis ? revalidation.score - analysis.score : 0;

  return (
    <motion.div
      className="realigner"
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.5 }}
    >
      {/* CTA */}
      {phase === "idle" && (
        <motion.div
          className="glass realigner-cta"
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <div className="realigner-cta-inner">
            <div>
              <h3 className="realigner-title">Ready to close the gaps?</h3>
              <p className="realigner-desc">
                AI will rewrite your resume to better target this role — keeping all facts
                truthful while optimizing language, structure, and emphasis.
              </p>
            </div>
            <button onClick={handleRealign} className="btn-primary btn-realign">
              <span className="shimmer" />
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <path d="M12 20V4M5 11l7-7 7 7" />
              </svg>
              Realign my resume
            </button>
          </div>
        </motion.div>
      )}

      {/* Realigning loader */}
      <AnimatePresence>
        {phase === "realigning" && (
          <motion.div
            className="glass"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <h3 className="realigner-title">Rewriting your resume...</h3>
            <div className="realigned-preview">
              <pre className="realigned-text">{realignedResume || "Generating..."}</pre>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Realigned result */}
      {(phase === "realigned" || phase === "revalidating" || phase === "validated") && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
        >
          <div className="glass" style={{ marginBottom: "1.5rem" }}>
            <div className="realigned-header">
              <h3 className="realigner-title">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--emerald)" strokeWidth="2.5" strokeLinecap="round">
                  <path d="M20 6L9 17l-5-5" />
                </svg>
                Optimized resume
              </h3>
              <span className="realigned-badge">AI-enhanced</span>
            </div>
            <textarea
              ref={textRef}
              className="realigned-textarea"
              value={realignedResume}
              onChange={(e) => setRealignedResume(e.target.value)}
              rows={20}
            />
            <p className="realigned-hint">
              You can edit the text above before validating.
            </p>
          </div>

          {/* Action buttons */}
          <div className="realigner-actions">
            {phase === "realigned" && (
              <button onClick={handleRevalidate} className="btn-primary">
                <span className="shimmer" />
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <path d="M1 4v6h6M23 20v-6h-6" />
                  <path d="M20.49 9A9 9 0 005.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 013.51 15" />
                </svg>
                Validate improved resume
              </button>
            )}

            {phase === "revalidating" && (
              <button className="btn-primary" disabled>
                Re-analyzing...
              </button>
            )}

            {/* Revalidation result */}
            <AnimatePresence>
              {phase === "validated" && revalidation && (
                <motion.div
                  className="revalidation-result"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6 }}
                >
                  <div className="score-comparison glass">
                    <div className="score-compare-item">
                      <span className="score-compare-label">Before</span>
                      <span
                        className="score-compare-value"
                        style={{
                          color:
                            analysis.score >= 70
                              ? "var(--emerald)"
                              : analysis.score >= 40
                              ? "var(--amber)"
                              : "var(--red)",
                        }}
                      >
                        {analysis.score}
                      </span>
                    </div>
                    <div className="score-compare-arrow">
                      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2" strokeLinecap="round">
                        <path d="M5 12h14M12 5l7 7-7 7" />
                      </svg>
                    </div>
                    <div className="score-compare-item">
                      <span className="score-compare-label">After</span>
                      <span
                        className="score-compare-value"
                        style={{
                          color:
                            revalidation.score >= 70
                              ? "var(--emerald)"
                              : revalidation.score >= 40
                              ? "var(--amber)"
                              : "var(--red)",
                        }}
                      >
                        {revalidation.score}
                      </span>
                    </div>
                    {scoreDelta !== 0 && (
                      <div
                        className="score-delta"
                        style={{
                          color: scoreDelta > 0 ? "var(--emerald)" : "var(--red)",
                        }}
                      >
                        {scoreDelta > 0 ? "+" : ""}
                        {scoreDelta} points
                      </div>
                    )}
                  </div>

                  <div className="revalidation-stats">
                    <div className="revalidation-stat">
                      <span style={{ color: "var(--emerald)" }}>
                        {revalidation.strengths.length}
                      </span>{" "}
                      strong
                    </div>
                    <div className="revalidation-stat">
                      <span style={{ color: "var(--amber)" }}>
                        {revalidation.weaknesses.length}
                      </span>{" "}
                      partial
                    </div>
                    <div className="revalidation-stat">
                      <span style={{ color: "var(--red)" }}>
                        {revalidation.missing.length}
                      </span>{" "}
                      gaps
                    </div>
                  </div>

                  <button
                    onClick={handleDownloadPDF}
                    className="btn-primary btn-download"
                    disabled={pdfLoading}
                  >
                    <span className="shimmer" />
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                      <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" />
                    </svg>
                    {pdfLoading
                      ? "Generating..."
                      : "Download optimized resume (.pdf)"}
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      )}

      {error && (
        <motion.div
          className="glass glass-sm error-card"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          style={{ marginTop: "1rem" }}
        >
          {error}
        </motion.div>
      )}
    </motion.div>
  );
}
