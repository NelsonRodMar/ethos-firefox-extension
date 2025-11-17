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

// Fetch the score from the Ethos API
async function fetchEthosScore(username) {
  const platform = getPlatform();
  if (!platform) {
    return null;
  }
  
  try {
    let url, options;
    
    if (platform === 'farcaster') {
      // Farcaster uses GET with username in the path
      // Endpoint: /user/by/farcaster/username/{farcasterUsername}
      url = `${API_ETHOS}/user/by/farcaster/username/${encodeURIComponent(username)}`;
      options = {
        method: "GET",
        headers: {
          "Accept": "application/json",
          "X-Ethos-Client": "ethos-unofficial-extension@1.0.0"
        }
      };
    } else {
      // X/Twitter uses POST with body
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
    
    // Handle response based on platform
    let userData = null;
    
    if (platform === 'farcaster') {
      // Farcaster returns a single object, not an array
      if (data && typeof data === 'object' && !Array.isArray(data)) {
        userData = data;
      } else {
        return null;
      }
    } else {
      // X/Twitter returns an array
      if (Array.isArray(data) && data.length > 0) {
        userData = data[0];
      } else {
        return null;
      }
    }
    
    if (userData) {
      const score = userData.score;
      
      // Handle null, undefined, or valid score values
      if (score !== null && score !== undefined) {
        return score;
      }
    }
    
    return null;
  } catch (error) {
    return null;
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

