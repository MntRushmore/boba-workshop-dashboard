import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]";

export default async function handler(req, res) {
  const session = await getServerSession(req, res, authOptions);
  if (!session) return res.status(401).json({ error: "Unauthorized" });

  const adminSlackIds =
    process.env.NEXT_PUBLIC_ADMIN_SLACK_IDS?.split(",") || [];
  if (!adminSlackIds.includes(session.user.SlackID)) {
    return res.status(403).json({ error: "Forbidden" });
  }

  const key = process.env.AIRBRIDGE_API_KEY;
  const base =
    process.env.AIRBRIDGE_BASE_URL || "https://airbridge.hackclub.com";

  if (!key) return res.status(500).json({ error: "Missing AIRBRIDGE_API_KEY" });

  try {
    const url = `${base}/v0.2/Boba%20Club%20Dashboard/Websites?maxRecords=5&authKey=${key}`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10000);
    let resp;
    try {
      resp = await fetch(url, { signal: controller.signal });
    } finally {
      clearTimeout(timer);
    }
    const json = await resp.json();
    const records = Array.isArray(json)
      ? json
      : json?.records || json?.data || [];

    const samples = records.map((r) => {
      const fields = r.fields || r;
      return {
        id: r.id,
        fieldNames: Object.keys(fields),
        fields,
      };
    });

    return res.status(200).json({ samples });
  } catch (err) {
    console.error("Explore error", err);
    return res.status(500).json({ error: err.message || "Unknown error" });
  }
}
