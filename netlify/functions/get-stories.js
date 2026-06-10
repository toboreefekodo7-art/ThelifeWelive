const { getSupabaseConfig, json, supabaseRequest } = require("./lib/supabase");

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
        "select=id,title,slug,category,story_body,video_url,status,report_status,published_at",
        "status=eq.published",
        "order=published_at.desc"
      ].join("&")
    });

    return json(200, { platformActive: true, stories });
  } catch (error) {
    return json(200, {
      platformActive: false,
      stories: [],
      message: "Story database is not ready yet."
    });
  }
};
