export const config = { runtime: "edge" };

const ONE_BY_ONE_GIF = Uint8Array.from([
  71,73,70,56,57,97,1,0,1,0,128,0,0,0,0,0,255,255,255,33,249,4,1,0,0,0,0,44,0,0,0,0,1,0,1,0,0,2,2,68,1,0,59
]);

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

async function logEvent(body: any) {
  const url = `${process.env.SUPABASE_URL}/rest/v1/email_tracking`;
  await fetch(url, {
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

export default async function handler(req: Request) {
  const { searchParams } = new URL(req.url);
  const email = searchParams.get("email");

  const headers = req.headers;
  const ip = getIP(headers);
  const { country, city } = getGeo(headers);
  const user_agent = headers.get("user-agent") || "";

  const resp = new Response(ONE_BY_ONE_GIF, {
    headers: { "Content-Type": "image/gif", "Cache-Control": "no-store" }
  });

  const event = { type: "open", email, url: null, ip, country, city, user_agent};

  // @ts-ignore
  resp.waitUntil(logEvent(event));

  return resp;
}
