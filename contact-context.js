// Shared allowlists keep arbitrary query-string text out of forms and analytics.
(function (root) {
  const services = ["1ページサイト", "企業サイト", "LP制作", "サイト修正とデザイン制作", "更新・運用", "まだ決まっていない"];
  const samples = {
    "余白珈琲": "1ページサイト",
    "NORTHLINE": "企業サイト",
    "ノースライン建設": "企業サイト",
    "スミカ住設の相談会": "LP制作",
    "部分修正・デザイン": "サイト修正とデザイン制作",
  };
  function fromSearch(search) {
    const params = new URLSearchParams(search);
    const sample = Object.hasOwn(samples, params.get("sample")) ? params.get("sample") : "";
    const service = services.includes(params.get("service")) ? params.get("service") : (samples[sample] || "まだ決まっていない");
    const industry = ["カフェ・飲食店", "小規模企業・個人事業"].includes(params.get("industry")) ? params.get("industry") : "";
    const plan = params.get("plan") === "完全お任せ1ページ制作" ? params.get("plan") : "";
    const lines = [sample && `参考制作例：${sample}`, industry && `業種：${industry}`, plan && `希望プラン：${plan}`].filter(Boolean);
    return { service, sample, industry, plan, message: lines.length ? lines.join("\n") + "\n\n" : "" };
  }
  const api = { fromSearch };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.TanomatoContact = api;
})(typeof window === "undefined" ? globalThis : window);
