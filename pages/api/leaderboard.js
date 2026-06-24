import { getServerSession } from "next-auth/next";
import { authOptions } from "./auth/[...nextauth]";

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

function getClubName(fields) {
  const candidates = [
    fields["Club Names"],
    fields["club_name (from Active Clubs) (from Club)"],
    fields["club_name (from Club)"],
    fields.Club,
    fields.club_name,
    fields["School Name"],
  ];
  for (const c of candidates) {
    const val = firstArrayValue(c);
    if (val && String(val).trim()) return String(val).trim();
  }
  return "Unknown";
}

function toNumber(val) {
  if (val == null) return 0;
  const n = Number(val);
  return Number.isFinite(n) ? n : 0;
}

export default async function handler(req, res) {
  const session = await getServerSession(req, res, authOptions);
  if (!session) return res.status(401).json({ error: "Unauthorized" });

  const key = process.env.AIRBRIDGE_API_KEY;
  const base =
    process.env.AIRBRIDGE_BASE_URL || "https://airbridge.hackclub.com";
  if (!key) return res.status(500).json({ error: "Missing AIRBRIDGE_API_KEY" });

  try {
    // 1. Fast club stats from Club Workshops (pre-aggregated counts)
    const clubSelect = encodeURIComponent(
      JSON.stringify({
        fields: ["Club Names", "Count of Submitted", "Count of approved"],
        pageSize: 100,
      }),
    );
    const clubUrl = `${base}/v0.2/Boba%20Club%20Dashboard/Club%20Workshops?select=${clubSelect}&authKey=${key}`;
    const clubRecords = await fetchAllPages(clubUrl);

    const clubMap = new Map();
    for (const r of clubRecords) {
      const fields = r.fields || r;
      const clubName = getClubName(fields);
      const submitted = toNumber(fields["Count of Submitted"]);
      const approved = toNumber(fields["Count of approved"]);

      if (!clubMap.has(clubName)) {
        clubMap.set(clubName, {
          name: clubName,
          total: 0,
          approved: 0,
          rejected: 0,
          pending: 0,
          badges: [],
        });
      }
      const club = clubMap.get(clubName);
      club.total += submitted;
      club.approved += approved;
      club.pending += Math.max(0, submitted - approved);
    }

    // 2. Timeline from Websites (lightweight, capped to avoid timeouts)
    const websiteSelect = encodeURIComponent(
      JSON.stringify({
        fields: ["Project Status", "Status"],
        pageSize: 500,
        maxRecords: 500,
      }),
    );
    const websiteUrl = `${base}/v0.2/Boba%20Club%20Dashboard/Websites?select=${websiteSelect}&authKey=${key}`;
    let websiteRecords = [];
    try {
      websiteRecords = await fetchJson(websiteUrl);
      websiteRecords = Array.isArray(websiteRecords)
        ? websiteRecords
        : websiteRecords?.records || websiteRecords?.data || [];
    } catch (err) {
      console.warn("Leaderboard timeline fetch failed", err.message);
      // Timeline is optional; don't fail the whole request
    }

    const timeline = [];
    for (const r of websiteRecords) {
      const createdTime = r.createdTime || r.fields?.createdTime || null;
      if (createdTime) {
        timeline.push({ date: createdTime });
      }
    }

    // Badges & approval rate
    for (const club of clubMap.values()) {
      const badges = [];
      if (club.approved >= 5) badges.push({ name: "Boba Starter", icon: "🧋" });
      if (club.approved >= 10) badges.push({ name: "Boba Pro", icon: "🏆" });
      if (club.approved >= 25) badges.push({ name: "Boba Legend", icon: "👑" });
      if (club.approved >= 50) badges.push({ name: "Boba God", icon: "🌟" });
      club.badges = badges;
      club.approvalRate = club.total
        ? Math.round((club.approved / club.total) * 100)
        : 0;
    }

    const clubs = Array.from(clubMap.values()).sort(
      (a, b) => b.approved - a.approved || b.total - a.total,
    );

    // Weekly timeline aggregation
    const weeklyMap = new Map();
    for (const t of timeline) {
      const d = new Date(t.date);
      if (Number.isNaN(d.getTime())) continue;
      const year = d.getUTCFullYear();
      const week = getWeek(d);
      const key = `${year}-W${String(week).padStart(2, "0")}`;
      if (!weeklyMap.has(key)) weeklyMap.set(key, { period: key, count: 0 });
      weeklyMap.get(key).count++;
    }
    const weeklyTimeline = Array.from(weeklyMap.values()).sort((a, b) =>
      a.period.localeCompare(b.period),
    );

    const totalSubmissions = clubs.reduce((sum, c) => sum + c.total, 0);

    res.setHeader(
      "Cache-Control",
      `s-maxage=${CACHE_MAX_AGE_S}, stale-while-revalidate=${CACHE_MAX_AGE_S * 2}`,
    );
    return res.status(200).json({
      clubs,
      weeklyTimeline,
      totalSubmissions,
      totalClubs: clubs.length,
    });
  } catch (err) {
    console.error("Leaderboard error", err);
    return res.status(500).json({ error: err.message || "Unknown error" });
  }
}

function getWeek(date) {
  const tmp = new Date(
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()),
  );
  const dayNum = tmp.getUTCDay() || 7;
  tmp.setUTCDate(tmp.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(tmp.getUTCFullYear(), 0, 1));
  return Math.ceil(((tmp - yearStart) / 86400000 + 1) / 7);
}
