async function scanHandle(handle, bearer) {
  const clean = cleanHandle(handle);

  if (!clean) {
    const error = new Error("Enter an X handle to scan.");
    error.status = 400;
    throw error;
  }

  if (!bearer) {
    const error = new Error("Missing X_BEARER_TOKEN");
    error.status = 503;
    throw error;
  }

  const user = await xFetch(
    `https://api.x.com/2/users/by/username/${encodeURIComponent(clean)}?` +
      new URLSearchParams({
        "user.fields":
          "created_at,description,entities,location,profile_image_url,protected,public_metrics,url,verified,verified_type",
      }),
    bearer,
    "user lookup",
  );

  const tweets = await xFetch(
    `https://api.x.com/2/users/${user.data.id}/tweets?` +
      new URLSearchParams({
        max_results: "50",
        exclude: "retweets,replies",
        "tweet.fields": "created_at,entities,lang,possibly_sensitive,public_metrics,text",
      }),
    bearer,
    "recent posts",
  );

  return buildProfile(user.data, tweets.data || []);
}

async function getUsage(bearer) {
  if (!bearer) {
    const error = new Error("Missing X_BEARER_TOKEN");
    error.status = 503;
    throw error;
  }

  return xFetch("https://api.x.com/2/usage/tweets", bearer, "usage check");
}

