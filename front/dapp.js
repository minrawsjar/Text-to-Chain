import { renderDashContent } from "./elements/dash.js";
import { renderPoolsPanel, mockPools } from "./elements/pools.js";

const dappContent = document.getElementById("dapp-content");
const sidebarStats = document.getElementById("dapp-sidebar-stats");

const LOGIN_KEY = "ttc-login";

function isLoggedIn() {
  return !!localStorage.getItem(LOGIN_KEY);
}

function updateNavAuth() {
  const loginBtn = document.getElementById("nav-login");
  const walletLink = document.getElementById("nav-wallet");
  if (isLoggedIn()) {
    if (loginBtn) loginBtn.style.display = "none";
    if (walletLink) walletLink.style.display = "inline-flex";
  } else {
    if (loginBtn) loginBtn.style.display = "inline-flex";
    if (walletLink) walletLink.style.display = "none";
  }
}

function getFilters() {
  const country = document.querySelector('[data-filter="country"]')?.value || "";
  const currency = document.querySelector('[data-filter="currency"]')?.value || "";
  const provider = document.querySelector('[data-filter="provider"]')?.value || "";
  return { country, currency, provider };
}

function renderWalletPanel() {
  const method = localStorage.getItem(LOGIN_KEY) || "wallet";
  const isMobile = method === "mobile";
  const id = isMobile ? "+1 ••• ••• 1234" : "0x7f3a9b2c1d4e5f6a7b8c9d0e1f2a3b4c5d6a2c1";
  return `
    <div class="dapp-wallet-panel">
      <h2 class="dapp-wallet-panel__title">Wallet</h2>
      <div class="dapp-wallet-user">
        <div class="dapp-wallet-user__row">
          <div class="dapp-wallet-user__avatar">${isMobile ? "📱" : "◆"}</div>
          <div>
            <div class="dapp-wallet-user__name">${isMobile ? "Mobile (OTC)" : "Wallet"}</div>
            <div class="dapp-wallet-user__id">${id}</div>
          </div>
        </div>
      </div>
      <div class="dapp-wallet-actions__title">Quick actions</div>
      <div class="dapp-wallet-actions">
        <button type="button" class="dapp-wallet-actions__btn"><span>↑</span><span>Send</span></button>
        <button type="button" class="dapp-wallet-actions__btn"><span>↓</span><span>Receive</span></button>
        <button type="button" class="dapp-wallet-actions__btn"><span>⇄</span><span>Swap</span></button>
        <button type="button" class="dapp-wallet-actions__btn"><span>◇</span><span>Bridge</span></button>
      </div>
    </div>
  `;
}

function renderSidebarStats() {
  const totalTVL = "2.1M";
  const topPoolsByTvl = [...mockPools].sort((a, b) => {
    const parse = (s) => parseFloat(String(s).replace(/[M%—]/g, "")) || 0;
    return parse(b.tvl) - parse(a.tvl);
  });
  const top10Pools = topPoolsByTvl.slice(0, 10);
  const mostYieldPool = mockPools.filter((p) => p.apyTtc && p.apyTtc !== "—").sort((a, b) => parseFloat(String(b.apyTtc)) - parseFloat(String(a.apyTtc)))[0];
  const newPool = topPoolsByTvl[topPoolsByTvl.length - 1];
  const topYieldVal = mostYieldPool?.apyTtc ?? "—";
  if (!sidebarStats) return;
  sidebarStats.innerHTML = `
    <div class="dapp-sidebar__stat-section">
      <div class="dapp-sidebar__stat-row">
        <span class="dapp-sidebar__stat-label">TVL</span>
        <span class="dapp-sidebar__stat-value">${totalTVL}</span>
      </div>
      <div class="dapp-sidebar__stat-row">
        <span class="dapp-sidebar__stat-label">Top yield</span>
        <span class="dapp-sidebar__stat-value">${topYieldVal}</span>
      </div>
    </div>
    <div class="dapp-sidebar__stat-section">
      <h3 class="dapp-sidebar__stat-title">Top 10 pools</h3>
      <ul class="dapp-sidebar__stat-list">
        ${top10Pools.map((p) => `<li class="dapp-sidebar__stat-item"><span>${p.country} · ${p.provider}</span><span class="dapp-sidebar__stat-num">${p.tvl}</span></li>`).join("")}
      </ul>
    </div>
    <div class="dapp-sidebar__stat-section dapp-sidebar__stat-section--highlight">
      <h3 class="dapp-sidebar__stat-title">Most yield</h3>
      <div class="dapp-sidebar__stat-item dapp-sidebar__stat-item--highlight">
        <span>${mostYieldPool ? `${mostYieldPool.country} · ${mostYieldPool.provider}` : "—"}</span>
        <span class="dapp-sidebar__stat-num">${mostYieldPool?.apyTtc ?? "—"}</span>
      </div>
    </div>
    <div class="dapp-sidebar__stat-section dapp-sidebar__stat-section--highlight">
      <h3 class="dapp-sidebar__stat-title">New pool</h3>
      <div class="dapp-sidebar__stat-item dapp-sidebar__stat-item--highlight">
        <span>${newPool ? `${newPool.country} · ${newPool.provider}` : "—"}</span>
        <span class="dapp-sidebar__stat-num">${newPool?.active ? "Live" : "Soon"}</span>
      </div>
    </div>
  `;
}

