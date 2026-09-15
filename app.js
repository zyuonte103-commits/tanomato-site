const toggle = document.querySelector(".menu-toggle");
const nav = document.querySelector("#navigation");
toggle?.addEventListener("click", () => {
  const open = toggle.getAttribute("aria-expanded") !== "true";
  toggle.setAttribute("aria-expanded", String(open));
  nav.classList.toggle("open", open);
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && nav?.classList.contains("open")) {
    nav.classList.remove("open");
    toggle.setAttribute("aria-expanded", "false");
    toggle.focus();
  }
});
const recipient = "tanomato.admin@gmail.com";
const form = document.querySelector("#contact-form");
form?.addEventListener("submit", (e) => {
  e.preventDefault();
  if (!form.reportValidity()) return;
  const d = new FormData(form);
  const subject = "TANOMATOへのご相談：" + d.get("service");
  const body = [
    "お名前：" + d.get("name"),
    "返信先：" + d.get("email"),
    "会社名・屋号：" + d.get("business"),
    "相談内容：" + d.get("service"),
    "希望時期：" + d.get("timing"),
    "",
    "ご相談の詳細：",
    d.get("message"),
  ].join("\n");
  document.querySelector("#mail-body").textContent = body;
  document.querySelector("#mail-open").href =
    "mailto:" +
    recipient +
    "?subject=" +
    encodeURIComponent(subject) +
    "&body=" +
    encodeURIComponent(body);
  document.querySelector("#gmail-open").href =
    "https://mail.google.com/mail/?view=cm&fs=1&to=" +
    encodeURIComponent(recipient) +
    "&su=" +
    encodeURIComponent(subject) +
    "&body=" +
    encodeURIComponent(body);
  document.querySelector("#mail-review").hidden = false;
  document
    .querySelector("#mail-review")
    .scrollIntoView({ behavior: "smooth", block: "nearest" });
});
form?.addEventListener("input", () => {
  document.querySelector("#mail-review").hidden = true;
  document.querySelector("#mail-status").textContent =
    "まだ送信されていません。メール作成画面で送信してください。";
});
document.querySelector("#copy-mail")?.addEventListener("click", async () => {
  try {
    await navigator.clipboard.writeText(
      document.querySelector("#mail-body").textContent,
    );
    document.querySelector("#mail-status").textContent =
      "本文をコピーしました。まだ送信されていません。";
  } catch {
    document.querySelector("#mail-status").textContent =
      "コピーできませんでした。上の本文を選択してコピーしてください。";
  }
});


// Service / portfolio links preserve the visitor's selection, without accepting arbitrary text.
const context = window.TanomatoContact.fromSearch(location.search);
if (form) {
  form.elements.service.value = context.service;
  if (context.message) form.elements.message.value = context.message;
  const contextLine = document.querySelector("#contact-context");
  if (context.message || context.service !== "まだ決まっていない") {
    contextLine.hidden = false;
    contextLine.textContent = [context.service, context.sample, context.industry, context.plan].filter(Boolean).join(" / ") + " のご相談";
  }
  form.addEventListener("input", () => window.tanomatoTrack?.("contact_start"), { once: true });
  for (const id of ["mail-open", "gmail-open"]) {
    document.getElementById(id)?.addEventListener("click", () => window.tanomatoTrack?.("email_compose"));
  }
}

const config = window.TANOMATO_CONFIG || {};
const googleFormUrl = window.TanomatoContact.googleUrl(config, context);
if (googleFormUrl) {
  const googleSection = document.getElementById("google-contact");
  if (googleSection) {
    googleSection.hidden = false;
    document.getElementById("email-fallback").open = false;
    const external = document.getElementById("google-form-link");
    external.href = googleFormUrl;
    external.addEventListener("click", () => window.tanomatoTrack?.("google_form_open"));
    document.getElementById("load-google-form").addEventListener("click", (e) => {
      const frame = document.createElement("iframe");
      frame.title = "TANOMATOへの無料相談 Googleフォーム";
      frame.src = window.TanomatoContact.googleUrl(config, context, true);
      frame.className = "google-contact-frame";
      frame.referrerPolicy = "no-referrer";
      frame.addEventListener("load", () => {
        document.getElementById("google-form-note").textContent = "フォームが表示されない場合は「別タブで開く」をお使いください。末尾の「送信」を押し、Googleフォームの受付完了表示まで確認してください。";
      });
      document.getElementById("google-frame-container").replaceChildren(frame);
      e.currentTarget.hidden = true;
      document.getElementById("google-form-note").textContent = "フォームを読み込んでいます。表示されない場合は「別タブで開く」または下のメールをご利用ください。";
      window.tanomatoTrack?.("google_form_open");
    }, { once: true });
  }
  const policy = document.getElementById("privacy-form-mode");
  if (policy) policy.textContent = "Googleフォームを開くとGoogleに接続します。フォームで送信した氏名・返信先メール・相談内容等はGoogleのサービスを通じて受け付け、TANOMATOがご相談への対応に使用します。Googleの利用規約・プライバシーポリシーも適用されます。代替のメール用入力欄は、メール作成画面への引き継ぎ用です。メール側で送信するまでTANOMATOへ届きません。";
  const release = document.getElementById("release-form-status");
  if (release) release.textContent = "Googleフォーム：接続済み。問い合わせページ内、または別タブでフォームを開いて送信できます。メールの代替手段も残しています。";
}

// Checklists persist only boolean completion states, never contact information.
const checks = Array.from(document.querySelectorAll("[data-check]"));
if (checks.length) {
  const key = "tanomato.preparation.v1";
  let saved = {};
  const storageNote = document.getElementById("checklist-storage");
  try {
    const value = JSON.parse(localStorage.getItem(key) || "{}");
    if (value && typeof value === "object" && !Array.isArray(value)) saved = value;
  } catch {
    storageNote.textContent = "このブラウザーでは保存できない場合があります。チェックはこのページ内で使えます。必要なら印刷してお持ちください。";
  }
  for (const input of checks) input.checked = saved[input.dataset.check] === true;
  function refresh(save = false) {
    const done = checks.filter((input) => input.checked).length;
    document.getElementById("checklist-status").textContent = `${done} / ${checks.length} 項目を確認済み`;
    document.getElementById("checklist-progress").value = done;
    if (save) {
      try {
        localStorage.setItem(key, JSON.stringify(Object.fromEntries(checks.map((input) => [input.dataset.check, input.checked]))));
      } catch {
        storageNote.textContent = "このブラウザーでは保存できませんでした。必要なら印刷してお持ちください。";
      }
      window.tanomatoTrack?.("checklist_use");
      if (done === checks.length) window.tanomatoTrack?.("checklist_complete");
    }
  }
  checks.forEach((input) => input.addEventListener("change", () => refresh(true)));
  document.getElementById("reset-checklist").addEventListener("click", () => {
    checks.forEach((input) => { input.checked = false; });
    refresh(true);
  });
  document.getElementById("print-checklist").addEventListener("click", () => {
    window.tanomatoTrack?.("checklist_print");
    window.print();
  });
  refresh();
}

// Closing the menu after an in-page navigation prevents it obscuring content on mobile.
nav?.addEventListener("click", (e) => {
  if (e.target.closest("a") && nav.classList.contains("open")) {
    nav.classList.remove("open");
    toggle.setAttribute("aria-expanded", "false");
  }
});
