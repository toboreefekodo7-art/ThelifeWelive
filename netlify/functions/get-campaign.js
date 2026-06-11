const { canAcceptContributions, getSupabaseConfig, json, supabaseRequest } = require("./lib/supabase");

const fallbackCampaign = {
  id: "first-campaign",
  title: "First TLWL Campaign Coming Soon",
  status: "Launching Soon",
  story: "This campaign area can be used to raise support for a student, family, scholarship, emergency need, or community initiative.",
  goal_amount: 1000,
  amount_raised: 0,
  supporter_count: 0,
  canContribute: false,
  report_status: "no_reports",
  updates: []
};

exports.handler = async (event) => {
  const { configured } = getSupabaseConfig();
  if (!configured) {
    return json(200, {
      platformActive: false,
      campaign: fallbackCampaign,
      message: "Campaign pages will load from Supabase after the platform database is connected."
    });
  }

  const params = event.queryStringParameters || {};
  const id = params.id;
  const slug = params.slug;

  if (!id && !slug) {
    return json(400, { message: "Campaign id or slug is required." });
  }

  const filter = id ? `id=eq.${encodeURIComponent(id)}` : `slug=eq.${encodeURIComponent(slug)}`;

  try {
    const campaigns = await supabaseRequest("campaigns", {
      query: [
        "select=id,story_id,title,slug,status,campaign_status,review_status,payout_status,accepting_contributions,goal_amount,amount_raised,supporter_count,fund_use_description,verification_status,report_status,contributions_paused,stories(id,title,slug,category,story_body,video_url,video_thumbnail_url)",
        filter,
        "status=in.(public,accepting_contributions,published,closed)",
        "limit=1"
      ].join("&")
    });

    const campaign = campaigns[0];
    if (!campaign) return json(404, { message: "Campaign not found." });

    const updates = await supabaseRequest("campaign_updates", {
      query: [
        "select=id,title,body,media_url,published_at",
        `campaign_id=eq.${encodeURIComponent(campaign.id)}`,
        "status=eq.published",
        "order=published_at.desc"
      ].join("&")
    });

    return json(200, {
      platformActive: true,
      campaign: {
        ...campaign,
        updates,
        canContribute: canAcceptContributions(campaign)
      }
    });
  } catch (error) {
    return json(error.statusCode || 500, { message: "Could not load this campaign." });
  }
};
