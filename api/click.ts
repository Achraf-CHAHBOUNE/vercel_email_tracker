export const config = { runtime: "edge" };

import { verifyHMAC } from '../lib/crypto';
import { isSecurityScanner } from '../lib/detection';

function getIP(headers: Headers): string {
  const fwd = headers.get("x-forwarded-for") || "";
  return fwd.split(",")[0].trim() || headers.get("x-real-ip") || "0.0.0.0";
}

function getGeo(headers: Headers) {
  return {
    country: headers.get("x-vercel-ip-country") || "Unknown",
    city: headers.get("x-vercel-ip-city") || "Unknown",
  };
}

function safeUrl(url: string): boolean {
  try {
    const u = new URL(url);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

async function logEvent(body: any) {
  const url = `${process.env.SUPABASE_URL}/rest/v1/email_tracking`;
  return fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
      Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
      Prefer: "return=minimal"
    },
    body: JSON.stringify(body)
  });
}

export default async function handler(req: Request, event: any) {
  const { searchParams } = new URL(req.url);
  
  // Get parameters
  const eid = searchParams.get("eid");
  const seg = searchParams.get("seg");
  const campaign = searchParams.get("c");
  const targetUrl = searchParams.get("u");
  const signature = searchParams.get("sig");
  
  // Verify required parameters
  if (!eid || !campaign || !targetUrl || !signature) {
    return new Response("Missing parameters", { status: 400 });
  }
  
  if (!safeUrl(targetUrl)) {
    return new Response("Invalid target URL", { status: 400 });
  }
  
  // Verify HMAC signature
  const paramsForSigning = new URLSearchParams();
  paramsForSigning.set("eid", eid);
  paramsForSigning.set("c", campaign);
  paramsForSigning.set("u", targetUrl);
  if (seg) paramsForSigning.set("seg", seg);
  
  const isValidSignature = await verifyHMAC(paramsForSigning.toString(), signature, process.env.TRACKING_SECRET!);
  
  if (!isValidSignature) {
    return new Response("Invalid signature", { status: 403 });
  }
  
  const headers = req.headers;
  const ip = getIP(headers);
  const { country, city } = getGeo(headers);
  const userAgent = headers.get("user-agent") || "";
  const isScanner = isSecurityScanner(userAgent);
  
  // Log raw click
  const rawClickEvent = {
    type: "click_raw",
    eid,
    campaign,
    seg,
    email: null,
    url: targetUrl,
    ip,
    country,
    city,
    user_agent: userAgent,
    is_scanner: isScanner,
    is_proxy: false
  };
  
  // Set verification cookie (10 minutes)
  const cookieValue = `${eid}_${Date.now()}`;
  const cookieExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
  
  // Create verification URL
  const verifyUrl = new URL('/api/verify', req.url);
  verifyUrl.searchParams.set('eid', eid);
  verifyUrl.searchParams.set('c', campaign);
  verifyUrl.searchParams.set('u', targetUrl);
  if (seg) verifyUrl.searchParams.set('seg', seg);
  
  // HTML response with meta refresh and fallback image
  const htmlResponse = `<!DOCTYPE html>
<html>
<head>
  <meta http-equiv="refresh" content="0;url=${verifyUrl.toString()}">
</head>
<body>
  <img src="${verifyUrl.toString()}" width="1" height="1" style="display:none;">
  <script>window.location.href='${verifyUrl.toString()}';</script>
  <p>Redirecting... <a href="${verifyUrl.toString()}">Click here if not redirected</a></p>
</body>
</html>`;
  
  const resp = new Response(htmlResponse, {
    headers: {
      "Content-Type": "text/html",
      "Cache-Control": "no-store",
      "Set-Cookie": `click_verify=${cookieValue}; Path=/; HttpOnly; Secure; SameSite=Lax; Expires=${cookieExpires.toUTCString()}`
    }
  });
  
  if (event?.waitUntil) {
    event.waitUntil(logEvent(rawClickEvent));
  } else {
    logEvent(rawClickEvent);
  }
  
  return resp;
}