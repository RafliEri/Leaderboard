// ==UserScript==
// @name         Lemiplay Leaderboard Autoplay
// @namespace    leaderboard-wall
// @version      1.0
// @description  Picks a category and turns on Live Play (auto-scroll + refresh) on Lemiplay leaderboards. Controlled by the URL hash: #cat=2&live=1
// @match        https://tournament.lemiplay.app/tournament-leaderboard/*
// @run-at       document-idle
// @grant        none
// ==/UserScript==

(function () {
  "use strict";

  // Read settings once, before the app can touch the URL.
  const params = new URLSearchParams(location.hash.slice(1));
  const CATEGORY = parseInt(params.get("cat") || "1", 10); // 1 = first category
  const LIVE = params.get("live") !== "0";
  if (!params.has("cat") && !params.has("live")) return; // opened normally, leave it alone

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  async function waitFor(fn, timeout = 30000) {
    const end = Date.now() + timeout;
    while (Date.now() < end) {
      const v = fn();
      if (v) return v;
      await sleep(300);
    }
    return null;
  }

  async function pickCategory(n) {
    // Wait until the category select has loaded a value.
    const select = await waitFor(() => {
      const el = document.querySelector(".tournament-leaderboard-page__title-select");
      return el && el.querySelector(".ant-select-selection-item") ? el : null;
    });
    if (!select) return console.warn("[autoplay] category select not found");

    select.querySelector(".ant-select-selector")
      .dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));

    const options = await waitFor(() => {
      const list = document.querySelectorAll(
        ".ant-select-dropdown:not(.ant-select-dropdown-hidden) .ant-select-item-option"
      );
      return list.length ? list : null;
    }, 5000);
    if (!options) return console.warn("[autoplay] category list did not open");

    const option = options[n - 1];
    if (!option) {
      console.warn(`[autoplay] category ${n} does not exist (only ${options.length})`);
      document.body.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
      return;
    }
    option.click();
    await sleep(1500); // let the new category load
  }

  function liveButton() {
    return document.querySelector(".tournament-leaderboard-page__live-play");
  }

  function ensureLive() {
    const btn = liveButton();
    if (btn && !btn.disabled && !btn.classList.contains("tournament-leaderboard-page__live-play--active")) {
      btn.click();
    }
  }

  (async () => {
    if (CATEGORY > 1) await pickCategory(CATEGORY);
    if (!LIVE) return;
    await waitFor(() => {
      const btn = liveButton();
      return btn && !btn.disabled;
    });
    ensureLive();
    // Keep it on if it ever switches off (e.g. after a hiccup or an accidental click).
    setInterval(ensureLive, 30000);
  })();
})();
