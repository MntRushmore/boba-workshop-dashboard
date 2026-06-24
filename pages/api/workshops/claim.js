import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]";
import AirtablePlus from "airtable-plus";

const baseID = process.env.AIRTABLE_BASE_ID || "app05mIKwNPO2l1vT";
const tableName = "Club Workshops";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const session = await getServerSession(req, res, authOptions);
  if (!session) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const apiKey = process.env.AIRTABLE_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "Missing AIRTABLE_API_KEY" });
  }

  const { eventCode, email } = req.body || {};
  const slackId = session.user.SlackID;
  const sessionEmail = String(session.user.email || "")
    .trim()
    .toLowerCase();

  if (!eventCode || !email) {
    return res.status(400).json({ error: "Missing eventCode or email" });
  }
  if (!slackId) {
    return res.status(400).json({ error: "No Slack ID in session" });
  }

  const normalizedInputEmail = String(email).trim().toLowerCase();

  try {
    const airtable = new AirtablePlus({
      baseID,
      apiKey,
      tableName,
    });

    // Find the workshop by event code
    const sanitizedCode = String(eventCode).replace(/'/g, "\\'");
    const records = await airtable.read({
      filterByFormula: `{Event Code} = '${sanitizedCode}'`,
      maxRecords: 1,
    });

    if (!records || records.length === 0) {
      return res.status(404).json({ error: "Workshop not found" });
    }

    const record = records[0];
    const fields = record.fields || {};

    // Verify email matches the workshop's stored email
    const workshopEmail = String(fields.Email || "")
      .trim()
      .toLowerCase();
    if (workshopEmail !== normalizedInputEmail) {
      return res
        .status(403)
        .json({ error: "Email does not match this workshop" });
    }

    // Optional: prevent claiming if already linked to a different Slack ID
    const existingSlackId = fields["Slack ID"];
    if (existingSlackId && existingSlackId !== slackId) {
      return res.status(409).json({
        error: "This workshop is already linked to another Slack account",
      });
    }

    // Update the workshop with the user's Slack ID
    await airtable.update(record.id, {
      "Slack ID": slackId,
    });

    return res.status(200).json({
      success: true,
      message: "Workshop claimed successfully",
      recordId: record.id,
    });
  } catch (err) {
    console.error("Workshop claim error", err);
    return res.status(500).json({ error: err.message || "Unknown error" });
  }
}
