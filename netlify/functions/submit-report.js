const {
  cleanString,
  getSupabaseConfig,
  json,
  supabaseRequest
} = require("./lib/supabase");

const allowedReasons = new Set([
  "misleading_or_false_story",
  "fake_identity_or_impersonation",
  "misuse_of_funds_concern",
  "inappropriate_or_harmful_content",
  "privacy_or_consent_concern",
  "copyright_or_content_ownership_issue",
  "other"
]);

const normalizeChoice = (value, fallback) => {
  const normalized = cleanString(value, 120).toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
  return normalized || fallback;
};

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") return json(204, {});

  if (event.httpMethod !== "POST") {
    return json(405, { message: "Method not allowed" });
  }

  const { configured } = getSupabaseConfig();
  if (!configured) {
    return json(200, {
      platformActive: false,
      message: "Supabase is not connected yet. This report can continue through Netlify Forms until the platform database is configured."
    });
  }

  let payload;
  try {
    payload = JSON.parse(event.body || "{}");
  } catch (error) {
    return json(400, { message: "Invalid request body" });
  }

  const reporterName = cleanString(payload.reporter_name || payload.name, 160);
  const reporterEmail = cleanString(payload.reporter_email || payload.email, 240).toLowerCase();
  const targetType = normalizeChoice(payload.target_type, "story");
  const targetId = cleanString(payload.target_id || payload.story_id || payload.campaign_id, 120);
  const reason = normalizeChoice(payload.reason, "other");
  const details = cleanString(payload.details || payload.explanation, 6000);

  if (!reporterName || !reporterEmail || !targetId || !details) {
    return json(400, { message: "Reporter name, email, target ID, and details are required." });
  }

  if (!allowedReasons.has(reason)) {
    return json(400, { message: "Please choose a valid report reason." });
  }

  const reportRecord = {
    reporter_name: reporterName,
    reporter_email: reporterEmail,
    reason,
    details,
    supporting_file_url: cleanString(payload.supporting_file_url, 1000),
    status: "reported"
  };

  if (targetType === "campaign") {
    reportRecord.campaign_id = targetId;
  } else {
    reportRecord.story_id = targetId;
  }

  try {
    const [report] = await supabaseRequest("reports", {
      method: "POST",
      body: reportRecord
    });

    const table = targetType === "campaign" ? "campaigns" : "stories";
    await supabaseRequest(table, {
      method: "PATCH",
      query: `id=eq.${encodeURIComponent(targetId)}`,
      body: { report_status: "reported" },
      prefer: "return=minimal"
    });

    return json(200, {
      platformActive: true,
      message: "Report submitted for TLWL review.",
      reportId: report.id
    });
  } catch (error) {
    return json(error.statusCode || 500, {
      message: "Could not save this report yet.",
      details: process.env.NODE_ENV === "development" ? error.details || error.message : undefined
    });
  }
};
