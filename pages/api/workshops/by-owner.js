import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]";
import { airtableUrl, airtableHeaders } from "../../../lib/airtable";
export default async function handler(req, res) {
  // Check authentication
  const session = await getServerSession(req, res, authOptions);
  if (!session) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const { email } = req.query;
  if (!email) return res.status(400).json({ error: "Missing email" });

  // Verify user can only access their own data (unless admin).
  // Workshops are matched by email: the logged-in Slack email must equal
  // the workshop's Email field.
  const adminSlackIds = process.env.NEXT_PUBLIC_ADMIN_SLACK_IDS?.split(',') || [];
  const isAdmin = adminSlackIds.includes(session.user.SlackID);

  const requestedEmail = String(email).trim().toLowerCase();
  const sessionEmail = String(session.user.email ?? "").trim().toLowerCase();

  if (!isAdmin && sessionEmail !== requestedEmail) {
    return res.status(403).json({ error: "Forbidden: Can only access your own data" });
  }

  // Sanitize email to prevent injection into the filter formula
  const sanitizedEmail = requestedEmail.replace(/'/g, "\\'");

  try {
    const url = airtableUrl("tblcIuVemD63IbBuY", {
      fields: ["Club Names", "Status", "Organizer Name", "Email"],
      filterByFormula: `LOWER(TRIM({Email})) = '${sanitizedEmail}'`,
    });
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    let resp;
    try {
      resp = await fetch(url, {
        signal: controller.signal,
        headers: airtableHeaders(),
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
        clubName: fields["Club Names"]?.[0] || "",
        status: fields.Status || fields.status || "Pending",
      };
    });

    return res.status(200).json({ records: normalized });
  } catch (err) {
    console.error("Event codes fetch error", err);
    return res.status(500).json({ error: err.message || "Unknown error" });
  }
}
