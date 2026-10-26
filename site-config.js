// Public configuration only. Never put a password, API secret, or access token here.
window.TANOMATO_CONFIG = Object.freeze({
  gaMeasurementId: "G-NB7H3NNSPL",
  // Googleフォームのアドレスと、事前入力に使う項目の番号（entry.〇〇の〇〇だけ）。
  // url が空のあいだは、問い合わせページはメールの案内だけを出す。手順は TANOMATO_事務書類\問い合わせフォーム_設定手順.md
  contactForm: {
    url: "https://docs.google.com/forms/d/e/1FAIpQLSfQfML7TOMw2u8-yZaGBzPEn0cDybhgVFXLZhY7YdSaCKVNKg/viewform",
    entries: { service: "945997463", sample: "1826202533", industry: "1408830789", plan: "128500433" },
  },
});
