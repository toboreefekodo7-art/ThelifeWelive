exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: "Method not allowed" })
    };
  }

  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
  const siteUrl = process.env.SITE_URL || process.env.URL || "http://localhost:8888";

  if (!stripeSecretKey) {
    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: "Stripe is not connected yet. Add STRIPE_SECRET_KEY and SITE_URL in Netlify environment variables."
      })
    };
  }

  let payload;
  try {
    payload = JSON.parse(event.body || "{}");
  } catch (error) {
    return {
      statusCode: 400,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: "Invalid request body" })
    };
  }

  const campaignId = String(payload.campaignId || "first-campaign");
  const contribution = Math.max(0, Math.round(Number(payload.contribution || 0) * 100));
  const tlwlSupport = Math.max(0, Math.round(Number(payload.tlwlSupport || 0) * 100));

  if (contribution < 100 && tlwlSupport < 100) {
    return {
      statusCode: 400,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: "Minimum checkout amount is $1.00." })
    };
  }

  const params = new URLSearchParams();
  params.append("mode", "payment");
  params.append("success_url", `${siteUrl}/success.html?session_id={CHECKOUT_SESSION_ID}`);
  params.append("cancel_url", `${siteUrl}/cancel.html`);
  params.append("metadata[campaign_id]", campaignId);
  params.append("metadata[platform]", "TLWL");

  let index = 0;
  if (contribution > 0) {
    params.append(`line_items[${index}][quantity]`, "1");
    params.append(`line_items[${index}][price_data][currency]`, "usd");
    params.append(`line_items[${index}][price_data][unit_amount]`, String(contribution));
    params.append(`line_items[${index}][price_data][product_data][name]`, "TLWL Campaign Contribution");
    params.append(`line_items[${index}][price_data][product_data][description]`, `Support for campaign: ${campaignId}`);
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
      return {
        statusCode: 400,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: session.error?.message || "Stripe checkout error" })
      };
    }

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: session.url })
    };
  } catch (error) {
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: "Could not create checkout session." })
    };
  }
};
