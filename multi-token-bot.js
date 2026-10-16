(() => {
  "use strict";

  const API = "https://gurug-trading-bot.pcaticom.workers.dev/";
  const $ = (id) => document.getElementById(id);
  const status = $("multiBotStatus");
  const walletSelect = $("multiBotWallet");
  const walletList = $("multiBotWalletList");
  const SOL_MINT = "So11111111111111111111111111111111111111112";

  function provider() {
    return window.phantom?.solana?.isPhantom ? window.phantom.solana :
      (window.solana?.isPhantom ? window.solana : null);
  }

  function setStatus(message, error = false) {
    if (!status) return;
    status.textContent = message;
    status.classList.toggle("is-error", error);
  }

  function encodeBase58(bytes) {
    const alphabet = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
    const digits = [];
    for (const byte of bytes) {
      let carry = byte;
      for (let i = 0; i < digits.length; i++) {
        const n = digits[i] * 256 + carry;
        digits[i] = n % 58;
        carry = Math.floor(n / 58);
      }
      while (carry > 0) {
        digits.push(carry % 58);
        carry = Math.floor(carry / 58);
      }
    }
    let zeros = 0;
    while (zeros < bytes.length && bytes[zeros] === 0) zeros++;
    return "1".repeat(zeros) + (digits.length ? digits.reverse().map(n => alphabet[n]).join("") : "");
  }

  async function post(action, body) {
    const response = await fetch(API + "?action=" + encodeURIComponent(action), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
      body: JSON.stringify(body)
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data.ok) throw new Error(data.error || "Trading bot API request failed (" + response.status + ").");
    return data;
  }

  async function signedChallenge(walletProvider, publicKey) {
    if (typeof walletProvider.signMessage !== "function") {
      throw new Error("This wallet does not support signMessage. Use Phantom or another compatible Solana wallet.");
    }
    const challenge = await post("wallet-challenge", { publicKey });
    const signed = await walletProvider.signMessage(new TextEncoder().encode(challenge.message), "utf8");
    const signature = encodeBase58(signed.signature || signed);
    return { nonce: challenge.nonce, signature };
  }

  async function authenticated(action, body = {}) {
    const walletProvider = provider();
    if (!walletProvider?.publicKey) throw new Error("Connect your Phantom wallet first.");
    const publicKey = walletProvider.publicKey.toBase58();
    const auth = await signedChallenge(walletProvider, publicKey);
    return post(action, { ...body, ...auth });
  }

  function shortKey(key) {
    return key ? key.slice(0, 5) + "…" + key.slice(-5) : "—";
  }

  function renderWallets(wallets) {
    if (walletSelect) {
      walletSelect.replaceChildren();
      for (const wallet of wallets) {
        const option = document.createElement("option");
        option.value = String(wallet.id);
        option.textContent = shortKey(wallet.public_key) + " · " + (wallet.wallet_type || "wallet") + (Number(wallet.enabled) ? "" : " · disabled");
        walletSelect.append(option);
      }
    }
    if (walletList) {
      walletList.replaceChildren();
      if (!wallets.length) {
        walletList.textContent = "No registered wallets yet. Register the currently connected wallet to begin.";
        return;
      }
      for (const wallet of wallets) {
        const item = document.createElement("div");
        item.className = "multi-bot-wallet-row";
        const label = document.createElement("span");
        label.textContent = shortKey(wallet.public_key) + " · " + (wallet.wallet_type || "wallet");
        const state = document.createElement("small");
        state.textContent = Number(wallet.enabled) ? "ENABLED" : "DISABLED";
        item.append(label, state);
        walletList.append(item);
      }
    }
  }

  async function loadWallets() {
    setStatus("Authenticating wallet and loading your registered wallets…");
    const data = await authenticated("wallets", { operation: "list" });
    renderWallets(data.wallets || []);
    setStatus("Connected to the bot API. Wallets are scoped to the signed-in wallet.");
  }

  $("multiBotConnect")?.addEventListener("click", async () => {
    try {
      const walletProvider = provider();
      if (!walletProvider) throw new Error("Phantom was not found. Connect Phantom and try again.");
      if (!walletProvider.publicKey) await walletProvider.connect();
      await loadWallets();
    } catch (error) {
      setStatus(error.message || "Wallet connection failed.", true);
    }
  });

  $("multiBotRegister")?.addEventListener("click", async () => {
    try {
      const walletProvider = provider();
      if (!walletProvider?.publicKey) throw new Error("Connect your Phantom wallet first.");
      const publicKey = walletProvider.publicKey.toBase58();
      setStatus("Please approve the wallet ownership signature in Phantom…");
      // The owner signature and target-wallet proof are distinct one-time challenges.
      const walletProof = await signedChallenge(walletProvider, publicKey);
      const auth = await signedChallenge(walletProvider, publicKey);
      const data = await post("wallets", {
        ...auth,
        operation: "register",
        wallet: { publicKey, walletType: "user_connected", label: "GurugSwap connected wallet" },
        walletProof
      });
      setStatus("Wallet registered successfully. No private key was shared.");
      await loadWallets();
    } catch (error) {
      setStatus(error.message || "Could not register wallet.", true);
    }
  });

  $("multiBotCreateConfig")?.addEventListener("click", async () => {
    try {
      const walletId = Number(walletSelect?.value);
      if (!Number.isSafeInteger(walletId) || walletId <= 0) throw new Error("Register and select a wallet first.");
      const strategy = $("multiBotStrategy")?.value || "DCA";
      const targetPrice = $("multiBotTarget")?.value || "";
      const config = {
        tokenMint: $("multiBotMint")?.value.trim() || "",
        strategy,
        side: $("multiBotSide")?.value || "BUY",
        tradeAmount: Number($("multiBotAmount")?.value),
        intervalSeconds: Number($("multiBotInterval")?.value || 300),
        maxTrades: Number($("multiBotMaxTrades")?.value || 1),
        maxTotalSpend: Number($("multiBotMaxSpend")?.value || 0),
        targetPrice: targetPrice === "" ? null : Number(targetPrice),
        mode: "dry_run",
        enabled: 0
      };
      setStatus("Saving disabled dry-run configuration…");
      const data = await authenticated("token-configs", { operation: "create", walletId, config });
      setStatus("Configuration saved in DRY-RUN mode and left disabled. Live trading is not activated.");
      const output = $("multiBotConfigResult");
      if (output) output.textContent = "Saved config #" + data.config.id + " · " + data.config.strategy + " · DRY RUN · DISABLED";
    } catch (error) {
      setStatus(error.message || "Could not save token configuration.", true);
    }
  });

  $("multiBotLoadConfigs")?.addEventListener("click", async () => {
    try {
      const walletId = Number(walletSelect?.value);
      if (!Number.isSafeInteger(walletId) || walletId <= 0) throw new Error("Register and select a wallet first.");
      const data = await authenticated("token-configs", { operation: "list", walletId });
      const output = $("multiBotConfigResult");
      if (output) {
        output.textContent = data.configs?.length
          ? data.configs.map(c => "#" + c.id + " · " + c.token_mint + " · " + c.strategy + " · " + c.mode.toUpperCase() + (Number(c.enabled) ? " · ENABLED" : " · DISABLED")).join("\n")
          : "No token configurations for this wallet yet.";
      }
      setStatus("Loaded " + (data.configs?.length || 0) + " token configuration(s).");
    } catch (error) {
      setStatus(error.message || "Could not load token configurations.", true);
    }
  });
})();