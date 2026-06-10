const fallbackCampaigns = [
  {
    id: "first-campaign",
    title: "First TLWL Campaign Coming Soon",
    status: "Launching Soon",
    story: "This campaign area can be used to raise support for a student, family, scholarship, emergency need, or community initiative.",
    goal: 1000,
    raised: 0,
    donors: 0,
    uses: [
      "Direct support to the approved recipient",
      "Scholarship or educational expenses",
      "Community impact initiatives",
      "Verified emergency assistance"
    ]
  }
];

const featuredStory = {
  videoLabel: "Featured Video Coming Soon",
  videoEmbedHtml: "",
  tag: "Featured Story",
  title: "The first full TLWL story will live here.",
  description: "Add your YouTube, Vimeo, Instagram, or uploaded video embed here. This section is built for a main interview or documentary-style story with a clear call to action.",
  actionLabel: "Share Your Story",
  actionHref: "#share-story"
};

const storyItems = [
  {
    type: "Video",
    thumbClass: "gradient-one",
    label: "Interview",
    title: "Community Spotlight",
    description: "Highlight a student, family, creator, or leader making progress through adversity."
  },
  {
    type: "Story",
    thumbClass: "gradient-two",
    label: "Written Feature",
    title: "Personal Journey",
    description: "Share written stories that explain the person, their challenge, and their goal."
  },
  {
    type: "Update",
    thumbClass: "gradient-three",
    label: "Impact Update",
    title: "Where Support Went",
    description: "After campaigns close, post updates showing how contributions helped."
  }
];

const money = (value) => {
  const number = Number(value || 0);
  return number.toLocaleString("en-US", { style: "currency", currency: "USD" });
};

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

  campaigns.forEach((campaign) => {
    const percent = campaign.goal > 0 ? Math.min(100, Math.round((campaign.raised / campaign.goal) * 100)) : 0;

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
        <a href="#contribute" class="btn primary" data-campaign-link="${campaign.id}">Support This Campaign</a>
      </div>
    `;

    list.appendChild(article);

    const option = document.createElement("option");
    option.value = campaign.id;
    option.textContent = campaign.title;
    select.appendChild(option);
  });

  document.querySelectorAll("[data-campaign-link]").forEach((link) => {
    link.addEventListener("click", () => {
      select.value = link.dataset.campaignLink;
    });
  });
}

function renderStories() {
  const featured = document.getElementById("featuredStory");
  const library = document.getElementById("storyLibrary");

  if (featured) {
    const videoMarkup = featuredStory.videoEmbedHtml
      ? featuredStory.videoEmbedHtml
      : `<div class="play-circle">&#9658;</div><p>${featuredStory.videoLabel}</p>`;

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

renderStories();
loadCampaigns().then(renderCampaigns);
setupAmounts();
setupCheckout();
updateSummary();
