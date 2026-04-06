import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "jobfit-ai — Know your fit score before you apply",
  description:
    "AI-powered resume analyzer. Paste a resume and a job description to get an instant semantic fit score with per-requirement gap analysis.",
  authors: [{ name: "Punith Gowda" }],
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#050816",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
