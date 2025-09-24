export const config = { runtime: "edge" };

function getIP(headers: Headers) {
  const fwd = headers.get("x-forwarded-for") || "";
  return fwd.split(",")[0].trim() || headers.get("x-real-ip") || "0.0.0.0";
}

function getGeo(headers: Headers) {
  return {
    country: headers.get("x-vercel-ip-country") || "Unknown",
    city: headers.get("x-vercel-ip-city") || "Unknown",
  };
}

function safeUrl(url: string) {
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
  const email = searchParams.get("email");
  const target = searchParams.get("url") || "";

  if (!safeUrl(target)) {
    return new Response("Invalid redirect", { status: 400 });
  }

  const headers = req.headers;
  const ip = getIP(headers);
  const { country, city } = getGeo(headers);
  const user_agent = headers.get("user-agent") || "";

  const eventBody = { type: "click", email, url: target, ip, country, city, user_agent };

  const resp = new Response(null, {
    status: 302,
    headers: { Location: target, "Cache-Control": "no-store" }
  });

  if (event?.waitUntil) {
    event.waitUntil(logEvent(eventBody));
  } else {
    logEvent(eventBody);
  }

  return resp;
}
