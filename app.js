const BOX_CLASS = "ethos-box";
const STYLE_ID = "ethos-box-style";
const API_ETHOS = "https://api.ethos.network/api/v2";

const CONTAINER_SELECTORS = [
  'div[data-testid="UserName"]',
  'div[data-testid="User-Name"]'
];

let processedContainers = new WeakSet();
let containerToUsernameMap = new WeakMap();
let currentURL = window.location.href;

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
  `;

  document.head.appendChild(style);
}

// Create the Ethos box element
function createBox() {
  const box = document.createElement("span");
  box.className = `${BOX_CLASS} loading`;
  box.setAttribute("aria-hidden", "true");
  box.setAttribute("aria-label", "Loading Ethos score...");
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

// Extract the username from the URL
function extractUsernameFromURL() {
  const pathMatch = window.location.pathname.match(/^\/([^\/]+)/);
  if (pathMatch && pathMatch[1] && pathMatch[1] !== "home" && pathMatch[1] !== "explore" && pathMatch[1] !== "notifications") {
    return pathMatch[1];
  }
  return null;
}

// Extract the username from the container
function extractUsernameFromContainer(container) {
  // Method 1: Look for @username text in the container first (most reliable)
  // This is the most accurate method since the container contains the display name
  const textContent = container.textContent || '';
  const atMatches = Array.from(textContent.matchAll(/@([a-zA-Z0-9_]+)/g));
  if (atMatches.length > 0) {
    // Return the first @username found - this is the username for this container
    return atMatches[0][1];
  }
  
  // Method 2: Find the article and look for username link in the container's section
  const article = container.closest('article[data-testid="tweet"]') || container.closest('article');
  if (!article) {
    return extractUsernameFromURL();
  }
  
  // Find all UserName containers in this article
  const allUserNameContainers = article.querySelectorAll('div[data-testid="UserName"]');
  
  // Find the section/div that contains this specific container
  // by finding the smallest parent that contains this container but not others
  let section = container.parentElement;
  const excludedRoutes = ['home', 'explore', 'notifications', 'messages', 'i', 'settings', 'compose', 'status', 'hashtag'];
  
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
      const links = section.querySelectorAll('a[href^="/"]');
      for (const link of links) {
        const href = link.getAttribute("href");
        const match = href.match(/^\/([^\/\?]+)/);
        
        if (match && match[1] && !excludedRoutes.includes(match[1])) {
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
  
  // Method 3: Fallback to URL if on profile page
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

// Fetch the score from the Ethos API
async function fetchEthosScore(username) {
  try {
    const response = await fetch(`${API_ETHOS}/users/by/x`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
        "X-Ethos-Client": "ethos-unofficial-extension@1.0.0"
      },
      body: JSON.stringify({
        accountIdsOrUsernames: [username]
      })
    });
    
    if (!response.ok) {
      return null;
    }
    
    const data = await response.json();
    if (Array.isArray(data) && data.length > 0 && data[0]) {
      return data[0].score;
    }
    return null;
  } catch (error) {
    console.error("Ethos direct API call failed:", error);
    return null;
  }
}

// Find the name span in the container
function findNameSpan(container) {
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

  const nameSpan = findNameSpan(container);
  if (!nameSpan) {
    return;
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
    nameSpan.insertAdjacentElement("afterend", box);

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

  CONTAINER_SELECTORS.forEach((selector) => {
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
}

function init() {
  ensureStyles();
  scanForUserNames(document);

  // Watch for URL changes (X is a SPA)
  // Method 1: Check URL periodically
  setInterval(() => {
    const newURL = window.location.href;
    if (newURL !== currentURL) {
      currentURL = newURL;
      console.log("URL changed, clearing cache and rescanning");
      clearProcessedContainers();
      // Small delay to let X update the DOM
      setTimeout(() => {
        scanForUserNames(document);
      }, 200);
    }
  }, 500);

  // Method 2: Listen to popstate for browser navigation
  window.addEventListener('popstate', () => {
    currentURL = window.location.href;
    clearProcessedContainers();
    setTimeout(() => {
      scanForUserNames(document);
    }, 200);
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
    }, 200);
  };
  
  history.replaceState = function(...args) {
    originalReplaceState.apply(history, args);
    currentURL = window.location.href;
    clearProcessedContainers();
    setTimeout(() => {
      scanForUserNames(document);
    }, 200);
  };

  // Watch for DOM changes
  const observer = new MutationObserver((mutations) => {
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

