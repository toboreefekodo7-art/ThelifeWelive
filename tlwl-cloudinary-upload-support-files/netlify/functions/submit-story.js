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

const isChecked = (value) => value === true || value === "on" || value === "true";

const getInitialStatus = (supportType, storyBody) => {
  const hasEnoughContext = storyBody.length >= 80;

  if (supportType !== "share_story_only") {
    return {
      moderationStatus: hasEnoughContext ? "public" : "submitted",
      campaignStatus: hasEnoughContext ? "accepting_contributions" : "submitted",
      reviewStatus: "clear",
      payoutStatus: "payout_pending_verification",
      riskLevel: hasEnoughContext ? "low" : "needs_review",
      supportStatus: hasEnoughContext ? "accepting_contributions" : "submitted"
    };
  }

  return {
    moderationStatus: hasEnoughContext ? "public" : "submitted",
    campaignStatus: "not_requested",
    reviewStatus: "clear",
    payoutStatus: "not_started",
    riskLevel: hasEnoughContext ? "low" : "needs_review",
    supportStatus: "not_requested"
  };
};

const requiredCampaignFields = [
  ["organizer_name", "Organizer name"],
  ["beneficiary_name", "Beneficiary/recipient name"],
  ["beneficiary_relationship", "Relationship to beneficiary"],
  ["fund_purpose", "What funds are being raised for"],
  ["fund_use_description", "How funds will be used"],
  ["fund_delivery_plan", "How funds will be delivered to the beneficiary"]
];

const missingCampaignFields = (payload, videoUrl, goalAmount) => {
  const missing = requiredCampaignFields
    .filter(([key]) => !cleanString(payload[key], 6000))
    .map(([, label]) => label);

  if (!videoUrl) missing.push("Video URL or uploaded video");
  if (goalAmount <= 0) missing.push("Support goal amount");
  if (!isChecked(payload.disclaimer_acknowledgment)) missing.push("For-profit contribution disclaimer acknowledgment");

  return missing;
};

const mediaTypeForSupportingAsset = (resourceType, format) => {
  const normalizedFormat = String(format || "").toLowerCase();
  if (["pdf", "doc", "docx"].includes(normalizedFormat)) return "document";
  if (["jpg", "jpeg", "png", "webp"].includes(normalizedFormat)) return "photo";
  if (resourceType === "image") return "photo";
  if (resourceType === "raw") return "document";
  return "other";
};

