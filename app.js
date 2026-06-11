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

const featuredStory = {
  videoLabel: "Featured Story Film Coming Soon",
  videoEmbedHtml: "",
  videoKicker: "World of Stories",
  videoDescription: "Feature interviews, campaign updates, and real community moments in this cinematic space.",
  tag: "Featured Story",
  title: "A library of real lives, real experiences, and real support.",
  description: "Add your YouTube, Vimeo, Instagram, or uploaded video embed here. This section is designed for a main interview, campaign story, or documentary-style feature that helps people understand the person behind the need.",
  actionLabel: "Share Your Story",
  actionHref: "#share-story"
};

const worldStoryNodes = [
  { label: "Education" },
  { label: "Family" },
  { label: "Recovery" },
  { label: "Community" },
  { label: "New Beginning" }
];

const worldStoryCards = [
  {
    label: "Education",
    text: "A student working toward the next chapter."
  },
  {
    label: "Family",
    text: "A household looking for stability and support."
  },
  {
    label: "Community",
    text: "A local need connected to people who care."
  }
];

const storyItems = [
  {
    type: "Video",
    thumbClass: "gradient-one",
    label: "Interview",
    title: "Community Spotlight",
    description: "Highlight a student, family, creator, or leader making progress through adversity.",
    note: "Video feature"
  },
  {
    type: "Story",
    thumbClass: "gradient-two",
    label: "Written Feature",
    title: "Personal Journey",
    description: "Share written stories that explain the person, their challenge, and their goal.",
    note: "Story profile"
  },
  {
    type: "Update",
    thumbClass: "gradient-three",
    label: "Impact Update",
    title: "Where the Support Went",
    description: "After campaigns close, post updates showing how contributions helped.",
    note: "Trust update"
  }
];

const money = (value) => {
  const number = Number(value || 0);
  return number.toLocaleString("en-US", { style: "currency", currency: "USD" });
};

let cloudinaryUploadConfig = null;

const menuToggle = document.getElementById("menuToggle");
const navLinks = document.getElementById("navLinks");
if (menuToggle) {
  menuToggle.addEventListener("click", () => navLinks.classList.toggle("open"));
}

async function loadCampaigns() {
  try {
    const response = await fetch("/api/get-campaigns");
    if (!response.ok) throw new Error("Campaign API unavailable");
    const data = await response.json();
    return data.campaigns && data.campaigns.length ? data.campaigns : fallbackCampaigns;
  } catch (error) {
    return fallbackCampaigns;
  }
}

function renderCampaigns(campaigns) {
  const list = document.getElementById("campaignList");
  const select = document.getElementById("campaignSelect");
  if (!list || !select) return;

  list.innerHTML = "";
  select.innerHTML = "";
  let openCampaigns = 0;

  campaigns.forEach((campaign) => {
    const percent = campaign.goal > 0 ? Math.min(100, Math.round((campaign.raised / campaign.goal) * 100)) : 0;
    const canContribute = campaign.canContribute === true;
    const reportStatus = campaign.reportStatus || campaign.report_status || "no_reports";
    const campaignUrl = `campaign.html?id=${encodeURIComponent(campaign.id)}`;

    const article = document.createElement("article");
    article.className = "campaign-card";
    article.innerHTML = `
      <div>
        <span class="status-pill">${campaign.status || "Active"}</span>
        <h3>${campaign.title}</h3>
        <p>${campaign.story}</p>

        <div class="progress-info">
          <span>${money(campaign.raised)} raised</span>
          <span>${money(campaign.goal)} goal</span>
          <span>${campaign.donors || 0} supporters</span>
        </div>
        <div class="progress-bar">
          <div class="progress" style="width: ${percent}%"></div>
        </div>
      </div>

      <div class="campaign-details">
        <h4>How funds may be used:</h4>
        <ul>${(campaign.uses || []).map(item => `<li>${item}</li>`).join("")}</ul>
        ${reportStatus === "under_review" || reportStatus === "paused" ? `<p class="status-note">Under Review: contributions are paused while TLWL reviews this campaign.</p>` : ""}
        ${canContribute
          ? `<a href="#contribute" class="btn primary" data-campaign-link="${campaign.id}">Contribute to this story</a>`
          : `<p class="status-note">Contributions open after TLWL verification.</p>`
        }
        <a href="${campaignUrl}" class="text-link">View campaign page</a>
        <div class="campaign-safety-note">
          <span>Have a concern about this story?</span>
          <button type="button" class="safety-link report-link" data-report-target-type="campaign" data-report-target-id="${campaign.id}">Report it here.</button>
        </div>
      </div>
    `;

    list.appendChild(article);

    if (canContribute) {
      const option = document.createElement("option");
      option.value = campaign.id;
      option.textContent = campaign.title;
      select.appendChild(option);
      openCampaigns++;
    }
  });

  if (!openCampaigns) {
    const option = document.createElement("option");
    option.value = "";
    option.textContent = "No campaigns are accepting contributions yet";
    select.appendChild(option);
  }

  const requestedCampaign = new URLSearchParams(window.location.search).get("campaign");
  if (requestedCampaign && Array.from(select.options).some((option) => option.value === requestedCampaign)) {
    select.value = requestedCampaign;
  }

  document.querySelectorAll("[data-campaign-link]").forEach((link) => {
    link.addEventListener("click", () => {
      select.value = link.dataset.campaignLink;
    });
  });

  setupReportPrefill();
}