async function xFetch(resource, bearer, label) {
  const response = await fetch(resource, {
    headers: {
      Authorization: `Bearer ${bearer}`,
      "User-Agent": "reputation-lens",
    },
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = payload.detail || payload.title || payload.errors?.[0]?.message || "X API request failed";
    const error = new Error(`${label}: ${message}`);
    error.status = response.status;
    error.payload = payload;
    throw error;
  }

  return payload;
}

function buildProfile(user, tweets) {
  const metrics = user.public_metrics || {};
  const createdAt = user.created_at ? new Date(user.created_at) : null;
  const accountAgeDays = createdAt ? Math.max(1, daysBetween(createdAt, new Date())) : null;
  const postRate = accountAgeDays ? Math.round((metrics.tweet_count || 0) / accountAgeDays) : 0;
  const recentDailyRate = estimateRecentDailyRate(tweets);
  const linkRatio = ratio(tweets.filter((tweet) => tweet.entities?.urls?.length).length, tweets.length);
  const duplicateRatio = duplicateHookRatio(tweets);
  const urgencyHits = keywordHits(tweets, [
    "dm me",
    "guaranteed",
    "limited slots",
    "act now",
    "send payment",
    "crypto",
    "airdrop",
    "approval guaranteed",
    "whatsapp",
    "telegram",
  ]);
  const engagementRatio = engagementPerFollower(tweets, metrics.followers_count || 0);

  const risks = [];
  const trusts = [];
  let score = 12;

  if (accountAgeDays !== null && accountAgeDays < 45) {
    score += 24;
    risks.push(["New account", `Created ${formatAge(accountAgeDays)} ago, so history is limited.`, "danger"]);
  } else if (accountAgeDays !== null && accountAgeDays < 180) {
    score += 12;
    risks.push(["Limited history", `Created ${formatAge(accountAgeDays)} ago; review before trusting.`, "warn"]);
  } else if (accountAgeDays !== null) {
    score -= 7;
    trusts.push(["Account history present", `Created ${formatAge(accountAgeDays)} ago.`]);
  }

  if (recentDailyRate > 60 || postRate > 75) {
    score += 22;
    risks.push(["Excessive posting velocity", `Recent activity is about ${recentDailyRate}/day.`, "danger"]);
  } else if (recentDailyRate > 25 || postRate > 35) {
    score += 12;
    risks.push(["High posting velocity", `Recent activity is about ${recentDailyRate}/day.`, "warn"]);
  } else {
    score -= 5;
    trusts.push(["Normal posting cadence", `Recent activity is about ${recentDailyRate}/day.`]);
  }

  if (linkRatio > 0.65) {
    score += 16;
    risks.push(["Heavy link pattern", `${percent(linkRatio)} of recent posts include links.`, "warn"]);
  } else if (linkRatio > 0.35) {
    score += 8;
    risks.push(["Medium link density", `${percent(linkRatio)} of recent posts include links.`, "warn"]);
  } else {
    trusts.push(["Low link pressure", `${percent(linkRatio)} of recent posts include links.`]);
  }

  if (duplicateRatio > 0.28) {
    score += 16;
    risks.push(["Repeated wording", "Recent posts reuse similar opening phrases.", "warn"]);
  } else {
    trusts.push(["Low duplication", "Recent posts do not strongly repeat the same opening patterns."]);
  }

  if (urgencyHits > 2) {
    score += 18;
    risks.push(["Pressure language", "Recent posts include urgency, DM, payment, or guaranteed-outcome wording.", "danger"]);
  }

  if (metrics.followers_count > 5000 && engagementRatio < 0.0008 && tweets.length > 5) {
    score += 10;
    risks.push(["Engagement mismatch", "Follower count is high compared with recent visible engagement.", "warn"]);
  } else if (tweets.length > 5) {
    trusts.push(["Engagement present", "Recent posts show measurable public interaction."]);
  }

  if (user.verified || user.verified_type) {
    score -= 4;
    trusts.push(["Verification marker present", "X reports a verification marker on the public profile."]);
  }

  if (user.description && user.description.length > 25) {
    trusts.push(["Profile context present", "Bio gives enough context for manual review."]);
  } else {
    score += 6;
    risks.push(["Thin profile", "Bio has limited context for manual review.", "warn"]);
  }

  if (accountAgeDays && accountAgeDays > 365 && tweets.length > 15 && urgencyHits === 0) {
    score -= 8;
  }

  score = Math.max(0, Math.min(100, Math.round(score)));

  return {
    source: "live",
    name: user.name || user.username,
    handle: user.username,
    initials: initialsFor(user.name || user.username),
    bio: user.description || "No public bio available.",
    followers: compactNumber(metrics.followers_count || 0),
    age: accountAgeDays ? formatAge(accountAgeDays) : "-",
    postRate: `${recentDailyRate || postRate}/day`,
    score,
    confidence: `${Math.min(92, 48 + Math.min(tweets.length, 40))}%`,
    risks: risks.length ? risks : [["No major public risk pattern", "No strong warning pattern was detected in this scan.", "ok"]],
    trusts: trusts.length ? trusts : [["Public data available", "The profile returned enough public data for review."]],
    evidence: buildEvidence(user, tweets, { linkRatio, recentDailyRate, urgencyHits }),
    recommendation: recommendationFor(score),
  };
}

function buildEvidence(user, tweets, facts) {
  const evidence = [];
  if (user.created_at) {
    evidence.push(["Profile", `Account created on ${new Date(user.created_at).toLocaleDateString("en-US")}.`, "Age"]);
  }
  evidence.push(["Scan", `Reviewed ${tweets.length} recent original posts from X API.`, "Posts"]);
  evidence.push(["Pattern", `${percent(facts.linkRatio)} link density and about ${facts.recentDailyRate}/day recent cadence.`, "Signal"]);
  if (facts.urgencyHits) {
    evidence.push(["Language", `${facts.urgencyHits} recent posts matched pressure-language terms.`, "Review"]);
  }
  return evidence.slice(0, 4);
}

function recommendationFor(score) {
  if (score >= 72) {
    return "Do not share personal, payment, or company documents. Require external verification first.";
  }
  if (score >= 45) {
    return "Read with caution. Verify identity and claims before replying, following links, or moving into DMs.";
  }
  return "Safe to read and follow. Verify claims before using as source material.";
}

function cleanHandle(handle) {
  return handle.trim().replace(/^@/, "").toLowerCase().replace(/[^a-z0-9_]/g, "");
}

function daysBetween(start, end) {
  return Math.ceil((end - start) / 86400000);
}

function estimateRecentDailyRate(tweets) {
  if (!tweets.length) return 0;
  const dates = tweets.map((tweet) => new Date(tweet.created_at)).filter((date) => !Number.isNaN(date.valueOf()));
  if (!dates.length) return 0;
  const newest = Math.max(...dates);
  const oldest = Math.min(...dates);
  const days = Math.max(1, Math.ceil((newest - oldest) / 86400000) || 1);
  return Math.round(tweets.length / days);
}

function ratio(count, total) {
  return total ? count / total : 0;
}

function percent(value) {
  return `${Math.round(value * 100)}%`;
}

function duplicateHookRatio(tweets) {
  const hooks = tweets
    .map((tweet) => tweet.text.toLowerCase().replace(/https?:\/\/\S+/g, "").split(/\s+/).slice(0, 6).join(" "))
    .filter(Boolean);
  const unique = new Set(hooks);
  return hooks.length ? 1 - unique.size / hooks.length : 0;
}

function keywordHits(tweets, terms) {
  return tweets.filter((tweet) => {
    const text = tweet.text.toLowerCase();
    return terms.some((term) => text.includes(term));
  }).length;
}

function engagementPerFollower(tweets, followers) {
  if (!followers || !tweets.length) return 0;
  const engagement = tweets.reduce((sum, tweet) => {
    const metrics = tweet.public_metrics || {};
    return sum + (metrics.like_count || 0) + (metrics.reply_count || 0) + (metrics.retweet_count || 0) + (metrics.quote_count || 0);
  }, 0);
  return engagement / tweets.length / followers;
}

function compactNumber(value) {
  return Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 }).format(value);
}

function formatAge(days) {
  if (days < 90) return `${days}d`;
  if (days < 730) return `${(days / 30.437).toFixed(1)}mo`;
  return `${(days / 365.25).toFixed(1)}y`;
}

function initialsFor(name) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function tokenFingerprint(token) {
  if (!token) return "missing";
  return `${token.slice(0, 7)}...${token.slice(-6)} (${token.length} chars)`;
}

module.exports = {
  getUsage,
  scanHandle,
  tokenFingerprint,
};
