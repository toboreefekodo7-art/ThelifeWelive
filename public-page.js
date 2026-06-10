const params = new URLSearchParams(window.location.search);
const pageType = document.body.dataset.pageType;
const content = document.getElementById("publicContent");

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

const getLookup = () => {
  const id = params.get("id");
  const slug = params.get("slug");
  return id ? `id=${encodeURIComponent(id)}` : `slug=${encodeURIComponent(slug || "")}`;
};

const setReportTarget = (id) => {
  document.querySelectorAll("[data-report-target-id]").forEach((input) => {
    input.value = id || "";
  });
};

const statusLabel = (status, reportStatus, paused) => {
  if (reportStatus === "under_review" || reportStatus === "paused" || paused) return "Under Review";
  return String(status || "Pending").replace(/_/g, " ");
};

async function loadPublicRecord() {
  if (!content) return;
  const lookup = getLookup();
  const endpoint = pageType === "campaign" ? `/api/get-campaign?${lookup}` : `/api/get-story?${lookup}`;

  try {
    const response = await fetch(endpoint);
    const data = await response.json();
    const record = pageType === "campaign" ? data.campaign : data.story;

    if (!record) {
      content.innerHTML = `
        <p class="section-label">TLWL ${pageType}</p>
        <h1>This ${pageType} is not published yet.</h1>
        <p>Approved TLWL stories and verified campaigns will appear here after review.</p>
      `;
      return;
    }

    setReportTarget(record.id);
    if (pageType === "campaign") {
      renderCampaign(record, data.platformActive);
    } else {
      renderStory(record, data.platformActive);
    }
  } catch (error) {
    content.innerHTML = `
      <p class="section-label">TLWL ${pageType}</p>
      <h1>This page is not available yet.</h1>
      <p>Try again later after the TLWL platform database is connected.</p>
    `;
  }
}

function renderStory(story, platformActive) {
  const campaign = Array.isArray(story.campaigns) ? story.campaigns[0] : null;
  content.innerHTML = `
    <p class="section-label">${escapeHtml(story.category || "Story")}</p>
    <h1>${escapeHtml(story.title)}</h1>
    <div class="public-meta">
      <span>${escapeHtml(statusLabel(story.status, story.report_status))}</span>
      <span>${platformActive ? "Published story" : "Preview placeholder"}</span>
    </div>
    ${story.video_url ? `<a class="video-link" href="${escapeHtml(story.video_url)}" target="_blank" rel="noopener">Watch video</a>` : ""}
    <p>${escapeHtml(story.story_body)}</p>
    ${campaign ? `<a class="btn primary" href="campaign.html?id=${encodeURIComponent(campaign.id)}">View related campaign</a>` : ""}
    <p class="legal-note dark">TLWL is a for-profit social impact platform. Contributions and TLWL support payments are not tax-deductible charitable donations unless specifically stated otherwise.</p>
  `;
}

function renderCampaign(campaign, platformActive) {
  const status = statusLabel(campaign.status, campaign.report_status, campaign.contributions_paused);
  const story = campaign.stories || {};
  const disabled = !campaign.canContribute;

  content.innerHTML = `
    <p class="section-label">Campaign</p>
    <h1>${escapeHtml(campaign.title)}</h1>
    <div class="public-meta">
      <span>${escapeHtml(status)}</span>
      <span>${platformActive ? "Verified campaign page" : "Preview placeholder"}</span>
    </div>
    <div class="campaign-meter">
      <p><strong>${money(campaign.amount_raised)}</strong> raised of ${money(campaign.goal_amount)}</p>
      <div class="progress-bar"><div class="progress" style="width: ${Math.min(100, Math.round((Number(campaign.amount_raised || 0) / Number(campaign.goal_amount || 1)) * 100))}%"></div></div>
      <p>${Number(campaign.supporter_count || 0)} supporters</p>
    </div>
    ${status === "Under Review" ? `<p class="status-note">Under Review: contributions are paused while TLWL reviews this campaign.</p>` : ""}
    <p>${escapeHtml(campaign.fund_use_description || story.story_body || "Campaign details will appear here after TLWL review.")}</p>
    ${story.video_url ? `<a class="video-link" href="${escapeHtml(story.video_url)}" target="_blank" rel="noopener">Watch story video</a>` : ""}
    ${disabled
      ? `<button class="btn secondary" type="button" disabled>Contributions not open yet</button>`
      : `<a class="btn primary" href="index.html#contribute">Contribute to this story</a>`
    }
    <div class="updates-list">
      <h2>Updates</h2>
      ${(campaign.updates || []).length
        ? campaign.updates.map((update) => `<article><h3>${escapeHtml(update.title)}</h3><p>${escapeHtml(update.body)}</p></article>`).join("")
        : "<p>No public updates have been posted yet.</p>"
      }
    </div>
    <p class="legal-note dark">Contribution Notice: TLWL is a for-profit social impact platform. Contributions and TLWL support payments are not tax-deductible charitable donations unless specifically stated otherwise.</p>
  `;
}

function formPayload(form) {
  const data = new FormData(form);
  return Array.from(data.entries()).reduce((payload, [key, value]) => {
    if (key !== "bot-field" && key !== "form-name") payload[key] = value;
    return payload;
  }, {});
}

function nativeSubmit(form) {
  form.dataset.platformSubmitting = "native";
  HTMLFormElement.prototype.submit.call(form);
}

function setupReportForms() {
  document.querySelectorAll("[data-platform-form='report']").forEach((form) => {
    form.addEventListener("submit", async (event) => {
      if (form.dataset.platformSubmitting === "native") return;
      event.preventDefault();

      const status = form.querySelector("[data-form-status]");
      const submitButton = form.querySelector("button[type='submit']");
      if (status) status.textContent = "Submitting report for TLWL review...";
      if (submitButton) submitButton.disabled = true;

      try {
        const response = await fetch("/api/submit-report", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formPayload(form))
        });
        const data = await response.json();

        if (data.platformActive === false) {
          if (status) status.textContent = data.message || "Continuing through Netlify Forms...";
          nativeSubmit(form);
          return;
        }

        if (!response.ok) throw new Error(data.message || "Report could not be saved.");
        if (status) status.textContent = data.message || "Report submitted for TLWL review.";
      } catch (error) {
        if (status) status.textContent = `${error.message} Continuing through Netlify Forms.`;
        nativeSubmit(form);
      } finally {
        if (submitButton) submitButton.disabled = false;
      }
    });
  });
}

loadPublicRecord();
setupReportForms();
