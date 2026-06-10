const { getSupabaseConfig, json, supabaseRequest } = require("./lib/supabase");

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
        "select=id,title,slug,category,story_body,video_url,status,report_status,published_at,campaigns(id,title,slug,status,report_status,contributions_paused)",
        filter,
        "status=eq.published",
        "limit=1"
      ].join("&")
    });

    return json(200, { platformActive: true, story: stories[0] || null });
  } catch (error) {
    return json(error.statusCode || 500, { message: "Could not load this story." });
  }
};