function getPoolDetailFromHash() {
  const hash = (window.location.hash || "#pools").replace("#", "");
  if (!hash.startsWith("pools/")) return null;
  const poolId = hash.slice(6);
  return getPoolById(poolId);
}

function renderPanel(panel) {
  if (!dappContent) return;
  dappContent.classList.remove("dapp-content--visible");
  dappContent.offsetHeight;
  requestAnimationFrame(() => {
    if (panel === "pools") {
      const pool = getPoolDetailFromHash();
      if (pool && pool.active) {
        dappContent.innerHTML = renderPoolDetailView(pool);
        bindPoolDetailBack();
      } else {
        dappContent.innerHTML = renderPoolsPanel(getFilters());
        bindFilterListeners();
        bindPoolCardClicks();
      }
    } else if (panel === "wallet") {
      dappContent.innerHTML = renderWalletPanel();
    } else {
      dappContent.innerHTML = renderDashContent();
    }
    requestAnimationFrame(() => dappContent.classList.add("dapp-content--visible"));
  });
}

function bindFilterListeners() {
  document.querySelectorAll(".dash-filter__select").forEach((select) => {
    select.addEventListener("change", () => {
      dappContent.innerHTML = renderPoolsPanel(getFilters());
      bindFilterListeners();
      bindPoolCardClicks();
    });
  });
}

function getPoolById(poolId) {
  const [country, ...providerParts] = poolId.split("-");
  const provider = providerParts.join("-");
  return mockPools.find((p) => p.country === country && p.provider === provider);
}

