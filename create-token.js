/* GURUGSWAP — CREATE TOKEN v1
 * Isolated from the existing Swap engine.
 * Creates a standard SPL Token mint on Solana mainnet using the connected wallet.
 */
(() => {
  const SPL_TOKEN_CDN = "https://unpkg.com/@solana/spl-token@0.4.15/lib/index.iife.min.js";
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
            <div class="create-token-warning"><b>Important:</b> this creates a real token on Solana mainnet and costs SOL for rent and transaction fees. Review everything before approving in Phantom.</div>
          </div>

          <div class="create-token-cost">
            <div class="create-token-cost-title">CREATION COST</div>
            <div class="create-token-cost-row"><span>Solana network &amp; rent</span><strong id="createTokenNetworkCost">Calculating…</strong></div>
            <div class="create-token-cost-row"><span>GurugSwap fee</span><strong>0 SOL</strong></div>
            <div class="create-token-cost-row create-token-cost-total"><span>Estimated total</span><strong id="createTokenTotalCost">Calculating…</strong></div>
            <div class="create-token-warning"><b>Transparent pricing:</b> GurugSwap currently adds no creation fee. The final network amount is calculated before you sign.</div>
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
            </div>
          </div>

          <div class="create-token-note">Token name, symbol and logo will be connected to Solana token metadata in the next metadata module. GurugSwap does not custody your wallet or private key.</div>
        </div>
        <aside class="create-token-help">
          <div class="create-token-help-kicker">HOW IT WORKS</div>
          <h3>How to create a Solana token</h3>
          <div class="create-token-help-step"><div class="create-token-help-num">1</div><div><strong>Connect your wallet</strong><span>Connect Phantom. Your wallet stays under your control.</span></div></div>
          <div class="create-token-help-step"><div class="create-token-help-num">2</div><div><strong>Enter token details</strong><span>Choose the name, symbol, supply and decimals.</span></div></div>
          <div class="create-token-help-step"><div class="create-token-help-num">3</div><div><strong>Upload your logo</strong><span>Upload PNG, JPG or WEBP and check the preview before creating.</span></div></div>
          <div class="create-token-help-step"><div class="create-token-help-num">4</div><div><strong>Choose supply control</strong><span>Fixed Supply and Revoke Freeze Authority are enabled by default.</span></div></div>
          <div class="create-token-help-step"><div class="create-token-help-num">5</div><div><strong>Review the cost</strong><span>See the estimated Solana network and rent cost before signing. GurugSwap currently charges 0 SOL.</span></div></div>
          <div class="create-token-help-step"><div class="create-token-help-num">6</div><div><strong>Approve in Phantom</strong><span>Your wallet signs the on-chain transaction.</span></div></div>
          <div class="create-token-help-section"><h4>What is Fixed Total Supply?</h4><p>Revoking Mint Authority after the initial mint means no additional tokens can be minted through that authority.</p></div>
          <div class="create-token-help-section"><h4>What is Freeze Authority?</h4><p>A freeze authority can freeze token accounts. Revoking it leaves no freeze authority on the mint.</p><div class="create-token-help-tip">Recommended for public liquidity pools and transparent token launches.</div></div>
          <div class="create-token-help-section"><h4>What happens after creation?</h4><p>Your wallet receives the initial supply and GurugSwap shows the new mint address with direct Solscan links.</p></div>
        </aside>
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

  async function loadSplToken() {
    const existing = window.splToken || window.SPLToken || window.SplToken;
    if (existing) return existing;
    return await new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = SPL_TOKEN_CDN;
      script.onload = () => {
        const lib = window.splToken || window.SPLToken || window.SplToken;
        if (lib) resolve(lib);
        else reject(new Error("SPL Token library loaded, but no browser API was exposed."));
      };
      script.onerror = () => reject(new Error("Could not load the SPL Token library."));
      document.head.appendChild(script);
    });
  }

  const TOKEN_ACCOUNT_SIZE = 165;

  function updateCostDisplay(lamports) {
    const sol = Number(lamports || 0) / 1e9;
    const formatted = sol < 0.000001 ? "<0.000001 SOL" : sol.toFixed(6).replace(/0+$/, "").replace(/\.$/, "") + " SOL";
    const networkEl = document.getElementById("createTokenNetworkCost");
    const totalEl = document.getElementById("createTokenTotalCost");
    if (networkEl) networkEl.textContent = formatted;
    if (totalEl) totalEl.textContent = formatted;
  }

  async function refreshCreationCost() {
    try {
      if (!window.solanaWeb3) return;
      const spl = await loadSplToken();
      const connection = new window.solanaWeb3.Connection("https://api.mainnet-beta.solana.com", "confirmed");
      const mintRent = await connection.getMinimumBalanceForRentExemption(spl.MINT_SIZE);
      const tokenAccountRent = await connection.getMinimumBalanceForRentExemption(TOKEN_ACCOUNT_SIZE);
      updateCostDisplay(mintRent + tokenAccountRent + 5000);
    } catch {
      const networkEl = document.getElementById("createTokenNetworkCost");
      const totalEl = document.getElementById("createTokenTotalCost");
      if (networkEl) networkEl.textContent = "Calculated at signing";
      if (totalEl) totalEl.textContent = "Calculated at signing";
    }
  }

  async function createToken() {
    const logoInput = document.getElementById("createTokenLogo");
    const logoPreview = document.getElementById("createTokenLogoPreview");
    if (logoInput && logoPreview) {
      logoInput.addEventListener("change", () => {
        const file = logoInput.files?.[0];
        if (!file) return;
        if (!/^image\/(png|jpeg|webp)$/.test(file.type)) {
          logoInput.value = "";
          setStatus("Please choose a PNG, JPG or WEBP image.", "error");
          return;
        }
        if (file.size > 2 * 1024 * 1024) {
          logoInput.value = "";
          setStatus("Logo image must be 2 MB or smaller.", "error");
          return;
        }
        logoPreview.src = URL.createObjectURL(file);
        logoPreview.classList.add("visible");
      });
    }

    refreshCreationCost();

    const button = document.getElementById("createTokenButton");
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

    const provider = typeof getPhantomProvider === "function" ? getPhantomProvider() : null;
    if (!provider?.publicKey) {
      setStatus("Connect Phantom first.", "error");
      if (typeof connectPhantom === "function") await connectPhantom();
      return;
    }

    if (!window.solanaWeb3) throw new Error("Solana Web3 library is not available.");
    const spl = await loadSplToken();
    const required = [
      "MINT_SIZE","TOKEN_PROGRAM_ID","ASSOCIATED_TOKEN_PROGRAM_ID",
      "createInitializeMintInstruction","createAssociatedTokenAccountInstruction",
      "getAssociatedTokenAddressSync","createMintToCheckedInstruction",
      "createSetAuthorityInstruction","AuthorityType"
    ];
    const missing = required.filter(key => spl[key] === undefined);
    if (missing.length) throw new Error("SPL Token library is missing: " + missing.join(", "));

    const web3 = window.solanaWeb3;
    const owner = provider.publicKey;
    const connection = new web3.Connection("https://api.mainnet-beta.solana.com", "confirmed");
    const mintKeypair = web3.Keypair.generate();

    setStatus("Preparing the mint transaction...", "active");

    const rentLamports = await connection.getMinimumBalanceForRentExemption(spl.MINT_SIZE);
    const ata = spl.getAssociatedTokenAddressSync(
      mintKeypair.publicKey,
      owner,
      false,
      spl.TOKEN_PROGRAM_ID,
      spl.ASSOCIATED_TOKEN_PROGRAM_ID
    );

    const tx = new web3.Transaction();
    tx.add(
      web3.SystemProgram.createAccount({
        fromPubkey: owner,
        newAccountPubkey: mintKeypair.publicKey,
        lamports: rentLamports,
        space: spl.MINT_SIZE,
        programId: spl.TOKEN_PROGRAM_ID
      }),
      spl.createInitializeMintInstruction(
        mintKeypair.publicKey,
        decimals,
        owner,
        revokeFreeze ? null : owner,
        spl.TOKEN_PROGRAM_ID
      ),
      spl.createAssociatedTokenAccountInstruction(
        owner,
        ata,
        owner,
        mintKeypair.publicKey,
        spl.TOKEN_PROGRAM_ID,
        spl.ASSOCIATED_TOKEN_PROGRAM_ID
      ),
      spl.createMintToCheckedInstruction(
        mintKeypair.publicKey,
        ata,
        owner,
        amount,
        decimals,
        [],
        spl.TOKEN_PROGRAM_ID
      )
    );

    if (fixedSupply) {
      tx.add(
        spl.createSetAuthorityInstruction(
          mintKeypair.publicKey,
          owner,
          spl.AuthorityType.MintTokens,
          null,
          [],
          spl.TOKEN_PROGRAM_ID
        )
      );
    }

    const latest = await connection.getLatestBlockhash("confirmed");
    tx.recentBlockhash = latest.blockhash;
    try {
      const feeInfo = await connection.getFeeForMessage(tx.compileMessage(), "confirmed");
      const tokenAccountRent = await connection.getMinimumBalanceForRentExemption(TOKEN_ACCOUNT_SIZE);
      updateCostDisplay(rentLamports + tokenAccountRent + Number(feeInfo?.value || 5000));
    } catch {
      const tokenAccountRent = await connection.getMinimumBalanceForRentExemption(TOKEN_ACCOUNT_SIZE);
      updateCostDisplay(rentLamports + tokenAccountRent + 5000);
    }
    tx.feePayer = owner;
    tx.partialSign(mintKeypair);

    setStatus("Review the transaction in Phantom and approve it...", "active");
    const signed = await provider.signAndSendTransaction(tx);
    const signature = signed?.signature;
    if (!signature) throw new Error("Phantom did not return a transaction signature.");

    setStatus("Transaction sent. Waiting for Solana confirmation...", "active");
    await waitForConfirmation(connection, signature);

    const mintAddress = mintKeypair.publicKey.toBase58();
    const solscan = "https://solscan.io/token/" + mintAddress;
    const account = "https://solscan.io/account/" + ata.toBase58();

    const result = document.getElementById("createTokenResult");
    const address = document.getElementById("createTokenMintAddress");
    const solscanEl = document.getElementById("createTokenSolscan");
    const accountEl = document.getElementById("createTokenAccount");
    if (address) address.textContent = mintAddress;
    if (solscanEl) solscanEl.href = solscan;
    if (accountEl) accountEl.href = account;
    if (result) result.hidden = false;

    setStatus("TOKEN CREATED SUCCESSFULLY — your new SPL token is on Solana.", "success");
    button.disabled = false;
    return {mintAddress, ata, signature};
  }

  function bind() {
    addStyle();
    addSection();

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
