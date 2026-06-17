const { canAcceptContributions, getSupabaseConfig, json, supabaseRequest } = require("./lib/supabase");

const mediaSelect = "id,story_id,campaign_id,asset_type,provider,url,public_id,thumbnail_url,resource_type,format,bytes,duration,moderation_status,created_at";
const mediaSelectFallbacks = [
  mediaSelect,
  "id,story_id,campaign_id,asset_type,provider,url,thumbnail_url,resource_type,format,created_at",
  "id,story_id,campaign_id,asset_type,url,thumbnail_url",
  "id,story_id,campaign_id,url"
];
const fullCampaignSelect = "select=id,story_id,title,slug,status,campaign_status,review_status,payout_status,accepting_contributions,goal_amount,amount_raised,supporter_count,fund_use_description,verification_status,report_status,contributions_paused,stories(id,title,slug,category,story_body,video_url,video_thumbnail_url)";
const basicCampaignSelect = "select=id,story_id,title,slug,status,campaign_status,review_status,payout_status,accepting_contributions,goal_amount,amount_raised,supporter_count,fund_use_description,verification_status,report_status,contributions_paused";
const publicCampaignStatuses = new Set(["public", "accepting_contributions", "published", "closed", "under_review", "contributions_paused", "payout_pending_verification", "payout_verified", "refund_review"]);

const fetchCampaign = async (filter) => {
  try {
    return await supabaseRequest("campaigns", {
      query: [fullCampaignSelect, filter, "limit=1"].join("&")
    });
  } catch (error) {
    return supabaseRequest("campaigns", {
      query: [basicCampaignSelect, filter, "limit=1"].join("&")
    });
  }
};

const fetchMediaAssets = async (filters = []) => {
  for (const select of mediaSelectFallbacks) {
    try {
      return await supabaseRequest("media_assets", {
        query: [`select=${select}`, ...filters].join("&")
      });
    } catch (error) {
      // Keep campaign pages visible even when optional media metadata columns are not present yet.
    }
  }
  return [];
};

const optionalSupabaseRequest = async (table, options, fallback = []) => {
  try {
    return await supabaseRequest(table, options);
  } catch (error) {
    return fallback;
  }
};

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
    const campaigns = await fetchCampaign(filter);
    const campaign = campaigns[0];
    if (!campaign) return json(404, { message: "Campaign not found." });
    if (!publicCampaignStatuses.has(campaign.status)) return json(404, { message: "Campaign not found." });

    const updates = await optionalSupabaseRequest("campaign_updates", {
      query: [
        "select=id,title,body,media_url,published_at",
        `campaign_id=eq.${encodeURIComponent(campaign.id)}`,
        "status=eq.published",
        "order=published_at.desc"
      ].join("&")
    }, []);

    const campaignAssets = await fetchMediaAssets([
      `campaign_id=eq.${encodeURIComponent(campaign.id)}`,
      "order=created_at.asc"
    ]);

    const storyAssets = campaign.story_id
      ? await fetchMediaAssets([
        `story_id=eq.${encodeURIComponent(campaign.story_id)}`,
        "order=created_at.asc"
      ])
      : [];

    const mediaMap = new Map([...storyAssets, ...campaignAssets].map((asset) => [asset.id, asset]));
    const media_assets = Array.from(mediaMap.values());

    return json(200, {
      platformActive: true,
      campaign: {
        ...campaign,
        media_assets,
        stories: campaign.stories ? {
          ...campaign.stories,
          media_assets: storyAssets
        } : campaign.stories,
        updates,
        canContribute: canAcceptContributions(campaign)
      }
    });
  } catch (error) {
    return json(error.statusCode || 500, { message: "Could not load this campaign." });
  }
};
