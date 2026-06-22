// Shared authorization helpers for workshop access.
//
// A user is allowed to see a workshop if they're an admin, or if they own it.
// Ownership matches on EITHER the Hack Club Slack ID OR the account email, so
// linking keeps working when one of those is blank or differs between the
// signed-in account and the workshop record.

const norm = (value) => (value == null ? "" : String(value).trim());
const normEmail = (value) => norm(value).toLowerCase();

export function getAdminSlackIds() {
  return (process.env.NEXT_PUBLIC_ADMIN_SLACK_IDS || "")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);
}

export function isAdmin(session) {
  const slackId = norm(session?.user?.SlackID);
  if (!slackId) return false;
  return getAdminSlackIds().includes(slackId);
}

// Does the signed-in user own this workshop record?
// `record` is the workshop's { slackId, email } (e.g. from Airbridge fields).
export function ownsWorkshop(session, record) {
  const sessionSlackId = norm(session?.user?.SlackID);
  const sessionEmail = normEmail(session?.user?.email);

  const recordSlackId = norm(record?.slackId);
  const recordEmail = normEmail(record?.email);

  const slackMatches = sessionSlackId !== "" && sessionSlackId === recordSlackId;
  const emailMatches = sessionEmail !== "" && sessionEmail === recordEmail;

  return slackMatches || emailMatches;
}

// Admins can access anything; everyone else must own the record.
export function canAccessWorkshop(session, record) {
  return isAdmin(session) || ownsWorkshop(session, record);
}
