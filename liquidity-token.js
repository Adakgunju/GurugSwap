(() => {
  "use strict";

  const RAYDIUM_API = "https://api-v3.raydium.io";
  const SOL_MINT = "So11111111111111111111111111111111111111112";

  function injectStyles() {
    if (document.getElementById("gurug-liquidity-styles")) return;
    const style = document.createElement("style");
    style.id = "gurug-liquidity-styles";
    style.textContent = `
      #liquidity.gurug-liquidity{padding:72px 20px 32px;max-width:1180px;margin:0 auto}
      .liquidity-grid{display:grid;grid-template-columns:minmax(0,1.15fr) minmax(300px,.85fr);gap:24px}
      .liquidity-card,.liquidity-help{border:1px solid rgba(255,255,255,.12);background:rgba(12,12,12,.88);border-radius:22px;padding:28px;box-shadow:0 18px 60px rgba(0,0,0,.22)}
      .liquidity-kicker{font-size:12px;letter-spacing:.18em;color:#ffe500;font-weight:800}
      .liquidity-title{font-size:34px;line-height:1.05;margin:8px 0 8px;color:#fff}
      .liquidity-sub{color:#bdbdbd;margin:0 0 24px;line-height:1.55}
      .liq-label{display:block;font-size:13px;font-weight:800;letter-spacing:.08em;color:#f3f3f3;margin:18px 0 8px}
      .liq-input{width:100%;box-sizing:border-box;min-height:54px;border-radius:12px;border:1px solid rgba(255,255,255,.16);background:#090909;color:#fff;padding:0 15px;font-size:16px;outline:none}
      .liq-input:focus{border-color:#ffe500}
      .liq-row{display:grid;grid-template-columns:1fr 150px;gap:12px}
      .liq-pair{display:grid;grid-template-columns:1fr 1fr;gap:12px}
      .liq-box{border:1px solid rgba(255,255,255,.1);border-radius:14px;padding:15px;background:rgba(255,255,255,.025)}
      .liq-box-head{display:flex;justify-content:space-between;gap:12px;align-items:center;color:#aaa;font-size:11px;letter-spacing:.1em}
      .liq-box strong{display:block;color:#fff;font-size:18px;margin-top:8px}
      .liq-summary{margin-top:20px;border-top:1px solid rgba(255,255,255,.1);padding-top:18px;display:grid;gap:10px}
      .liq-summary div{display:flex;justify-content:space-between;color:#aaa;font-size:14px}
      .liq-summary strong{color:#fff}
      .liq-action{width:100%;min-height:56px;border:0;border-radius:13px;background:#ffe500;color:#090909;font-size:16px;font-weight:900;letter-spacing:.04em;margin-top:22px;cursor:pointer}
      .liq-action:disabled{opacity:.45;cursor:not-allowed}
      .liq-status{margin-top:14px;min-height:22px;color:#aaa;font-size:13px;line-height:1.5}
      .liq-help h3{color:#fff;margin:0 0 18px;font-size:18px}
      .liq-step{display:grid;grid-template-columns:34px 1fr;gap:12px;margin:0 0 18px}
      .liq-num{width:30px;height:30px;border-radius:50%;display:grid;place-items:center;background:#ffe500;color:#090909;font-weight:900;font-size:12px}
      .liq-step strong{color:#fff;display:block;margin-bottom:4px}
      .liq-step p{margin:0;color:#aaa;font-size:13px;line-height:1.5}
      .liq-note{border-top:1px solid rgba(255,255,255,.1);margin-top:22px;padding-top:18px;color:#9e9e9e;font-size:12px;line-height:1.55}
      .liq-link{color:#ffe500;text-decoration:none}
      @media(max-width:760px){#liquidity.gurug-liquidity{padding:44px 14px 24px}.liquidity-grid{grid-template-columns:1fr}.liquidity-card,.liquidity-help{padding:22px}.liquidity-title{font-size:29px}.liq-row{grid-template-columns:1fr}.liq-pair{grid-template-columns:1fr}.liq-input{font-size:17px}}
    `;
    document.head.appendChild(style);
  }

  function provider() {
    if (typeof getPhantomProvider === "function") return getPhantomProvider();
    return window.phantom?.solana || window.solana || null;
  }

  function createSection() {
    if (document.getElementById("liquidity")) return;
    const section = document.createElement("section");
    section.id = "liquidity";
    section.className = "gurug-liquidity";
    section.innerHTML = `
      <div class="liquidity-grid">
        <div class="liquidity-card">
          <div class="liquidity-kicker">04 / LIQUIDITY</div>
          <h2 class="liquidity-title">CREATE A RAYDIUM POOL.</h2>
          <p class="liquidity-sub">Seed your new Solana token with SOL and create a permissionless CPMM pool.</p>

          <label class="liq-label" for="liqMint">TOKEN MINT ADDRESS</label>
          <input id="liqMint" class="liq-input" placeholder="Paste your token mint address">

          <label class="liq-label">POOL PAIR</label>
          <div class="liq-box">
            <div class="liq-box-head"><span>PAIR</span><span>CPMM</span></div>
            <strong>YOUR TOKEN / SOL</strong>
          </div>

          <div class="liq-pair">
            <div><label class="liq-label" for="liqTokenAmount">TOKEN AMOUNT</label><input id="liqTokenAmount" class="liq-input" inputmode="decimal" type="number" min="0" step="any" placeholder="0"></div>
            <div><label class="liq-label" for="liqSolAmount">SOL AMOUNT</label><input id="liqSolAmount" class="liq-input" inputmode="decimal" type="number" min="0" step="any" placeholder="0"></div>
          </div>

          <div class="liq-row">
            <div><label class="liq-label" for="liqPrice">INITIAL PRICE (SOL)</label><input id="liqPrice" class="liq-input" inputmode="decimal" type="number" min="0" step="any" placeholder="Calculated from deposits"></div>
            <div><label class="liq-label" for="liqFee">FEE TIER</label><select id="liqFee" class="liq-input"><option value="0.25">0.25%</option><option value="0.01">0.01%</option><option value="1">1.00%</option></select></div>
          </div>

          <div class="liq-summary">
            <div><span>POOL TYPE</span><strong>RAYDIUM CPMM</strong></div>
            <div><span>INITIAL PRICE</span><strong id="liqSummaryPrice">—</strong></div>
            <div><span>POOL CREATION COST</span><strong>CALCULATED AT SIGNING</strong></div>
            <div><span>EXISTING POOL</span><strong id="liqExisting">CHECKING…</strong></div>
          </div>

          <button id="liqCreateButton" class="liq-action" type="button">CREATE CPMM POOL</button>
          <div id="liqStatus" class="liq-status">Connect your wallet and enter the token mint and initial liquidity.</div>
        </div>

        <aside class="liquidity-help">
          <h3>HOW LIQUIDITY WORKS</h3>
          <div class="liq-step"><span class="liq-num">1</span><div><strong>SELECT YOUR TOKEN</strong><p>Use the mint address of the SPL token you created in GurugSwap.</p></div></div>
          <div class="liq-step"><span class="liq-num">2</span><div><strong>SET THE INITIAL PRICE</strong><p>Your token amount and SOL amount determine the starting pool price.</p></div></div>
          <div class="liq-step"><span class="liq-num">3</span><div><strong>SEED THE POOL</strong><p>Both assets are deposited into the Raydium CPMM pool in the same creation transaction.</p></div></div>
          <div class="liq-step"><span class="liq-num">4</span><div><strong>APPROVE IN PHANTOM</strong><p>You remain in control. GurugSwap never receives your private key or takes custody of your funds.</p></div></div>
          <div class="liq-note">Raydium currently recommends CPMM for most new permissionless pools. Pool creation also requires SOL for account creation and network/priority costs. <a class="liq-link" href="https://docs.raydium.io/" target="_blank" rel="noopener noreferrer">Raydium docs ↗</a></div>
        </aside>
      </div>
    `;
    const tokenInfo = document.getElementById("token-info");
    const swap = document.getElementById("swap");
    const anchor = tokenInfo || swap;
    if (anchor?.parentNode) anchor.parentNode.insertBefore(section, anchor.nextSibling);
    else document.querySelector("main")?.appendChild(section);
  }

  function setStatus(message) { const el = document.getElementById("liqStatus"); if (el) el.textContent = message; }

  function updatePrice() {
    const token = Number(document.getElementById("liqTokenAmount")?.value);
    const sol = Number(document.getElementById("liqSolAmount")?.value);
    const price = token > 0 && sol > 0 ? sol / token : 0;
    const input = document.getElementById("liqPrice");
    const summary = document.getElementById("liqSummaryPrice");
    if (price > 0) { input.value = String(price); summary.textContent = price < 0.000001 ? price.toExponential(6) + " SOL" : price.toFixed(9).replace(/0+$/,"").replace(/\.$/,"") + " SOL"; }
    else summary.textContent = "—";
  }

  async function checkExistingPool() {
    const mint = document.getElementById("liqMint")?.value.trim();
    const el = document.getElementById("liqExisting");
    if (!el) return;
    if (!mint) { el.textContent = "ENTER MINT"; return; }
    el.textContent = "CHECKING…";
    try {
      const url = RAYDIUM_API + "/pools/info/list-v2?mint1=" + encodeURIComponent(mint) + "&mint2=" + encodeURIComponent(SOL_MINT) + "&poolType=standard&page=1&pageSize=10";
      const res = await fetch(url, { cache: "no-store" });
      const json = await res.json();
      const count = Array.isArray(json?.data?.data) ? json.data.data.length : Array.isArray(json?.data) ? json.data.length : 0;
      el.textContent = count > 0 ? count + " POOL(S) FOUND" : "NONE FOUND";
    } catch (_) { el.textContent = "CHECK UNAVAILABLE"; }
  }

  function bind() {
    const mint = document.getElementById("liqMint");
    const tokenAmount = document.getElementById("liqTokenAmount");
    const solAmount = document.getElementById("liqSolAmount");
    [tokenAmount, solAmount].forEach(el => el?.addEventListener("input", updatePrice));
    mint?.addEventListener("change", checkExistingPool);
    mint?.addEventListener("blur", checkExistingPool);
    document.getElementById("liqCreateButton")?.addEventListener("click", async () => {
      const p = provider();
      if (!p) { setStatus("Connect Phantom first."); return; }
      if (!p.publicKey) { setStatus("Connect your wallet first."); return; }
      const mintValue = mint?.value.trim();
      const tokenAmountValue = Number(tokenAmount?.value);
      const solAmountValue = Number(solAmount?.value);
      if (!mintValue) { setStatus("Enter the token mint address."); return; }
      if (!Number.isFinite(tokenAmountValue) || tokenAmountValue <= 0) { setStatus("Enter a token amount greater than zero."); return; }
      if (!Number.isFinite(solAmountValue) || solAmountValue <= 0) { setStatus("Enter a SOL amount greater than zero."); return; }
      updatePrice();
      setStatus("Pool creation transaction wiring is being prepared. Your wallet will sign the final Raydium transaction.");
    });
  }

  function init() {
    injectStyles(); createSection(); bind();
    window.addEventListener("gurug:token-created", event => {
      const mint = event?.detail?.mint || event?.detail?.mintAddress || "";
      if (mint) { const input = document.getElementById("liqMint"); if (input) { input.value = mint; checkExistingPool(); } }
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
})();