(() => {
  "use strict";
  // Preview-only integration: never redirects existing live Save/Start/Stop controls.
  const API = "https://gurug-trading-bot-preview.pcaticom.workers.dev/";
  const button = document.getElementById("botDryRunSaveButton");
  const status = document.getElementById("botDryRunStatus");
  if (!button || !status) return;
  const setStatus = (message, error = false) => {
    const line = status.querySelector("div:last-child");
    if (line) line.textContent = message;
    status.classList.toggle("error", error);
  };
  function walletProvider() {
    if (window.phantom?.solana?.isPhantom) return window.phantom.solana;
    if (window.solana?.isPhantom) return window.solana;
    return null;
  }
  function base58(bytes) {
    const alphabet = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
    const digits = [0];
    for (const byte of bytes) {
      let carry = byte;
      for (let i = 0; i < digits.length; i++) {
        const n = digits[i] * 256 + carry;
        digits[i] = n % 58;
        carry = Math.floor(n / 58);
      }
      while (carry > 0) { digits.push(carry % 58); carry = Math.floor(carry / 58); }
    }
    let zeros = 0;
    while (zeros < bytes.length && bytes[zeros] === 0) zeros++;
    return "1".repeat(zeros) + (digits.length ? digits.reverse().map(n => alphabet[n]).join("") : "");
  }
  async function post(action, body) {
    const response = await fetch(API + "?action=" + encodeURIComponent(action), {
      method: "POST", headers: { "Content-Type": "application/json" }, cache: "no-store",
      body: JSON.stringify(body)
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || data.ok !== true) throw new Error(data.error || "Preview API request failed (" + response.status + ").");
    return data;
  }
  async function auth(provider, publicKey) {
    if (typeof provider.signMessage !== "function") throw new Error("This Phantom connection does not support message signing.");
    const challenge = await post("wallet-challenge", { publicKey });
    const result = await provider.signMessage(new TextEncoder().encode(challenge.message), "utf8");
    return { nonce: challenge.nonce, signature: base58(result.signature || result) };
  }
  async function protectedPost(provider, publicKey, action, body) {
    return post(action, { ...body, ...await auth(provider, publicKey) });
  }
  function collectConfig() {
    const strategy = document.querySelector(".bot-strategy.active")?.dataset.strategy || "dca";
    const target = document.getElementById("botTargetPrice")?.value || "";
    const stopLoss = document.getElementById("botStopLoss")?.value || "";
    const takeProfit = document.getElementById("botTakeProfit")?.value || "";
    const side = (document.getElementById("botSide")?.value || "buy").toUpperCase();
    const tradeAmount = Number(document.getElementById("botTradeAmount")?.value);
    const maxTrades = Number(document.getElementById("botMaxTrades")?.value || 1);
    const maxTotalSpend = Number(document.getElementById("botMaxSpend")?.value || 0);
    const tokenMint = document.getElementById("botTokenMint")?.value.trim() || "";
    const intervalSeconds = Number(document.getElementById("botInterval")?.value || 300);
    if (!/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(tokenMint)) throw new Error("Enter a valid-looking Solana token mint address.");
    if (!Number.isFinite(tradeAmount) || tradeAmount <= 0) throw new Error("Trade amount must be greater than zero.");
    if (!Number.isSafeInteger(maxTrades) || maxTrades < 1) throw new Error("Maximum trades must be a positive whole number.");
    if (!Number.isSafeInteger(intervalSeconds) || intervalSeconds < 60) throw new Error("Interval must be at least 60 seconds.");
    if (!Number.isFinite(maxTotalSpend) || maxTotalSpend < 0) throw new Error("Maximum total spend cannot be negative.");
    if (strategy === "advanced") throw new Error("Advanced strategy is not available yet.");
    if (strategy === "target" && (!Number.isFinite(Number(target)) || Number(target) <= 0)) throw new Error("Enter a target price greater than zero.");
    return {
      tokenMint, strategy: strategy === "target" ? "TARGET" : "DCA", side, tradeAmount,
      intervalSeconds, maxTrades, maxTotalSpend,
      targetPrice: target === "" ? null : Number(target),
      stopLoss: stopLoss === "" ? null : Number(stopLoss),
      takeProfit: takeProfit === "" ? null : Number(takeProfit),
      mode: "dry_run", enabled: 0
    };
  }
  button.addEventListener("click", async () => {
    button.disabled = true;
    try {
      setStatus("Connecting Phantom and validating the token mint on the preview API…");
      const provider = walletProvider();
      if (!provider) throw new Error("Phantom was not found. Install or unlock Phantom, then try again.");
      if (!provider.publicKey) await provider.connect();
      const publicKey = provider.publicKey.toBase58();
      const registered = await protectedPost(provider, publicKey, "wallets", {
        operation: "register",
        wallet: { publicKey, walletType: "user_connected", label: "GurugSwap Phantom" }
      });
      const walletId = Number(registered.wallet?.id);
      if (!Number.isSafeInteger(walletId) || walletId <= 0) throw new Error("Preview API did not return a valid wallet ID.");
      const saved = await protectedPost(provider, publicKey, "token-configs", {
        operation: "create", walletId, config: collectConfig()
      });
      setStatus("Saved disabled DRY-RUN config #" + saved.config.id + " for wallet " +
        publicKey.slice(0, 5) + "…" + publicKey.slice(-5) +
        ". Mint verified on-chain; live trading was not started.");
    } catch (error) {
      setStatus(error?.message || "Could not save dry-run configuration.", true);
    } finally {
      button.disabled = false;
    }
  });
})();
