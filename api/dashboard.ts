import type { VercelRequest, VercelResponse } from "@vercel/node";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const url = `${process.env.SUPABASE_URL}/rest/v1/email_tracking?select=*&order=timestamp.desc`;
    const r = await fetch(url, {
      headers: {
        apikey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
        Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
      },
    });

    if (!r.ok) {
      return res.status(500).json({ error: await r.text() });
    }

    const data = await r.json();
    res.setHeader("Cache-Control", "no-store");
    return res.status(200).json(data);
  } catch (e: any) {
    return res.status(500).json({ error: e.message || String(e) });
  }
}
