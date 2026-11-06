// Huntern Web Clipper — popup logic.
// Override the deployed app URL by editing API_BASE below, or set it in
// chrome.storage via the "Use a different account" flow.
const API_BASE = "http://localhost:3000";

const setupView = document.getElementById("setup-view");
const clipView = document.getElementById("clip-view");
const userIdInput = document.getElementById("user-id");
const saveIdBtn = document.getElementById("save-id");
const saveJobBtn = document.getElementById("save-job");
const resetBtn = document.getElementById("reset-id");
const msg = document.getElementById("msg");

function showMessage(kind, text) {
  msg.className = `msg ${kind}`;
  msg.textContent = text;
}

function clearMessage() {
  msg.className = "msg";
  msg.textContent = "";
}

function showClipView() {
  setupView.classList.add("hidden");
  clipView.classList.remove("hidden");
}

function showSetupView() {
  clipView.classList.add("hidden");
  setupView.classList.remove("hidden");
}

async function getUserId() {
  const stored = await chrome.storage.local.get("hunternUserId");
  return stored.hunternUserId || "";
}

async function init() {
  const userId = await getUserId();
  if (userId) {
    showClipView();
  } else {
    showSetupView();
  }
}

saveIdBtn.addEventListener("click", async () => {
  const value = userIdInput.value.trim();
  if (!value) {
    showMessage("error", "Paste your User ID first.");
    return;
  }
  await chrome.storage.local.set({ hunternUserId: value });
  clearMessage();
  showClipView();
});

resetBtn.addEventListener("click", async () => {
  await chrome.storage.local.remove("hunternUserId");
  userIdInput.value = "";
  clearMessage();
  showSetupView();
});

// Catches the common cases where a page looks like a job board but is not a
// single posting, so the user gets a useful hint instead of a parse failure.
function validatePage(url) {
  const blocked = [
    "chrome://",
    "chrome-extension://",
    "edge://",
    "about:",
    "https://chromewebstore.google.com",
    "https://accounts.google.com",
  ];
  for (const prefix of blocked) {
    if (url.startsWith(prefix)) {
      return "This is a browser system page. Open a real job posting (LinkedIn, Jobstreet, company site...) first, then clip again.";
    }
  }

  if (url.includes("linkedin.com") && !/\/jobs\/(view|search)/.test(url) && !url.includes("/jobs/")) {
    return "Open a specific LinkedIn job posting, not your feed or search page.";
  }
  if (url.includes("indeed.com") && !/\/viewjob|rc\/clk/.test(url)) {
    return "Open a specific Indeed job posting, not the search results list.";
  }

  return null;
}

saveJobBtn.addEventListener("click", async () => {
  const userId = await getUserId();
  if (!userId) {
    showSetupView();
    return;
  }

  saveJobBtn.disabled = true;
  saveJobBtn.textContent = "Reading page...";
  saveJobBtn.classList.add("loading");

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab || tab.id === undefined) {
      throw new Error("No active tab found.");
    }

    const url = tab.url || "";
    const pageError = validatePage(url);
    if (pageError) throw new Error(pageError);

    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ["content.js"],
    });

    const payload = results && results[0] ? results[0].result : null;
    const rawText = payload && typeof payload === "object" ? String(payload.text ?? "") : "";

    if (rawText.trim().length < 50) {
      throw new Error("Could not read enough text from this page.");
    }
    if (/sign in to (continue|linkedin|indeed)/i.test(rawText.slice(0, 400))) {
      throw new Error("This page is asking you to log in. Sign in first, then clip again.");
    }

    saveJobBtn.textContent = "Saving...";

    const res = await fetch(`${API_BASE}/api/clipper`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        rawText,
        user_id: userId,
        page_url: tab.url || "",
        page_title: payload && typeof payload === "object" ? payload.title : "",
      }),
    });
    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      if (res.status === 401) {
        // Bad or stale User ID: drop back to the connect screen.
        await chrome.storage.local.remove("hunternUserId");
        showSetupView();
        throw new Error("Your User ID was rejected. Paste the current one from Settings.");
      }
      throw new Error(data.error || `Request failed (${res.status}).`);
    }

    const job = data.job || {};
    showMessage(
      "success",
      `Saved: ${job.position_title || "job"} @ ${job.company_name || "unknown"} → Wishlist.`
    );
  } catch (err) {
    showMessage("error", err instanceof Error ? err.message : "Something went wrong.");
  } finally {
    saveJobBtn.disabled = false;
    saveJobBtn.classList.remove("loading");
    saveJobBtn.textContent = "Save to Huntern";
  }
});

init();
