const json = (statusCode, body) => ({
  statusCode,
  headers: {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS"
  },
  body: JSON.stringify(body)
});

const getSupabaseConfig = () => {
  const url = (process.env.SUPABASE_URL || "").replace(/\/$/, "");
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || "";
  return {
    url,
    serviceKey,
    configured: Boolean(url && serviceKey)
  };
};

const supabaseRequest = async (table, options = {}) => {
  const { url, serviceKey, configured } = getSupabaseConfig();
  if (!configured) {
    const error = new Error("Supabase is not configured.");
    error.code = "SUPABASE_NOT_CONFIGURED";
    throw error;
  }

  const method = options.method || "GET";
  const query = options.query ? `?${options.query}` : "";
  const response = await fetch(`${url}/rest/v1/${table}${query}`, {
    method,
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      "Content-Type": "application/json",
      Prefer: options.prefer || "return=representation"
    },
    body: options.body ? JSON.stringify(options.body) : undefined
  });

  const text = await response.text();
  const data = text ? JSON.parse(text) : null;

  if (!response.ok) {
    const error = new Error(data?.message || data?.hint || "Supabase request failed.");
    error.statusCode = response.status;
    error.details = data;
    throw error;
  }

  return data;
};

const cleanString = (value, maxLength = 1000) => String(value || "").trim().slice(0, maxLength);

const toNumber = (value) => {
  const number = Number(value || 0);
  return Number.isFinite(number) && number > 0 ? number : 0;
};

const slugify = (value) => cleanString(value, 90)
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, "-")
  .replace(/^-+|-+$/g, "")
  || `tlwl-${Date.now()}`;

const blockingReviewStatuses = new Set([
  "under_review",
  "paused",
  "contributions_paused",
  "removed",
  "refund_review",
  "refunded_if_needed"
]);

const publicStoryStatuses = new Set([
  "public",
  "published",
  "auto_approved"
]);

const publicCampaignStatuses = new Set([
  "public",
  "accepting_contributions",
  "published",
  "closed"
]);

const canAcceptContributions = (campaign = {}) => {
  const status = campaign.campaign_status || campaign.status;
  const reviewStatus = campaign.review_status || campaign.report_status;
  const accepting = campaign.accepting_contributions === true || status === "accepting_contributions";
  const publicEnough = publicCampaignStatuses.has(status);

  return accepting
    && publicEnough
    && campaign.contributions_paused !== true
    && !blockingReviewStatuses.has(reviewStatus);
};

module.exports = {
  blockingReviewStatuses,
  canAcceptContributions,
  cleanString,
  getSupabaseConfig,
  json,
  publicCampaignStatuses,
  publicStoryStatuses,
  slugify,
  supabaseRequest,
  toNumber
};
