const { canAcceptContributions, getSupabaseConfig, json, supabaseRequest } = require("./lib/supabase");

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

    const publicStories = stories.map((story) => {
      const campaign = Array.isArray(story.campaigns) ? story.campaigns[0] : null;
      return {
        ...story,
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
