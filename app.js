const BOX_CLASS = "ethos-box";
const STYLE_ID = "ethos-box-style";
const API_ETHOS = "https://api.ethos.network/api/v2";

// Platform detection
function getPlatform() {
  const hostname = window.location.hostname;
  if (hostname.includes('farcaster.xyz') || hostname.includes('warpcast.com')) {
    return 'farcaster';
  }
  if (hostname.includes('x.com') || hostname.includes('twitter.com')) {
    return 'x';
  }
  return null;
}

// Container selectors for each platform
const CONTAINER_SELECTORS = {
  x: [
  'div[data-testid="UserName"]',
  'div[data-testid="User-Name"]'
  ],
  farcaster: [
    // For Farcaster, we look for username links and use their parent containers
    // The username appears in links like <a href="/username">username</a>
    // We'll find these links and use their parent divs as containers
    'a[href^="/"][class*="font-semibold"]', // Username links with font-semibold class
    'a[href^="/"]' // Fallback: any link that might be a username
  ]
};

function getContainerSelectors() {
  const platform = getPlatform();
  if (!platform) return [];
  return CONTAINER_SELECTORS[platform] || [];
}

const PROFILE_INFO_CLASS = "ethos-profile-info-container";
const PROFILE_INFO_PROFILE_URLS = {
  x: "https://app.ethos.network/profile/x/",
  farcaster: "https://app.ethos.network/profile/farcaster/"
};
const DEFAULT_PROFILE_URL = "https://app.ethos.network";
const WEI_IN_ETH = BigInt("1000000000000000000");

let processedContainers = new WeakSet();
let containerToUsernameMap = new WeakMap();
let currentURL = window.location.href;
let profileInfoContainerElement = null;
let profileInfoUsername = null;
let profileInfoPlatform = null;
let profileInfoKey = null;
let profileInfoLoadingKey = null;

function ensureStyles() {
  if (document.getElementById(STYLE_ID)) {
    return;
  }

  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = `
    .${BOX_CLASS} {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-width: 1.5rem;
      height: 1.2rem;
      padding: 0 0.4rem;
      border-radius: 3px;
      margin-left: 0.35rem;
      vertical-align: middle;
      flex-shrink: 0;
      color: white;
      font-size: 0.7rem;
      font-weight: 600;
      line-height: 1;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    }
    .${BOX_CLASS}.loading {
      width: 1.2rem;
      height: 1.2rem;
      padding: 0;
      background: #ccc;
    }
    .${PROFILE_INFO_CLASS} {
      margin: 0;
      border-radius: 16px;
      padding: 0 1rem;
      background: rgba(255, 255, 255, 0.9);
      backdrop-filter: blur(8px);
      color: #000000;
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
      font-size: 0.9rem;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    }
    .${PROFILE_INFO_CLASS} .ethos-profile-info-content {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
      flex-wrap: wrap;
    }
    .${PROFILE_INFO_CLASS} .ethos-profile-info-content-stats {
      flex: 1;
      min-width: 0;
    }
    .${PROFILE_INFO_CLASS} .ethos-profile-row-container {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }
    .${PROFILE_INFO_CLASS} .profile-stat-rows {
      display: flex;
      flex-wrap: wrap;
      gap: 1rem;
      text-decoration: none;
      color: inherit;
    }
    .${PROFILE_INFO_CLASS} .profile-row-item {
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
      min-width: 0;
    }
    .${PROFILE_INFO_CLASS} .profile-row-item-icon {
      flex-shrink: 0;
      color: inherit;
    }
    .${PROFILE_INFO_CLASS} .ethos-review-text-bold {
      font-weight: 700;
      font-size: 0.95rem;
    }
    .${PROFILE_INFO_CLASS} .ethos-review-text-regular {
      font-size: 0.8rem;
      color: rgba(0, 0, 0, 0.7);
    }
    .${PROFILE_INFO_CLASS} .profile-status-item {
      color: inherit;
    }
    .${PROFILE_INFO_CLASS} .profile-status-icon.profile-uninitialized,
    .${PROFILE_INFO_CLASS} .profile-status-icon.profile-unknown {
      color: #cc9a1a;
    }
    .${PROFILE_INFO_CLASS} .profile-status-icon.profile-active,
    .${PROFILE_INFO_CLASS} .profile-status-icon.profile-verified,
    .${PROFILE_INFO_CLASS} .profile-status-icon.profile-trusted {
      color: #127f31;
    }
    .${PROFILE_INFO_CLASS} .profile-status-icon.profile-suspended,
    .${PROFILE_INFO_CLASS} .profile-status-icon.profile-banned {
      color: #b72b38;
    }
    .${PROFILE_INFO_CLASS} .ethos-profile-info-content-logo {
      color: #000000;
    }
    .${PROFILE_INFO_CLASS} .text-link {
      color: #000000;
    }
    .${PROFILE_INFO_CLASS} .write-review-link {
      align-self: stretch;
      display: flex;
      align-items: center;
      gap: 0.4rem;
      border: none;
      background: #eff3f4;
      color: #000000;
      cursor: pointer;
      font-weight: 600;
      padding: 0.65rem 1rem;
      justify-content: center;
      text-align: center;
      border-radius: 12px;
    }
    .${PROFILE_INFO_CLASS} .write-review-link:hover {
      background: #e1e5e8;
    }
    .${PROFILE_INFO_CLASS} .write-review-icon {
      color: inherit;
    }
    @media (prefers-color-scheme: dark) {
      .${PROFILE_INFO_CLASS} {
        background: rgba(15, 20, 25, 0.9);
        color: #f7f9f9;
      }
      .${PROFILE_INFO_CLASS} .ethos-review-text-regular {
        color: rgba(247, 249, 249, 0.7);
      }
      .${PROFILE_INFO_CLASS} .text-link,
      .${PROFILE_INFO_CLASS} .ethos-profile-info-content-logo,
      .${PROFILE_INFO_CLASS} .write-review-link {
        color: #f7f9f9;
      }
      .${PROFILE_INFO_CLASS} .write-review-link {
        background: rgba(247, 249, 249, 0.15);
      }
      .${PROFILE_INFO_CLASS} .write-review-link:hover {
        background: rgba(247, 249, 249, 0.25);
      }
    }
  `;

  document.head.appendChild(style);
}

