export const config = { runtime: "edge" };

import { verifyHMAC } from '../lib/crypto';
import { isEmailProxy, isSecurityScanner } from '../lib/detection';

const ONE_BY_ONE_GIF = Uint8Array.from([
  71,73,70,56,57,97,1,0,1,0,128,0,0,0,0,0,255,255,255,33,249,4,1,0,0,0,0,44,0,0,0,0,1,0,1,0,0,2,2,68,1,0,59
]);

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
  const campaign = searchParams.get("c");
  const randomParam = searchParams.get("r");
  const signature = searchParams.get("sig");
  
  // Verify required parameters
  if (!eid || !campaign || !randomParam || !signature) {
    return new Response("Missing parameters", { status: 400 });
  }
  
  // Verify HMAC signature
  const paramsToSign = new URLSearchParams({ eid, c: campaign, r: randomParam });
  const isValidSignature = verifyHMAC(paramsToSign.toString(), signature, process.env.TRACKING_SECRET!);
  
  if (!isValidSignature) {
    return new Response("Invalid signature", { status: 403 });
  }
  
  const headers = req.headers;
  const ip = getIP(headers);
  const { country, city } = getGeo(headers);
  const userAgent = headers.get("user-agent") || "";
  
  // Detect proxies and scanners
  const isProxy = isEmailProxy(userAgent);
  const isScanner = isSecurityScanner(userAgent);
  
  const eventBody = {
    type: "open",
    eid,
    campaign,
    email: null, // Keep for backward compatibility but use eid primarily
    url: null,
    ip,
    country,
    city,
    user_agent: userAgent,
    is_proxy: isProxy,
    is_scanner: isScanner,
    random_param: randomParam
  };
  
  // Response with strict no-cache headers
  const resp = new Response(ONE_BY_ONE_GIF, {
    headers: {
      "Content-Type": "image/gif",
      "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
      "Pragma": "no-cache",
      "Expires": "0"
    }
  });
  
  if (event?.waitUntil) {
    event.waitUntil(logEvent(eventBody));
  } else {
    logEvent(eventBody);
  }
  
  return resp;
}
