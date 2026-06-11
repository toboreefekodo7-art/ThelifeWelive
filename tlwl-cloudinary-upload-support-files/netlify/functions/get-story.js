const { canAcceptContributions, getSupabaseConfig, json, supabaseRequest } = require("./lib/supabase");

const mediaSelect = "id,story_id,campaign_id,asset_type,provider,url,public_id,thumbnail_url,resource_type,format,bytes,duration,moderation_status,created_at";

exports.handler = async (event) => {
  const { configured } = getSupabaseConfig();
  if (!configured) {
    return json(200, {
      platformActive: false,
      story: null,
      message: "Story pages will load from Supabase after the platform database is connected."
    });
  }

  const params = event.queryStringParameters || {};
  const id = params.id;
  const slug = params.slug;

  if (!id && !slug) {
    return json(400, { message: "Story id or slug is required." });
  }

  const filter = id ? `id=eq.${encodeURIComponent(id)}` : `slug=eq.${encodeURIComponent(slug)}`;

  try {
    const stories = await supabaseRequest("stories", {
      query: [
        "select=id,title,slug,category,short_description,story_body,video_url,video_thumbnail_url,status,report_status,published_at,campaigns(id,title,slug,status,campaign_status,review_status,payout_status,accepting_contributions,goal_amount,amount_raised,supporter_count,report_status,contributions_paused)",
        filter,
        "status=in.(public,published,auto_approved)",
        "limit=1"
      ].join("&")
    });

    const story = stories[0] || null;
    if (story && Array.isArray(story.campaigns)) {
      story.campaigns = story.campaigns.map((campaign) => ({
        ...campaign,
        canContribute: canAcceptContributions(campaign)
      }));
    }

    if (story) {
      story.media_assets = await supabaseRequest("media_assets", {
        query: [
          `select=${mediaSelect}`,
          `story_id=eq.${encodeURIComponent(story.id)}`,
          "order=created_at.asc"
        ].join("&")
      });
    }

    return json(200, { platformActive: true, story });
  } catch (error) {
    return json(error.statusCode || 500, { message: "Could not load this story." });
  }
};
