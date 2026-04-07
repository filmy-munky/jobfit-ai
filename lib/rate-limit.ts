/**
 * Simple in-memory sliding window rate limiter.
 * For production, swap with Redis/Vercel KV. This is sufficient for a single-instance deploy.
 */

interface Window {
  timestamps: number[];
}

const windows = new Map<string, Window>();

// Cleanup stale entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, win] of windows) {
    win.timestamps = win.timestamps.filter((t) => now - t < 300_000);
    if (win.timestamps.length === 0) windows.delete(key);
  }
}, 300_000);

export function rateLimit(
  ip: string,
  endpoint: string,
  maxRequests: number,
  windowMs: number,
): { ok: boolean; retryAfterMs: number } {
  const key = `${ip}:${endpoint}`;
  const now = Date.now();

  let win = windows.get(key);
  if (!win) {
    win = { timestamps: [] };
    windows.set(key, win);
  }

  // Remove timestamps outside the window
  win.timestamps = win.timestamps.filter((t) => now - t < windowMs);

  if (win.timestamps.length >= maxRequests) {
    const oldest = win.timestamps[0];
    const retryAfterMs = windowMs - (now - oldest);
    return { ok: false, retryAfterMs: Math.max(retryAfterMs, 1000) };
  }

  win.timestamps.push(now);
  return { ok: true, retryAfterMs: 0 };
}
