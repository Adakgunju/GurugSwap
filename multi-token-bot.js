(() => {
  "use strict";

  const API = window.GURUG_TRADING_BOT_API_BASE || "https://gurug-trading-bot-preview.pcaticom.workers.dev/";
  const $ = (id) => document.getElementById(id);
  const status = $("multiBotStatus");
  const walletSelect = $("multiBotWallet");
  const walletList = $("multiBotWalletList");

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
      const enabledWallets = wallets.filter(wallet => Number(wallet.enabled) === 1 || wallet.enabled === true);
      if (!enabledWallets.length) {
        const option = document.createElement("option");
        option.value = "";
        option.textContent = wallets.length ? "No enabled wallets available" : "Register a wallet first";
        walletSelect.append(option);
      }
      for (const wallet of enabledWallets) {
        const option = document.createElement("option");
        option.value = String(wallet.id);
        option.textContent = shortKey(wallet.public_key) + " · " + (wallet.wallet_type || "wallet");
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

  // Keep the primary account proof in memory while the user switches Phantom's
  // active account to the secondary wallet they want to register. Never persist signatures.
  let pendingOwnerAuth = null;
  let pendingOwnerPublicKey = null;

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

      if (!pendingOwnerAuth) {
        setStatus("Sign once with your primary account to establish the wallet group…");
        pendingOwnerAuth = await signedChallenge(walletProvider, publicKey);
        pendingOwnerPublicKey = publicKey;
        setStatus(
          "Primary account signature captured (server verification happens on the next request): " + shortKey(publicKey) +
          ". To add another wallet, switch Phantom to that wallet and click REGISTER CONNECTED WALLET again. " +
          "This signature only authenticates settings; it cannot transfer tokens."
        );
        const button = $("multiBotRegister");
        if (button) button.textContent = "REGISTER / CONTINUE";
        return;
      }

      if (publicKey === pendingOwnerPublicKey) {
        throw new Error("Switch Phantom to a different secondary wallet before continuing.");
      }

      setStatus("Sign a separate ownership proof with the wallet currently selected in Phantom…");
      const walletProof = await signedChallenge(walletProvider, publicKey);
      const data = await post("wallets", {
        ...pendingOwnerAuth,
        operation: "register",
        wallet: { publicKey, walletType: "user_connected", label: "GurugSwap connected wallet" },
        walletProof
      });

      pendingOwnerAuth = null;
      const registeredButton = $("multiBotRegister");
      if (registeredButton) registeredButton.textContent = "REGISTER CONNECTED WALLET";
      setStatus(
        "Wallet " + shortKey(data.wallet?.public_key || publicKey) +
        " registered under primary account " + shortKey(pendingOwnerPublicKey) +
        ". No private key was shared."
      );
      pendingOwnerPublicKey = null;
      setStatus("Registration complete. Switch Phantom back to the primary account and click CONNECT / LOAD WALLETS to refresh the full wallet group.");
    } catch (error) {
      const message = error.message || "Could not register wallet.";
      if (/invalid or expired wallet challenge/i.test(message)) {
        pendingOwnerAuth = null;
        pendingOwnerPublicKey = null;
        const button = $("multiBotRegister");
        if (button) button.textContent = "REGISTER CONNECTED WALLET";
        setStatus("The primary signature expired. Click REGISTER CONNECTED WALLET again to restart the two-step flow.", true);
        return;
      }
      setStatus(message, true);
    }
  });

  $("multiBotCreateConfig")?.addEventListener("click", async () => {
    try {
      const walletId = Number(walletSelect?.value);
      if (!Number.isSafeInteger(walletId) || walletId <= 0) throw new Error("Register and select a wallet first.");
      const strategy = $("multiBotStrategy")?.value || "DCA";
      const targetPrice = $("multiBotTarget")?.value || "";
      const tokenMint = $("multiBotMint")?.value.trim() || "";
      const tradeAmount = Number($("multiBotAmount")?.value);
      const intervalSeconds = Number($("multiBotInterval")?.value || 300);
      const maxTrades = Number($("multiBotMaxTrades")?.value || 1);
      const maxTotalSpend = Number($("multiBotMaxSpend")?.value || 0);
      const parsedTarget = targetPrice === "" ? null : Number(targetPrice);

      // Catch common form errors before requesting a wallet signature.
      if (!/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(tokenMint)) {
        throw new Error("Enter a valid-looking Solana token mint address.");
      }
      if (!Number.isFinite(tradeAmount) || tradeAmount <= 0) {
        throw new Error("Trade amount must be greater than 0.");
      }
      if (!Number.isSafeInteger(intervalSeconds) || intervalSeconds < 60) {
        throw new Error("Interval must be at least 60 whole seconds.");
      }
      if (!Number.isSafeInteger(maxTrades) || maxTrades < 1) {
        throw new Error("Maximum trades must be a positive whole number.");
      }
      if (!Number.isFinite(maxTotalSpend) || maxTotalSpend < 0) {
        throw new Error("Maximum total spend cannot be negative.");
      }
      if (strategy === "TARGET" && (!Number.isFinite(parsedTarget) || parsedTarget <= 0)) {
        throw new Error("Enter a target price greater than 0 for TARGET strategy.");
      }

      const config = {
        tokenMint,
        strategy,
        side: $("multiBotSide")?.value || "BUY",
        tradeAmount,
        intervalSeconds,
        maxTrades,
        maxTotalSpend,
        targetPrice: parsedTarget,
        mode: "dry_run",
        enabled: 0
      };
      setStatus("Saving disabled dry-run configuration…");
      const data = await authenticated("token-configs", { operation: "create", walletId, config });
      const output = $("multiBotConfigResult");
      if (output) output.textContent = "Saved config #" + data.config.id + " · " + data.config.strategy + " · DRY RUN · DISABLED";
      await loadConfigs();
      setStatus("Configuration #" + data.config.id + " saved. It is disabled in DRY-RUN mode; enable it below when ready to simulate.");
    } catch (error) {
      setStatus(error.message || "Could not save token configuration.", true);
    }
  });

  async function loadConfigs() {
    const walletId = Number(walletSelect?.value);
    if (!Number.isSafeInteger(walletId) || walletId <= 0) throw new Error("Register and select a wallet first.");
    const data = await authenticated("token-configs", { operation: "list", walletId });
    const output = $("multiBotConfigResult");
    if (!output) return;
    output.replaceChildren();
    const configs = data.configs || [];
    if (!configs.length) {
      output.textContent = "No token configurations for this wallet yet.";
    } else {
      for (const config of configs) {
        const row = document.createElement("div");
        row.style.cssText = "display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;padding:10px 0;border-bottom:1px solid rgba(255,229,0,.14)";
        const details = document.createElement("span");
        details.textContent = "#" + config.id + " · " + config.token_mint + " · " + config.strategy + " · " + String(config.mode || "dry_run").toUpperCase() + (Number(config.enabled) ? " · ENABLED" : " · DISABLED");
        details.style.cssText = "overflow-wrap:anywhere;flex:1;min-width:180px";
        const toggle = document.createElement("button");
        toggle.type = "button";
        toggle.className = Number(config.enabled) ? "bot-secondary" : "bot-primary";
        toggle.textContent = Number(config.enabled) ? "PAUSE DRY RUN" : "ENABLE DRY RUN";
        toggle.addEventListener("click", async () => {
          try {
            toggle.disabled = true;
            setStatus((Number(config.enabled) ? "Disabling" : "Enabling") + " dry-run config #" + config.id + "…");
            await authenticated("token-configs", {
              operation: "set-enabled",
              walletId,
              configId: config.id,
              enabled: !Number(config.enabled)
            });
            await loadConfigs();
            setStatus("Dry-run config #" + config.id + " updated. Live trading remains disabled.");
          } catch (error) {
            toggle.disabled = false;
            setStatus(error.message || "Could not update configuration.", true);
          }
        });
        row.append(details, toggle);
        output.append(row);
      }
    }
    setStatus("Loaded " + configs.length + " token configuration(s).");
  }

  walletSelect?.addEventListener("change", async () => {
    try {
      await loadConfigs();
    } catch (error) {
      // A newly rendered wallet list can briefly have no selection.
      setStatus(error.message || "Could not load token configurations.", true);
    }
  });

  $("multiBotLoadConfigs")?.addEventListener("click", async () => {
    try {
      await loadConfigs();
    } catch (error) {
      setStatus(error.message || "Could not load token configurations.", true);
    }
  });
})();