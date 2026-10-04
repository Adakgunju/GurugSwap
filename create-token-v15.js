/* GURUGSWAP — CREATE TOKEN v2
 * Creates a standard SPL Token + Metaplex Token Metadata on Solana mainnet.
 * Logo + metadata are uploaded to permanent Arweave storage through Irys.
 * The connected wallet signs all Solana/storage transactions; GurugSwap never
 * receives or stores the user's private key.
 */
(() => {
  const SOLANA_RPCS = [
    "https://solana-rpc.publicnode.com",
    "https://api.mainnet.solana.com",
    "https://api.mainnet-beta.solana.com"
  ];

  async function getWorkingRpc() {
    for (const rpc of SOLANA_RPCS) {
      try {
        const response = await fetch(rpc, {
          method: "POST",
          headers: {"content-type": "application/json"},
          body: JSON.stringify({jsonrpc:"2.0",id:1,method:"getHealth",params:[]}),
          cache: "no-store"
        });
        if (response.ok) {
          const data = await response.json();
          if (data?.result === "ok" || data?.result === "healthy") return rpc;
        }
      } catch {}
    }
    throw new Error("No Solana RPC endpoint is currently available. Please try again.");
  }
  const UMI_CDN = "https://esm.sh/@metaplex-foundation/umi@1.5.1?bundle";
  const UMI_DEFAULTS_CDN = "https://esm.sh/@metaplex-foundation/umi-bundle-defaults@1.5.1?bundle";
  const UMI_WALLET_CDN = "https://esm.sh/@metaplex-foundation/umi-signer-wallet-adapters@1.5.1?bundle";
  const MPL_METADATA_CDN = "https://esm.sh/@metaplex-foundation/mpl-token-metadata@3.4.0?bundle";
  const MPL_TOOLBOX_CDN = "https://esm.sh/@metaplex-foundation/mpl-toolbox@0.11.4?bundle";
  const BUFFER_CDN = "https://esm.sh/buffer@6.0.3?bundle";
  const STYLE_ID = "gurug-create-token-style";
  const SECTION_ID = "create-token";

  const css = `
#create-token{padding:42px 5vw 18px}
.create-token-card{max-width:760px;margin:0 auto;padding:24px;border:1px solid rgba(255,229,0,.34);border-radius:22px;background:linear-gradient(145deg,rgba(27,29,17,.94),rgba(12,14,9,.94));box-shadow:0 18px 55px rgba(0,0,0,.34),inset 0 0 35px rgba(255,229,0,.018)}
.create-token-head{display:flex;align-items:flex-start;justify-content:space-between;gap:18px;margin-bottom:20px}
.create-token-kicker{color:#ffe500;font-size:10px;font-weight:800;letter-spacing:.18em}
.create-token-title{margin:7px 0 0;color:#fff;font-size:25px;line-height:1.05}
.create-token-copy{margin:8px 0 0;color:#8f8f82;font-size:10px;line-height:1.6;max-width:510px}
.create-token-network{flex:0 0 auto;padding:7px 9px;border:1px solid rgba(255,229,0,.28);border-radius:9px;color:#ffe500;font-size:8px;font-weight:800;letter-spacing:.12em}
.create-token-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}
.create-token-field{display:flex;flex-direction:column;gap:7px}
.create-token-field.full{grid-column:1/-1}
.create-token-field label{color:#85867a;font-size:8px;font-weight:800;letter-spacing:.14em}
.create-token-field input{width:100%;box-sizing:border-box;border:1px solid rgba(255,255,255,.08);border-radius:11px;background:#10110d;color:#fff;padding:13px 12px;outline:0;font-size:12px}
.create-token-field input:focus{border-color:rgba(255,229,0,.55);box-shadow:0 0 0 2px rgba(255,229,0,.05)}
.create-token-field small{color:#66685f;font-size:8px;line-height:1.4}
.create-token-options{margin-top:14px;padding:13px 14px;border:1px solid rgba(255,255,255,.065);border-radius:12px;background:#10110d}
.create-token-check{display:flex;align-items:flex-start;gap:10px;cursor:pointer}
.create-token-check input{margin-top:2px;accent-color:#ffe500}
.create-token-check strong{display:block;color:#ddd;font-size:10px}
.create-token-check span{display:block;margin-top:4px;color:#77786e;font-size:8px;line-height:1.45}
.create-token-warning{margin-top:10px;color:#b5b5a9;font-size:8px;line-height:1.5}
.create-token-warning b{color:#ffe500}
.create-token-button{width:100%;margin-top:16px;min-height:48px;border:0;border-radius:11px;background:#ffe500;color:#10110d;font-size:11px;font-weight:900;letter-spacing:.13em;cursor:pointer}
.create-token-button:hover{filter:brightness(1.04)}
.create-token-button:disabled{opacity:.5;cursor:not-allowed}
.create-token-status{margin-top:12px;padding:13px 14px;border:1px solid rgba(255,255,255,.07);border-radius:11px;background:#10110d;color:#929388;font-size:9px;line-height:1.55}
.create-token-status.active{border-color:rgba(255,229,0,.35);color:#ddd}
.create-token-status.success{border-color:rgba(255,229,0,.5);color:#fff}
.create-token-status.error{border-color:rgba(255,120,120,.35);color:#ffadad}
.create-token-result{margin-top:12px;padding:14px;border:1px solid rgba(255,229,0,.25);border-radius:12px;background:rgba(255,229,0,.035)}
.create-token-result[hidden]{display:none}
.create-token-result-label{color:#7f8074;font-size:7px;letter-spacing:.14em}
.create-token-result-address{display:flex;align-items:center;gap:10px;margin-top:7px}
.create-token-result-address code{min-width:0;flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:#fff;font-size:9px}
.create-token-copy{border:0;background:transparent;color:#ffe500;font-size:8px;font-weight:800;letter-spacing:.1em;cursor:pointer}
.create-token-result-links{display:flex;gap:14px;margin-top:10px}
.create-token-result-links a{color:#ffe500;text-decoration:none;font-size:8px;letter-spacing:.1em}
.create-token-note{margin-top:13px;color:#66685f;font-size:8px;line-height:1.55}
@media(max-width:520px){#create-token{padding:30px 18px 14px}.create-token-card{padding:17px;border-radius:18px}.create-token-head{gap:10px}.create-token-title{font-size:21px}.create-token-grid{grid-template-columns:1fr}.create-token-field.full{grid-column:auto}.create-token-network{font-size:7px}.create-token-button{min-height:46px}}
/* GurugSwap Create Token visual upgrade */
/* Mobile readability pass */
/* Mobile alignment correction */
#create-token .create-token-head{align-items:flex-start}
#create-token .create-token-copy{letter-spacing:normal!important;word-spacing:normal!important;max-width:none!important;width:100%!important;display:block!important;text-align:left!important}
#create-token .create-token-title{letter-spacing:-.02em!important;word-spacing:normal!important}
@media(max-width:560px){
  #create-token .create-token-head{display:block!important}
  #create-token .create-token-network{display:inline-block!important;margin-top:16px!important}
  #create-token .create-token-copy{font-size:15px!important;line-height:1.55!important;letter-spacing:normal!important;word-spacing:normal!important}
  #create-token .create-token-title{font-size:28px!important;line-height:1.08!important}
}

#create-token .create-token-title{color:#ffffff!important}
#create-token .create-token-copy{color:#f2f2ec!important;font-weight:600}
#create-token .create-token-field label{color:#f1f1e9!important;font-size:15px!important}
#create-token .create-token-field small{color:#c8c9bd!important;font-size:13px!important}
#create-token .create-token-field input{color:#ffffff!important;background:#0b0d0a!important;border-color:rgba(255,255,255,.22)!important}
#create-token .create-token-field input::placeholder{color:#bfc0b8!important;opacity:1!important}
#create-token .create-token-options-title,
#create-token .create-token-check strong,
#create-token .create-token-cost-title{color:#ffffff!important}
#create-token .create-token-check span{color:#d2d3c9!important;font-size:14px!important}
#create-token .create-token-warning{color:#c9cabf!important;font-size:13px!important}
#create-token .create-token-cost-row{color:#d4d5ca!important;font-size:14px!important}
#create-token .create-token-cost-row strong{color:#ffffff!important}
#create-token .create-token-help h3,
#create-token .create-token-help-section h4{color:#ffffff!important}
#create-token .create-token-help-step strong{color:#f5f5ee!important}
#create-token .create-token-help-step span,
#create-token .create-token-help-section p{color:#d0d1c7!important}
#create-token .create-token-note{color:#bfc0b6!important;font-size:13px!important}
@media(max-width:560px){
  #create-token{padding:28px 14px 18px!important}
  #create-token .create-token-card{padding:22px 18px!important}
  #create-token .create-token-title{font-size:28px!important;line-height:1.08!important}
  #create-token .create-token-copy{font-size:15px!important;line-height:1.65!important}
  #create-token .create-token-network{font-size:10px!important}
  #create-token .create-token-field label{font-size:15px!important}
  #create-token .create-token-field input{font-size:17px!important;min-height:56px!important}
  #create-token .create-token-field small{font-size:13px!important}
  #create-token .create-token-check strong{font-size:16px!important}
  #create-token .create-token-check span{font-size:14px!important}
  #create-token .create-token-cost-row{font-size:14px!important}
  #create-token .create-token-cost-total{font-size:16px!important}
  #create-token .create-token-cost-total strong{font-size:20px!important}
  #create-token .create-token-button{font-size:15px!important;min-height:56px!important}
  #create-token .create-token-status{font-size:14px!important}
}

#create-token{padding:54px 5vw 24px}
.create-token-card{max-width:1180px;margin:0 auto;padding:30px}
.create-token-head{margin-bottom:28px}
.create-token-kicker{font-size:12px}
.create-token-title{font-size:30px}
.create-token-copy{font-size:15px}
.create-token-field label{font-size:14px}
.create-token-field input{padding:15px 14px;font-size:16px}
.create-token-field small{font-size:12px}
.create-token-options{margin-top:24px;padding:19px}
.create-token-check strong{font-size:15px}
.create-token-check span{font-size:13px}
.create-token-button{min-height:54px;font-size:14px}
.create-token-status{font-size:13px}
.create-token-shell{max-width:1180px;margin:0 auto;display:grid;grid-template-columns:minmax(0,1.05fr) minmax(330px,.78fr);gap:28px;align-items:start}
.create-token-shell .create-token-card{max-width:none;margin:0}
.create-token-help{padding:30px;position:sticky;top:24px;border:1px solid rgba(255,229,0,.26);border-radius:24px;background:linear-gradient(145deg,rgba(27,29,17,.97),rgba(10,12,9,.97));box-shadow:0 18px 55px rgba(0,0,0,.34)}
.create-token-help-kicker{color:#ffe500;font-size:12px;font-weight:900;letter-spacing:.15em}
.create-token-help h3{margin:9px 0 22px;color:#fff;font-size:26px;line-height:1.12}
.create-token-help-step{display:flex;gap:13px;padding:14px 0;border-bottom:1px solid rgba(255,255,255,.065)}
.create-token-help-num{width:27px;height:27px;flex:0 0 27px;border-radius:50%;background:rgba(255,229,0,.12);border:1px solid rgba(255,229,0,.28);display:flex;align-items:center;justify-content:center;color:#ffe500;font-size:12px;font-weight:900}
.create-token-help-step strong{display:block;color:#eee;font-size:15px}
.create-token-help-step span{display:block;margin-top:4px;color:#929388;font-size:13px;line-height:1.5}
.create-token-help-section{margin-top:25px;padding-top:20px;border-top:1px solid rgba(255,255,255,.08)}
.create-token-help-section h4{margin:0 0 11px;color:#fff;font-size:17px}
.create-token-help-section p{margin:0 0 13px;color:#929388;font-size:13px;line-height:1.6}
.create-token-help-tip{padding:13px 14px;border-radius:11px;background:rgba(255,229,0,.055);border:1px solid rgba(255,229,0,.13);color:#b9baae;font-size:12px;line-height:1.55}
.create-token-logo-wrap{display:grid;grid-template-columns:1fr 118px;gap:14px;align-items:center}
.create-token-logo-upload{min-height:118px;border:1px dashed rgba(255,229,0,.35);border-radius:14px;background:#10110d;display:flex;align-items:center;justify-content:center;cursor:pointer;overflow:hidden;position:relative}
.create-token-logo-upload input{display:none}
.create-token-logo-placeholder{text-align:center;color:#a9aa9f;font-size:14px;line-height:1.5;padding:15px}
.create-token-logo-placeholder b{display:block;color:#ffe500;font-size:16px;margin-bottom:4px}
.create-token-logo-preview{width:100%;height:100%;object-fit:cover;display:none}
.create-token-logo-preview.visible{display:block}
.create-token-logo-preview.visible + .create-token-logo-placeholder{display:none}
.create-token-cost{margin-top:22px;padding:19px;border:1px solid rgba(255,229,0,.22);border-radius:15px;background:rgba(255,229,0,.035)}
.create-token-cost-title{color:#fff;font-size:17px;font-weight:900;margin-bottom:12px}
.create-token-cost-row{display:flex;justify-content:space-between;gap:18px;color:#aaaBA0;font-size:14px;line-height:1.8}
.create-token-cost-row strong{color:#fff}
.create-token-cost-total{margin-top:9px;padding-top:10px;border-top:1px solid rgba(255,255,255,.08);font-size:16px;color:#fff}
.create-token-cost-total strong{color:#ffe500;font-size:19px}
@media(max-width:900px){.create-token-shell{grid-template-columns:1fr}.create-token-help{position:static}}
@media(max-width:560px){#create-token{padding:34px 18px 18px}.create-token-card,.create-token-help{padding:21px}.create-token-title{font-size:25px}.create-token-copy{font-size:14px}.create-token-grid{grid-template-columns:1fr}.create-token-field.full{grid-column:auto}.create-token-logo-wrap{grid-template-columns:1fr 100px}.create-token-logo-upload{min-height:100px}}

`;
  
  function addStyle() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = css;
    document.head.appendChild(style);
  }

  function addSection() {
    if (document.getElementById(SECTION_ID)) return;
    const swap = document.getElementById("swap");
    if (!swap) return;
    swap.insertAdjacentHTML("beforebegin", `
      <section id="create-token" aria-label="Create a Solana token">
        <div class="create-token-shell">
        <div class="create-token-card">
          <div class="create-token-head">
            <div>
              <div class="create-token-kicker">01 / CREATE TOKEN</div>
              <h2 class="create-token-title">CREATE YOUR SPL TOKEN.</h2>
              <p class="create-token-copy">Create a new standard SPL Token mint directly from GurugSwap. Your wallet signs the transaction — GurugSwap never receives your private key.</p>
            </div>
            <span class="create-token-network">SOLANA MAINNET</span>
          </div>

          <div class="create-token-grid">
            <div class="create-token-field">
              <label for="createTokenName">TOKEN NAME</label>
              <input id="createTokenName" maxlength="32" type="text" placeholder="My Token" autocomplete="off">
              <small>Up to 32 characters.</small>
            </div>
            <div class="create-token-field">
              <label for="createTokenSymbol">SYMBOL</label>
              <input id="createTokenSymbol" maxlength="6" type="text" placeholder="MYTKN" autocomplete="off">
              <small>Up to 6 characters.</small>
            </div>
            <div class="create-token-field">
              <label for="createTokenSupply">TOTAL SUPPLY</label>
              <input id="createTokenSupply" inputmode="decimal" type="text" placeholder="1000000000" autocomplete="off">
              <small>Initial supply minted to your wallet.</small>
            </div>
            <div class="create-token-field">
              <label for="createTokenDecimals">DECIMALS</label>
              <input id="createTokenDecimals" inputmode="numeric" type="number" min="0" max="9" step="1" value="9">
              <small>0–9 decimal places.</small>
            </div>
            <div class="create-token-field full">
              <label>TOKEN LOGO</label>
              <div class="create-token-logo-wrap">
                <label class="create-token-logo-upload" for="createTokenLogo">
                  <input id="createTokenLogo" type="file" accept="image/png,image/jpeg,image/webp">
                  <img id="createTokenLogoPreview" class="create-token-logo-preview" alt="Token logo preview">
                  <span class="create-token-logo-placeholder"><b>UPLOAD LOGO</b>PNG, JPG or WEBP</span>
                </label>
                <small>Use a square image. Maximum 2 MB. The selected logo is previewed here.</small>
              </div>
            </div>
          </div>

          <div class="create-token-options">
            <label class="create-token-check">
              <input id="createTokenFixed" type="checkbox" checked>
              <span>
                <strong>FIX TOTAL SUPPLY</strong>
                <span>After the initial supply is minted, permanently revoke Mint Authority. No additional tokens can be minted.</span>
              </span>
            </label>
            <label class="create-token-check">
              <input id="createTokenRevokeFreeze" type="checkbox" checked>
              <span>
                <strong>REVOKE FREEZE AUTHORITY</strong>
                <span>Prevents a freeze authority from freezing token accounts later. Recommended for public liquidity pools.</span>
              </span>
            </label>
            <div class="create-token-warning"><b>Important:</b> this creates a real token on Solana mainnet and requires SOL for Solana account setup and transaction fees. Review everything before approving in Phantom.</div>
          </div>

          <div class="create-token-cost">
            <div class="create-token-cost-title">CREATION COST</div>
            <div class="create-token-cost-row"><span>Solana account &amp; network cost</span><strong id="createTokenNetworkCost">Calculating…</strong></div>
            <div class="create-token-cost-row"><span>Metadata storage (Irys)</span><strong id="createTokenStorageCost">Calculated when uploaded</strong></div>
            <div class="create-token-cost-row"><span>GurugSwap fee</span><strong>0 SOL</strong></div>
            <div class="create-token-cost-row create-token-cost-total"><span>Estimated total</span><strong id="createTokenTotalCost">Calculating…</strong></div>
            <div class="create-token-warning"><b>Transparent pricing:</b> GurugSwap currently adds no creation fee. The estimate includes the base Solana account/network cost plus permanent metadata storage. Final network fees and metadata-account cost are finalized when you sign.</div>
          </div>
          <button id="createTokenButton" class="create-token-button" type="button">CREATE TOKEN</button>
          <div id="createTokenStatus" class="create-token-status">Connect your Phantom wallet, enter the token details, then create the token.</div>

          <div id="createTokenResult" class="create-token-result" hidden>
            <div class="create-token-result-label">NEW MINT ADDRESS</div>
            <div class="create-token-result-address">
              <code id="createTokenMintAddress">—</code>
              <button id="createTokenCopy" class="create-token-copy" type="button">COPY</button>
            </div>
            <div class="create-token-result-links">
              <a id="createTokenSolscan" href="#" target="_blank" rel="noopener noreferrer">VIEW SOLSCAN ↗</a>
              <a id="createTokenAccount" href="#" target="_blank" rel="noopener noreferrer">VIEW TOKEN ACCOUNT ↗</a>
              <a id="createTokenMetadata" href="#" target="_blank" rel="noopener noreferrer" hidden>VIEW METADATA ↗</a>
            </div>
          </div>

          <div class="create-token-note">Your logo and token metadata are stored on permanent Arweave storage through Irys and connected to the mint with Metaplex Token Metadata. GurugSwap does not custody your wallet or private key.</div>
        </div>
        <aside class="create-token-help">
          <div class="create-token-help-kicker">HOW IT WORKS</div>
          <h3>How to create a Solana token</h3>
          <div class="create-token-help-step"><div class="create-token-help-num">1</div><div><strong>Connect your wallet</strong><span>Connect Phantom. Your wallet stays under your control.</span></div></div>
          <div class="create-token-help-step"><div class="create-token-help-num">2</div><div><strong>Enter token details</strong><span>Choose the name, symbol, supply and decimals.</span></div></div>
          <div class="create-token-help-step"><div class="create-token-help-num">3</div><div><strong>Upload your logo</strong><span>Upload PNG, JPG or WEBP and check the preview before creating.</span></div></div>
          <div class="create-token-help-step"><div class="create-token-help-num">4</div><div><strong>Choose supply control</strong><span>Fixed Supply and Revoke Freeze Authority are enabled by default.</span></div></div>
          <div class="create-token-help-step"><div class="create-token-help-num">5</div><div><strong>Upload metadata</strong><span>Your logo and metadata JSON are stored permanently through Irys. Storage cost is paid by your wallet.</span></div></div>
          <div class="create-token-help-step"><div class="create-token-help-num">6</div><div><strong>Approve in Phantom</strong><span>Your wallet signs the token creation and metadata transaction.</span></div></div>
          <div class="create-token-help-section"><h4>What is Fixed Total Supply?</h4><p>Revoking Mint Authority after the initial mint means no additional tokens can be minted through that authority.</p></div>
          <div class="create-token-help-section"><h4>What is Freeze Authority?</h4><p>A freeze authority can freeze token accounts. Revoking it leaves no freeze authority on the mint.</p><div class="create-token-help-tip">Recommended for public liquidity pools and transparent token launches.</div></div>
          <div class="create-token-help-section"><h4>What happens after creation?</h4><p>Your wallet receives the initial supply and GurugSwap shows the new mint address with direct Solscan links.</p></div>
        </aside>
        </div>
      </section>

      <section class="swap-intro" aria-label="GurugSwap trading">
        <div class="swap-intro-inner">
          <div class="swap-intro-kicker">03 / SWAP</div>
          <h2>TRADE TOKENS ON SOLANA.</h2>
          <p>Swap SOL, GURUG and supported Solana tokens with a simple, transparent trading interface.</p>
        </div>
      </section>
    `);
  }

  function setStatus(message, state = "") {
    const el = document.getElementById("createTokenStatus");
    if (!el) return;
    el.className = "create-token-status" + (state ? " " + state : "");
    el.textContent = message;
  }

  function parseSupply(value, decimals) {
    const raw = String(value || "").trim().replace(/,/g, "");
    if (!/^\d+(\.\d+)?$/.test(raw)) throw new Error("Enter a valid total supply.");
    const parts = raw.split(".");
    const whole = parts[0] || "0";
    const fraction = parts[1] || "";
    if (fraction.length > decimals) throw new Error("Supply has more decimal places than the selected decimals.");
    const padded = (fraction + "0".repeat(decimals)).slice(0, decimals);
    const amount = BigInt(whole) * (10n ** BigInt(decimals)) + BigInt(padded || "0");
    const max = 18446744073709551615n;
    if (amount <= 0n || amount > max) throw new Error("Total supply is outside the valid SPL Token range.");
    return amount;
  }

  function normalizeSymbol(value) {
    return String(value || "").trim().toUpperCase().replace(/\s+/g, "");
  }

  let estimatedNetworkSol = NaN;
  let estimatedStorageSol = NaN;

  function updateEstimatedTotal() {
    const totalEl = document.getElementById("createTokenTotalCost");
    if (!totalEl) return;
    if (Number.isFinite(estimatedNetworkSol) && Number.isFinite(estimatedStorageSol)) {
      const total = estimatedNetworkSol + estimatedStorageSol;
      totalEl.textContent = total < 0.000001
        ? "<0.000001 SOL"
        : total.toFixed(6).replace(/0+$/, "").replace(/\.$/, "") + " SOL";
      return;
    }
    if (Number.isFinite(estimatedNetworkSol)) {
      totalEl.textContent = formatSol(estimatedNetworkSol * 1e9);
      return;
    }
    totalEl.textContent = "Calculated at signing";
  }

  function formatSol(lamports) {
    const value = Number(lamports || 0) / 1e9;
    if (!Number.isFinite(value)) return "Calculated at signing";
    if (value < 0.000001) return "<0.000001 SOL";
    return value.toFixed(6).replace(/0+$/, "").replace(/\.$/, "") + " SOL";
  }

  function solAmountToNumber(amount) {
    const basisPoints = amount?.basisPoints;
    if (basisPoints === undefined || basisPoints === null) return NaN;
    try {
      return Number(basisPoints) / 1e9;
    } catch {
      return NaN;
    }
  }

  function updateStorageCost(sol) {
    const el = document.getElementById("createTokenStorageCost");
    if (!el) return;
    if (!Number.isFinite(sol)) {
      estimatedStorageSol = NaN;
      el.textContent = "Calculated when uploaded";
      updateEstimatedTotal();
      return;
    }
    estimatedStorageSol = sol;
    el.textContent = sol < 0.000001
      ? "<0.000001 SOL"
      : sol.toFixed(6).replace(/0+$/, "").replace(/\.$/, "") + " SOL";
    updateEstimatedTotal();
  }

  function updateNetworkCost(lamports) {
    const networkEl = document.getElementById("createTokenNetworkCost");
    const totalEl = document.getElementById("createTokenTotalCost");
    estimatedNetworkSol = Number(lamports || 0) / 1e9;
    const formatted = formatSol(lamports);
    if (networkEl) networkEl.textContent = formatted;
    updateEstimatedTotal();
  }

  function bindLogoPreview() {
    const logoInput = document.getElementById("createTokenLogo");
    const logoPreview = document.getElementById("createTokenLogoPreview");
    if (!logoInput || !logoPreview || logoInput.dataset.bound) return;
    logoInput.dataset.bound = "1";

    logoInput.addEventListener("change", () => {
      const file = logoInput.files?.[0];
      if (!file) {
        logoPreview.removeAttribute("src");
        logoPreview.classList.remove("visible");
        updateStorageCost(NaN);
        return;
      }
      if (!/^image\/(png|jpeg|webp)$/.test(file.type)) {
        logoInput.value = "";
        logoPreview.removeAttribute("src");
        logoPreview.classList.remove("visible");
        setStatus("Please choose a PNG, JPG or WEBP image.", "error");
        return;
      }
      if (file.size > 2 * 1024 * 1024) {
        logoInput.value = "";
        logoPreview.removeAttribute("src");
        logoPreview.classList.remove("visible");
        setStatus("Logo image must be 2 MB or smaller.", "error");
        return;
      }
      if (logoPreview.dataset.objectUrl) URL.revokeObjectURL(logoPreview.dataset.objectUrl);
      const objectUrl = URL.createObjectURL(file);
      logoPreview.dataset.objectUrl = objectUrl;
      logoPreview.src = objectUrl;
      logoPreview.classList.add("visible");
      setStatus("Logo selected. Connect Phantom and create when ready.", "active");
      updateStorageCost(NaN);
    });
  }

  let metadataModulesPromise = null;

  async function loadMetadataModules() {
    if (!metadataModulesPromise) {
      metadataModulesPromise = Promise.all([
        import(UMI_CDN),
        import(UMI_DEFAULTS_CDN),
        import(UMI_WALLET_CDN),
        import(MPL_METADATA_CDN),
        import(MPL_TOOLBOX_CDN),
        import(BUFFER_CDN)
      ]).then(([umi, defaults, walletAdapters, metadata, toolbox, bufferModule]) => {
        if (!globalThis.Buffer && bufferModule?.Buffer) globalThis.Buffer = bufferModule.Buffer;
        return {
          umi,
          defaults,
          walletAdapters,
          metadata,
          toolbox
        };
      });
    }
    return metadataModulesPromise;
  }

  function createPhantomWalletAdapter(provider) {
    return {
      publicKey: provider.publicKey,
      signTransaction: async transaction => provider.signTransaction(transaction),
      signAllTransactions: async transactions => {
        if (typeof provider.signAllTransactions === "function") {
          return provider.signAllTransactions(transactions);
        }
        const signed = [];
        for (const transaction of transactions) {
          signed.push(await provider.signTransaction(transaction));
        }
        return signed;
      },
      signMessage: async message => {
        if (typeof provider.signMessage !== "function") {
          throw new Error("This wallet does not support message signing required for storage upload.");
        }
        const result = await provider.signMessage(message);
        return result?.signature || result;
      },
      sendTransaction: async (transaction, connection, options = {}) => {
        // Phantom's legacy provider may expose signAndSendTransaction rather
        // than sendTransaction. Irys needs a wallet adapter with a generic
        // sendTransaction method, so support both provider APIs.
        if (typeof provider.sendTransaction === "function") {
          const result = await provider.sendTransaction(transaction, connection, options);
          return result?.signature || result;
        }

        if (typeof provider.signAndSendTransaction === "function") {
          const result = await provider.signAndSendTransaction(transaction, options);
          return result?.signature || result;
        }

        if (typeof provider.signTransaction === "function" && connection?.sendRawTransaction) {
          const signed = await provider.signTransaction(transaction);
          return await connection.sendRawTransaction(signed.serialize(), options);
        }

        throw new Error("This wallet does not expose a compatible Solana transaction signing method for Irys storage.");
      }
    };
  }

  async function createUmiForWallet(provider) {
    const modules = await loadMetadataModules();
    const { createUmi } = modules.defaults;
    const { walletAdapterIdentity } = modules.walletAdapters;
    const { mplTokenMetadata } = modules.metadata;
    const { mplToolbox } = modules.toolbox;
    const wallet = createPhantomWalletAdapter(provider);
    const rpc = await getWorkingRpc();
    const umi = createUmi(rpc)
      .use(walletAdapterIdentity(wallet))
      .use(mplTokenMetadata())
      .use(mplToolbox());

    return {umi, modules};
  }

  let irysWebUploaderPromise = null;

  function ensureBrowserPolyfills() {
    if (globalThis.Buffer == null && globalThis.buffer?.Buffer) {
      globalThis.Buffer = globalThis.buffer.Buffer;
    }
    if (typeof window !== "undefined" && window.Buffer == null && globalThis.Buffer) {
      window.Buffer = globalThis.Buffer;
    }
    if (globalThis.process == null) {
      globalThis.process = { env: {} };
    } else if (globalThis.process.env == null) {
      globalThis.process.env = {};
    }
    if (globalThis.global == null) globalThis.global = globalThis;
  }

  async function createIrysWebClient(provider) {
    if (!irysWebUploaderPromise) {
      const browserDeps =
        "bundle&target=es2020" +
        "&deps=@irys/bundles@0.0.5,@irys/upload-core@0.0.10,stream-browserify@3.0.0,events@3.3.0,buffer@6.0.3" +
        "&alias=stream:stream-browserify@3.0.0,buffer:buffer@6.0.3,events:events@3.3.0";
      irysWebUploaderPromise = Promise.all([
        import("https://esm.sh/@irys/web-upload@0.0.15?" + browserDeps),
        import("https://esm.sh/@irys/web-upload-solana@0.1.8?" + browserDeps)
      ]).then(([webUpload, solanaUpload]) => {
        const WebUploader = webUpload?.WebUploader || webUpload?.default;
        const WebSolana = solanaUpload?.WebSolana || solanaUpload?.default;
        if (typeof WebUploader !== "function" || typeof WebSolana !== "function") {
          throw new Error("Irys browser uploader modules loaded without WebUploader/WebSolana.");
        }
        return {WebUploader, WebSolana};
      });
    }

    const {WebUploader, WebSolana} = await irysWebUploaderPromise;
    const wallet = createPhantomWalletAdapter(provider);
    const rpc = await getWorkingRpc();

    const irys = await withTimeout(
      WebUploader(WebSolana)
        .withProvider(wallet)
        .withRpc(rpc)
        .bundlerUrl("https://node1.irys.xyz")
        .build(),
      60000,
      "Irys storage connection timed out. Please try again."
    );

    if (!irys || typeof irys.upload !== "function") {
      throw new Error("Irys browser uploader initialized without an upload method.");
    }

    return irys;
  }
  async function uploadToPermanentStorage(irys, data, contentType, label) {
    const bytes = data instanceof Uint8Array ? data : new TextEncoder().encode(String(data));
    const price = await irys.getPrice(bytes.length);
    const priceAtomic = price?.toString ? price.toString() : String(price);
    if (!priceAtomic || priceAtomic === "0") {
      throw new Error(label + " storage price could not be calculated.");
    }

    const currentBalance = await irys.getLoadedBalance();
    if (currentBalance.lt(price)) {
      const funding = await withTimeout(
        irys.fund(price.minus(currentBalance)),
        120000,
        label + " storage payment timed out after wallet approval."
      );
      if (!funding) throw new Error(label + " storage funding failed.");

      // WebIrys returns a funding transaction that must be submitted
      // through its funder before the balance becomes spendable.
      if (irys.funder && typeof irys.funder.submitFundTransaction === "function" && funding.id) {
        await withTimeout(
          irys.funder.submitFundTransaction(funding.id),
          120000,
          label + " storage funding confirmation timed out."
        );
      }
    }

    const receipt = await withTimeout(
      irys.upload(bytes, {
        tags: [{name: "Content-Type", value: contentType}]
      }),
      180000,
      label + " storage upload timed out."
    );

    const id = receipt?.id;
    if (!id) throw new Error(label + " upload completed without a storage ID.");
    return {
      uri: "https://arweave.net/" + id,
      atomicCost: priceAtomic
    };
  }

  async function waitForConfirmation(connection, signature) {
    for (let i = 0; i < 40; i++) {
      const result = await connection.getSignatureStatuses([signature], {searchTransactionHistory:true});
      const status = result?.value?.[0];
      if (status?.err) throw new Error("Transaction failed on-chain.");
      if (status?.confirmationStatus === "confirmed" || status?.confirmationStatus === "finalized") return;
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    throw new Error("Transaction was sent, but confirmation timed out. Check Solscan.");
  }

  async function refreshCreationCost() {
    try {
      if (!window.solanaWeb3) return;
      const rpc = await getWorkingRpc();
      const connection = new window.solanaWeb3.Connection(rpc, "confirmed");
      const mintRent = await connection.getMinimumBalanceForRentExemption(82);
      const tokenAccountRent = await connection.getMinimumBalanceForRentExemption(165);
      const recentFee = await connection.getFeeForMessage(
        new window.solanaWeb3.TransactionMessage({
          payerKey: new window.solanaWeb3.PublicKey("11111111111111111111111111111111"),
          recentBlockhash: (await connection.getLatestBlockhash("confirmed")).blockhash,
          instructions: []
        }).compileToV0Message(),
        "confirmed"
      ).catch(() => null);

      updateNetworkCost(mintRent + tokenAccountRent + Number(recentFee?.value || 5000));
    } catch {
      const networkEl = document.getElementById("createTokenNetworkCost");
      const totalEl = document.getElementById("createTokenTotalCost");
      if (networkEl) networkEl.textContent = "Calculated at signing";
      if (totalEl) totalEl.textContent = "Calculated at signing";
    }
  }

  async function withTimeout(promise, ms, message) {
    let timer;
    try {
      return await Promise.race([
        promise,
        new Promise((_, reject) => {
          timer = setTimeout(() => reject(new Error(message)), ms);
        })
      ]);
    } finally {
      clearTimeout(timer);
    }
  }

  async function verifyCreatedToken(mintAddress, ataAddress, expectedAmount) {
    if (!window.solanaWeb3) throw new Error("Solana Web3 library is not available for verification.");
    const rpc = await getWorkingRpc();
    const connection = new window.solanaWeb3.Connection(rpc, "confirmed");
    const mintInfo = await connection.getAccountInfo(new window.solanaWeb3.PublicKey(mintAddress), "confirmed");
    if (!mintInfo) throw new Error("Token mint was not found on Solana after confirmation.");

    const balance = await connection.getTokenAccountBalance(
      new window.solanaWeb3.PublicKey(ataAddress),
      "confirmed"
    );
    const actualAmount = BigInt(balance?.value?.amount || "0");
    if (actualAmount !== expectedAmount) {
      throw new Error("Token creation transaction was confirmed, but the initial token balance could not be verified.");
    }
    return actualAmount;
  }

  async function createToken() {
    const logoInput = document.getElementById("createTokenLogo");
    const logoFile = logoInput?.files?.[0];
    const name = String(document.getElementById("createTokenName")?.value || "").trim();
    const symbol = normalizeSymbol(document.getElementById("createTokenSymbol")?.value);
    const supplyText = document.getElementById("createTokenSupply")?.value;
    const decimals = Number(document.getElementById("createTokenDecimals")?.value);
    const fixedSupply = !!document.getElementById("createTokenFixed")?.checked;
    const revokeFreeze = !!document.getElementById("createTokenRevokeFreeze")?.checked;

    if (!name) throw new Error("Enter a token name.");
    if (name.length > 32) throw new Error("Token name must be 32 characters or fewer.");
    if (!/^[A-Z0-9]{1,6}$/.test(symbol)) throw new Error("Symbol must be 1–6 letters or numbers.");
    if (!Number.isInteger(decimals) || decimals < 0 || decimals > 9) throw new Error("Decimals must be between 0 and 9.");
    const amount = parseSupply(supplyText, decimals);

    if (!logoFile) throw new Error("Upload a token logo before creating the token.");
    if (!/^image\/(png|jpeg|webp)$/.test(logoFile.type)) throw new Error("Please choose a PNG, JPG or WEBP image.");
    if (logoFile.size > 2 * 1024 * 1024) throw new Error("Logo image must be 2 MB or smaller.");

    const provider = typeof getPhantomProvider === "function" ? getPhantomProvider() : null;
    if (!provider?.publicKey) {
      setStatus("Connect Phantom first.", "error");
      if (typeof connectPhantom === "function") await connectPhantom();
      return;
    }

    if (!window.solanaWeb3) throw new Error("Solana Web3 library is not available.");

    setStatus("STEP 1/4 — Preparing permanent metadata storage...", "active");
    const {umi, modules} = await createUmiForWallet(provider);
    const {createGenericFile, generateSigner, percentAmount, some} = modules.umi;
    const {createV1, TokenStandard} = modules.metadata;
    const {
      createMint,
      createTokenIfMissing,
      findAssociatedTokenPda,
      mintTokensTo,
      setAuthority,
      AuthorityType
    } = modules.toolbox;

    const mint = generateSigner(umi);
    const imageBuffer = new Uint8Array(await logoFile.arrayBuffer());
    const imageFile = createGenericFile(imageBuffer, logoFile.name, {
      contentType: logoFile.type
    });

    const irys = await createIrysWebClient(provider);
    setStatus("STEP 1/4 — Uploading logo to permanent storage...", "active");

    const imageData = new Uint8Array(await logoFile.arrayBuffer());
    const imageUpload = await uploadToPermanentStorage(
      irys,
      imageData,
      logoFile.type,
      "Logo"
    );
    const imageUri = imageUpload.uri;
    updateStorageCost(Number(imageUpload.atomicCost) / 1e9);

    const metadataJson = {
      name,
      symbol,
      description: name + " — created on GurugSwap",
      image: imageUri,
      properties: {
        files: [{uri: imageUri, type: logoFile.type}],
        category: "image"
      }
    };

    setStatus("STEP 2/4 — Uploading token metadata JSON...", "active");
    const metadataUpload = await uploadToPermanentStorage(
      irys,
      JSON.stringify(metadataJson),
      "application/json",
      "Metadata"
    );
    const metadataUri = metadataUpload.uri;
    const totalStorageAtomic =
      BigInt(imageUpload.atomicCost) + BigInt(metadataUpload.atomicCost);
    updateStorageCost(Number(totalStorageAtomic) / 1e9);

    setStatus("STEP 3/4 — Building the token creation transaction...", "active");

    const tokenBuilder = createMint(umi, {
      mint,
      decimals,
      mintAuthority: umi.identity.publicKey,
      freezeAuthority: revokeFreeze ? null : umi.identity.publicKey
    })
      .add(createV1(umi, {
        mint,
        authority: umi.identity,
        payer: umi.payer,
        updateAuthority: umi.identity.publicKey,
        name,
        symbol,
        uri: metadataUri,
        sellerFeeBasisPoints: percentAmount(0),
        tokenStandard: TokenStandard.Fungible,
        decimals: some(decimals),
        isMutable: true
      }))
      .add(
        createTokenIfMissing(umi, {
          mint: mint.publicKey,
          owner: umi.identity.publicKey
        }).add(
          mintTokensTo(umi, {
            mint: mint.publicKey,
            token: findAssociatedTokenPda(umi, {
              mint: mint.publicKey,
              owner: umi.identity.publicKey
            }),
            amount
          })
        )
      );

    const finalBuilder = fixedSupply
      ? tokenBuilder.add(
          setAuthority(umi, {
            authorityType: AuthorityType.MintTokens,
            newAuthority: null,
            owned: mint.publicKey,
            owner: umi.identity.publicKey
          })
        )
      : tokenBuilder;

    setStatus("STEP 3/4 — Approve the actual token creation transaction in Phantom...", "active");
    let result;
    try {
      result = await withTimeout(
        finalBuilder.sendAndConfirm(umi, {send: {commitment: "confirmed"}}),
        180000,
        "Token creation timed out. Check Phantom/Solscan before retrying."
      );
    } catch (error) {
      console.error("TOKEN CREATION transaction failed:", error);
      throw new Error(error?.message || "Token creation transaction failed or was cancelled. No success was recorded.");
    }

    const mintAddress = mint.publicKey.toString();
    const ata = findAssociatedTokenPda(umi, {
      mint: mint.publicKey,
      owner: umi.identity.publicKey
    });
    const ataAddress = ata?.toString ? ata.toString() : String(ata);

    setStatus("STEP 4/4 — Verifying the token mint and initial balance on Solana...", "active");
    await verifyCreatedToken(mintAddress, ataAddress, amount);

    const solscan = "https://solscan.io/token/" + mintAddress;
    const account = "https://solscan.io/account/" + ataAddress;

    const resultEl = document.getElementById("createTokenResult");
    const addressEl = document.getElementById("createTokenMintAddress");
    const solscanEl = document.getElementById("createTokenSolscan");
    const accountEl = document.getElementById("createTokenAccount");
    const metadataEl = document.getElementById("createTokenMetadata");

    if (addressEl) addressEl.textContent = mintAddress;
    if (solscanEl) solscanEl.href = solscan;
    if (accountEl) accountEl.href = account;
    if (metadataEl) {
      metadataEl.href = metadataUri;
      metadataEl.hidden = false;
    }
    if (resultEl) resultEl.hidden = false;

    updateStorageCost(storageSol > 0 ? storageSol : NaN);
    setStatus("TOKEN CREATED SUCCESSFULLY — token, metadata, logo and initial balance are verified on Solana.", "success");
    window.dispatchEvent(new CustomEvent("gurug:token-created", { detail: { mintAddress, metadataUri, signature: result?.signature || null } }));
    return {mintAddress, metadataUri, signature: result?.signature || null};
  }

  function bind() {
    addStyle();
    addSection();
    bindLogoPreview();
    refreshCreationCost();

    const button = document.getElementById("createTokenButton");
    if (!button || button.dataset.bound) return;
    button.dataset.bound = "1";

    button.addEventListener("click", async () => {
      button.disabled = true;
      try {
        await createToken();
      } catch (err) {
        console.error("CREATE TOKEN failed:", err);
        setStatus(err?.message || "Token creation failed or was cancelled.", "error");
      } finally {
        button.disabled = false;
      }
    });

    const copy = document.getElementById("createTokenCopy");
    if (copy) copy.addEventListener("click", async () => {
      const value = document.getElementById("createTokenMintAddress")?.textContent || "";
      if (!value || value === "—") return;
      try {
        await navigator.clipboard.writeText(value);
        copy.textContent = "COPIED!";
        setTimeout(() => copy.textContent = "COPY", 1400);
      } catch { alert(value); }
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bind, {once:true});
  } else {
    bind();
  }
})();
