import { getServerSession } from "next-auth/next";
import { authOptions } from "./auth/[...nextauth]";

const PAGE_TIMEOUT_MS = 30000;

async function fetchAllPages(baseUrl) {
  const records = [];
  let offset = null;

  do {
    const url = offset
      ? `${baseUrl}&offset=${encodeURIComponent(offset)}`
      : baseUrl;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), PAGE_TIMEOUT_MS);
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

    const page = Array.isArray(json) ? json : json?.records || json?.data || [];
    records.push(...page);

    offset = json?.offset || null;
  } while (offset);

  return records;
}

export default async function handler(req, res) {
  const session = await getServerSession(req, res, authOptions);
  if (!session) return res.status(401).json({ error: "Unauthorized" });

  const key = process.env.AIRBRIDGE_API_KEY;
  const base =
    process.env.AIRBRIDGE_BASE_URL || "https://airbridge.hackclub.com";
  if (!key) return res.status(500).json({ error: "Missing AIRBRIDGE_API_KEY" });

  try {
    const select = encodeURIComponent(
      JSON.stringify({
        fields: [
          "Project Status",
          "club_name (from Active Clubs) (from Club)",
          "Slack ID",
        ],
        pageSize: 100,
      }),
    );
    const url = `${base}/v0.2/Boba%20Club%20Dashboard/Websites?select=${select}&authKey=${key}`;

    const records = await fetchAllPages(url);

    const clubMap = new Map();
    const timeline = [];

    for (const r of records) {
      const fields = r.fields || r;
      const status = fields["Project Status"] || "Pending";
      const clubArr = fields["club_name (from Active Clubs) (from Club)"];
      const clubName = Array.isArray(clubArr)
        ? clubArr[0]
        : clubArr || "Unknown";
      const createdTime = r.createdTime || fields.createdTime || null;

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
      club.total++;
      if (status === "Approve") club.approved++;
      else if (status === "Reject") club.rejected++;
      else club.pending++;

      if (createdTime) {
        timeline.push({
          club: clubName,
          status,
          date: createdTime,
        });
      }
    }

    // Badges
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

    // Timeline aggregation by week
    const weeklyMap = new Map();
    for (const t of timeline) {
      const d = new Date(t.date);
      const year = d.getUTCFullYear();
      const week = getWeek(d);
      const key = `${year}-W${String(week).padStart(2, "0")}`;
      if (!weeklyMap.has(key)) weeklyMap.set(key, { period: key, count: 0 });
      weeklyMap.get(key).count++;
    }
    const weeklyTimeline = Array.from(weeklyMap.values()).sort((a, b) =>
      a.period.localeCompare(b.period),
    );

    return res.status(200).json({
      clubs,
      weeklyTimeline,
      totalSubmissions: records.length,
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
