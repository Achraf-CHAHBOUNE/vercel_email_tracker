export const config = { runtime: "edge" };

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
  
  const email = searchParams.get("email");
  const targetUrl = searchParams.get("url");
  
  if (!email || !targetUrl) {
    return new Response("Missing parameters", { status: 400 });
  }
  
  const headers = req.headers;
  const ip = getIP(headers);
  const { country, city } = getGeo(headers);
  const userAgent = headers.get("user-agent") || "";
  
  // Check for verification cookie
  const cookieHeader = headers.get("cookie") || "";
  const hasVerificationCookie = cookieHeader.includes("click_verify=");
  
  const eventType = hasVerificationCookie ? "click_human" : "click_no_cookie";
  
  const clickEvent = {
    type: eventType,
    email,
    url: targetUrl,
    ip,
    country,
    city,
    user_agent: userAgent,
    is_scanner: false,
    is_proxy: false
  };
  
  // Redirect to final URL
  const resp = new Response(null, {
    status: 302,
    headers: {
      Location: targetUrl,
      "Cache-Control": "no-store"
    }
  });
  
  if (event?.waitUntil) {
    event.waitUntil(logEvent(clickEvent));
  } else {
    logEvent(clickEvent);
  }
  
  return resp;
}