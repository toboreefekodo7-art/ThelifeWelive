const { canAcceptContributions, getSupabaseConfig, json, supabaseRequest } = require("./lib/supabase");

const mediaSelect = "id,story_id,campaign_id,asset_type,provider,url,public_id,thumbnail_url,resource_type,format,bytes,duration,moderation_status,created_at";
const mediaSelectFallbacks = [
  mediaSelect,
  "id,story_id,campaign_id,asset_type,provider,url,thumbnail_url,resource_type,format,created_at",
  "id,story_id,campaign_id,asset_type,url,thumbnail_url",
  "id,story_id,campaign_id,url"
];
const fullStorySelect = "select=id,title,slug,category,short_description,story_body,video_url,video_thumbnail_url,status,report_status,published_at,campaigns(id,title,slug,status,campaign_status,review_status,payout_status,verification_status,accepting_contributions,goal_amount,amount_raised,supporter_count,report_status,contributions_paused)";
const basicStorySelect = "select=id,title,slug,category,short_description,story_body,video_url,video_thumbnail_url,status,report_status,published_at";
const minimalStorySelect = "select=id,title,slug,category,story_body,video_url,status,published_at";
const publicStoryStatuses = new Set(["public", "published", "auto_approved", "under_review", "contributions_paused", "closed"]);

const normalizeLooseStory = (story = {}) => ({
  id: story.id,
  title: story.title || story.story_title || "Untitled TLWL Story",
  slug: story.slug || "",
  category: story.category || "other",
  short_description: story.short_description || story.description || story.story || story.story_body || "",
  story_body: story.story_body || story.story || story.description || "",
  video_url: story.video_url || story.video || story.video_link || "",
  video_thumbnail_url: story.video_thumbnail_url || story.thumbnail_url || "",
  status: story.status || story.moderation_status || "public",
  report_status: story.report_status || "no_reports",
  published_at: story.published_at || story.created_at || null,
  campaigns: []
});

const fetchStory = async (filter) => {
  try {
    return await supabaseRequest("stories", {
      query: [fullStorySelect, filter, "limit=1"].join("&")
    });
  } catch (error) {
    try {
      const stories = await supabaseRequest("stories", {
        query: [basicStorySelect, filter, "limit=1"].join("&")
      });
      return stories.map((story) => ({ ...story, campaigns: [] }));
    } catch (fallbackError) {
      try {
        const stories = await supabaseRequest("stories", {
          query: [minimalStorySelect, filter, "limit=1"].join("&")
        });
        return stories.map((story) => ({
          ...story,
          short_description: story.story_body,
          video_thumbnail_url: "",
          report_status: "no_reports",
          campaigns: []
        }));
      } catch (looseError) {
        const stories = await supabaseRequest("stories", {
          query: ["select=*", filter, "limit=1"].join("&")
        });
        return stories.map(normalizeLooseStory);
      }
    }
  }
};

const fetchMediaAssets = async (filters = []) => {
  for (const select of mediaSelectFallbacks) {
    try {
      return await supabaseRequest("media_assets", {
        query: [`select=${select}`, ...filters].join("&")
      });
    } catch (error) {
      // Media columns may be added over time; do not hide the public story when media lookup fails.
    }
  }
  return [];
};

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
    const stories = await fetchStory(filter);
    const story = stories[0] || null;
    if (story && !publicStoryStatuses.has(story.status)) {
      return json(404, { message: "Story not found." });
    }

    if (story) {
      const campaigns = Array.isArray(story.campaigns) ? story.campaigns : [];
      const campaignIds = campaigns.map((campaign) => campaign.id).filter(Boolean);
      const storyAssets = await fetchMediaAssets([
        `story_id=eq.${encodeURIComponent(story.id)}`,
        "order=created_at.asc"
      ]);

      const campaignAssets = campaignIds.length
        ? await fetchMediaAssets([
          `campaign_id=in.(${campaignIds.join(",")})`,
          "order=created_at.asc"
        ])
        : [];

      const mediaMap = new Map([...storyAssets, ...campaignAssets].map((asset) => [asset.id, asset]));
      story.media_assets = Array.from(mediaMap.values());

      if (Array.isArray(story.campaigns)) {
        story.campaigns = story.campaigns.map((campaign) => ({
          ...campaign,
          media_assets: campaignAssets.filter((asset) => asset.campaign_id === campaign.id),
          canContribute: canAcceptContributions(campaign)
        }));
      }
    }

    return json(200, { platformActive: true, story });
  } catch (error) {
    return json(error.statusCode || 500, { message: "Could not load this story." });
  }
};
