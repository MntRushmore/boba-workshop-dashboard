import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]";

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

  const userSlackId = session.user.SlackID;
  if (!userSlackId) {
    return res.status(400).json({ error: "Missing Slack ID in session" });
  }

  const key = process.env.AIRBRIDGE_API_KEY;
  const base =
    process.env.AIRBRIDGE_BASE_URL ||
    (process.env.DEV === "true"
      ? "http://localhost:5000"
      : "https://airbridge.hackclub.com");
  if (!key) return res.status(500).json({ error: "Missing AIRBRIDGE_API_KEY" });

  try {
    // 1. Find clubs owned by this user
    const clubSelect = encodeURIComponent(
      JSON.stringify({
        filterByFormula: `{Slack ID} = '${userSlackId}'`,
        fields: ["Club Names", "Status"],
      }),
    );
    const clubUrl = `${base}/v0.2/Boba%20Club%20Dashboard/Club%20Workshops?select=${clubSelect}&authKey=${key}`;
    const clubRecords = await fetchAllPages(clubUrl);

    const userClubs = new Map();
    for (const r of clubRecords) {
      const fields = r.fields || r;
      const names = fields["Club Names"];
      const status = fields.Status || "Active";
      if (Array.isArray(names)) {
        for (const name of names) {
          userClubs.set(name, { name, status });
        }
      } else if (names) {
        userClubs.set(names, { name: names, status });
      }
    }

    const clubNames = Array.from(userClubs.keys());
    if (clubNames.length === 0) {
      return res.status(200).json({
        clubs: [],
        submissions: [],
        summary: {
          total: 0,
          approved: 0,
          rejected: 0,
          pending: 0,
          approvalRate: 0,
        },
        weeklyTimeline: [],
        rejectionReasons: [],
        globalComparison: null,
      });
    }

    // 2. Fetch all website submissions for these clubs
    const formulaParts = clubNames.map(
      (name) =>
        `{club_name (from Active Clubs) (from Club)} = '${String(name).replace(/'/g, "\\'")}'`,
    );
    const websiteFilter = encodeURIComponent(
      JSON.stringify({
        filterByFormula: `OR(${formulaParts.join(",")})`,
        fields: [
          "Project Status",
          "club_name (from Active Clubs) (from Club)",
          "Rejection Reason",
        ],
        pageSize: 100,
      }),
    );
    const websiteUrl = `${base}/v0.2/Boba%20Club%20Dashboard/Websites?select=${websiteFilter}&authKey=${key}`;
    const websiteRecords = await fetchAllPages(websiteUrl);

    const submissions = [];
    const rejectionReasons = new Map();
    const weeklyMap = new Map();
    let approved = 0;
    let rejected = 0;
    let pending = 0;

    for (const r of websiteRecords) {
      const fields = r.fields || r;
      const status = fields["Project Status"] || "Pending";
      const clubArr = fields["club_name (from Active Clubs) (from Club)"];
      const clubName = Array.isArray(clubArr)
        ? clubArr[0]
        : clubArr || "Unknown";
      const reason = fields["Rejection Reason"] || "";
      const createdTime = r.createdTime || fields.createdTime || null;

      if (status === "Approve") approved++;
      else if (status === "Reject") rejected++;
      else pending++;

      if (reason) {
        rejectionReasons.set(reason, (rejectionReasons.get(reason) || 0) + 1);
      }

      if (createdTime) {
        const d = new Date(createdTime);
        const year = d.getUTCFullYear();
        const week = getWeek(d);
        const key = `${year}-W${String(week).padStart(2, "0")}`;
        if (!weeklyMap.has(key)) weeklyMap.set(key, { period: key, count: 0 });
        weeklyMap.get(key).count++;
      }

      submissions.push({
        id: r.id || null,
        club: clubName,
        status,
        rejectionReason: reason,
        createdTime,
      });
    }

    const total = submissions.length;
    const approvalRate = total ? Math.round((approved / total) * 100) : 0;

    const weeklyTimeline = Array.from(weeklyMap.values()).sort((a, b) =>
      a.period.localeCompare(b.period),
    );

    const rejectionReasonList = Array.from(rejectionReasons.entries())
      .map(([reason, count]) => ({ reason, count }))
      .sort((a, b) => b.count - a.count);

    // 3. Simple global comparison: fetch total submissions count
    const globalSelect = encodeURIComponent(
      JSON.stringify({
        fields: ["Project Status"],
        pageSize: 100,
      }),
    );
    const globalUrl = `${base}/v0.2/Boba%20Club%20Dashboard/Websites?select=${globalSelect}&authKey=${key}`;
    const globalRecords = await fetchAllPages(globalUrl);
    const globalTotal = globalRecords.length;
    const globalApproved = globalRecords.filter(
      (r) => (r.fields || r)["Project Status"] === "Approve",
    ).length;
    const globalApprovalRate = globalTotal
      ? Math.round((globalApproved / globalTotal) * 100)
      : 0;

    return res.status(200).json({
      clubs: Array.from(userClubs.values()),
      submissions,
      summary: { total, approved, rejected, pending, approvalRate },
      weeklyTimeline,
      rejectionReasons: rejectionReasonList,
      globalComparison: {
        total: globalTotal,
        approved: globalApproved,
        approvalRate: globalApprovalRate,
        userShare: globalTotal ? Math.round((total / globalTotal) * 100) : 0,
      },
    });
  } catch (err) {
    console.error("Personal stats error", err);
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
