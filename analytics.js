(function () {
  "use strict";
  const config = window.TANOMATO_CONFIG || {};
  const measurementId = config.gaMeasurementId || "";
  const configured = /^G-[A-Z0-9]{6,20}$/.test(measurementId);
  const key = "tanomato.analytics-choice.v1";
  const allowedEvents = new Set(["works_click", "case_click", "sample_open", "compare_click", "compare_use", "guide_click", "checklist_use", "checklist_complete", "checklist_print", "contact_click", "contact_start", "email_compose"]);
  let consent = "", loaded = false;
  try { consent = localStorage.getItem(key) || ""; } catch { /* Storage may be disabled. */ }
  window.dataLayer = window.dataLayer || [];
  function gtag() { window.dataLayer.push(arguments); }
  const pathname = location.pathname;
  const pageLocation = location.origin + pathname; // No query strings, hashes, or form content.
  function enable() {
    if (!configured || loaded || consent !== "granted") return;
    loaded = true;
    window[`ga-disable-${measurementId}`] = false;
    gtag("consent", "default", { analytics_storage: "granted", ad_storage: "denied", ad_user_data: "denied", ad_personalization: "denied" });
    gtag("js", new Date());
    gtag("config", measurementId, {
      send_page_view: false, page_location: pageLocation, page_referrer: "",
      allow_google_signals: false, allow_ad_personalization_signals: false,
      cookie_path: "/", cookie_domain: "none",
    });
    gtag("event", "page_view", { page_location: pageLocation, page_referrer: "", page_title: document.title });
    const script = document.createElement("script");
    script.async = true;
    script.src = "https://www.googletagmanager.com/gtag/js?id=" + encodeURIComponent(measurementId);
    document.head.append(script);
  }
  window.tanomatoTrack = function (event) {
    if (!configured || consent !== "granted" || !allowedEvents.has(event)) return;
    enable();
    gtag("event", event, { page_location: pageLocation, page_referrer: "", page_path: pathname });
  };
  document.addEventListener("click", (e) => {
    const tagged = e.target.closest("[data-track]");
    if (tagged) window.tanomatoTrack(tagged.dataset.track);
    else if (e.target.closest("[data-view]")) window.tanomatoTrack("compare_use");
  });
  if (!configured) return;
  const banner = document.createElement("section");
  banner.className = "analytics-choice";
  banner.setAttribute("aria-label", "アクセス解析の選択");
  banner.innerHTML = '<p>使いやすさの改善のため、閲覧やボタン操作をGoogle Analyticsで計測してよいですか？相談内容は送信しません。</p><div><button type="button" data-choice="granted">許可する</button><button type="button" data-choice="denied">許可しない</button></div>';
  function removeAnalyticsCookies() {
    document.cookie.split(";").forEach((part) => {
      const name = part.split("=")[0].trim();
      if (!/^_ga(?:_|$)/.test(name)) return;
      document.cookie = `${name}=; Max-Age=0; path=/; SameSite=Lax`;
    });
  }
  banner.addEventListener("click", (e) => {
    const button = e.target.closest("[data-choice]");
    if (!button) return;
    consent = button.dataset.choice;
    try { localStorage.setItem(key, consent); } catch { /* Choice lasts for this page. */ }
    if (consent === "granted") {
      window[`ga-disable-${measurementId}`] = false;
      if (loaded) gtag("consent", "update", { analytics_storage: "granted" });
      else enable();
    } else {
      window[`ga-disable-${measurementId}`] = true;
      if (loaded) gtag("consent", "update", { analytics_storage: "denied" });
      removeAnalyticsCookies();
    }
    banner.hidden = true;
    settings.focus();
  });
  const settings = document.createElement("button");
  settings.type = "button";
  settings.className = "analytics-settings";
  settings.textContent = "アクセス解析の設定";
  settings.addEventListener("click", () => {
    banner.hidden = false;
    banner.querySelector("button").focus();
  });
  document.querySelector("footer")?.append(settings);
  document.body.append(banner);
  banner.hidden = consent === "granted" || consent === "denied";
  enable();
  const policy = document.querySelector("#privacy-analytics-mode");
  if (policy) policy.textContent = "許可いただいた場合に限り、Google Analyticsで閲覧・ボタン操作を計測します。氏名・メール・相談内容・URLの追加パラメーターは計測に送りません。Googleの解析用Cookieを使います。選択はページ下部の設定から変更できます。";
  const release = document.querySelector("#release-analytics-status");
  if (release) release.textContent = "アクセス解析：Google Analyticsに接続済み。許可した訪問者の閲覧・操作を計測します。";
})();
