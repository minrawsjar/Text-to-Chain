/**
 * Step cards component for onboarding / feature steps
 */
const DEFAULT_STEPS = [
  { title: "Text JOIN", desc: "Send JOIN to the number. No app, no wallet." },
  { title: "Get your wallet", desc: "We create a wallet you control via SMS." },
  { title: "Receive & send", desc: "Get tokens and airtime. Send to anyone." },
];

export function renderStepCards(steps = []) {
  const list = Array.isArray(steps) && steps.length ? steps : DEFAULT_STEPS;
  return list.map((s, i) => stepCardHtml(s, i)).join("");
}

/** Single card HTML */
function stepCardHtml(s, i) {
  return `
    <div class="step-card" data-step="${i + 1}">
      <div class="step-card__title">${s.title || `Step ${i + 1}`}</div>
      <div class="step-card__desc">${s.desc || ""}</div>
    </div>
  `.trim();
}

/** Full spotlight section content: rows + cards so section height drives scroll effect */
export function renderSpotlightContent(steps = []) {
  const list = Array.isArray(steps) && steps.length ? steps : DEFAULT_STEPS;
  const cards = list.map((s, i) => stepCardHtml(s, i));
  return [
    `<div class="row row--start"><div class="col">${cards[0] || ""}</div></div>`,
    `<div class="row row-spacer"><div class="spacer"></div></div>`,
    `<div class="row row--end"><div class="col">${cards[1] || ""}</div></div>`,
    `<div class="row row-spacer"><div class="spacer"></div></div>`,
    `<div class="row row--start"><div class="col">${cards[2] || ""}</div></div>`,
  ].join("\n");
}
