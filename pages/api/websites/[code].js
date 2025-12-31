import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]";

export default async function handler(req, res) {
  // Check authentication
  const session = await getServerSession(req, res, authOptions);
  if (!session) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const { code } = req.query;
  const key = process.env.AIRBRIDGE_API_KEY;

  if (!key) {
    return res.status(500).json({ error: "Missing AIRBRIDGE_API_KEY" });
  }
  if (!code) {
    return res.status(400).json({ error: "Missing event code" });
  }
  try {
    const base = encodeURIComponent("Boba Club Dashboard");

    // Sanitize code to prevent injection
    const sanitizedCode = String(code).replace(/'/g, "\\'");

    const eventSelect = encodeURIComponent(
      JSON.stringify({
        filterByFormula: `{Event Code} = '${sanitizedCode}'`,
        fields: ["Event Code", "Status"]
      })
    );
    const eventUrl = `https://airbridge.hackclub.com/v0.2/${base}/Event Codes?select=${eventSelect}&authKey=${key}`;

    let eventResp;
    try {
      eventResp = await fetch(eventUrl);
    } catch (err) {
      if (err.name === "AbortError") {
        return res
          .status(504)
          .json({ error: "Event lookup timed out after 8s" });
      }
    }
    const eventText = await eventResp.text();
    let eventJson;
    try {
      eventJson = JSON.parse(eventText);
    } catch (e) {
      return res
        .status(502)
        .json({ error: "Bad JSON from event lookup", body: eventText });
    }
    const eventRecords = Array.isArray(eventJson)
      ? eventJson
      : eventJson?.records || eventJson?.data || [];
    if (!eventRecords.length) {
      return res.status(404).json({ error: "Event code not found" });
    }
    const eventId = eventRecords[0].id || eventRecords[0].fields?.id;

    if (!eventId) {
      return res.status(404).json({ error: "Event code ID missing" });
    }

    const select = encodeURIComponent(
      JSON.stringify({
        fields: [
          "Email",
          "Name",
          "Status",
          "Event Code",
          "Playable URL",
          "Decision Reason (to email)",
        ],
      })
    );

    const url = `https://airbridge.hackclub.com/v0.2/${base}/Websites?select=${select}&authKey=${key}`;

    const controller = new AbortController();
    let resp;
    try {
      resp = await fetch(url, {
        signal: controller.signal,
        headers: { Accept: "application/json" },
      });
    } catch (err) {
      if (err.name === "AbortError") {
        return res
          .status(504)
          .json({ error: "Upstream request timed out after 8s" });
      }
      throw err;
    }
    const text = await resp.text();
    let json;
    try {
      json = JSON.parse(text);
    } catch (e) {
      return res
        .status(502)
        .json({ error: "Bad JSON from upstream", body: text });
    }

    if (!resp.ok) {
      return res
        .status(resp.status)
        .json({ error: "Upstream error", body: json });
    }

    const records = Array.isArray(json)
      ? json
      : json?.records || json?.data || [];
    const normalized = records
      .map((r) => {
        const fields = r.fields || r;
        if (fields["Event Code"] == eventId) {
          return {
            id: r.id || fields.id || null,
            name: fields.Name || fields.name || "",
            email: fields.Email || fields.email || "",
            status: fields.Status || fields.status || "Pending",
            website: fields["Playable URL"] || fields.website || "",
            decisionReason: fields["Decision Reason (to email)"] || "",
          };
        }
      })
      .filter((e) => e !== undefined);

    const eventStatus = eventRecords[0]?.fields?.Status || eventRecords[0]?.Status || "Active";

    return res
      .status(200)
      .json({ records: normalized, raw: json, event: eventJson, eventStatus });
  } catch (err) {
    console.error("API fetch error", err);
    return res.status(500).json({ error: err.message || "Unknown error" });
  }
}