// Create the Ethos box element
function createBox() {
  const box = document.createElement("span");
  box.className = `${BOX_CLASS} loading`;
  box.setAttribute("aria-hidden", "true");
  box.setAttribute("aria-label", "Loading Ethos score...");
  // Hide the box initially - it will only be shown when a score is loaded
  box.style.display = "none";
  return box;
}

// Get the score color
function getScoreColor(score) {
  if (score === null || score === undefined) {return "";}

  // Color scheme based on Ethos score ranges
  // Renowned scores (2600+): Medium purple, moderately bright and saturated 
  if (score >= 2600) {
    return "#7a5eaf"; // Medium purple, moderately bright and saturated
  }
  // Revered scores (2400-2599): Muted medium lavender/purple
  else if (score >= 2400) {
    return "#836da6"; // Muted medium lavender/purple
  }
  // Distinguished scores (2200-2399): Vibrant natural green
  else if (score >= 2200) {
    return "#127f31"; // Vibrant natural green
  }
  // Exemplary scores (2000-2199): Medium-dark natural green
  else if (score >= 2000) {
    return "#37874e"; // Medium-dark natural green
  }
  // Reputable scores (1800-1999): Vivid, deep blue
  else if (score >= 1800) {
    return "#1f21b6"; // Vivid, deep blue
  }
  // Established scores (1600-1799): Deep, cool, muted blue
  else if (score >= 1600) {
    return "#2f4290"; // Deep, cool, muted blue
  }
  // Known scores (1400-1599): Dark, muted blue
  else if (score >= 1400) {
    return "#41517a"; // Dark, muted blue
  }
  // Neutral scores (1200-1399): Black
  else if (score >= 1200) {
    return "#16171b"; // Black
  }
  // Questionable (800-1199): Yellow/Orange 
  else if (score >= 800) {
    return "#cc9a1a"; // Yellow/Orange
  }
  // Untrusted scores (<800): Red 
  else {
    return "#b72b38"; // Red
  }
}

// Get the score category
function getScoreCategory(score) {
  if (score === null || score === undefined) {
    return "Unrated";
  }
  
  if (score >= 2600) {
    return "Renowned";
  } else if (score >= 2400) {
    return "Revered";
  } else if (score >= 2200) {
    return "Distinguished";
  } else if (score >= 2000) {
    return "Exemplary";
  } else if (score >= 1800) {
    return "Reputable";
  } else if (score >= 1600) {
    return "Established";
  } else if (score >= 1400) {
    return "Known";
  } else if (score >= 1200) {
    return "Neutral";
  } else if (score >= 800) {
    return "Questionable";
  } else {
    return "Untrusted";
  }
}

// Update the box with the score, category and color
function updateBox(box, score) {
  if (!box) return;
  
  box.classList.remove("loading");
  if (score !== null && score !== undefined) {
    // Show the box with the score
    box.textContent = score;
    const category = getScoreCategory(score);
    box.setAttribute("aria-label", `Ethos Score: ${score} (${category})`);
    box.style.background = getScoreColor(score);
    box.style.display = "inline-flex";
  } else {
    // Hide the box if there's no score
    box.style.display = "none";
    box.remove();
  }
}

function formatReviewStats(userData) {
  const reviewStats = userData?.stats?.review?.received || {};
  const positive = reviewStats.positive || 0;
  const neutral = reviewStats.neutral || 0;
  const negative = reviewStats.negative || 0;
  const total = positive + neutral + negative;
  if (!total) {
    return { primary: "--", secondary: "(0)" };
  }
  const percentage = Math.round((positive / total) * 100);
  return { primary: `${percentage}%`, secondary: `(${total})` };
}

function formatUsdAmount(value) {
  if (value === null || value === undefined) {
    return null;
  }
  const numericValue = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(numericValue)) {
    return null;
  }
  return `$${numericValue.toFixed(2)}`;
}

function formatEthFromWei(value) {
  if (value === null || value === undefined) {
    return null;
  }
  try {
    const weiValue = typeof value === "bigint" ? value : BigInt(value);
    const whole = weiValue / WEI_IN_ETH;
    const fraction = weiValue % WEI_IN_ETH;
    let fractionText = fraction.toString().padStart(18, "0").slice(0, 4);
    fractionText = fractionText.replace(/0+$/, "");
    return `Ξ${whole.toString()}${fractionText ? `.${fractionText}` : ""}`;
  } catch (error) {
    return null;
  }
}

function formatVouchStats(userData) {
  const vouchStats = userData?.stats?.vouch?.received || {};
  const count = typeof vouchStats.count === "number" ? vouchStats.count : Number(vouchStats.count) || 0;
  const usdAmountText = formatUsdAmount(vouchStats.amountUsdTotal);
  const ethAmountText = usdAmountText ? null : formatEthFromWei(vouchStats.amountWeiTotal);
  return {
    primary: usdAmountText || ethAmountText || "$0.00",
    secondary: `(${count})`
  };
}

function getProfileStatusMeta(status) {
  const normalized = (status || "").toString().toUpperCase();
  const statusMap = {
    UNINITIALIZED: { label: "Uninitialized", detail: "profile", className: "profile-uninitialized" },
    ACTIVE: { label: "Active", detail: "profile", className: "profile-active" },
    VERIFIED: { label: "Verified", detail: "profile", className: "profile-verified" },
    TRUSTED: { label: "Trusted", detail: "profile", className: "profile-trusted" },
    SUSPENDED: { label: "Suspended", detail: "profile", className: "profile-suspended" },
    BANNED: { label: "Banned", detail: "profile", className: "profile-banned" }
  };
  return statusMap[normalized] || { label: "Unknown", detail: "profile", className: "profile-unknown" };
}

function createSvgIcon(config) {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", config.viewBox);
  svg.setAttribute("width", config.width || "1em");
  svg.setAttribute("height", config.height || "1em");
  svg.setAttribute("fill", config.fill || "currentColor");
  if (config.className) {
    svg.setAttribute("class", config.className);
  }
  (config.paths || []).forEach((pathConfig) => {
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    Object.entries(pathConfig).forEach(([key, value]) => {
      const attributeName = key === "d" ? "d" : key.replace(/([A-Z])/g, "-$1").toLowerCase();
      path.setAttribute(attributeName, value);
    });
    svg.appendChild(path);
  });
  return svg;
}

