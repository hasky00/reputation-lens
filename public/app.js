if (typeof document !== "undefined") {
const profiles = {
  signal_scout: {
    name: "Maya Chen",
    handle: "signal_scout",
    initials: "MC",
    bio: "Market researcher tracking AI infra, public datasets, and founder signals.",
    followers: "18.4K",
    age: "6.8y",
    postRate: "9/day",
    score: 22,
    confidence: "82%",
    risks: [
      ["Medium link density", "Links appear in 38% of recent posts, mostly to known research sources.", "warn"],
      ["Reply velocity spike", "One unusually active reply window after a funding announcement.", "warn"],
    ],
    trusts: [
      ["Stable identity", "Name, bio, and topic focus have been consistent across recent checks."],
      ["Organic engagement", "Replies show varied participants and topic-specific discussion."],
      ["Source diversity", "Shared links point to a mix of docs, filings, essays, and datasets."],
      ["Network overlap", "Followed by several accounts already marked trusted."],
      ["Low duplication", "Recent posts do not repeat the same promotional phrasing."],
    ],
    evidence: [
      ["Today", "Thread on GPU supply constraints received specialist replies.", "Context"],
      ["2d ago", "Shared public benchmark dataset with attribution.", "Source"],
      ["9d ago", "Profile changes limited to pinned post refresh.", "Profile"],
    ],
    recommendation: "Safe to read and follow. Verify claims before using as source material.",
  },
  growth_drop: {
    name: "Growth Drop",
    handle: "growth_drop",
    initials: "GD",
    bio: "Daily growth hacks, viral templates, startup giveaways, and launch shortcuts.",
    followers: "41.2K",
    age: "1.4y",
    postRate: "64/day",
    score: 57,
    confidence: "74%",
    risks: [
      ["High posting velocity", "Recent activity is far above the normal range for a solo account.", "warn"],
      ["Repeated templates", "Multiple posts reuse near-identical hooks and calls to action.", "warn"],
      ["Engagement mismatch", "Large follower count with uneven reply depth on promotional posts.", "warn"],
      ["Link clustering", "Recent links concentrate around two landing pages.", "danger"],
    ],
    trusts: [
      ["Account history present", "The account is not newly created."],
      ["Some real replies", "Several replies include specific, non-template exchanges."],
      ["Clear commercial intent", "The account's promotional posture is visible rather than hidden."],
    ],
    evidence: [
      ["Today", "Eight posts used the same giveaway call to action.", "Pattern"],
      ["1d ago", "Follower growth rose faster than engagement quality.", "Metric"],
      ["6d ago", "Several replies requested payment details off-platform.", "Review"],
    ],
    recommendation: "Read with caution. Avoid payments, credentials, or private details until independently verified.",
  },
  grant_alerts_ai: {
    name: "Grant Alerts AI",
    handle: "grant_alerts_ai",
    initials: "GA",
    bio: "Instant grants for founders. DM now. Limited slots. Guaranteed approvals.",
    followers: "7.8K",
    age: "28d",
    postRate: "112/day",
    score: 84,
    confidence: "88%",
    risks: [
      ["New account", "The profile has limited history and no durable identity trail.", "danger"],
      ["Excessive velocity", "Posting cadence suggests automation or coordinated scheduling.", "danger"],
      ["Financial promise language", "Recent posts imply guaranteed outcomes and urgency.", "danger"],
      ["DM funnel pressure", "Calls to action repeatedly move users into private messages.", "danger"],
      ["Low-context engagement", "Replies are repetitive and do not address specific questions.", "warn"],
    ],
    trusts: [["Public profile data exists", "The account can be reviewed against visible public activity."]],
    evidence: [
      ["Today", "Repeated 'guaranteed approval' phrasing across posts.", "Claim"],
      ["Today", "Multiple replies push users to DM before sharing eligibility details.", "Pattern"],
      ["3d ago", "Handle and display name changed during active campaign.", "Profile"],
    ],
    recommendation: "Do not share personal, payment, or company documents. Require external verification first.",
  },
};

const fallbackProfile = {
  name: "Unknown Account",
  handle: "new_handle",
  initials: "??",
  bio: "No cached profile available. Live API lookup would populate this panel.",
  followers: "-",
  age: "-",
  postRate: "-",
  score: 49,
  confidence: "51%",
  risks: [["Insufficient data", "Risk cannot be assessed confidently without recent activity.", "warn"]],
  trusts: [["Manual review ready", "The account can be scanned once X API credentials are connected."]],
  evidence: [["Now", "No local demo record matched this handle.", "Lookup"]],
  recommendation: "Review manually before following, replying, or moving into DMs.",
};

const els = {
  form: document.querySelector("#lookupForm"),
  input: document.querySelector("#handleInput"),
  displayName: document.querySelector("#displayName"),
  statusPill: document.querySelector("#statusPill"),
  profileName: document.querySelector("#profileName"),
  profileHandle: document.querySelector("#profileHandle"),
  profileBio: document.querySelector("#profileBio"),
  avatar: document.querySelector("#avatar"),
  followers: document.querySelector("#followers"),
  accountAge: document.querySelector("#accountAge"),
  postRate: document.querySelector("#postRate"),
  scoreRing: document.querySelector("#scoreRing"),
  riskScore: document.querySelector("#riskScore"),
  riskTitle: document.querySelector("#riskTitle"),
  riskCopy: document.querySelector("#riskCopy"),
  signalList: document.querySelector("#signalList"),
  trustList: document.querySelector("#trustList"),
  signalCount: document.querySelector("#signalCount"),
  trustCount: document.querySelector("#trustCount"),
  confidence: document.querySelector("#confidence"),
  recommendation: document.querySelector("#recommendation"),
  evidenceList: document.querySelector("#evidenceList"),
  toast: document.querySelector("#toast"),
  copyBrief: document.querySelector("#copyBrief"),
  markReviewed: document.querySelector("#markReviewed"),
};

let currentProfile = profiles.signal_scout;
const scanButton = els.form.querySelector("button");

function classify(score) {
  if (score >= 72) {
    return {
      label: "High risk",
      title: "High risk signal",
      copy: "Multiple public signals suggest extra caution before interacting.",
      color: "var(--red)",
    };
  }

  if (score >= 45) {
    return {
      label: "Elevated risk",
      title: "Elevated risk signal",
      copy: "Some behavior patterns deserve review before trust or transaction.",
      color: "var(--amber)",
    };
  }

  return {
    label: "Low risk",
    title: "Low risk signal",
    copy: "Account behavior looks consistent with a real specialist profile.",
    color: "var(--green)",
  };
}

function cleanHandle(value) {
  return value.trim().replace(/^@/, "").toLowerCase();
}

function renderSignals(target, items) {
  target.innerHTML = "";
  items.forEach(([title, copy, level = "ok"]) => {
    const item = document.createElement("div");
    item.className = `signal ${level}`;
    item.innerHTML = `
      <span class="dot" aria-hidden="true"></span>
      <div>
        <strong>${title}</strong>
        <p>${copy}</p>
      </div>
    `;
    target.append(item);
  });
}

function renderEvidence(items) {
  els.evidenceList.innerHTML = "";
  items.forEach(([time, copy, type]) => {
    const item = document.createElement("div");
    item.className = "evidence";
    item.innerHTML = `
      <time>${time}</time>
      <p>${copy}</p>
      <span>${type}</span>
    `;
    els.evidenceList.append(item);
  });
}

function renderProfile(profile) {
  const risk = classify(profile.score);
  currentProfile = profile;

  els.displayName.textContent = profile.name;
  els.statusPill.textContent = risk.label;
  els.statusPill.style.color = risk.color;
  els.statusPill.style.background = `color-mix(in srgb, ${risk.color} 14%, transparent)`;
  els.profileName.textContent = profile.name;
  els.profileHandle.textContent = `@${profile.handle}`;
  els.profileBio.textContent = profile.bio;
  els.avatar.textContent = profile.initials;
  els.followers.textContent = profile.followers;
  els.accountAge.textContent = profile.age;
  els.postRate.textContent = profile.postRate;
  els.scoreRing.style.setProperty("--score", profile.score);
  els.scoreRing.style.setProperty("--ring-color", risk.color);
  els.riskScore.textContent = profile.score;
  els.riskTitle.textContent = risk.title;
  els.riskCopy.textContent = risk.copy;
  els.signalCount.textContent = `${profile.risks.length} flags`;
  els.trustCount.textContent = `${profile.trusts.length} checks`;
  els.confidence.textContent = profile.confidence;
  els.recommendation.textContent = profile.recommendation;

  renderSignals(els.signalList, profile.risks);
  renderSignals(els.trustList, profile.trusts);
  renderEvidence(profile.evidence);

  document.querySelectorAll(".watch-account").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.handle === profile.handle);
  });
}

