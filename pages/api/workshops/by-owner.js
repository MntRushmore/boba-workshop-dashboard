import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]";

// Escape a value before it goes into an Airtable filterByFormula string literal.
const escapeFormulaValue = (value) => String(value).replace(/'/g, "\\'");

export default async function handler(req, res) {
  // Check authentication
  const session = await getServerSession(req, res, authOptions);
  if (!session) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const key = process.env.AIRBRIDGE_API_KEY;
  const airbridgeBase =
    process.env.DEV === "true"
      ? "http://localhost:5000"
      : "https://airbridge.hackclub.com";
  if (!key) return res.status(500).json({ error: "Missing AIRBRIDGE_API_KEY" });

  // Identity always comes from the signed-in session, never from the client.
  // A workshop belongs to this user if EITHER their Hack Club Slack ID matches
  // the record's "Slack ID" OR their account email matches the record's "Email".
  // Matching on both keeps linking working when one of them is blank or differs
  // (e.g. the Slack email doesn't match the email used on the workshop form).
  const slackId = session.user.SlackID
    ? String(session.user.SlackID).trim()
    : "";
  const email = session.user.email
    ? String(session.user.email).trim().toLowerCase()
    : "";

  // No usable identity to match on. Return an empty set rather than building a
  // formula that could match every record.
  if (!slackId && !email) {
    return res.status(200).json({ records: [] });
  }

  const conditions = [];
  if (slackId) {
    conditions.push(`{Slack ID} = '${escapeFormulaValue(slackId)}'`);
  }
  if (email) {
    conditions.push(`LOWER({Email}) = '${escapeFormulaValue(email)}'`);
  }
  const filterByFormula =
    conditions.length > 1 ? `OR(${conditions.join(", ")})` : conditions[0];

  try {
    const select = encodeURIComponent(
      JSON.stringify({
        fields: ["Club Names", "Status", "Organizer Name"],
        filterByFormula,
      })
    );
    const base = "Boba%20Club%20Dashboard";
    const url = `${airbridgeBase}/v0.2/${base}/Club%20Workshops?select=${select}&authKey=${key}`;
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
        clubName: fields["Club Names"]?.[0] || "",
        status: fields.Status || fields.status || "Pending",
        organizerName: fields["Organizer Name"] || "",
      };
    });

    return res.status(200).json({ records: normalized });
  } catch (err) {
    console.error("Event codes fetch error", err);
    return res.status(500).json({ error: err.message || "Unknown error" });
  }
}