function renderWorldStories() {
  const nodeList = document.getElementById("worldStoryNodes");
  const cardList = document.getElementById("worldStoryCards");

  if (nodeList) {
    nodeList.innerHTML = worldStoryNodes.map((node) => (
      `<span class="world-node" data-label="${node.label}" aria-label="${node.label} story node"></span>`
    )).join("");
  }

  if (cardList) {
    cardList.innerHTML = worldStoryCards.map((card) => `
      <article class="world-story-card">
        <span>${card.label}</span>
        <p>${card.text}</p>
      </article>
    `).join("");
  }
}

function renderStories() {
  const featured = document.getElementById("featuredStory");
  const library = document.getElementById("storyLibrary");

  if (featured) {
    const videoMarkup = featuredStory.videoEmbedHtml
      ? featuredStory.videoEmbedHtml
      : `
        <div class="video-placeholder">
          <span>${featuredStory.videoKicker}</span>
          <div class="play-circle">&#9658;</div>
          <h3>${featuredStory.videoLabel}</h3>
          <p>${featuredStory.videoDescription}</p>
        </div>
      `;

    featured.innerHTML = `
      <div class="video-frame${featuredStory.videoEmbedHtml ? " has-embed" : ""}">
        ${videoMarkup}
      </div>
      <div class="featured-story-copy">
        <p class="tag">${featuredStory.tag}</p>
        <h3>${featuredStory.title}</h3>
        <p>${featuredStory.description}</p>
        <a href="${featuredStory.actionHref}" class="btn primary">${featuredStory.actionLabel}</a>
      </div>
    `;
  }

  if (library) {
    library.innerHTML = storyItems.map((item) => `
      <article class="story-tile">
        <div class="story-thumb ${item.thumbClass}"><span>${item.type}</span></div>
        <div>
          <p class="mini-label">${item.label}</p>
          <h3>${item.title}</h3>
          <p>${item.description}</p>
          <span class="story-note">${item.note}</span>
        </div>
      </article>
    `).join("");
  }
}

function setupAmounts() {
  document.querySelectorAll(".amount-grid").forEach((grid) => {
    grid.addEventListener("click", (event) => {
      const button = event.target.closest("button[data-value]");
      if (!button) return;
      const targetId = grid.dataset.target;
      const input = document.getElementById(targetId);
      if (!input) return;

      grid.querySelectorAll("button").forEach(btn => btn.classList.remove("active"));
      button.classList.add("active");
      input.value = button.dataset.value;
      updateSummary();
    });
  });

  ["contributionAmount", "tlwlSupportAmount"].forEach((id) => {
    const input = document.getElementById(id);
    if (input) input.addEventListener("input", updateSummary);
  });
}

function updateSummary() {
  const contribution = Number(document.getElementById("contributionAmount")?.value || 0);
  const support = Number(document.getElementById("tlwlSupportAmount")?.value || 0);
  document.getElementById("summaryContribution").textContent = money(contribution);
  document.getElementById("summarySupport").textContent = money(support);
  document.getElementById("summaryTotal").textContent = money(contribution + support);
}

function setupCheckout() {
  const button = document.getElementById("checkoutButton");
  const message = document.getElementById("checkoutMessage");

  if (!button) return;

  button.addEventListener("click", async () => {
    const campaignId = document.getElementById("campaignSelect").value;
    const contribution = Number(document.getElementById("contributionAmount").value || 0);
    const tlwlSupport = Number(document.getElementById("tlwlSupportAmount").value || 0);

    if (contribution < 1 && tlwlSupport < 1) {
      message.textContent = "Please enter a campaign contribution or TLWL support amount before continuing.";
      return;
    }

    if (contribution > 0 && !campaignId) {
      message.textContent = "No campaign is accepting contributions yet. You can still add TLWL support if you want to help keep The Life We Live going.";
      return;
    }

    message.textContent = "Preparing secure checkout...";

    try {
      const response = await fetch("/api/create-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ campaignId, contribution, tlwlSupport })
      });

      const data = await response.json();

      if (data.url) {
        window.location.href = data.url;
        return;
      }

      message.textContent = data.message || "Stripe checkout is not active yet. Add your Stripe key and enable checkout in Netlify environment variables when ready.";
    } catch (error) {
      message.textContent = "Checkout backend is not active yet. Deploy with Netlify Functions, add Stripe keys, and enable checkout when ready.";
    }
  });
}

