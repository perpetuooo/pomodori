import type { TimerState, Settings } from "../types";

const MODAL_ID = "pomodori-blocker-modal";
let checkInterval: number | null = null;

function applyBlur() {
  document.body.style.filter = "blur(10px)";
  document.body.style.overflow = "hidden";
  document.body.style.pointerEvents = "none";
}

function removeBlur() {
  document.body.style.filter = "";
  document.body.style.overflow = "";
  document.body.style.pointerEvents = "auto";
}

function showModal() {
  if (document.getElementById(MODAL_ID)) return;

  const modal = document.createElement("div");
  modal.id = MODAL_ID;
  modal.style.position = "fixed";
  modal.style.top = "0";
  modal.style.left = "0";
  modal.style.width = "100vw";
  modal.style.height = "100vh";
  modal.style.backgroundColor = "rgba(0, 0, 0, 0.8)";
  modal.style.color = "white";
  modal.style.display = "flex";
  modal.style.flexDirection = "column";
  modal.style.justifyContent = "center";
  modal.style.alignItems = "center";
  modal.style.zIndex = "2147483647"; // Max z-index
  modal.style.fontFamily = "sans-serif";
  modal.style.pointerEvents = "auto"; 

  const title = document.createElement("h1");
  title.innerText = "Focus Time";
  title.style.fontSize = "3rem";
  title.style.marginBottom = "1rem";

  const text = document.createElement("p");
  text.innerText = "This URL is currently blocked because a Pomodoro session is active.";
  text.style.fontSize = "1.5rem";

  modal.appendChild(title);
  modal.appendChild(text);

  document.documentElement.appendChild(modal);
}

function removeModal() {
  const modal = document.getElementById(MODAL_ID);
  if (modal) {
    modal.remove();
  }
}

function checkBlockState(settings: Settings | undefined, timerState: TimerState | undefined) {
  if (!settings || !timerState) {
    removeBlur();
    removeModal();
    if (checkInterval) {
      window.clearInterval(checkInterval);
      checkInterval = null;
    }
    return;
  }

  const currentHref = window.location.href;
  const currentHostname = window.location.hostname;

  const isBlockedURL = settings.blocklist.some(blockedPattern => {
    return currentHref.includes(blockedPattern) || currentHostname.includes(blockedPattern);
  });

  if (!isBlockedURL) {
    return;
  }

  const isActive = timerState.isRunning && timerState.phase === "work" && timerState.endEpochMs && Date.now() < timerState.endEpochMs;

  if (isActive) {
    applyBlur();
    showModal();

    // Poll to remove block if timer naturally expires without popup opening
    if (!checkInterval) {
      checkInterval = window.setInterval(() => {
        if (timerState.endEpochMs && Date.now() >= timerState.endEpochMs) {
          removeBlur();
          removeModal();
          window.clearInterval(checkInterval!);
          checkInterval = null;
        }
      }, 1000);
    }
  } else {
    removeBlur();
    removeModal();
    if (checkInterval) {
      window.clearInterval(checkInterval);
      checkInterval = null;
    }
  }
}

async function initialize() {
  const data = await chrome.storage.local.get(["settings", "timer-state"]);
  checkBlockState(data.settings as Settings | undefined, data["timer-state"] as TimerState | undefined);

  // Listen for changes (e.g. user pauses timer, or modifies blocklist)
  chrome.storage.onChanged.addListener((_changes, area) => {
    if (area === "local") {
      chrome.storage.local.get(["settings", "timer-state"]).then(currentData => {
        checkBlockState(currentData.settings as Settings | undefined, currentData["timer-state"] as TimerState | undefined);
      });
    }
  });
}

initialize();
