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

const fetchStories = async () => {
  const attempts = [
    { select: fullStorySelect, query: ["order=published_at.desc"], normalize: (stories) => stories },
    { select: fullStorySelect, query: [], normalize: (stories) => stories },
    { select: basicStorySelect, query: ["order=published_at.desc"], normalize: (stories) => stories.map((story) => ({ ...story, campaigns: [] })) },
    { select: basicStorySelect, query: [], normalize: (stories) => stories.map((story) => ({ ...story, campaigns: [] })) },
    {
      select: minimalStorySelect,
      query: ["order=published_at.desc"],
      normalize: (stories) => stories.map((story) => ({
        ...story,
        short_description: story.story_body,
        video_thumbnail_url: "",
        report_status: "no_reports",
        campaigns: []
      }))
    },
    {
      select: minimalStorySelect,
      query: [],
      normalize: (stories) => stories.map((story) => ({
        ...story,
        short_description: story.story_body,
        video_thumbnail_url: "",
        report_status: "no_reports",
        campaigns: []
      }))
    },
    {
      select: "select=*",
      query: [],
      normalize: (stories) => stories.map(normalizeLooseStory)
    }
  ];

  for (const attempt of attempts) {
    try {
      const stories = await supabaseRequest("stories", {
        query: [attempt.select, ...attempt.query].join("&")
      });
      return attempt.normalize(stories);
    } catch (error) {
      // Try the next lighter query shape before declaring the public story database unavailable.
    }
  }

  throw new Error("Stories table could not be queried.");
};

const fetchMediaAssets = async (filters = []) => {
  for (const select of mediaSelectFallbacks) {
    try {
      return await supabaseRequest("media_assets", {
        query: [`select=${select}`, ...filters].join("&")
      });
    } catch (error) {
      // Keep public story pages online even if optional media columns are not present yet.
    }
  }
  return [];
};

exports.handler = async () => {
  const { configured } = getSupabaseConfig();

  if (!configured) {
    return json(200, {
      platformActive: false,
      stories: []
    });
  }

  try {
    const stories = (await fetchStories()).filter((story) => publicStoryStatuses.has(story.status));

    const storyIds = stories.map((story) => story.id).filter(Boolean);
    const campaignIdToStoryId = stories.reduce((map, story) => {
      const campaigns = Array.isArray(story.campaigns) ? story.campaigns : [];
      campaigns.forEach((campaign) => {
        if (campaign.id) map[campaign.id] = story.id;
      });
      return map;
    }, {});
    const campaignIds = Object.keys(campaignIdToStoryId);
    const storyMediaAssets = storyIds.length
      ? await fetchMediaAssets([
        `story_id=in.(${storyIds.join(",")})`,
        "order=created_at.asc"
      ])
      : [];

    const campaignMediaAssets = campaignIds.length
      ? await fetchMediaAssets([
        `campaign_id=in.(${campaignIds.join(",")})`,
        "order=created_at.asc"
      ])
      : [];

    const mediaByStory = {};
    const addAssetForStory = (storyId, asset) => {
      if (!storyId || !asset) return;
      const grouped = mediaByStory[storyId] || [];
      const key = asset.id || asset.url;
      if (!grouped.some((item) => (item.id || item.url) === key)) grouped.push(asset);
      mediaByStory[storyId] = grouped;
    };

    storyMediaAssets.forEach((asset) => {
      addAssetForStory(asset.story_id, asset);
    });

    campaignMediaAssets.forEach((asset) => {
      addAssetForStory(campaignIdToStoryId[asset.campaign_id], asset);
    });

    const campaignMediaById = campaignMediaAssets.reduce((grouped, asset) => {
      if (!asset.campaign_id) return grouped;
      grouped[asset.campaign_id] = grouped[asset.campaign_id] || [];
      grouped[asset.campaign_id].push(asset);
      return grouped;
    }, {});

    const publicStories = stories.map((story) => {
      const campaign = Array.isArray(story.campaigns) ? story.campaigns[0] : null;
      return {
        ...story,
        media_assets: mediaByStory[story.id] || [],
        campaign: campaign ? {
          ...campaign,
          media_assets: campaignMediaById[campaign.id] || [],
          canContribute: canAcceptContributions(campaign)
        } : null
      };
    });

    return json(200, { platformActive: true, stories: publicStories });
  } catch (error) {
    return json(200, {
      platformActive: false,
      stories: [],
      message: "Story database is not ready yet."
    });
  }
};
