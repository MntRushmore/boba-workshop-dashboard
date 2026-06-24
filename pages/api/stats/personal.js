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

function getWeek(date) {
  const tmp = new Date(
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()),
  );
  const dayNum = tmp.getUTCDay() || 7;
  tmp.setUTCDate(tmp.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(tmp.getUTCFullYear(), 0, 1));
  return Math.ceil(((tmp - yearStart) / 86400000 + 1) / 7);
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
    process.env.AIRBRIDGE_BASE_URL || "https://airbridge.hackclub.com";
  if (!key) return res.status(500).json({ error: "Missing AIRBRIDGE_API_KEY" });

  try {
    // 1. Fetch this user's Club Workshops (pre-aggregated counts)
    const clubSelect = encodeURIComponent(
      JSON.stringify({
        filterByFormula: `{Slack ID} = '${userSlackId}'`,
        fields: [
          "Club Names",
          "Status",
          "Count of Submitted",
          "Count of approved",
        ],
        pageSize: 100,
      }),
    );
    const clubUrl = `${base}/v0.2/Boba%20Club%20Dashboard/Club%20Workshops?select=${clubSelect}&authKey=${key}`;
    const clubRecords = await fetchAllPages(clubUrl);

    const userClubs = [];
    let userTotal = 0;
    let userApproved = 0;

    for (const r of clubRecords) {
      const fields = r.fields || r;
      const name = firstArrayValue(fields["Club Names"]) || "Unknown";
      const status = fields.Status || "Active";
      const submitted = toNumber(fields["Count of Submitted"]);
      const approved = toNumber(fields["Count of approved"]);

      userClubs.push({ name, status });
      userTotal += submitted;
      userApproved += approved;
    }

    const userPending = Math.max(0, userTotal - userApproved);
    const userRejected = 0; // not tracked in Club Workshops
    const userApprovalRate = userTotal
      ? Math.round((userApproved / userTotal) * 100)
      : 0;

    if (userClubs.length === 0) {
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

    const clubNames = userClubs.map((c) => c.name);

    // 2. Global comparison from all Club Workshops (lightweight)
    const globalSelect = encodeURIComponent(
      JSON.stringify({
        fields: ["Count of Submitted", "Count of approved"],
        pageSize: 100,
      }),
    );
    const globalUrl = `${base}/v0.2/Boba%20Club%20Dashboard/Club%20Workshops?select=${globalSelect}&authKey=${key}`;
    const globalRecords = await fetchAllPages(globalUrl);

    let globalTotal = 0;
    let globalApproved = 0;
    for (const r of globalRecords) {
      const fields = r.fields || r;
      globalTotal += toNumber(fields["Count of Submitted"]);
      globalApproved += toNumber(fields["Count of approved"]);
    }
    const globalApprovalRate = globalTotal
      ? Math.round((globalApproved / globalTotal) * 100)
      : 0;

    // 3. Optional timeline/rejection reasons from Websites (capped)
    const weeklyMap = new Map();
    const rejectionReasons = new Map();
    const submissions = [];

    const formulaParts = clubNames.map(
      (name) =>
        `{club_name (from Active Clubs) (from Club)} = '${String(name).replace(/'/g, "\\'")}'`,
    );

    if (formulaParts.length > 0) {
      const websiteFilter = encodeURIComponent(
        JSON.stringify({
          filterByFormula: `OR(${formulaParts.join(",")})`,
          fields: [
            "Project Status",
            "club_name (from Active Clubs) (from Club)",
            "Rejection Reason",
          ],
          pageSize: 500,
          maxRecords: 500,
        }),
      );
      const websiteUrl = `${base}/v0.2/Boba%20Club%20Dashboard/Websites?select=${websiteFilter}&authKey=${key}`;
      try {
        const websiteRecords = await fetchJson(websiteUrl);
        const page = Array.isArray(websiteRecords)
          ? websiteRecords
          : websiteRecords?.records || websiteRecords?.data || [];

        for (const r of page) {
          const fields = r.fields || r;
          const status = fields["Project Status"] || "Pending";
          const clubArr = fields["club_name (from Active Clubs) (from Club)"];
          const clubName = Array.isArray(clubArr)
            ? clubArr[0]
            : clubArr || "Unknown";
          const reason = fields["Rejection Reason"] || "";
          const createdTime = r.createdTime || fields.createdTime || null;

          if (reason) {
            rejectionReasons.set(
              reason,
              (rejectionReasons.get(reason) || 0) + 1,
            );
          }

          if (createdTime) {
            const d = new Date(createdTime);
            if (!Number.isNaN(d.getTime())) {
              const year = d.getUTCFullYear();
              const week = getWeek(d);
              const key = `${year}-W${String(week).padStart(2, "0")}`;
              if (!weeklyMap.has(key))
                weeklyMap.set(key, { period: key, count: 0 });
              weeklyMap.get(key).count++;
            }
          }

          submissions.push({
            id: r.id || null,
            club: clubName,
            status,
            rejectionReason: reason,
            createdTime,
          });
        }
      } catch (err) {
        console.warn("Personal stats website fetch failed", err.message);
      }
    }

    const weeklyTimeline = Array.from(weeklyMap.values()).sort((a, b) =>
      a.period.localeCompare(b.period),
    );

    const rejectionReasonList = Array.from(rejectionReasons.entries())
      .map(([reason, count]) => ({ reason, count }))
      .sort((a, b) => b.count - a.count);

    res.setHeader(
      "Cache-Control",
      `s-maxage=${CACHE_MAX_AGE_S}, stale-while-revalidate=${CACHE_MAX_AGE_S * 2}`,
    );
    return res.status(200).json({
      clubs: userClubs,
      submissions,
      summary: {
        total: userTotal,
        approved: userApproved,
        rejected: userRejected,
        pending: userPending,
        approvalRate: userApprovalRate,
      },
      weeklyTimeline,
      rejectionReasons: rejectionReasonList,
      globalComparison: {
        total: globalTotal,
        approved: globalApproved,
        approvalRate: globalApprovalRate,
        userShare: globalTotal
          ? Math.round((userTotal / globalTotal) * 100)
          : 0,
      },
    });
  } catch (err) {
    console.error("Personal stats error", err);
    return res.status(500).json({ error: err.message || "Unknown error" });
  }
}