function createReviewBadgeIcon() {
  return createSvgIcon({
    viewBox: "0 0 63 63",
    className: "profile-row-item-icon",
    paths: [
      { d: "M2 9.936h15.12v15.12H2zM32.24 9.936h15.12v15.12H32.24V9.935Z" },
      { d: "M24.68 25.059A22.68 22.68 0 0 1 2 47.739M54.92 25.059a22.68 22.68 0 0 1-22.68 22.68", stroke: "currentColor", fill: "none", strokeWidth: "15.12" }
    ]
  });
}

function createVouchBadgeIcon() {
  return createSvgIcon({
    viewBox: "0 0 60 60",
    className: "profile-row-item-icon",
    paths: [
      { d: "M0 6.773v36.775L29.913 60h.174L60 43.548V6.773a59.67 59.67 0 0 1-12 5.28V0H36v14.504a60.726 60.726 0 0 1-12 0V0H12v12.053a59.67 5.67 0 0 1-12-5.28Zm12 5.28a59.713 59.713 0 0 0 12 2.45V32h12V14.504a59.713 59.713 0 0 0 12-2.451v24.4l-18 9.9-18-9.9v-24.4Z", fillRule: "evenodd", clipRule: "evenodd" }
    ]
  });
}

function createStatusBadgeIcon(statusClass) {
  const svg = createSvgIcon({
    viewBox: "0 0 22 19",
    width: "15",
    height: "15",
    className: `profile-row-item-icon profile-status-icon ${statusClass || ""}`,
    paths: [
      { d: "M3.5 17h15L11 4 3.5 17Zm8.5-1h-2v-2h2v2Zm0-4h-2V8h2v4Z", opacity: ".3" },
      { d: "M0 19h22L11 0 0 19Zm3.5-2L11 4l7.5 13h-15Zm6.5-3h2v2h-2v-2Zm0-6h2v4h-2V8Z" }
    ]
  });
  return svg;
}

function createEthosLogoIcon() {
  return createSvgIcon({
    viewBox: "0 0 12 12",
    width: "20",
    height: "20",
    className: "ethos-profile-info-content-logo",
    paths: [
      { d: "M4.93206 1.50016L4.93219 1.50016C5.35845 2.04334 5.70918 2.64863 5.96852 3.30021H2.00012L2.00012 3.29981H2L2.00009 8.7001H4.89566V8.70032H5.96164C5.70028 9.35208 5.3474 9.95727 4.9189 10.5H11V8.70032H5.96164C6.18946 8.13218 6.34775 7.52866 6.42598 6.90029H11V5.10024H6.4281C6.35142 4.47202 6.19472 3.86851 5.96852 3.30021H11V1.50016H4.93219L4.93206 1.5V1.50016ZM6.4281 5.10024C6.46376 5.39238 6.48212 5.68987 6.48212 5.99164C6.48212 6.29936 6.46303 6.60261 6.42598 6.90029H2.00012V5.10024H6.4281Z", fillRule: "evenodd", clipRule: "evenodd" }
    ]
  });
}

function createWriteReviewIcon() {
  return createSvgIcon({
    viewBox: "0 0 63 63",
    className: "write-review-icon",
    paths: [
      { d: "M2 9.936h15.12v15.12H2zM32.24 9.936h15.12v15.12H32.24V9.935Z" },
      { d: "M24.68 25.059A22.68 22.68 0 0 1 2 47.739M54.92 25.059a22.68 22.68 0 0 1-22.68 22.68", stroke: "currentColor", fill: "none", strokeWidth: "15.12" }
    ]
  });
}

function createProfileRowItem(iconElement, primaryText, secondaryText, extraClasses = []) {
  const item = document.createElement("div");
  item.className = ["profile-row-item", ...extraClasses].filter(Boolean).join(" ");
  if (iconElement) {
    iconElement.classList.add("profile-row-item-icon");
    item.appendChild(iconElement);
  }
  const primary = document.createElement("div");
  primary.className = "ethos-review-text-bold";
  primary.textContent = primaryText || "--";
  item.appendChild(primary);
  if (secondaryText !== null && secondaryText !== undefined) {
    const secondary = document.createElement("div");
    secondary.className = "ethos-review-text-regular";
    secondary.textContent = secondaryText;
    item.appendChild(secondary);
  }
  return item;
}

function getUserKeysArray(userData) {
  const rawKeys = userData?.userkeys ?? userData?.userKeys;
  if (!rawKeys) {
    return [];
  }
  if (Array.isArray(rawKeys)) {
    return rawKeys;
  }
  if (typeof rawKeys === "string") {
    return [rawKeys];
  }
  if (typeof rawKeys === "object") {
    const values = Object.values(rawKeys);
    return values.flatMap((value) => {
      if (!value) {
        return [];
      }
      if (Array.isArray(value)) {
        return value;
      }
      return [value];
    });
  }
  return [];
}

function extractServiceUsernameFromUserData(userData, serviceDomain) {
  const prefix = `service:${serviceDomain}:username:`;
  for (const key of getUserKeysArray(userData)) {
    if (typeof key === "string" && key.startsWith(prefix)) {
      const candidate = key.slice(prefix.length).trim();
      if (candidate) {
        return candidate;
      }
    }
  }
  return null;
}

