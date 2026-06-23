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

		// Airtable-style pagination
		offset = json?.offset || null;
	} while (offset);

	return records;
}

export default async function handler(req, res) {
	const session = await getServerSession(req, res, authOptions);
	if (!session) return res.status(401).json({ error: "Unauthorized" });

	const adminSlackIds =
		process.env.NEXT_PUBLIC_ADMIN_SLACK_IDS?.split(",") || [];
	if (!adminSlackIds.includes(session.user.slack_id)) {
		return res.status(403).json({ error: "Forbidden" });
	}

	const key = process.env.AIRBRIDGE_API_KEY;
	const base =
		process.env.DEV === "true"
			? "http://localhost:5000"
			: "https://airbridge.hackclub.com";
	if (!key) return res.status(500).json({ error: "Missing AIRBRIDGE_API_KEY" });

	try {
		const websiteSelect = encodeURIComponent(
			JSON.stringify({
				fields: ["Project Status", "club_name (from Active Clubs) (from Club)"],
				pageSize: 100,
			}),
		);
		const websiteUrl = `${base}/v0.2/Boba%20Club%20Dashboard/Websites?select=${websiteSelect}&authKey=${key}`;

		const records = await fetchAllPages(websiteUrl);
		console.log(`[admin/stats] fetched ${records.length} website records`);

		let totalSubmissions = 0;
		let approvedSubmissions = 0;
		const clubsWithSubmissions = new Set();

		for (const r of records) {
			const fields = r.fields || r;
			const status = fields["Project Status"] || "";
			const clubArr = fields["club_name (from Active Clubs) (from Club)"];
			const clubName = Array.isArray(clubArr) ? clubArr[0] : clubArr || "";

			totalSubmissions++;
			if (status === "Approve") approvedSubmissions++;
			if (clubName) clubsWithSubmissions.add(clubName);
		}

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
