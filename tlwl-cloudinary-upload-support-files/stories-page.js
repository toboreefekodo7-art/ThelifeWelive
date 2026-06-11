const storiesGrid = document.getElementById("storiesGrid");

const money = (value) => Number(value || 0).toLocaleString("en-US", {
  style: "currency",
  currency: "USD"
});

const escapeHtml = (value) => String(value || "")
  .replace(/&/g, "&amp;")
  .replace(/</g, "&lt;")
  .replace(/>/g, "&gt;")
  .replace(/"/g, "&quot;")
  .replace(/'/g, "&#039;");

const excerpt = (value, length = 170) => {
  const text = String(value || "").trim();
  return text.length > length ? `${text.slice(0, length).trim()}...` : text;
};

const statusLabel = (story) => {
  const campaign = story.campaign || story.campaigns?.[0];
  if (!campaign) return "Story only";
  if (campaign.review_status === "under_review" || campaign.contributions_paused) return "Under Review";
  if (campaign.canContribute) return "Accepting contributions";
  return "Campaign public";
};

const storyUrl = (story) => (
  story.slug ? `story.html?slug=${encodeURIComponent(story.slug)}` : `story.html?id=${encodeURIComponent(story.id)}`
);

const campaignUrl = (campaign) => (
  campaign?.slug ? `campaign.html?slug=${encodeURIComponent(campaign.slug)}` : `campaign.html?id=${encodeURIComponent(campaign?.id || "")}`
);

function renderMedia(story) {
  const assets = Array.isArray(story.media_assets) ? story.media_assets : [];
  const videoAsset = assets.find((asset) => asset.asset_type === "video" && asset.url);
  const photoAsset = assets.find((asset) => (asset.asset_type === "photo" || asset.resource_type === "image") && asset.url);
  const thumb = story.video_thumbnail_url || videoAsset?.thumbnail_url || story.thumbnail_url || photoAsset?.thumbnail_url || photoAsset?.url;
  const hasVideo = Boolean(story.video_url || videoAsset?.url);

  if (thumb) {
    return `
      <div class="library-video-preview" style="background-image: url('${escapeHtml(thumb)}')">
        ${hasVideo ? `<span class="play-circle small">&#9658;</span>` : `<span class="mini-label">Photo Story</span>`}
      </div>
    `;
  }

  if (hasVideo) {
    return `
      <div class="library-video-preview">
        <span class="mini-label">Video Story</span>
        <span class="play-circle small">&#9658;</span>
      </div>
    `;
  }

  return `
    <div class="library-video-preview no-video">
      <span class="mini-label">Story</span>
      <p>Video preview coming soon</p>
    </div>
  `;
}

function renderStories(stories) {
  if (!storiesGrid) return;

  if (!stories.length) {
    storiesGrid.innerHTML = `
      <div class="loading-card">
        <h3>No public stories yet</h3>
        <p>Approved public stories will appear here after TLWL connects Supabase and publishes the first stories.</p>
        <a class="btn primary" href="index.html#share-story">Share Your Story</a>
      </div>
    `;
    return;
  }

  storiesGrid.innerHTML = stories.map((story) => {
    const campaign = story.campaign || story.campaigns?.[0] || null;
    return `
      <article class="library-story-card">
        ${renderMedia(story)}
        <div class="library-story-body">
          <div class="public-meta">
            <span>${escapeHtml(story.category || "Story")}</span>
            <span>${escapeHtml(statusLabel(story))}</span>
          </div>
          <h3>${escapeHtml(story.title)}</h3>
          <p>${escapeHtml(story.short_description || excerpt(story.story_body))}</p>
          ${campaign ? `
            <div class="campaign-mini-meter">
              <span>${money(campaign.amount_raised)} raised</span>
              <span>${money(campaign.goal_amount)} goal</span>
            </div>
          ` : ""}
          <div class="library-card-actions">
            <a class="btn primary" href="${storyUrl(story)}">Watch/read full story</a>
            ${campaign?.canContribute
              ? `<a class="btn secondary dark-secondary" href="${campaignUrl(campaign)}">Contribute to this story</a>`
              : ""
            }
          </div>
        </div>
      </article>
    `;
  }).join("");
}

async function loadStories() {
  if (!storiesGrid) return;

  try {
    const response = await fetch("/api/get-stories");
    const data = await response.json();
    renderStories(data.stories || []);
  } catch (error) {
    storiesGrid.innerHTML = `
      <div class="loading-card">
        <h3>Stories are not available yet</h3>
        <p>Try again after the TLWL platform database is connected.</p>
      </div>
    `;
  }
}

loadStories();
