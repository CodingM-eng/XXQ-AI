import type { IncomingMessage, RequestListener, ServerResponse } from "node:http";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { getSessionUser, loginWithIdToken, toPublic, type LoginDeps } from "../src/auth/login-service";
import { tr } from "../src/i18n/tr";

export interface AppOptions { publicDir: string; secureCookies: boolean }
const COOKIE = "xxq_session";
const MIME: Record<string, string> = {
  ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8", ".svg": "image/svg+xml", ".ico": "image/x-icon",
};

function messageFor(code: string): string {
  return (tr.accessDenied as Record<string, string>)[code] ?? (tr.errors as Record<string, string>)[code] ?? tr.errors.invalid_token;
}
function send(res: ServerResponse, status: number, body: unknown, headers: Record<string, string> = {}) {
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff", ...headers,
  });
  res.end(JSON.stringify(body));
}
function readToken(req: IncomingMessage): string | undefined {
  for (const part of (req.headers.cookie ?? "").split(";")) {
    const [k, ...v] = part.trim().split("=");
    if (k === COOKIE) return v.join("=");
  }
  return undefined;
}
function readJson(req: IncomingMessage, limit = 16_384): Promise<any> {
  return new Promise((resolve, reject) => {
    let size = 0; const chunks: Buffer[] = [];
    req.on("data", (c: Buffer) => { size += c.length; if (size > limit) { reject(new Error("too_large")); req.destroy(); } else chunks.push(c); });
    req.on("end", () => { try { resolve(JSON.parse(Buffer.concat(chunks).toString("utf8"))); } catch { reject(new Error("bad_json")); } });
    req.on("error", reject);
  });
}
/** State-changing requests must come from this site's own origin. */
function sameOrigin(req: IncomingMessage): boolean {
  const origin = req.headers.origin;
  if (!origin) return false;
  try { return new URL(origin).host === req.headers.host; } catch { return false; }
}

export function createHandler(deps: LoginDeps, opts: AppOptions): RequestListener {
  const cookie = (value: string, maxAgeSec: number) =>
    `${COOKIE}=${value}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${maxAgeSec}${opts.secureCookies ? "; Secure" : ""}`;

  return async (req, res) => {
    try {
      const url = new URL(req.url ?? "/", "http://localhost");

      if (url.pathname === "/api/auth/login" && req.method === "POST") {
        if (!sameOrigin(req)) return send(res, 403, { error: "bad_origin", message: messageFor("permission_denied") });
        let body: any;
        try { body = await readJson(req); } catch { return send(res, 400, { error: "bad_request", message: messageFor("invalid_token") }); }
        if (typeof body?.idToken !== "string" || body.idToken.length < 20) {
          return send(res, 400, { error: "bad_request", message: messageFor("invalid_token") });
        }
        const r = await loginWithIdToken(deps, body.idToken);
        if (!r.ok) return send(res, r.status, { error: r.code, message: messageFor(r.code) });
        return send(res, 200, { user: r.user }, { "Set-Cookie": cookie(r.token, Math.floor(deps.sessionTtlMs / 1000)) });
      }

      if (url.pathname === "/api/auth/me" && req.method === "GET") {
        const user = await getSessionUser(deps, readToken(req));
        return user ? send(res, 200, { user: toPublic(user) }) : send(res, 401, { error: "not_authenticated", message: messageFor("not_authenticated") });
      }

      if (url.pathname === "/api/auth/logout" && req.method === "POST") {
        if (!sameOrigin(req)) return send(res, 403, { error: "bad_origin", message: messageFor("permission_denied") });
        const t = readToken(req);
        if (t) await deps.sessions.revoke(t);
        return send(res, 200, { ok: true }, { "Set-Cookie": cookie("", 0) });
      }

      if (url.pathname.startsWith("/api/")) return send(res, 404, { error: "not_found" });

      if (req.method !== "GET" && req.method !== "HEAD") return send(res, 405, { error: "method_not_allowed" });
      const rel = decodeURIComponent(url.pathname === "/" ? "/index.html" : url.pathname);
      const file = path.join(opts.publicDir, rel);
      const root = path.resolve(opts.publicDir) + path.sep;
      if (!path.resolve(file).startsWith(root) || path.basename(file).startsWith(".")) return send(res, 404, { error: "not_found" });
      const data = await readFile(file).catch(() => undefined);
      if (!data) return send(res, 404, { error: "not_found" });
      res.writeHead(200, {
        "Content-Type": MIME[path.extname(file)] ?? "application/octet-stream",
        "X-Content-Type-Options": "nosniff", "Referrer-Policy": "same-origin",
        "Cross-Origin-Opener-Policy": "same-origin-allow-popups",
      });
      res.end(req.method === "HEAD" ? undefined : data);
    } catch {
      send(res, 500, { error: "internal_error" }); // never leak internals
    }
  };
}
