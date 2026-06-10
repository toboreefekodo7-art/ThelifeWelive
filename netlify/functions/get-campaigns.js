const { getSupabaseConfig, json, supabaseRequest } = require("./lib/supabase");

const fallbackCampaigns = [
  {
    id: "first-campaign",
    title: "First TLWL Campaign Coming Soon",
    status: "Launching Soon",
    story: "This campaign area can be used to raise support for a student, family, scholarship, emergency need, or community initiative.",
    goal: 1000,
    raised: 0,
    donors: 0,
    canContribute: false,
    reportStatus: "no_reports",
    uses: [
      "Direct support to the approved recipient",
      "Scholarship or educational expenses",
      "Community impact initiatives",
      "Verified emergency assistance"
    ]
  }
];

const canAcceptContributions = (campaign) => (
  campaign.status === "published"
  && campaign.verification_status === "verified"
  && campaign.contributions_paused !== true
  && !["under_review", "paused", "removed", "refunded_if_needed"].includes(campaign.report_status)
);

exports.handler = async () => {
  const { configured } = getSupabaseConfig();

  if (!configured) {
    return json(200, { platformActive: false, campaigns: fallbackCampaigns });
  }

  try {
    const records = await supabaseRequest("campaigns", {
      query: [
        "select=id,title,slug,status,goal_amount,amount_raised,supporter_count,fund_use_description,verification_status,report_status,contributions_paused",
        "status=in.(published,closed,flagged)"
      ].join("&")
    });

    const campaigns = records.map((campaign) => ({
      id: campaign.id,
      slug: campaign.slug,
      title: campaign.title,
      status: campaign.report_status === "under_review" || campaign.contributions_paused
        ? "Under Review"
        : campaign.status,
      story: campaign.fund_use_description || "This campaign is connected to a TLWL story.",
      goal: Number(campaign.goal_amount || 0),
      raised: Number(campaign.amount_raised || 0),
      donors: Number(campaign.supporter_count || 0),
      canContribute: canAcceptContributions(campaign),
      reportStatus: campaign.report_status || "no_reports",
      uses: ["See the campaign page for approved use of funds and updates."]
    }));

    return json(200, { platformActive: true, campaigns: campaigns.length ? campaigns : fallbackCampaigns });
  } catch (error) {
    return json(200, {
      platformActive: false,
      campaigns: fallbackCampaigns,
      message: "Campaign database is not ready yet."
    });
  }
};