function extractProfileLinkComponents(profileLink) {
  if (typeof profileLink !== "string") {
    return null;
  }
  const match = profileLink.match(/\/profile\/([^\/]+)\/([^\/?#]+)/i);
  if (match && match[1] && match[2]) {
    return { platform: match[1].toLowerCase(), username: match[2] };
  }
  return null;
}

function getPreferredEthosProfileTarget(userData, platform) {
  if (!userData) {
    return { platform, username: null };
  }

  const linkComponents = extractProfileLinkComponents(userData?.links?.profile);

  if (platform === "farcaster") {
    const xUsernameFromKeys = extractServiceUsernameFromUserData(userData, "x.com");
    if (xUsernameFromKeys) {
      return { platform: "x", username: xUsernameFromKeys };
    }
    if (linkComponents && linkComponents.platform === "x") {
      return linkComponents;
    }
  }

  if (linkComponents) {
    return linkComponents;
  }

  return { platform, username: userData?.username || null };
}

function buildEthosProfileUrl(userData, platform) {
  const target = getPreferredEthosProfileTarget(userData, platform);
  if (!target.username) {
    return DEFAULT_PROFILE_URL;
  }
  const base = PROFILE_INFO_PROFILE_URLS[target.platform] || PROFILE_INFO_PROFILE_URLS.x;
  return `${base}${encodeURIComponent(target.username)}`;
}

function buildProfileInfoContainer(userData, platform) {
  const container = document.createElement("div");
  container.className = PROFILE_INFO_CLASS;
  if (userData?.username) {
    container.dataset.handleId = userData.username;
  }

  const profileUrl = buildEthosProfileUrl(userData, platform);

  const content = document.createElement("div");
  content.className = "ethos-profile-info-content";

  const statsWrapper = document.createElement("div");
  statsWrapper.className = "ethos-profile-info-content-stats";

  const rowContainer = document.createElement("div");
  rowContainer.className = "ethos-profile-row-container";

  const statsLink = document.createElement("a");
  statsLink.className = "profile-stat-rows text-link";
  statsLink.href = profileUrl;
  statsLink.target = "_blank";
  statsLink.rel = "noopener noreferrer";

  const reviewData = formatReviewStats(userData);
  statsLink.appendChild(createProfileRowItem(createReviewBadgeIcon(), reviewData.primary, reviewData.secondary));

  const vouchData = formatVouchStats(userData);
  statsLink.appendChild(createProfileRowItem(createVouchBadgeIcon(), vouchData.primary, vouchData.secondary));

  const statusMeta = getProfileStatusMeta(userData?.status);
  statsLink.appendChild(
    createProfileRowItem(
      createStatusBadgeIcon(statusMeta.className),
      statusMeta.label,
      statusMeta.detail,
      ["profile-status-item", statusMeta.className || ""]
    )
  );

  rowContainer.appendChild(statsLink);
  statsWrapper.appendChild(rowContainer);
  content.appendChild(statsWrapper);

  const logoLink = document.createElement("a");
  logoLink.href = profileUrl;
  logoLink.target = "_blank";
  logoLink.rel = "noopener noreferrer";
  logoLink.className = "text-link";
  logoLink.appendChild(createEthosLogoIcon());
  content.appendChild(logoLink);

  container.appendChild(content);

  const reviewButton = document.createElement("button");
  reviewButton.type = "button";
  reviewButton.className = "write-review-link interactive ethos-btn-text";
  reviewButton.dataset.ethosReviewTrigger = "true";
  if (userData?.username) {
    reviewButton.dataset.username = userData.username;
  }
  const buttonIconWrapper = document.createElement("span");
  buttonIconWrapper.appendChild(createWriteReviewIcon());
  const buttonText = document.createElement("span");
  buttonText.textContent = "Write a review";
  reviewButton.appendChild(buttonIconWrapper);
  reviewButton.appendChild(buttonText);
  reviewButton.addEventListener("click", (event) => {
    event.preventDefault();
    window.open(`${profileUrl}?modal=review`, "_blank", "noopener,noreferrer");
  });

  container.appendChild(reviewButton);

  return container;
}

// Extract the username from the URL
function extractUsernameFromURL() {
  const platform = getPlatform();
  const pathMatch = window.location.pathname.match(/^\/([^\/]+)/);
  
  if (!pathMatch || !pathMatch[1]) {
    return null;
  }
  
  const username = pathMatch[1];
  
  // Platform-specific excluded routes
  const excludedRoutes = {
    x: ['explore', 'messages', 'i', 'settings', 'compose', 'status', 'hashtag'],
    farcaster: [ 'explore', 'settings', 'compose']
  };
  
  const excluded = excludedRoutes[platform] || [];
  if (excluded.includes(username)) {
  return null;
  }
  
  return username;
}

// Extract the username from the container
function extractUsernameFromContainer(container) {
  const platform = getPlatform();
  
 // Platform-specific excluded routes
 const excludedRoutes = {
  x: ['explore', 'messages', 'i', 'settings', 'compose', 'status', 'hashtag'],
  farcaster: [ 'explore', 'settings', 'compose']
};

  
  const excluded = excludedRoutes[platform] || [];
  
  // For Farcaster, prioritize link extraction (most reliable)
  if (platform === 'farcaster') {
    // If on a profile page and container doesn't have links, try URL extraction first
    const urlUsername = extractUsernameFromURL();
    const links = container.querySelectorAll('a[href^="/"]');
    if (urlUsername && links.length === 0) {
      // If no links found in container, it might be a profile header with just text
      return urlUsername;
    }
    
    for (const link of links) {
      const href = link.getAttribute("href");
      const match = href.match(/^\/([^\/\?]+)/);
      
      if (match && match[1] && !excluded.includes(match[1].toLowerCase())) {
        const username = match[1];
        const linkText = link.textContent?.trim();
        // If link text matches username, it's likely the username link
        if (linkText === username || linkText === `@${username}`) {
          return username;
        }
      }
    }
    // Fallback: return first valid link
    for (const link of links) {
      const href = link.getAttribute("href");
      const match = href.match(/^\/([^\/\?]+)/);
      if (match && match[1] && !excluded.includes(match[1].toLowerCase())) {
        return match[1];
      }
    }
    return urlUsername;
  }
  
  // For X/Twitter, use original logic
  // Method 1: Look for @username text in the container first (most reliable)
  // This is the most accurate method since the container contains the display name
  let textContent = container.textContent || '';

  // X-specific: Because when we are on profile of someone, textContent contains "Follows You", so we need to get the username from the URL
  if (/Follows\s+You/i.test(textContent)) {
    textContent = container.ownerDocument.URL;
  }
  
  const atMatches = Array.from(textContent.matchAll(/@([a-zA-Z0-9_]+)/g));
  if (atMatches.length > 0) {
    // Return the first @username found - this is the username for this container
    return atMatches[0][1];
  }
  
  // Method 2: Look for username links in the container or nearby
  const links = container.querySelectorAll('a[href^="/"]');
  
  for (const link of links) {
    const href = link.getAttribute("href");
    const match = href.match(/^\/([^\/\?]+)/);
    
    if (match && match[1] && !excluded.includes(match[1])) {
      // Skip links that are clearly not usernames
      if (href.match(/^\/[^\/]+\/(status|photo|video|media|hashtag)/)) {
        continue;
      }
      return match[1];
    }
  }
  
  // Method 3: For X, find the article and look for username link in the container's section
  if (platform === 'x') {
  const article = container.closest('article[data-testid="tweet"]') || container.closest('article');
  if (!article) {
    return extractUsernameFromURL();
  }
  
  // Find all UserName containers in this article
  const allUserNameContainers = article.querySelectorAll('div[data-testid="UserName"]');
  
  // Find the section/div that contains this specific container
  // by finding the smallest parent that contains this container but not others
  let section = container.parentElement;
  
  while (section && section !== article) {
    // Check if this section contains only our container (or our container is the closest)
    let containsOtherContainer = false;
    for (const otherContainer of allUserNameContainers) {
      if (otherContainer === container) continue;
      if (section.contains(otherContainer) && !container.contains(otherContainer)) {
        // Check if otherContainer is closer to section's root than our container
        let otherAncestor = otherContainer;
        let containerAncestor = container;
        let otherDepth = 0;
        let containerDepth = 0;
        
        while (otherAncestor && otherAncestor !== section) {
          otherDepth++;
          otherAncestor = otherAncestor.parentElement;
        }
        while (containerAncestor && containerAncestor !== section) {
          containerDepth++;
          containerAncestor = containerAncestor.parentElement;
        }
        
        // If other container is at same or higher level, this section contains both
        if (otherDepth <= containerDepth) {
          containsOtherContainer = true;
          break;
        }
      }
    }
    
    // If this section only contains our container (or our container is the primary one), search here
    if (!containsOtherContainer) {
      // Look for username links in this section
        const sectionLinks = section.querySelectorAll('a[href^="/"]');
        for (const link of sectionLinks) {
        const href = link.getAttribute("href");
        const match = href.match(/^\/([^\/\?]+)/);
        
          if (match && match[1] && !excluded.includes(match[1])) {
          // Skip links that are clearly not usernames
          if (href.match(/^\/[^\/]+\/(status|photo|video|media|hashtag)/)) {
            continue;
          }
          
          // Make sure this link is closer to our container than to other containers
          let isClosest = true;
          for (const otherContainer of allUserNameContainers) {
            if (otherContainer === container) continue;
            
            // Calculate distances
            const distToContainer = getDOMDistance(container, link);
            const distToOther = getDOMDistance(otherContainer, link);
            
            if (distToOther < distToContainer) {
              isClosest = false;
              break;
            }
          }
          
          if (isClosest) {
            return match[1];
          }
        }
      }
    }
    
    section = section.parentElement;
    }
  }
  
  // Method 4: Fallback to URL if on profile page
  return extractUsernameFromURL();
}

// Simple helper to calculate DOM distance
function getDOMDistance(element1, element2) {
  if (!element1 || !element2) return Infinity;
  if (element1 === element2) return 0;
  
  const path1 = [];
  const path2 = [];
  let current = element1;
  while (current) {
    path1.push(current);
    current = current.parentElement;
  }
  current = element2;
  while (current) {
    path2.push(current);
    current = current.parentElement;
  }
  
  // Find common ancestor
  let commonIndex = -1;
  for (let i = 0; i < Math.min(path1.length, path2.length); i++) {
    if (path1[path1.length - 1 - i] === path2[path2.length - 1 - i]) {
      commonIndex = i;
    } else {
      break;
    }
  }
  
  if (commonIndex === -1) return Infinity;
  return path1.length + path2.length - 2 * (commonIndex + 1);
}

// Fetch Ethos profile data (score, stats, etc.)
async function fetchEthosUserData(username) {
  const platform = getPlatform();
  if (!platform || !username) {
    return null;
  }

  try {
    let url;
    let options;

    if (platform === "farcaster") {
      url = `${API_ETHOS}/user/by/farcaster/username/${encodeURIComponent(username)}`;
      options = {
        method: "GET",
        headers: {
          "Accept": "application/json",
          "X-Ethos-Client": "ethos-unofficial-extension@1.0.0"
        }
      };
    } else {
      url = `${API_ETHOS}/users/by/x`;
      const requestBody = {
        accountIdsOrUsernames: [username]
      };
      options = {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
          "X-Ethos-Client": "ethos-unofficial-extension@1.0.0"
        },
        body: JSON.stringify(requestBody)
      };
    }

    const response = await fetch(url, options);
    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    if (platform === "farcaster") {
      if (data && typeof data === "object" && !Array.isArray(data)) {
        return data;
      }
      return null;
    }

    if (Array.isArray(data) && data.length > 0) {
      return data[0];
    }
    return null;
  } catch (error) {
    return null;
  }
}

async function fetchEthosScore(username) {
  const userData = await fetchEthosUserData(username);
  if (userData && (userData.score || userData.score === 0)) {
    return userData.score;
  }
  return null;
}

function isOnXProfilePage() {
  if (getPlatform() !== "x") {
    return false;
  }
  const pathSegments = window.location.pathname.split("?")[0].split("/").filter(Boolean);
  if (!pathSegments.length) {
    return false;
  }
  const usernameSegment = pathSegments[0].toLowerCase();
  const excluded = ["explore", "messages", "i", "settings", "compose", "status", "hashtag", "notifications", "tos", "privacy", "home", "communitynotes"];
  if (excluded.includes(usernameSegment)) {
    return false;
  }
  if (pathSegments.length === 1) {
    return true;
  }
  const allowedSecondSegments = new Set(["with_replies", "media", "likes", "verified_followers", "followers", "following", "lists", "communities"]);
  return allowedSecondSegments.has(pathSegments[1].toLowerCase());
}

function isOnFarcasterProfilePage() {
  if (getPlatform() !== "farcaster") {
    return false;
  }
  const pathSegments = window.location.pathname.split("?")[0].split("/").filter(Boolean);
  if (!pathSegments.length) {
    return false;
  }
  const usernameSegment = pathSegments[0].toLowerCase();
  const excluded = ["settings", "messages", "notifications", "compose", "login", "signup", "cast", "channel"];
  if (excluded.includes(usernameSegment)) {
    return false;
  }
  if (pathSegments.length === 1) {
    return true;
  }
  const allowedSecondSegments = new Set([
    "casts",
    "posts",
    "replies",
    "likes",
    "media",
    "collects",
    "followers",
    "following",
    "collections",
    "highlights",
    "mentions"
  ]);
  return allowedSecondSegments.has(pathSegments[1].toLowerCase());
}

function findXProfileInsertionPoint() {
  const primaryColumn = document.querySelector('div[data-testid="primaryColumn"]');
  if (primaryColumn) {
    const tabList = primaryColumn.querySelector('[role="tablist"]');
    if (tabList && tabList.parentElement) {
      return { target: tabList, position: "beforebegin" };
    }
  }

  const selectors = [
    'div[data-testid="UserProfileHeader_Items"]',
    'div[data-testid="UserDescription"]',
    'div[data-testid="UserName"]'
  ];
  for (const selector of selectors) {
    const element = document.querySelector(selector);
    if (element) {
      return { target: element, position: "afterend" };
    }
  }
  if (primaryColumn) {
    const section = primaryColumn.querySelector("section");
    if (section) {
      return { target: section, position: "afterend" };
    }
  }
  return null;
}

function findFarcasterProfileInsertionPoint() {
  const explicitTabBar = document.querySelector('div.flex.h-14.flex-row.items-center.justify-around');
  if (explicitTabBar) {
    return { target: explicitTabBar, position: "beforebegin" };
  }
  const classBasedTabBar = document.querySelector(
    'div[class*="h-14"][class*="flex-row"][class*="items-center"][class*="justify-around"]'
  );
  if (classBasedTabBar) {
    return { target: classBasedTabBar, position: "beforebegin" };
  }

  const tabList = document.querySelector('[role="tablist"]');
  if (tabList) {
    return { target: tabList, position: "beforebegin" };
  }

  const candidateSelectors = [
    'nav[role="navigation"]',
    '[data-testid="tab-list"]',
    'div[class*="tabs"]',
    'div[class*="Tabs"]',
    'nav',
    'div[role="tablist"]'
  ];
  const keywords = ["casts", "posts", "replies", "likes", "mentions", "media", "collects", "gallery", "highlights"];
  for (const selector of candidateSelectors) {
    const elements = document.querySelectorAll(selector);
    for (const element of elements) {
      const text = element.textContent?.toLowerCase() || "";
      if (text && keywords.some(keyword => text.includes(keyword))) {
        return { target: element, position: "beforebegin" };
      }
    }
  }

  const main = document.querySelector("main");
  if (main) {
    const sections = main.querySelectorAll("section");
    if (sections.length > 0) {
      return { target: sections[0], position: "beforebegin" };
    }
    if (main.firstElementChild) {
      return { target: main.firstElementChild, position: "beforebegin" };
    }
  }

  return null;
}

function removeProfileInfoContainer() {
  if (profileInfoContainerElement && profileInfoContainerElement.parentElement) {
    profileInfoContainerElement.remove();
  }
  profileInfoContainerElement = null;
  profileInfoUsername = null;
  profileInfoPlatform = null;
  profileInfoKey = null;
}

async function maybeRenderXProfileInfo() {
  if (getPlatform() !== "x") {
    removeProfileInfoContainer();
    return;
  }

  if (!isOnXProfilePage()) {
    removeProfileInfoContainer();
    return;
  }

  const username = extractUsernameFromURL();
  if (!username) {
    removeProfileInfoContainer();
    return;
  }

  const normalizedUsername = username.toLowerCase();
  const targetKey = `x:${normalizedUsername}`;
  const insertionPoint = findXProfileInsertionPoint();
  if (!insertionPoint) {
    return;
  }

  if (
    profileInfoKey === targetKey &&
    profileInfoContainerElement &&
    profileInfoContainerElement.isConnected
  ) {
    return;
  }

  if (profileInfoLoadingKey === targetKey) {
    return;
  }

  profileInfoLoadingKey = targetKey;
  try {
    const userData = await fetchEthosUserData(username);
    if (!userData) {
      removeProfileInfoContainer();
      return;
    }

    const latestUsername = extractUsernameFromURL();
    if (!latestUsername || latestUsername.toLowerCase() !== normalizedUsername || !isOnXProfilePage()) {
      return;
    }

    const latestInsertionPoint = findXProfileInsertionPoint();
    if (!latestInsertionPoint) {
      return;
    }
    const { target: latestTarget, position: latestPosition } = latestInsertionPoint;

    const newContainer = buildProfileInfoContainer(userData, "x");
    removeProfileInfoContainer();
    latestTarget.insertAdjacentElement(latestPosition, newContainer);
    profileInfoContainerElement = newContainer;
    profileInfoUsername = username;
    profileInfoPlatform = "x";
    profileInfoKey = `${profileInfoPlatform}:${normalizedUsername}`;
  } catch (error) {
    // Swallow errors silently to avoid console noise
  } finally {
    profileInfoLoadingKey = null;
  }
}

async function maybeRenderFarcasterProfileInfo() {
  if (getPlatform() !== "farcaster") {
    removeProfileInfoContainer();
    return;
  }

  if (!isOnFarcasterProfilePage()) {
    removeProfileInfoContainer();
    return;
  }

  const username = extractUsernameFromURL();
  if (!username) {
    removeProfileInfoContainer();
    return;
  }

  const normalizedUsername = username.toLowerCase();
  const targetKey = `farcaster:${normalizedUsername}`;
  const insertionPoint = findFarcasterProfileInsertionPoint();
  if (!insertionPoint) {
    return;
  }

  if (
    profileInfoKey === targetKey &&
    profileInfoContainerElement &&
    profileInfoContainerElement.isConnected
  ) {
    return;
  }

  if (profileInfoLoadingKey === targetKey) {
    return;
  }

  profileInfoLoadingKey = targetKey;
  try {
    const userData = await fetchEthosUserData(username);
    if (!userData) {
      removeProfileInfoContainer();
      return;
    }

    const latestUsername = extractUsernameFromURL();
    if (!latestUsername || latestUsername.toLowerCase() !== normalizedUsername || !isOnFarcasterProfilePage()) {
      return;
    }

    const latestInsertionPoint = findFarcasterProfileInsertionPoint();
    if (!latestInsertionPoint) {
      return;
    }
    const { target: latestTarget, position: latestPosition } = latestInsertionPoint;

    const newContainer = buildProfileInfoContainer(userData, "farcaster");
    removeProfileInfoContainer();
    latestTarget.insertAdjacentElement(latestPosition, newContainer);
    profileInfoContainerElement = newContainer;
    profileInfoUsername = username;
    profileInfoPlatform = "farcaster";
    profileInfoKey = `${profileInfoPlatform}:${normalizedUsername}`;
  } catch (error) {
    // Silently ignore errors
  } finally {
    profileInfoLoadingKey = null;
  }
}

// Find the name span in the container
function findNameSpan(container) {
  const platform = getPlatform();
  
  // For Farcaster, look for the username link or text
  if (platform === 'farcaster') {
    // Check if we're on a profile page - if so, prioritize finding the display name
    const profileUsername = extractUsernameFromURL();
    if (profileUsername) {
      // First, try to find the display name span (the one with text-lg font-bold classes)
      // This is typically the main name shown in the profile header
      const allSpans = container.querySelectorAll('span');
      for (const span of allSpans) {
        const classes = span.className || '';
        // Check if this span has both text-lg and font-bold classes
        if (typeof classes === 'string' && classes.includes('text-lg') && classes.includes('font-bold')) {
          // Make sure it's not in post content
          const breakWordsParent = span.closest('.break-words');
          if (!breakWordsParent) {
            // This is likely the display name in the profile header
            return span;
          }
        }
      }
      
      // If no display name found, look for any span with font-bold that's not the username
      const boldSpans = container.querySelectorAll('span[class*="font-bold"]');
      for (const span of boldSpans) {
        const text = span.textContent?.trim();
        // Skip if it's the username text
        if (text !== `@${profileUsername}` && text !== profileUsername) {
          const breakWordsParent = span.closest('.break-words');
          if (!breakWordsParent) {
            return span;
          }
        }
      }
    }
    
    // First, try to find a username link
    const usernameLink = container.querySelector('a[href^="/"]');
    if (usernameLink) {
      // Check if it's a valid username link
      const href = usernameLink.getAttribute('href');
      const match = href.match(/^\/([^\/\?]+)/);
      if (match && match[1]) {
        const username = match[1];
        const linkText = usernameLink.textContent?.trim();
        // If link text matches username, it's likely the username link
        if (linkText === username || linkText === `@${username}`) {
          return usernameLink;
        }
      }
    }
    
    // If no link found, check if we're on a profile page and look for username text
    if (profileUsername) {
      // Look for text elements containing the username
      const allSpans = container.querySelectorAll('span, div, p');
      for (const element of allSpans) {
        const text = element.textContent?.trim();
        if (text === `@${profileUsername}` || text === profileUsername) {
          // Make sure it's not in post content (check for .break-words which indicates post content)
          // Note: .text-faint is used in both profile headers and post content, so we only exclude .break-words
          const breakWordsParent = element.closest('.break-words');
          if (!breakWordsParent) {
            return element;
          }
        }
      }
    }
    
    // Fallback: return the first link or span
    return container.querySelector('a[href^="/"]') || container.querySelector('span') || null;
  }
  
  // For X/Twitter, use original logic
  const dirSpans = container.querySelectorAll('span[dir]');
  if (dirSpans.length > 0) {
    return dirSpans[dirSpans.length - 1];
  }

  const fallbackSpan = container.querySelector('span');
  if (fallbackSpan) {
    return fallbackSpan;
  }

  return null;
}

async function insertBox(container) {
  if (!container) {
    return;
  }

  const platform = getPlatform();
  const profileUsername = extractUsernameFromURL();
  
  // For Farcaster profile pages, find the flex-1 div and insert after it
  let insertAfterElement = null;
  if (platform === 'farcaster' && profileUsername) {
    // Find the flex-1 div that contains the display name
    const flex1Divs = container.querySelectorAll('div[class*="flex-1"]');
    for (const flex1Div of flex1Divs) {
      // Check if this flex-1 div contains the display name (text-lg font-bold span)
      const displayNameSpan = flex1Div.querySelector('span');
      if (displayNameSpan) {
        const classes = displayNameSpan.className || '';
        if (typeof classes === 'string' && classes.includes('text-lg') && classes.includes('font-bold')) {
          // Make sure it's not in post content
          const breakWordsParent = flex1Div.closest('.break-words');
          if (!breakWordsParent) {
            insertAfterElement = flex1Div;
            break;
          }
        }
      }
    }
  }
  
  // If we didn't find a flex-1 div, use the standard nameSpan approach
  if (!insertAfterElement) {
    const nameSpan = findNameSpan(container);
    if (!nameSpan) {
      return;
    }
    insertAfterElement = nameSpan;
  }

  const username = extractUsernameFromContainer(container);
  if (!username) {
    return;
  }

  // Check if there's already a box
  let box = container.querySelector(`.${BOX_CLASS}`);
  const previousUsername = containerToUsernameMap.get(container);
  
  // If box exists and username hasn't changed, skip
  // This prevents re-processing the same container with the same username
  if (box && previousUsername === username && processedContainers.has(container)) {
    return;
  }

  // If username changed or box doesn't exist, create/update
  if (!box) {
    box = createBox();
    insertAfterElement.insertAdjacentElement("afterend", box);

    const containerStyle = window.getComputedStyle(container);
    if (containerStyle.display === "inline") {
      container.style.display = "inline-flex";
      container.style.alignItems = "center";
      container.style.gap = "0.2rem";
    }
  } else {
    // Reset box to loading state if username changed
    box.className = `${BOX_CLASS} loading`;
    box.textContent = "";
    // Hide the box until the new score is loaded
    box.style.display = "none";
  }

  // Update the username mapping
  containerToUsernameMap.set(container, username);
  processedContainers.add(container);

  // Fetch and update score
  const score = await fetchEthosScore(username);
  updateBox(box, score);
  
  // If box was removed (no score), clean up the mappings
  // Note: WeakSet doesn't support delete, but that's okay - the container will be garbage collected
  if (!box.parentElement) {
    containerToUsernameMap.delete(container);
    // processedContainers is a WeakSet, so we can't delete from it, but that's fine
  }
}

function scanForUserNames(root) {
  if (!(root instanceof Element) && root !== document) {
    return;
  }

  const platform = getPlatform();
  if (!platform) {
    return; // Don't run on unsupported platforms
  }

  if (platform === 'x') {
    maybeRenderXProfileInfo();
  } else if (platform === 'farcaster') {
    maybeRenderFarcasterProfileInfo();
  }

  // For Farcaster, we handle links differently
  if (platform === 'farcaster') {
    // Check if we're on a profile page
    const profileUsername = extractUsernameFromURL();
    if (profileUsername && root === document) {
      // Look for the username text in the profile header (not just links)
      // The username might be displayed as text, not a link
      const allElements = document.querySelectorAll('*');
      for (const element of allElements) {
        const text = element.textContent?.trim();
        // Check if this element contains the username as text (with or without @)
        if (text === `@${profileUsername}` || text === profileUsername) {
          // Make sure it's not in post content (check for .break-words which indicates post content)
          const breakWordsParent = element.closest('.break-words');
          if (!breakWordsParent) {
            // For profile header, the username might be in .text-faint, which is fine
            // Find the flex container with items-center that contains this username
            // This is typically the profile header container
            // Start by checking the element's parent (which is often the flex container)
            let container = element.parentElement;
            let foundContainer = false;
            let depth = 0;
            
            while (container && container !== document.body && depth < 15) {
              const classes = container.className || '';
              // Look for flex containers with items-center (profile header structure)
              if (typeof classes === 'string' && classes.includes('flex') && classes.includes('items-center')) {
                // Make sure this container is not inside post content
                if (!container.closest('.break-words')) {
                  insertBox(container);
                  foundContainer = true;
                  break;
                }
              }
              container = container.parentElement;
              depth++;
            }
            
            // If no suitable container found, use the element's direct parent
            if (!foundContainer && element.parentElement) {
              insertBox(element.parentElement);
            }
            break; // Found and processed, exit loop
          }
        }
      }
    }
    
    // Find all potential username links
    const usernameLinks = root.querySelectorAll?.('a[href^="/"]') || [];
    
    usernameLinks.forEach((link, index) => {
      // Skip links inside elements with "break-words" class (post content) or "text-faint" class (post content)
      const breakWordsParent = link.closest('.break-words');
      const textFaintParent = link.closest('.text-faint');
      if (breakWordsParent || textFaintParent) {
        return;
      }
      
      const href = link.getAttribute('href');
      const match = href.match(/^\/([^\/\?]+)/);
      
      if (match && match[1]) {
        const username = match[1];
        // Check if it's a valid username (not excluded routes)
        const excludedRoutes = ['explore', 'settings', 'compose'];
        if (excludedRoutes.includes(username.toLowerCase())) {
          return;
        }
        
        // Check if the link text matches the username (likely a username link)
        const linkText = link.textContent?.trim();
        
        if (linkText === username || linkText === `@${username}`) {
          // Find a suitable parent container (look for a flex container with items-center)
          let container = link.parentElement;
          let depth = 0;
          while (container && container !== document.body && depth < 10) {
            // Look for a container with flex classes that likely contains the username
            const classes = container.className || '';
            if (classes.includes('flex') && classes.includes('items-center')) {
              // Use this as the container
              insertBox(container);
              return;
            }
            container = container.parentElement;
            depth++;
          }
          // Fallback: use the link's immediate parent
          if (link.parentElement) {
            insertBox(link.parentElement);
          }
        }
      }
    });
    return;
  }

  // For X/Twitter, use the original logic
  const selectors = getContainerSelectors();
  selectors.forEach((selector) => {
    if (root instanceof Element && root.matches(selector)) {
      insertBox(root);
    }

    const containers = root.querySelectorAll?.(selector) || [];
    containers.forEach(container => {
      insertBox(container);
    });
  });
}

function clearProcessedContainers() {
  // Clear processed containers when URL changes
  processedContainers = new WeakSet();
  containerToUsernameMap = new WeakMap();
  removeProfileInfoContainer();
}

function init() {
  const platform = getPlatform();
  if (!platform) {
    return; // Don't initialize on unsupported platforms
  }

  ensureStyles();
  scanForUserNames(document);

  // Watch for URL changes (both X and Farcaster are SPAs)
  // Method 1: Check URL periodically
  setInterval(() => {
    const newURL = window.location.href;
    if (newURL !== currentURL) {
      currentURL = newURL;
      clearProcessedContainers();
      scanForUserNames(document);
    }
  }, 1000);

  // Method 2: Listen to popstate for browser navigation
  window.addEventListener('popstate', () => {
    currentURL = window.location.href;
    clearProcessedContainers();
    setTimeout(() => {
      scanForUserNames(document);
    }, 1000);
  });

  // Method 3: Override pushState/replaceState to catch programmatic navigation
  const originalPushState = history.pushState;
  const originalReplaceState = history.replaceState;
  
  history.pushState = function(...args) {
    originalPushState.apply(history, args);
    currentURL = window.location.href;
    clearProcessedContainers();
    setTimeout(() => {
      scanForUserNames(document);
    }, 1000);
  };
  
  history.replaceState = function(...args) {
    originalReplaceState.apply(history, args);
    currentURL = window.location.href;
    clearProcessedContainers();
    setTimeout(() => {
      scanForUserNames(document);
    }, 1000);
  };

  // Watch for DOM changes
  const observer = new MutationObserver((mutations) => {
    // Check if we're on a profile page - if so, scan the full document
    // because profile header might be added/updated
    const profileUsername = extractUsernameFromURL();
    if (profileUsername && platform === 'farcaster') {
      // For profile pages, scan the full document when significant changes occur
      let shouldScanDocument = false;
      for (const mutation of mutations) {
        if (mutation.addedNodes.length > 0) {
          for (const node of mutation.addedNodes) {
            if (node.nodeType === Node.ELEMENT_NODE) {
              // Check if this looks like it could be part of the profile header
              const element = node;
              if (element.querySelector && (
                element.querySelector('.text-faint') ||
                element.className?.includes('flex') ||
                element.textContent?.includes('@')
              )) {
                shouldScanDocument = true;
                break;
              }
            }
          }
        }
        if (shouldScanDocument) break;
      }
      
      if (shouldScanDocument) {
        // Use a small delay to let the DOM settle
        setTimeout(() => {
          scanForUserNames(document);
        }, 100);
      }
    }
    
    // Also scan individual added nodes (for non-profile pages or links in posts)
    for (const mutation of mutations) {
      mutation.addedNodes.forEach((node) => {
        scanForUserNames(node);
      });
    }
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}

