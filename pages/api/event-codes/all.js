import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]";

export default async function handler(req, res) {
  // Check authentication
  const session = await getServerSession(req, res, authOptions);
  if (!session) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  // Check if user is admin
  const adminSlackIds = process.env.NEXT_PUBLIC_ADMIN_SLACK_IDS?.split(',') || [];
  const isAdmin = adminSlackIds.includes(session.user.SlackID);

  if (!isAdmin) {
    return res.status(403).json({ error: "Forbidden: Admin access required" });
  }

  const key = process.env.AIRBRIDGE_API_KEY;
  if (!key) return res.status(500).json({ error: "Missing AIRBRIDGE_API_KEY" });

  try {
    const select = encodeURIComponent(
      JSON.stringify({
        fields: ["Event Code", "Status", "Organizer Name", "Slack ID"],
      })
    );
    const base = encodeURIComponent("Boba Club Dashboard");
    const url = `https://airbridge.hackclub.com/v0.2/${base}/Event Codes?select=${select}&authKey=${key}`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    let resp;
    try {
      resp = await fetch(url, {
        signal: controller.signal,
        headers: { Accept: "application/json" },
      });
    } catch (err) {
      clearTimeout(timeout);
      if (err.name === "AbortError") {
        return res
          .status(504)
          .json({ error: "Upstream request timed out after 8s" });
      }
      throw err;
    }
    clearTimeout(timeout);

    const text = await resp.text();
    let json;
    try {
      json = JSON.parse(text);
    } catch (e) {
      return res
        .status(502)
        .json({ error: "Bad JSON from upstream" });
    }

    if (!resp.ok) {
      return res
        .status(resp.status)
        .json({ error: "Upstream error" });
    }

    const records = Array.isArray(json)
      ? json
      : json?.records || json?.data || [];

    const normalized = records.map((r) => {
      const fields = r.fields || r;
      return {
        id: r.id || fields.id || null,
        code: fields["Event Code"] || fields.code || "",
        status: fields.Status || fields.status || "Active",
        organizerName: fields["Organizer Name"] || "",
        slackId: fields["Slack ID"] || "",
      };
    });

    return res.status(200).json({ records: normalized });
  } catch (err) {
    console.error("Event codes fetch error", err);
    return res.status(500).json({ error: err.message || "Unknown error" });
  }
}