function renderPoolDetailView(pool) {
  if (!pool) return "";
  const desc = `Phone credit locked to ${pool.provider} value unit - ${pool.currency} (${pool.currencyCode})`;
  return `
    <div class="pool-detail">
      <header class="pool-detail__header">
        <button type="button" class="pool-detail__back" id="pool-detail-back" aria-label="Back to pools">← Pools</button>
        <div class="pool-detail__title-row">
          <h1 class="pool-detail__title">${pool.countryName} · ${pool.provider}</h1>
          <span class="pool-detail__badge">ACTIVE</span>
        </div>
        <p class="pool-detail__desc">${desc}</p>
      </header>
      <div class="pool-detail__stats">
        <div class="pool-detail__stat">
          <span class="pool-detail__stat-label">TVL</span>
          <span class="pool-detail__stat-value">${pool.tvl}</span>
        </div>
        <div class="pool-detail__stat">
          <span class="pool-detail__stat-label">Volume 24h</span>
          <span class="pool-detail__stat-value">${pool.tvl}</span>
        </div>
        <div class="pool-detail__stat">
          <span class="pool-detail__stat-label">APY (TTC)</span>
          <span class="pool-detail__stat-value pool-detail__stat-value--accent">${pool.apyTtc || "—"}</span>
        </div>
        <div class="pool-detail__stat">
          <span class="pool-detail__stat-label">Fee tier</span>
          <span class="pool-detail__stat-value">0.3%</span>
        </div>
        <div class="pool-detail__stat">
          <span class="pool-detail__stat-label">Liquidity providers</span>
          <span class="pool-detail__stat-value">—</span>
        </div>
      </div>
      <div class="pool-detail__grid">
        <section class="pool-detail__card">
          <h2 class="pool-detail__card-title">Deposit liquidity</h2>
          <p class="pool-detail__card-desc">Add USDC to the pool and earn TTC yield.</p>
          <div class="pool-detail__input-wrap">
            <input type="text" class="pool-detail__input" placeholder="0.00" aria-label="Amount" />
            <span class="pool-detail__token">USDC</span>
          </div>
          <button type="button" class="pool-detail__btn pool-detail__btn--primary">Deposit</button>
        </section>
        <section class="pool-detail__card">
          <h2 class="pool-detail__card-title">Withdraw liquidity</h2>
          <p class="pool-detail__card-desc">Remove your share from the pool.</p>
          <div class="pool-detail__input-wrap">
            <input type="text" class="pool-detail__input" placeholder="0.00" aria-label="Amount" />
            <span class="pool-detail__token">LP</span>
          </div>
          <button type="button" class="pool-detail__btn pool-detail__btn--secondary">Withdraw</button>
        </section>
        <section class="pool-detail__card pool-detail__card--wide">
          <h2 class="pool-detail__card-title">Your position</h2>
          <div class="pool-detail__position-row">
            <span class="pool-detail__position-label">Deposited</span>
            <span class="pool-detail__position-value">0.00 USDC</span>
          </div>
          <div class="pool-detail__position-row">
            <span class="pool-detail__position-label">Pool share</span>
            <span class="pool-detail__position-value">0%</span>
          </div>
          <div class="pool-detail__position-row">
            <span class="pool-detail__position-label">Fees earned (TTC)</span>
            <span class="pool-detail__position-value">0.00</span>
          </div>
          <div class="pool-detail__position-row">
            <span class="pool-detail__position-label">Unclaimed yield</span>
            <span class="pool-detail__position-value pool-detail__stat-value--accent">0.00 TTC</span>
          </div>
        </section>
        <section class="pool-detail__card">
          <h2 class="pool-detail__card-title">Swap</h2>
          <p class="pool-detail__card-desc">Convert between USDC and pool tokens.</p>
          <div class="pool-detail__swap-row">
            <div class="pool-detail__input-wrap">
              <input type="text" class="pool-detail__input" placeholder="0.00" />
              <span class="pool-detail__token">USDC</span>
            </div>
            <span class="pool-detail__swap-arrow">↓</span>
            <div class="pool-detail__input-wrap">
              <input type="text" class="pool-detail__input" placeholder="0.00" readonly />
              <span class="pool-detail__token">LP</span>
            </div>
          </div>
          <button type="button" class="pool-detail__btn pool-detail__btn--secondary">Swap</button>
        </section>
        <section class="pool-detail__card pool-detail__card--wide">
          <h2 class="pool-detail__card-title">Pool info</h2>
          <div class="pool-detail__position-row">
            <span class="pool-detail__position-label">Settlement asset</span>
            <span class="pool-detail__position-value">USDC</span>
          </div>
          <div class="pool-detail__position-row">
            <span class="pool-detail__position-label">Value unit</span>
            <span class="pool-detail__position-value">${pool.currency} (${pool.currencyCode})</span>
          </div>
          <div class="pool-detail__position-row">
            <span class="pool-detail__position-label">Provider</span>
            <span class="pool-detail__position-value">${pool.provider}</span>
          </div>
        </section>
      </div>
    </div>
  `;
}

function bindPoolDetailBack() {
  const back = document.getElementById("pool-detail-back");
  if (back) back.addEventListener("click", () => {
    window.location.hash = "pools";
    setActive("pools");
  });
}

