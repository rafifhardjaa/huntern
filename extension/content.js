// Huntern Web Clipper — content script.
// Runs in the active tab and returns visible job-board text.
// Prefer known job containers; fall back to the whole body.
(() => {
  const SELECTORS = [
    // LinkedIn
    ".jobs-description__content",
    ".jobs-details",
    // Indeed
    "[data-testid='jobsearch-JobComponent']",
    ".jobsearch-JobComponent",
    // Glints (Indonesia)
    "[class*='JobDetail']",
    "[class*='jobDetail']",
    // Jobstreet / JobStreet
    "[data-testid='job-ad']",
    ".job-ad",
    // Kalibrr
    ".job-description-container",
    // Generic patterns
    "[class*='job-description']",
    "[class*='jobDescription']",
    "article",
    "main",
  ];

  function pickText() {
    for (const selector of SELECTORS) {
      try {
        const el = document.querySelector(selector);
        const text = el && el.innerText ? el.innerText.trim() : "";
        if (text.length > 200) return text;
      } catch {
        /* ignore bad selectors on odd pages */
      }
    }
    return document.body ? document.body.innerText.trim() : "";
  }

  // Strips the common "sign in / sign up / cookie" noise that trips up the
  // AI extractor, but only when the posting itself is present.
  const LOGIN_NOISE = [
    /sign in to (continue|linkedin|indeed|glassdoor)/gi,
    /log in to (continue|linkedin|indeed)/gi,
    /create (an )?account (to|for)/gi,
    /accept all cookies/gi,
    /enable javascript/gi,
  ];

  function clean(text) {
    let out = text;
    for (const pattern of LOGIN_NOISE) out = out.replace(pattern, "");
    return out.trim();
  }

  const raw = pickText();
  const text = clean(raw);

  // Cap payload size (~12k chars is plenty for the parser).
  return {
    text: text.slice(0, 15000),
    title: document.title || "",
  };
})();
