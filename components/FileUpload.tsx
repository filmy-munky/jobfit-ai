"use client";

import { useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface Props {
  onTextExtracted: (text: string) => void;
}

export default function FileUpload({ onTextExtracted }: Props) {
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const processFile = useCallback(
    async (file: File) => {
      setLoading(true);
      setError(null);
      setFileName(file.name);
      try {
        const form = new FormData();
        form.append("file", file);
        const res = await fetch("/api/extract-text", {
          method: "POST",
          body: form,
          headers: { "x-requested-with": "XMLHttpRequest" },
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Upload failed");
        if (!data.text?.trim()) throw new Error("No text content found in file");
        onTextExtracted(data.text);
      } catch (e) {
        setError((e as Error).message);
        setFileName(null);
      } finally {
        setLoading(false);
      }
    },
    [onTextExtracted],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) processFile(file);
    },
    [processFile],
  );

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) processFile(file);
    },
    [processFile],
  );

  return (
    <div
      className={`file-upload ${dragging ? "file-upload-active" : ""}`}
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      onClick={() => inputRef.current?.click()}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.docx,.txt,.md,.csv,.json,.xml,.html,.rtf,.yml,.yaml"
        onChange={handleChange}
        style={{ display: "none" }}
      />

      <AnimatePresence mode="wait">
        {loading ? (
          <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="file-upload-inner"
          >
            <div className="file-spinner" />
            <span>Extracting text...</span>
          </motion.div>
        ) : fileName && !error ? (
          <motion.div
            key="done"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="file-upload-inner file-upload-done"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--emerald)" strokeWidth="2.5" strokeLinecap="round">
              <path d="M20 6L9 17l-5-5" />
            </svg>
            <span>{fileName}</span>
          </motion.div>
        ) : (
          <motion.div
            key="idle"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="file-upload-inner"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12" />
            </svg>
            <span>
              {dragging
                ? "Drop file here"
                : "Upload file (.pdf, .docx, .txt, .md, .csv, .json...)"}
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {error && <p className="file-upload-error">{error}</p>}
    </div>
  );
}