const toIntegerOrNull = (value) => {
  const number = Number(value || 0);
  return Number.isFinite(number) && number > 0 ? Math.round(number) : null;
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

  const consentConfirmed = isChecked(payload.consent);
  const accuracyConfirmed = isChecked(payload.accuracy_consent);
  const mediaConsentConfirmed = isChecked(payload.media_consent);

  if (!consentConfirmed || !accuracyConfirmed) {
    return json(400, { message: "Consent and accuracy confirmation are required before submission." });
  }

  const videoUrl = cleanString(payload.video_url, 1000);
  const requestedGoal = toNumber(payload.goal_amount || payload.requested_goal);

  if (supportType !== "share_story_only") {
    const missing = missingCampaignFields(payload, videoUrl, requestedGoal);
    if (missing.length) {
      return json(400, {
        message: `Please complete the campaign required fields: ${missing.join(", ")}.`
      });
    }
  }

  const initial = getInitialStatus(supportType, storyBody);
  const slug = `${slugify(title)}-${Date.now()}`;

  const submissionRecord = {
    submitter_name: submitterName,
    submitter_email: submitterEmail,
    submitter_phone: cleanString(payload.phone || payload.requester_phone, 80),
    title,
    slug,
    category,
    story_body: storyBody,
    video_url: videoUrl,
    video_public_id: cleanString(payload.video_public_id, 300),
    video_thumbnail_url: cleanString(payload.video_thumbnail_url, 1000),
    supporting_file_url: cleanString(payload.supporting_file_url, 1000),
    supporting_file_public_id: cleanString(payload.supporting_file_public_id, 300),
    support_type: supportType,
    requested_goal: requestedGoal,
    recipient_name: cleanString(payload.recipient_name || payload.beneficiary_name, 160),
    organizer_name: cleanString(payload.organizer_name || submitterName, 160),
    beneficiary_name: cleanString(payload.beneficiary_name || payload.recipient_name, 160),
    beneficiary_relationship: cleanString(payload.beneficiary_relationship, 240),
    fund_purpose: cleanString(payload.fund_purpose, 600),
    fund_use_description: cleanString(payload.fund_use_description || payload.need || payload.story, 6000),
    fund_delivery_plan: cleanString(payload.fund_delivery_plan, 2000),
    disclaimer_acknowledged: isChecked(payload.disclaimer_acknowledgment),
    consent_confirmed: consentConfirmed,
    media_consent_confirmed: mediaConsentConfirmed,
    accuracy_confirmed: accuracyConfirmed,
    moderation_status: initial.moderationStatus,
    campaign_status: initial.campaignStatus,
    review_status: initial.reviewStatus,
    payout_status: initial.payoutStatus,
    support_status: initial.supportStatus,
    risk_level: initial.riskLevel,
    publication_note: "Submission does not guarantee campaign visibility, payout, or support approval."
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
          organizer_name: submissionRecord.organizer_name,
          beneficiary_name: submissionRecord.beneficiary_name,
          beneficiary_relationship: submissionRecord.beneficiary_relationship,
          fund_purpose: submissionRecord.fund_purpose,
          fund_use_description: submissionRecord.fund_use_description,
          fund_delivery_plan: submissionRecord.fund_delivery_plan,
          recipient_name: submissionRecord.recipient_name,
          nominee_contact: cleanString(payload.nominee_contact, 300),
          verification_status: "payout_pending_verification",
          payout_status: "payout_pending_verification",
          disclaimer_acknowledged: submissionRecord.disclaimer_acknowledged
        }
      });
    }

    let story = null;
    let campaign = null;
    if (submissionRecord.moderation_status === "public") {
      [story] = await supabaseRequest("stories", {
        method: "POST",
        body: {
          submission_id: submission.id,
          title: submissionRecord.title,
          slug: submissionRecord.slug,
          category: submissionRecord.category,
          short_description: cleanString(storyBody, 220),
          story_body: submissionRecord.story_body,
          video_url: submissionRecord.video_url,
          video_thumbnail_url: submissionRecord.video_thumbnail_url,
          status: "public",
          report_status: "no_reports",
          published_at: new Date().toISOString()
        }
      });
    }

    if (story && supportType !== "share_story_only") {
      [campaign] = await supabaseRequest("campaigns", {
        method: "POST",
        body: {
          story_id: story.id,
          support_request_id: supportRequest?.id || null,
          title: submissionRecord.title,
          slug: submissionRecord.slug,
          organizer_name: submissionRecord.organizer_name,
          beneficiary_name: submissionRecord.beneficiary_name,
          beneficiary_relationship: submissionRecord.beneficiary_relationship,
          fund_purpose: submissionRecord.fund_purpose,
          fund_use_description: submissionRecord.fund_use_description,
          fund_delivery_plan: submissionRecord.fund_delivery_plan,
          goal_amount: submissionRecord.requested_goal,
          amount_raised: 0,
          supporter_count: 0,
          status: "accepting_contributions",
          campaign_status: "accepting_contributions",
          review_status: "clear",
          payout_status: "payout_pending_verification",
          accepting_contributions: true,
          contributions_paused: false,
          verification_status: "payout_pending_verification",
          report_status: "no_reports",
          disclaimer_acknowledged: submissionRecord.disclaimer_acknowledged,
          payout_verification_due_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          published_at: new Date().toISOString()
        }
      });
    }

    if (submissionRecord.video_url) {
      await supabaseRequest("media_assets", {
        method: "POST",
        body: {
          story_submission_id: submission.id,
          story_id: story?.id || null,
          campaign_id: campaign?.id || null,
          asset_type: "video",
          provider: submissionRecord.video_public_id ? "cloudinary" : "external_link",
          url: submissionRecord.video_url,
          public_id: submissionRecord.video_public_id,
          thumbnail_url: submissionRecord.video_thumbnail_url,
          resource_type: cleanString(payload.video_resource_type, 60) || "video",
          format: cleanString(payload.video_format, 40),
          bytes: toIntegerOrNull(payload.video_bytes),
          duration: toNumber(payload.video_duration),
          moderation_status: "submitted"
        }
      });
    }

    if (submissionRecord.supporting_file_url) {
      await supabaseRequest("media_assets", {
        method: "POST",
        body: {
          story_submission_id: submission.id,
          story_id: story?.id || null,
          campaign_id: campaign?.id || null,
          asset_type: mediaTypeForSupportingAsset(
            cleanString(payload.supporting_file_type, 60),
            cleanString(payload.supporting_file_format, 40)
          ),
          provider: submissionRecord.supporting_file_public_id ? "cloudinary" : "external_link",
          url: submissionRecord.supporting_file_url,
          public_id: submissionRecord.supporting_file_public_id,
          thumbnail_url: cleanString(payload.supporting_file_thumbnail_url, 1000),
          resource_type: cleanString(payload.supporting_file_type, 60),
          format: cleanString(payload.supporting_file_format, 40),
          bytes: toIntegerOrNull(payload.supporting_file_bytes),
          duration: toNumber(payload.supporting_file_duration),
          moderation_status: "submitted"
        }
      });
    }

    return json(200, {
      platformActive: true,
      message: supportType === "share_story_only"
        ? "Story submitted for TLWL review."
        : "Support request submitted. If required information is complete, the story can become public while payout verification remains pending.",
      submissionId: submission.id,
      supportRequestId: supportRequest?.id || null,
      storyId: story?.id || null,
      campaignId: campaign?.id || null,
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