function setUploadStatus(form, message) {
  const status = form.querySelector("[data-upload-status]");
  if (status) status.textContent = message;
}

async function loadUploadConfig() {
  try {
    const response = await fetch("/api/get-upload-config");
    const data = await response.json();
    cloudinaryUploadConfig = data.configured ? data : null;
  } catch (error) {
    cloudinaryUploadConfig = null;
  }
}

function setUploadField(form, name, value) {
  const field = form.elements[name];
  if (field) field.value = value || "";
}

function applyUploadResult(form, kind, info) {
  if (kind === "video") {
    setUploadField(form, "video_url", info.secure_url);
    setUploadField(form, "video_public_id", info.public_id);
    setUploadField(form, "video_thumbnail_url", info.thumbnail_url);
    setUploadField(form, "video_resource_type", info.resource_type || "video");
    setUploadStatus(form, "Video uploaded. You can submit when the rest of the form is complete.");
    return;
  }

  setUploadField(form, "supporting_file_url", info.secure_url);
  setUploadField(form, "supporting_file_public_id", info.public_id);
  setUploadField(form, "supporting_file_type", info.resource_type || "auto");
  setUploadStatus(form, "Supporting media uploaded. You can submit when the rest of the form is complete.");
}

function setupCloudinaryUploads() {
  document.querySelectorAll(".upload-trigger").forEach((button) => {
    button.addEventListener("click", async () => {
      const form = button.closest("form");
      if (!form) return;

      if (!cloudinaryUploadConfig) {
        await loadUploadConfig();
      }

      if (!cloudinaryUploadConfig || !window.cloudinary) {
        setUploadStatus(form, "Direct upload is not configured yet. Paste a video link for now.");
        return;
      }

      const kind = button.dataset.uploadKind || "video";
      const widget = window.cloudinary.createUploadWidget({
        cloudName: cloudinaryUploadConfig.cloudName,
        uploadPreset: cloudinaryUploadConfig.uploadPreset,
        folder: cloudinaryUploadConfig.folder,
        multiple: false,
        resourceType: kind === "video" ? "video" : "auto",
        sources: ["local", "camera", "url"],
        clientAllowedFormats: kind === "video"
          ? ["mp4", "mov", "webm", "m4v"]
          : ["jpg", "jpeg", "png", "pdf", "webp"],
        maxFileSize: cloudinaryUploadConfig.maxFileSize
      }, (error, result) => {
        if (error) {
          setUploadStatus(form, "Upload could not finish. Please try again or paste a link.");
          return;
        }

        if (result.event === "success") {
          applyUploadResult(form, kind, result.info);
        }
      });

      widget.open();
    });
  });
}

function formPayload(form) {
  const data = new FormData(form);
  return Array.from(data.entries()).reduce((payload, [key, value]) => {
    if (key !== "bot-field" && key !== "form-name") {
      payload[key] = value;
    }
    return payload;
  }, {});
}

function nativeSubmit(form) {
  form.dataset.platformSubmitting = "native";
  HTMLFormElement.prototype.submit.call(form);
}

function setupPlatformForms() {
  document.querySelectorAll("[data-platform-form]").forEach((form) => {
    form.addEventListener("submit", async (event) => {
      if (form.dataset.platformSubmitting === "native") return;

      event.preventDefault();
      const formType = form.dataset.platformForm;
      const endpoint = formType === "report" ? "/api/submit-report" : "/api/submit-story";
      const status = form.querySelector("[data-form-status]");
      const submitButton = form.querySelector("button[type='submit']");

      if (status) status.textContent = "Submitting for TLWL review...";
      if (submitButton) submitButton.disabled = true;

      try {
        const response = await fetch(endpoint, {
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

        if (!response.ok) {
          throw new Error(data.message || "Submission could not be saved.");
        }

        if (status) status.textContent = data.message || "Submitted for TLWL review.";
        window.location.href = "thanks.html";
      } catch (error) {
        if (status) status.textContent = `${error.message} Continuing through Netlify Forms.`;
        nativeSubmit(form);
      } finally {
        if (submitButton) submitButton.disabled = false;
      }
    });
  });
}

function setupReportPrefill() {
  document.querySelectorAll(".report-link").forEach((button) => {
    if (button.dataset.reportReady === "true") return;
    button.dataset.reportReady = "true";

    button.addEventListener("click", () => {
      const form = document.querySelector("[data-platform-form='report']");
      if (!form) return;
      const typeField = form.elements["target_type"];
      const idField = form.elements["target_id"];
      if (typeField) typeField.value = button.dataset.reportTargetType || "story";
      if (idField) idField.value = button.dataset.reportTargetId || "";
      document.getElementById("report-content")?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  });
}

renderWorldStories();
renderStories();
loadCampaigns().then(renderCampaigns);
setupAmounts();
setupCheckout();
setupCloudinaryUploads();
setupPlatformForms();
updateSummary();
