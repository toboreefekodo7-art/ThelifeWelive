const {
  cleanString,
  getSupabaseConfig,
  json,
  slugify,
  supabaseRequest,
  toNumber
} = require("./lib/supabase");

const allowedCategories = new Set([
  "education",
  "family",
  "recovery",
  "community",
  "new_beginning",
  "other"
]);

const allowedSupportTypes = new Set([
  "share_story_only",
  "financial_support",
  "scholarship_support",
  "emergency_assistance",
  "nominate_someone_else"
]);

const normalizeChoice = (value, fallback) => {
  const normalized = cleanString(value, 80).toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
  return normalized || fallback;
};

const getInitialStatus = (supportType, storyBody) => {
  if (supportType !== "share_story_only") {
    return {
      moderationStatus: "needs_verification",
      riskLevel: "verification_required",
      supportStatus: "needs_verification"
    };
  }

  const hasEnoughContext = storyBody.length >= 80;
  const autoApproveEnabled = process.env.ENABLE_STORY_AUTO_APPROVAL === "true";

  return {
    moderationStatus: autoApproveEnabled && hasEnoughContext ? "auto_approved" : "submitted",
    riskLevel: hasEnoughContext ? "low" : "needs_review",
    supportStatus: "not_requested"
  };
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
      message: "Supabase is not connected yet. This submission can continue through Netlify Forms until the platform database is configured."
    });
  }

  let payload;
  try {
    payload = JSON.parse(event.body || "{}");
  } catch (error) {
    return json(400, { message: "Invalid request body" });
  }

  const title = cleanString(payload.title || payload.story_title || payload.recipient_name || "Untitled TLWL Story", 140);
  const category = normalizeChoice(payload.category, "other");
  const supportType = normalizeChoice(payload.support_type, "share_story_only");
  const storyBody = cleanString(payload.story || payload.story_body || payload.need, 10000);
  const submitterName = cleanString(payload.name || payload.requester_name, 160);
  const submitterEmail = cleanString(payload.email || payload.requester_email, 240).toLowerCase();

  if (!submitterName || !submitterEmail || !storyBody) {
    return json(400, { message: "Name, email, and story details are required." });
  }

  if (!allowedCategories.has(category)) {
    return json(400, { message: "Please choose a valid story category." });
  }

  if (!allowedSupportTypes.has(supportType)) {
    return json(400, { message: "Please choose a valid support type." });
  }

  const consentConfirmed = payload.consent === true || payload.consent === "on" || payload.consent === "true";
  const accuracyConfirmed = payload.accuracy_consent === true || payload.accuracy_consent === "on" || payload.accuracy_consent === "true";
  const mediaConsentConfirmed = payload.media_consent === true || payload.media_consent === "on" || payload.media_consent === "true";

  if (!consentConfirmed || !accuracyConfirmed) {
    return json(400, { message: "Consent and accuracy confirmation are required before submission." });
  }

  const initial = getInitialStatus(supportType, storyBody);

  const submissionRecord = {
    submitter_name: submitterName,
    submitter_email: submitterEmail,
    submitter_phone: cleanString(payload.phone || payload.requester_phone, 80),
    title,
    slug: `${slugify(title)}-${Date.now()}`,
    category,
    story_body: storyBody,
    video_url: cleanString(payload.video_url, 1000),
    support_type: supportType,
    requested_goal: toNumber(payload.goal_amount || payload.requested_goal),
    recipient_name: cleanString(payload.recipient_name, 160),
    consent_confirmed: consentConfirmed,
    media_consent_confirmed: mediaConsentConfirmed,
    accuracy_confirmed: accuracyConfirmed,
    moderation_status: initial.moderationStatus,
    support_status: initial.supportStatus,
    risk_level: initial.riskLevel,
    publication_note: "Submission does not guarantee publication or campaign approval."
  };

  try {
    const [submission] = await supabaseRequest("story_submissions", {
      method: "POST",
      body: submissionRecord
    });

    let supportRequest = null;
    if (supportType !== "share_story_only") {
      [supportRequest] = await supabaseRequest("support_requests", {
        method: "POST",
        body: {
          story_submission_id: submission.id,
          request_type: supportType,
          requested_amount: submissionRecord.requested_goal,
          fund_use_description: cleanString(payload.fund_use_description || payload.need || payload.story, 6000),
          recipient_name: submissionRecord.recipient_name,
          nominee_contact: cleanString(payload.nominee_contact, 300),
          verification_status: "needs_verification"
        }
      });
    }

    if (submissionRecord.video_url) {
      await supabaseRequest("media_assets", {
        method: "POST",
        body: {
          story_submission_id: submission.id,
          asset_type: "video",
          provider: "external_link",
          url: submissionRecord.video_url,
          moderation_status: "submitted"
        }
      });
    }

    return json(200, {
      platformActive: true,
      message: supportType === "share_story_only"
        ? "Story submitted for TLWL review."
        : "Support request submitted for TLWL verification.",
      submissionId: submission.id,
      supportRequestId: supportRequest?.id || null,
      moderationStatus: submission.moderation_status,
      supportStatus: submission.support_status
    });
  } catch (error) {
    return json(error.statusCode || 500, {
      message: "Could not save this submission yet.",
      details: process.env.NODE_ENV === "development" ? error.details || error.message : undefined
    });
  }
};
