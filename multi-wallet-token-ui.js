(() => {
  "use strict";

  // Use the isolated preview Worker by default. This panel only manages dry-run configs.
  // Never point it at the production trading Worker.
  let apiBase = String(window.GURUG_MULTI_API_BASE || "https://gurug-trading-bot-preview.pcaticom.workers.dev").trim().replace(/\/+$/, "");
  const section = document.getElementById("trading-bot");
  if (!section || document.getElementById("multiWalletPanel")) return;

  const panel = document.createElement("section");
  panel.id = "multiWalletPanel";
  panel.className = "multi-wallet-panel";
  panel.innerHTML = `
    <style>
      .multi-wallet-panel{margin:28px 0 0;padding:24px;border:1px solid rgba(130,150,170,.3);border-radius:18px;background:var(--panel-bg,rgba(15,22,32,.6));color:inherit}
      .multi-wallet-panel *{box-sizing:border-box}
      .multi-wallet-panel h3{margin:0 0 8px;font-size:1.2rem}
      .multi-wallet-panel p{margin:0 0 16px;line-height:1.55;opacity:.8}
      .mw-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;margin:16px 0}
      .mw-field{display:flex;flex-direction:column;gap:6px;font-size:.8rem}
      .mw-field input,.mw-field select{width:100%;min-width:0;padding:11px 12px;border:1px solid rgba(130,150,170,.4);border-radius:9px;background:transparent;color:inherit}
      .mw-actions{display:flex;flex-wrap:wrap;gap:8px;margin:12px 0}
      .mw-button{border:1px solid rgba(130,150,170,.5);border-radius:9px;padding:10px 14px;background:transparent;color:inherit;cursor:pointer}
      .mw-button.primary{background:#d6f36a;color:#151a10;border-color:#d6f36a;font-weight:700}
      .mw-button:disabled{opacity:.45;cursor:not-allowed}
      .mw-status{padding:12px;border-radius:10px;background:rgba(130,150,170,.1);font-size:.88rem;overflow-wrap:anywhere}
      .mw-list{display:grid;gap:8px;margin:12px 0}
      .mw-item{padding:12px;border:1px solid rgba(130,150,170,.25);border-radius:10px;overflow-wrap:anywhere}
      .mw-item strong{display:block;margin-bottom:5px}
      .mw-small{font-size:.78rem;opacity:.72}
      @media(max-width:600px){.mw-grid{grid-template-columns:1fr}.multi-wallet-panel{padding:16px}}
    </style>
    <h3>Multi-wallet / Multi-token (Dry-run)</h3>
    <p>Manage wallet-linked token strategies independently. This panel only supports dry-run configuration; it cannot start live trades.</p>
    <div class="mw-grid">
      <label class="mw-field">Isolated preview Worker URL (HTTPS; not the production bot)
        <input id="mwApiUrl" type="url" placeholder="https://your-staging-worker.example.workers.dev" autocomplete="url">
      </label>
      <div class="mw-field" style="justify-content:end">
        <span>Only the isolated preview Worker or a separately named staging endpoint is accepted. The URL is kept in this page only.</span>
        <button id="mwSetApi" class="mw-button" type="button">Use preview/staging endpoint</button>
      </div>
    </div>
    <div id="mwStatus" class="mw-status" role="status" aria-live="polite"></div>
    <div class="mw-actions">
      <button id="mwConnect" class="mw-button primary" type="button">Connect wallet</button>
      <button id="mwRefresh" class="mw-button" type="button" disabled>Refresh wallets</button>
      <button id="mwRegister" class="mw-button" type="button" disabled>Register connected wallet</button>
    </div>
    <div id="mwWallets" class="mw-list"></div>
    <div class="mw-grid">
      <label class="mw-field">Selected wallet
        <select id="mwWalletSelect" disabled><option value="">Connect and register a wallet first</option></select>
      </label>
      <label class="mw-field">Token mint address
        <input id="mwMint" placeholder="Solana token mint" autocomplete="off">
      </label>
      <label class="mw-field">Strategy
        <select id="mwStrategy"><option value="DCA">DCA</option><option value="TARGET">Target price</option></select>
      </label>
      <label class="mw-field">Side
        <select id="mwSide"><option value="BUY">BUY</option><option value="SELL">SELL</option></select>
      </label>
      <label class="mw-field">Trade amount (SOL for BUY / token units for SELL)
        <input id="mwAmount" type="number" min="0.000000001" step="any" value="0.01">
      </label>
      <label class="mw-field">Interval (seconds, minimum 60)
        <input id="mwInterval" type="number" min="60" step="1" value="300">
      </label>
      <label class="mw-field">Maximum trades
        <input id="mwMaxTrades" type="number" min="1" step="1" value="1">
      </label>
      <label class="mw-field">Maximum spend (SOL; 0 = no cap)
        <input id="mwMaxSpend" type="number" min="0" step="any" value="0.01">
      </label>
      <label class="mw-field">Target price (USD; required for Target)
        <input id="mwTarget" type="number" min="0" step="any" placeholder="0.0001">
      </label>
      <label class="mw-field">Stop loss (USD, optional)
        <input id="mwStopLoss" type="number" min="0" step="any" placeholder="Optional">
      </label>
      <label class="mw-field">Take profit (USD, optional)
        <input id="mwTakeProfit" type="number" min="0" step="any" placeholder="Optional">
      </label>
    </div>
    <div class="mw-actions">
      <button id="mwCreate" class="mw-button primary" type="button" disabled>Save dry-run config</button>
      <button id="mwLoadConfigs" class="mw-button" type="button" disabled>Load token configs</button>
      <button id="mwLoadTrades" class="mw-button" type="button" disabled>Load recent dry-run trades</button>
    </div>
    <div id="mwConfigs" class="mw-list"></div>
    <h3 style="margin-top:24px">Recent trade history</h3>
    <div id="mwTrades" class="mw-list"></div>
  `;
  const legacyCard = section.querySelector(".trading-bot-card");
  if (legacyCard) legacyCard.insertAdjacentElement("afterend", panel);
  else section.appendChild(panel);

  const $ = id => panel.querySelector("#" + id);
  const status = message => { $("mwStatus").textContent = message; };
  let connectedPublicKey = "";
  let wallets = [];

  if (!apiBase) {
    status("Multi-wallet staging API is not configured. Live production endpoints are intentionally not used. Set window.GURUG_MULTI_API_BASE to a separate staging Worker URL after staging D1 is configured.");
  } else {
    status("Staging API configured. Connect a wallet to manage dry-run token configurations.");
  }

  function base58(bytes) {
    const alphabet = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
    let digits = [0];
    for (const byte of bytes) {
      let carry = byte;
      for (let i = 0; i < digits.length; i++) {
        const value = digits[i] * 256 + carry;
        digits[i] = value % 58;
        carry = Math.floor(value / 58);
      }
      while (carry) { digits.push(carry % 58); carry = Math.floor(carry / 58); }
    }
    let zeros = 0;
    while (zeros < bytes.length && bytes[zeros] === 0) zeros++;
    const encoded = digits.length ? digits.reverse().map(n => alphabet[n]).join("") : "";
    return "1".repeat(zeros) + encoded;
  }

  async function post(action, body) {
    if (!apiBase) throw new Error("Staging API is not configured; no request was sent.");
    const response = await fetch(apiBase + "/?action=" + encodeURIComponent(action), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
      body: JSON.stringify(body)
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data.ok) throw new Error(data.error || ("Request failed (" + response.status + ")."));
    return data;
  }

  async function signChallenge(publicKey) {
    const provider = window.solana;
    if (!provider?.signMessage) throw new Error("Install or unlock Phantom (or a compatible Solana wallet) and connect it first.");
    const challenge = await post("wallet-challenge", { publicKey });
    const signed = await provider.signMessage(new TextEncoder().encode(challenge.message), "utf8");
    return { nonce: challenge.nonce, signature: base58(signed.signature) };
  }

  async function ownerRequest(action, body) {
    if (!connectedPublicKey) throw new Error("Connect a wallet first.");
    const auth = await signChallenge(connectedPublicKey);
    return post(action, { ...body, ...auth });
  }

  function renderWallets() {
    const list = $("mwWallets");
    const select = $("mwWalletSelect");
    list.replaceChildren();
    select.replaceChildren();
    if (!wallets.length) {
      list.textContent = "No registered wallets yet.";
      select.add(new Option("Register a wallet first", ""));
      select.disabled = true;
      $("mwCreate").disabled = true;
      $("mwLoadConfigs").disabled = true;
      $("mwLoadTrades").disabled = true;
      return;
    }
    for (const wallet of wallets) {
      const item = document.createElement("div");
      item.className = "mw-item";
      const title = document.createElement("strong");
      title.textContent = wallet.label || wallet.wallet_type || "Wallet";
      const detail = document.createElement("div");
      detail.className = "mw-small";
      detail.textContent = wallet.public_key + " · " + (Number(wallet.enabled) ? "enabled" : "disabled");
      item.append(title, detail);
      list.appendChild(item);
      select.add(new Option((wallet.label || wallet.public_key.slice(0, 8)) + " · #" + wallet.id, String(wallet.id)));
    }
    select.disabled = false;
    $("mwCreate").disabled = !apiBase;
    $("mwLoadConfigs").disabled = !apiBase;
    $("mwLoadTrades").disabled = !apiBase;
  }

  async function refreshWallets() {
    const data = await ownerRequest("wallets", { operation: "list" });
    wallets = Array.isArray(data.wallets) ? data.wallets : [];
    renderWallets();
    status("Loaded " + wallets.length + " wallet(s).");
  }

  async function registerConnectedWallet() {
    if (!connectedPublicKey) throw new Error("Connect a wallet first.");
    // The owner and target are the same connected wallet here, so the same
    // wallet signs two distinct, single-use challenges.
    const walletProof = await signChallenge(connectedPublicKey);
    const data = await ownerRequest("wallets", {
      operation: "register",
      walletProof,
      wallet: { publicKey: connectedPublicKey, walletType: "user_connected", label: "Connected wallet" }
    });
    status("Wallet registered: " + data.wallet.public_key);
    await refreshWallets();
  }

  async function loadConfigs() {
    const walletId = $("mwWalletSelect").value;
    if (!walletId) throw new Error("Select a wallet first.");
    const data = await ownerRequest("token-configs", { operation: "list", walletId });
    const list = $("mwConfigs");
    list.replaceChildren();
    if (!data.configs?.length) {
      list.textContent = "No token configurations for this wallet.";
      return;
    }
    for (const config of data.configs) {
      const item = document.createElement("div");
      item.className = "mw-item";
      const title = document.createElement("strong");
      title.textContent = config.token_mint + " · " + config.strategy + " / " + config.side;
      const details = document.createElement("div");
      details.className = "mw-small";
      details.textContent = "Amount " + config.trade_amount + " · interval " + config.interval_seconds + "s · max trades " + config.max_trades + " · " + config.mode + " · " + (Number(config.enabled) ? "enabled" : "disabled");
      const button = document.createElement("button");
      button.type = "button";
      button.className = "mw-button";
      button.textContent = Number(config.enabled) ? "Disable dry-run" : "Enable dry-run";
      button.addEventListener("click", async () => {
        button.disabled = true;
        try {
          await ownerRequest("token-configs", {
            operation: "set-enabled", walletId, configId: config.id, enabled: !Number(config.enabled)
          });
          await loadConfigs();
          status("Dry-run configuration updated. No live transaction was sent.");
        } catch (error) { status(error.message); button.disabled = false; }
      });
      item.append(title, details, button);
      list.appendChild(item);
    }
  }

  async function loadTrades() {
    const walletId = $("mwWalletSelect").value;
    if (!walletId) throw new Error("Select a wallet first.");
    const data = await ownerRequest("token-trades", { walletId });
    const list = $("mwTrades");
    list.replaceChildren();
    const trades = Array.isArray(data.trades) ? data.trades : [];
    if (!trades.length) {
      list.textContent = "No trade history for this wallet yet. Enabled dry-run strategies are evaluated by the preview scheduler about once per minute.";
      return;
    }
    for (const trade of trades) {
      const item = document.createElement("div");
      item.className = "mw-item";
      const title = document.createElement("strong");
      title.textContent = String(trade.side || "TRADE") + " · " + String(trade.status || "unknown").toUpperCase();
      const details = document.createElement("div");
      details.className = "mw-small";
      const amount = trade.side === "BUY"
        ? String(trade.amount_sol ?? "—") + " SOL"
        : String(trade.amount_token ?? "—") + " token units";
      const price = Number(trade.price_usd);
      details.textContent = String(trade.token_mint || "") + " · " + amount +
        " · price " + (Number.isFinite(price) && price > 0 ? "$" + price.toPrecision(6) : "—") +
        " · " + String(trade.created_at || "time unavailable");
      item.append(title, details);
      if (trade.error_message) {
        const error = document.createElement("div");
        error.className = "mw-small";
        error.textContent = "Note: " + String(trade.error_message);
        item.appendChild(error);
      }
      list.appendChild(item);
    }
    status("Loaded " + trades.length + " recent trade record(s). Dry-run records do not represent on-chain transactions.");
  }

  async function createConfig() {
    const walletId = $("mwWalletSelect").value;
    const tokenMint = $("mwMint").value.trim();
    if (!walletId) throw new Error("Select a wallet first.");
    if (!/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(tokenMint)) {
      throw new Error("Enter a valid-looking Solana token mint address (32–44 base58 characters).");
    }
    const strategy = $("mwStrategy").value;
    const side = $("mwSide").value;
    const tradeAmount = Number($("mwAmount").value);
    const intervalSeconds = Number($("mwInterval").value);
    const maxTrades = Number($("mwMaxTrades").value);
    const maxTotalSpend = Number($("mwMaxSpend").value);
    const targetPrice = $("mwTarget").value ? Number($("mwTarget").value) : null;
    const stopLoss = $("mwStopLoss").value ? Number($("mwStopLoss").value) : null;
    const takeProfit = $("mwTakeProfit").value ? Number($("mwTakeProfit").value) : null;
    if (!Number.isFinite(tradeAmount) || tradeAmount <= 0) throw new Error("Trade amount must be greater than zero.");
    if (!Number.isSafeInteger(intervalSeconds) || intervalSeconds < 60) throw new Error("Interval must be at least 60 seconds.");
    if (!Number.isSafeInteger(maxTrades) || maxTrades < 1) throw new Error("Maximum trades must be a positive whole number.");
    if (!Number.isFinite(maxTotalSpend) || maxTotalSpend < 0) throw new Error("Maximum spend cannot be negative.");
    if (strategy === "TARGET" && (!Number.isFinite(targetPrice) || targetPrice <= 0)) {
      throw new Error("Target strategy requires a target price greater than zero.");
    }
    for (const [label, value] of [["Stop loss", stopLoss], ["Take profit", takeProfit]]) {
      if (value !== null && (!Number.isFinite(value) || value <= 0)) {
        throw new Error(label + " must be greater than zero when specified.");
      }
    }
    const config = {
      tokenMint, strategy, side, tradeAmount, intervalSeconds, maxTrades, maxTotalSpend,
      targetPrice, stopLoss, takeProfit, mode: "dry_run", enabled: 0
    };
    await ownerRequest("token-configs", { operation: "create", walletId, config });
    status("Token config saved disabled in dry-run mode. No live transaction was sent.");
    await loadConfigs();
  }
  async function run(action) {
    try {
      status("Working…");
      await action();
    } catch (error) {
      status(error?.message || String(error));
    }
  }

  $("mwSetApi").addEventListener("click", () => run(async () => {
    const raw = $("mwApiUrl").value.trim();
    let parsed;
    try { parsed = new URL(raw); } catch { throw new Error("Enter a valid preview or staging Worker URL."); }
    const host = parsed.hostname.toLowerCase();
    const approvedPreview = host === "gurug-trading-bot-preview.pcaticom.workers.dev";
    const approvedStaging = host.includes("staging");
    if (parsed.protocol !== "https:" || (!approvedPreview && !approvedStaging)) {
      throw new Error("For safety, use HTTPS and the isolated Gurug preview Worker or a staging hostname. Production endpoints are rejected.");
    }
    if (parsed.username || parsed.password || parsed.search || parsed.hash) {
      throw new Error("Use a clean Worker origin without credentials, query parameters, or fragments.");
    }
    apiBase = parsed.origin.replace(/\/+$/, "");
    $("mwConnect").disabled = false;
    $("mwCreate").disabled = wallets.length === 0;
    $("mwLoadConfigs").disabled = wallets.length === 0;
    $("mwLoadTrades").disabled = wallets.length === 0;
    status("Preview/staging endpoint selected for this page session: " + apiBase);
  }));

  $("mwConnect").addEventListener("click", () => run(async () => {
    if (!apiBase) throw new Error("Configure the separate staging API first. Production endpoint is intentionally not used.");
    const provider = window.solana;
    if (!provider?.connect) throw new Error("Install a compatible Solana wallet extension.");
    const result = await provider.connect();
    connectedPublicKey = (result.publicKey || provider.publicKey).toBase58();
    $("mwConnect").textContent = connectedPublicKey.slice(0, 6) + "…" + connectedPublicKey.slice(-6);
    $("mwRefresh").disabled = false;
    $("mwRegister").disabled = false;
    status("Connected wallet " + connectedPublicKey + ". Loading its wallet list…");
    await refreshWallets();
  }));
  $("mwRefresh").addEventListener("click", () => run(refreshWallets));
  $("mwRegister").addEventListener("click", () => run(registerConnectedWallet));
  $("mwLoadConfigs").addEventListener("click", () => run(loadConfigs));
  $("mwLoadTrades").addEventListener("click", () => run(loadTrades));
  $("mwCreate").addEventListener("click", () => run(createConfig));
})();