function openPoolDetails(pool) {
  const poolId = `${pool.country}-${pool.provider}`;
  window.location.hash = `pools/${poolId}`;
  setActive("pools");
}

function bindPoolCardClicks() {
  document.querySelectorAll(".pool-card--clickable").forEach((card) => {
    const poolId = card.getAttribute("data-pool-id");
    if (!poolId) return;
    const openDetails = () => {
      const pool = getPoolById(poolId);
      if (pool && pool.active) openPoolDetails(pool);
    };
    card.addEventListener("click", openDetails);
    card.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        openDetails();
      }
    });
  });
}

function initSidebar() {
  const sidebar = document.getElementById("dapp-sidebar");
  const openBtn = document.getElementById("sidebar-open");
  const closeBtn = document.getElementById("sidebar-close");
  openBtn?.addEventListener("click", () => sidebar?.classList.add("is-open"));
  closeBtn?.addEventListener("click", () => sidebar?.classList.remove("is-open"));
}

function initLoginModal() {
  const modal = document.getElementById("login-modal");
  const loginBtn = document.getElementById("nav-login");
  const backdrop = document.getElementById("login-modal-backdrop");
  const closeBtn = document.getElementById("login-modal-close");
  const openModal = () => {
    if (modal) {
      modal.hidden = false;
      modal.setAttribute("aria-hidden", "false");
      loginBtn?.setAttribute("aria-expanded", "true");
    }
  };
  const closeModal = () => {
    if (modal) {
      modal.hidden = true;
      modal.setAttribute("aria-hidden", "true");
      loginBtn?.setAttribute("aria-expanded", "false");
    }
  };
  loginBtn?.addEventListener("click", openModal);
  backdrop?.addEventListener("click", closeModal);
  closeBtn?.addEventListener("click", closeModal);
  modal?.querySelectorAll(".login-modal__btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const method = btn.getAttribute("data-login");
      if (method) {
        localStorage.setItem(LOGIN_KEY, method);
        closeModal();
        updateNavAuth();
        window.location.hash = "wallet";
        setActive("wallet");
      }
    });
  });
}

function setActive(panel) {
  const hash = (window.location.hash || "#pools").replace("#", "");
  const current = panel != null ? panel : hash;
  const panelForNav = current.startsWith("pools") ? "pools" : current;
  const panelForRender = current.startsWith("pools") ? "pools" : (current || "pools");
  document.querySelectorAll(".nav-dapp-link").forEach((link) => {
    link.classList.toggle("is-active", link.getAttribute("data-panel") === panelForNav);
  });
  const walletLink = document.getElementById("nav-wallet");
  if (walletLink) walletLink.classList.toggle("is-active", panelForNav === "wallet");
  renderPanel(panelForRender);
}

document.addEventListener("DOMContentLoaded", () => {
  initSidebar();
  updateNavAuth();
  initLoginModal();
  renderSidebarStats();

  const html = document.documentElement;
  const themeToggle = document.querySelector(".theme-toggle");
  const saved = localStorage.getItem("ttc-theme");
  if (saved === "light") html.setAttribute("data-theme", "light");
  themeToggle?.addEventListener("click", () => {
    const isLight = html.getAttribute("data-theme") === "light";
    html.setAttribute("data-theme", isLight ? "" : "light");
    localStorage.setItem("ttc-theme", isLight ? "dark" : "light");
  });

  const navLinks = document.querySelectorAll(".nav-dapp-link");
  const walletLink = document.getElementById("nav-wallet");

  const initialHash = window.location.hash.replace("#", "");
  const initialPanel = initialHash || "pools";
  if (!window.location.hash) window.location.hash = "pools";
  setActive(initialPanel);

  window.addEventListener("hashchange", () => setActive(null));

  navLinks.forEach((link) => {
    link.addEventListener("click", (e) => {
      e.preventDefault();
      const panel = link.getAttribute("data-panel");
      if (panel) {
        window.location.hash = panel;
        setActive(panel);
      }
    });
  });

  walletLink?.addEventListener("click", (e) => {
    e.preventDefault();
    window.location.hash = "wallet";
    setActive("wallet");
  });
});