function showToast(message) {
  els.toast.textContent = message;
  els.toast.classList.add("is-visible");
  window.setTimeout(() => els.toast.classList.remove("is-visible"), 2200);
}

async function scanHandle(handle) {
  if (window.location.protocol === "file:") {
    return profiles[handle] || { ...fallbackProfile, handle };
  }

  const response = await fetch(`/api/scan?handle=${encodeURIComponent(handle)}`);
  const contentType = response.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) {
    throw new Error("API server is not running");
  }

  const payload = await response.json();

  if (!response.ok) {
    throw new Error(payload.error || "Scan failed");
  }

  return payload.profile;
}

els.form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const handle = cleanHandle(els.input.value);

  scanButton.disabled = true;
  scanButton.textContent = "Scanning";

  try {
    const profile = await scanHandle(handle);
    renderProfile(profile);
    showToast(profile.source === "live" ? "Live X API scan complete" : "Demo scan loaded");
  } catch (error) {
    const profile = profiles[handle] || { ...fallbackProfile, handle };
    renderProfile(profile);
    showToast(`${error.message}. Showing demo fallback.`);
  } finally {
    scanButton.disabled = false;
    scanButton.textContent = "Scan";
  }
});

document.querySelectorAll(".watch-account").forEach((button) => {
  button.addEventListener("click", () => {
    els.input.value = button.dataset.handle;
    renderProfile(profiles[button.dataset.handle]);
  });
});

els.copyBrief.addEventListener("click", async () => {
  const brief = `${currentProfile.name} (@${currentProfile.handle}) risk score: ${currentProfile.score}/100. ${currentProfile.recommendation}`;
  try {
    await navigator.clipboard.writeText(brief);
    showToast("Brief copied");
  } catch {
    showToast(brief);
  }
});

els.markReviewed.addEventListener("click", () => {
  showToast(`${currentProfile.handle} marked reviewed`);
});

renderProfile(currentProfile);
}
