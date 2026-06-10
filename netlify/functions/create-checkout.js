const { getSupabaseConfig, supabaseRequest } = require("./lib/supabase");

const json = (statusCode, body) => ({
  statusCode,
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body)
});

const canAcceptContributions = (campaign) => (
  campaign.status === "published"
  && campaign.verification_status === "verified"
  && campaign.contributions_paused !== true
  && !["under_review", "paused", "removed", "refunded_if_needed"].includes(campaign.report_status)
);

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return json(405, { message: "Method not allowed" });
  }

  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
  const checkoutEnabled = process.env.ENABLE_STRIPE_CHECKOUT === "true";
  const siteUrl = (process.env.SITE_URL || process.env.URL || "http://localhost:8888").replace(/\/$/, "");

  if (!checkoutEnabled || !stripeSecretKey) {
    return json(200, {
      message: "Stripe checkout is not active yet. Add STRIPE_SECRET_KEY, SITE_URL, and ENABLE_STRIPE_CHECKOUT=true in Netlify environment variables when you are ready."
    });
  }

  let payload;
  try {
    payload = JSON.parse(event.body || "{}");
  } catch (error) {
    return json(400, { message: "Invalid request body" });
  }

  const campaignId = String(payload.campaignId || "").trim();
  const contribution = Math.max(0, Math.round(Number(payload.contribution || 0) * 100));
  const tlwlSupport = Math.max(0, Math.round(Number(payload.tlwlSupport || 0) * 100));

  if (contribution < 100 && tlwlSupport < 100) {
    return json(400, { message: "Minimum checkout amount is $1.00." });
  }

  let campaign = null;
  if (contribution > 0) {
    if (!campaignId) {
      return json(400, { message: "Please choose a verified campaign before contributing to a story." });
    }

    const { configured } = getSupabaseConfig();
    if (!configured) {
      return json(400, {
        message: "Campaign contributions are not active yet. Connect Supabase and verify the campaign before opening contributions."
      });
    }

    try {
      const campaigns = await supabaseRequest("campaigns", {
        query: [
          "select=id,title,status,verification_status,report_status,contributions_paused",
          `id=eq.${encodeURIComponent(campaignId)}`,
          "limit=1"
        ].join("&")
      });
      campaign = campaigns[0];
    } catch (error) {
      return json(400, { message: "Could not verify this campaign before checkout." });
    }

    if (!campaign || !canAcceptContributions(campaign)) {
      return json(400, {
        message: "This campaign is not open for contributions yet. TLWL must verify it first, and contributions may be paused during review."
      });
    }
  }

  const params = new URLSearchParams();
  params.append("mode", "payment");
  params.append("success_url", `${siteUrl}/success.html?session_id={CHECKOUT_SESSION_ID}`);
  params.append("cancel_url", `${siteUrl}/cancel.html`);
  if (campaignId) params.append("metadata[campaign_id]", campaignId);
  params.append("metadata[platform]", "TLWL");
  params.append("metadata[payment_type]", contribution > 0 ? "campaign_contribution" : "tlwl_support");

  let index = 0;
  if (contribution > 0) {
    params.append(`line_items[${index}][quantity]`, "1");
    params.append(`line_items[${index}][price_data][currency]`, "usd");
    params.append(`line_items[${index}][price_data][unit_amount]`, String(contribution));
    params.append(`line_items[${index}][price_data][product_data][name]`, "Contribute to this story");
    params.append(`line_items[${index}][price_data][product_data][description]`, campaign?.title ? `Support for: ${campaign.title}` : `Support for campaign: ${campaignId}`);
    index++;
  }

  if (tlwlSupport > 0) {
    params.append(`line_items[${index}][quantity]`, "1");
    params.append(`line_items[${index}][price_data][currency]`, "usd");
    params.append(`line_items[${index}][price_data][unit_amount]`, String(tlwlSupport));
    params.append(`line_items[${index}][price_data][product_data][name]`, "Donate to TLWL");
    params.append(`line_items[${index}][price_data][product_data][description]`, "Support to help keep The Life We Live going.");
  }

  try {
    const stripeResponse = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${stripeSecretKey}`,
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: params
    });

    const session = await stripeResponse.json();

    if (!stripeResponse.ok) {
      return json(400, { message: session.error?.message || "Stripe checkout error" });
    }

    return json(200, { url: session.url });
  } catch (error) {
    return json(500, { message: "Could not create checkout session." });
  }
};
