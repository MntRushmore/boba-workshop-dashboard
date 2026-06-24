import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]";

const PAGE_TIMEOUT_MS = 20000;
const CACHE_MAX_AGE_S = 300; // 5 minutes

async function fetchJson(url, timeoutMs = PAGE_TIMEOUT_MS) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  let resp;
  try {
    resp = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: "application/json" },
    });
  } catch (err) {
    clearTimeout(timer);
    if (err.name === "AbortError")
      throw new Error("Request timed out fetching page");
    throw err;
  }
  clearTimeout(timer);

  const text = await resp.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error("Bad JSON from upstream");
  }

  if (!resp.ok) throw new Error(`Upstream error: ${resp.status}`);

  return json;
}

async function fetchAllPages(baseUrl) {
  const records = [];
  let offset = null;

  do {
    const url = offset
      ? `${baseUrl}&offset=${encodeURIComponent(offset)}`
      : baseUrl;

    const json = await fetchJson(url);
    const page = Array.isArray(json) ? json : json?.records || json?.data || [];
    records.push(...page);
    offset = json?.offset || null;
  } while (offset);

  return records;
}

function firstArrayValue(val) {
  if (val == null) return null;
  return Array.isArray(val) ? val[0] : val;
}

function toNumber(val) {
  if (val == null) return 0;
  const n = Number(val);
  return Number.isFinite(n) ? n : 0;
}

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
    // Use pre-aggregated counts from Club Workshops instead of scanning Websites
    const clubSelect = encodeURIComponent(
      JSON.stringify({
        fields: ["Club Names", "Count of Submitted", "Count of approved"],
        pageSize: 100,
      }),
    );
    const clubUrl = `${base}/v0.2/Boba%20Club%20Dashboard/Club%20Workshops?select=${clubSelect}&authKey=${key}`;

    const records = await fetchAllPages(clubUrl);
    console.log(
      `[admin/stats] fetched ${records.length} club workshop records`,
    );

    let totalSubmissions = 0;
    let approvedSubmissions = 0;
    const clubsWithSubmissions = new Set();

    for (const r of records) {
      const fields = r.fields || r;
      const submitted = toNumber(fields["Count of Submitted"]);
      const approved = toNumber(fields["Count of approved"]);
      const clubName = firstArrayValue(fields["Club Names"]) || "";

      totalSubmissions += submitted;
      approvedSubmissions += approved;
      if (clubName) clubsWithSubmissions.add(clubName);
    }

    res.setHeader(
      "Cache-Control",
      `s-maxage=${CACHE_MAX_AGE_S}, stale-while-revalidate=${CACHE_MAX_AGE_S * 2}`,
    );
    return res.status(200).json({
      totalSubmissions,
      approvedSubmissions,
      moneyGivenOut: approvedSubmissions * 5,
      schoolsReached: clubsWithSubmissions.size,
      _recordsFetched: records.length,
    });
  } catch (err) {
    console.error("Admin stats error", err);
    return res.status(500).json({ error: err.message || "Unknown error" });
  }
}
