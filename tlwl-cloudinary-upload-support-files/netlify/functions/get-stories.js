const { canAcceptContributions, getSupabaseConfig, json, supabaseRequest } = require("./lib/supabase");

const mediaSelect = "id,story_id,campaign_id,asset_type,provider,url,public_id,thumbnail_url,resource_type,format,bytes,duration,moderation_status,created_at";

exports.handler = async () => {
  const { configured } = getSupabaseConfig();

  if (!configured) {
    return json(200, {
      platformActive: false,
      stories: []
    });
  }

  try {
    const stories = await supabaseRequest("stories", {
      query: [
        "select=id,title,slug,category,short_description,story_body,video_url,video_thumbnail_url,status,report_status,published_at,campaigns(id,title,slug,status,campaign_status,review_status,payout_status,accepting_contributions,goal_amount,amount_raised,supporter_count,report_status,contributions_paused)",
        "status=in.(public,published,auto_approved)",
        "order=published_at.desc"
      ].join("&")
    });

    const storyIds = stories.map((story) => story.id).filter(Boolean);
    const mediaAssets = storyIds.length
      ? await supabaseRequest("media_assets", {
        query: [
          `select=${mediaSelect}`,
          `story_id=in.(${storyIds.join(",")})`,
          "order=created_at.asc"
        ].join("&")
      })
      : [];

    const mediaByStory = mediaAssets.reduce((grouped, asset) => {
      if (!asset.story_id) return grouped;
      grouped[asset.story_id] = grouped[asset.story_id] || [];
      grouped[asset.story_id].push(asset);
      return grouped;
    }, {});

    const publicStories = stories.map((story) => {
      const campaign = Array.isArray(story.campaigns) ? story.campaigns[0] : null;
      return {
        ...story,
        media_assets: mediaByStory[story.id] || [],
        campaign: campaign ? {
          ...campaign,
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
