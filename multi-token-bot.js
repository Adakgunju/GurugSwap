(() => {
  "use strict";

  const API = window.GURUG_TRADING_BOT_API_BASE || "https://gurug-trading-bot.pcaticom.workers.dev/";
  const $ = (id) => document.getElementById(id);
  const status = $("multiBotStatus");
  const walletSelect = $("multiBotWallet");
  const walletList = $("multiBotWalletList");
  const sideSelect = $("multiBotSide");
  const amountInput = $("multiBotAmount");

  function updateAmountHint() {
    const isSell = sideSelect?.value === "SELL";
    const label = amountInput?.closest("label")?.querySelector("small");
    if (label) label.textContent = isSell ? "TRADE AMOUNT (TOKENS)" : "TRADE AMOUNT (SOL)";
    if (amountInput) amountInput.placeholder = isSell ? "Token quantity to sell" : "SOL to spend per buy";
    if (amountInput) amountInput.step = isSell ? "any" : "0.001";
  }

  sideSelect?.addEventListener("change", updateAmountHint);
  updateAmountHint();

  function provider() {
    return window.phantom?.solana?.isPhantom ? window.phantom.solana :
      (window.solana?.isPhantom ? window.solana : null);
  }

  function formatRawAmount(raw, decimals) {
    if (raw === undefined || raw === null || !Number.isInteger(Number(decimals)) || Number(decimals) < 0 || Number(decimals) > 18) {
      return String(raw ?? "—");
    }
    const digits = String(raw);
    if (!/^\d+$/.test(digits)) return String(raw);
    const scale = 10n ** BigInt(Number(decimals));
    const value = BigInt(digits);
    const whole = value / scale;
    if (Number(decimals) === 0) return whole.toString();
    const fraction = (value % scale).toString().padStart(Number(decimals), "0").replace(/0+$/, "");
    return fraction ? whole.toString() + "." + fraction : whole.toString();
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
    return { publicKey, nonce: challenge.nonce, signature };
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
        if (Number(wallet.enabled) === 1 || wallet.enabled === true) {
          const disable = document.createElement("button");
          disable.type = "button";
          disable.className = "bot-secondary";
          disable.textContent = "DISABLE";
          disable.addEventListener("click", async () => {
            if (!window.confirm("Disable this wallet for new dry-run configurations? Existing configuration history will be retained.")) return;
            disable.disabled = true;
            try {
              setStatus("Disabling wallet " + shortKey(wallet.public_key) + "…");
              const result = await authenticated("wallets", { operation: "disable", walletId: wallet.id });
              if (!result.disabled) throw new Error("Wallet was already disabled or could not be found.");
              await loadWallets();
              setStatus("Wallet disabled. Its history is retained; it can no longer be selected for new dry-run configurations.");
            } catch (error) {
              disable.disabled = false;
              setStatus(error.message || "Could not disable wallet.", true);
            }
          });
          item.append(disable);
        }
        walletList.append(item);
      }
    }
  }

  async function loadWallets() {
    setStatus("Authenticating your Phantom wallet and loading its workspace…");
    const data = await authenticated("wallets", { operation: "list" });
    renderWallets(data.wallets || []);
    setStatus("Connected. Your workspace is private to the currently signed-in Phantom wallet.");
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
    const button = $("multiBotRegister");
    if (button) button.disabled = true;
    try {
      const walletProvider = provider();
      if (!walletProvider?.publicKey) throw new Error("Connect your Phantom wallet first.");
      const publicKey = walletProvider.publicKey.toBase58();
      setStatus("Sign once to register the currently connected wallet as your private workspace…");
      const auth = await signedChallenge(walletProvider, publicKey);
      const data = await post("wallets", {
        ...auth,
        operation: "register",
        wallet: { publicKey, walletType: "user_connected", label: "GurugSwap user wallet" }
      });
      // The API returns a "wallets" array (not a singular "wallet" field).
      // Render the response shape correctly, then refresh from the signed workspace.
      renderWallets(data.wallets || []);
      setStatus("Your wallet is registered. Select it below to configure tokens. No private key was shared.");
      await loadWallets();
    } catch (error) {
      setStatus(error.message || "Could not register your wallet.", true);
    } finally {
      if (button) button.disabled = false;
    }
  });

  $("multiBotRaydiumQuote")?.addEventListener("click", async () => {
    const button = $("multiBotRaydiumQuote");
    const output = $("multiBotRaydiumQuoteResult");
    const SOL_MINT = "So11111111111111111111111111111111111111112";
    try {
      const tokenMint = $("multiBotMint")?.value.trim() || "";
      const side = $("multiBotSide")?.value || "BUY";
      const amount = String($("multiBotAmount")?.value || "").trim();
      if (!/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(tokenMint)) {
        throw new Error("Enter a valid-looking Solana token mint first.");
      }
      if (!amount || !Number.isFinite(Number(amount)) || Number(amount) <= 0) {
        throw new Error("Enter a positive trade amount first.");
      }
      if (button) button.disabled = true;
      if (output) output.textContent = "Requesting a live Raydium mainnet quote…";
      const quote = await post("raydium-quote", {
        inputMint: side === "BUY" ? SOL_MINT : tokenMint,
        outputMint: side === "BUY" ? tokenMint : SOL_MINT,
        amount,
        slippageBps: 50
      });
      if (output) {
        const inputLabel = side === "BUY" ? "SOL" : "token";
        const outputLabel = side === "BUY" ? "token" : "SOL";
        output.textContent =
          "RAYDIUM MAINNET QUOTE · " + quote.amount + " " + inputLabel +
          " → " + quote.expectedOutput + " " + outputLabel +
          " · minimum out: " + formatRawAmount(quote.minimumOutputRaw, quote.outputDecimals) + " " + outputLabel + " (minimum)" +
          " · price impact: " + (quote.priceImpactPct ?? "not reported") + "%" +
          " · slippage: " + quote.slippageBps + " bps. Quote only — no wallet signature or swap submitted.";
      }
      setStatus("Raydium mainnet quote received. No transaction was signed or sent.");
    } catch (error) {
      if (output) output.textContent = error.message || "Could not fetch a Raydium quote.";
      setStatus(error.message || "Could not fetch a Raydium quote.", true);
    } finally {
      if (button) button.disabled = false;
    }
  });

  $("multiBotRaydiumSwap")?.addEventListener("click", async () => {
    const button = $("multiBotRaydiumSwap");
    const output = $("multiBotRaydiumQuoteResult");
    const SOL_MINT = "So11111111111111111111111111111111111111112";
    const walletProvider = provider();
    const submittedSignatures = [];
    try {
      if (!walletProvider) throw new Error("Phantom was not found. Connect Phantom first.");
      if (!walletProvider.publicKey) await walletProvider.connect();
      if (typeof walletProvider.signAndSendTransaction !== "function") {
        throw new Error("This wallet does not support signAndSendTransaction.");
      }
      if (!window.solanaWeb3?.VersionedTransaction || !window.solanaWeb3?.Connection) {
        throw new Error("Solana Web3 library did not load; refresh the page and try again.");
      }
      const tokenMint = $("multiBotMint")?.value.trim() || "";
      const side = $("multiBotSide")?.value || "BUY";
      const amount = String($("multiBotAmount")?.value || "").trim();
      if (!/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(tokenMint)) {
        throw new Error("Enter a valid-looking Solana token mint first.");
      }
      if (!amount || !Number.isFinite(Number(amount)) || Number(amount) <= 0) {
        throw new Error("Enter a positive trade amount first.");
      }
      const inputLabel = side === "BUY" ? "SOL" : "token";
      const outputLabel = side === "BUY" ? "token" : "SOL";
      if (!window.confirm(
        "You are about to request a Solana MAINNET swap through Raydium.\\n\\n" +
        side + " · spend " + amount + " " + inputLabel + "\\n" +
        "Receive " + outputLabel + " (final amount depends on the quote)\\n" +
        "Slippage: 0.5%\\n\\n" +
        "Phantom will show the transaction for your approval. Only approve if the details look correct."
      )) return;
      if (button) button.disabled = true;
      if (output) output.textContent = "Refreshing Raydium mainnet quote before building the swap…";
      const quote = await post("raydium-quote", {
        inputMint: side === "BUY" ? SOL_MINT : tokenMint,
        outputMint: side === "BUY" ? tokenMint : SOL_MINT,
        amount,
        slippageBps: 50
      });
      if (output) output.textContent =
        "Quote: " + quote.amount + " " + inputLabel + " → " +
        quote.expectedOutput + " " + outputLabel +
        ". Building unsigned Raydium transaction(s)…";
      const built = await post("raydium-build", {
        inputMint: side === "BUY" ? SOL_MINT : tokenMint,
        outputMint: side === "BUY" ? tokenMint : SOL_MINT,
        walletPublicKey: walletProvider.publicKey.toBase58(),
        amount,
        slippageBps: 50
      });
      if (!Array.isArray(built.transactions) || built.transactions.length === 0) {
        throw new Error("Raydium did not return any transactions.");
      }
      const executionExpectedOutput = built.expectedOutput ?? quote.expectedOutput;
      const executionMinimumOutput = formatRawAmount(built.minimumOutputRaw ?? quote.minimumOutputRaw, built.outputDecimals ?? quote.outputDecimals);
      const connection = new window.solanaWeb3.Connection(
        "https://api.mainnet-beta.solana.com", "confirmed"
      );
      const signatures = [];
      for (let i = 0; i < built.transactions.length; i++) {
        const encoded = built.transactions[i]?.transaction;
        if (typeof encoded !== "string" || !encoded) {
          throw new Error("Raydium returned an invalid transaction payload.");
        }
        const raw = Uint8Array.from(atob(encoded), ch => ch.charCodeAt(0));
        const transaction = window.solanaWeb3.VersionedTransaction.deserialize(raw);
        if (transaction.message.staticAccountKeys[0]?.toBase58() !== walletProvider.publicKey.toBase58()) {
          throw new Error("Transaction fee payer does not match the connected Phantom wallet.");
        }
        if (output) output.textContent =
          "Phantom approval " + (i + 1) + " of " + built.transactions.length +
          " · fresh build quote: " + executionExpectedOutput + " " + outputLabel + " · minimum out: " + executionMinimumOutput + " " + outputLabel + ".";
        const sent = await walletProvider.signAndSendTransaction(transaction, {
          preflightCommitment: "confirmed",
          skipPreflight: false,
          maxRetries: 3
        });
        const signature = sent?.signature || sent;
        if (typeof signature !== "string" || !signature) {
          throw new Error("Wallet did not return a transaction signature.");
        }
        signatures.push(signature);
        submittedSignatures.push(signature);
        if (output) output.textContent =
          "Transaction submitted (" + (i + 1) + "/" + built.transactions.length +
          "): " + signature + " · waiting for confirmation…";
        const confirmation = await connection.confirmTransaction(signature, "confirmed");
        if (confirmation?.value?.err) {
          throw new Error("On-chain transaction failed: " + JSON.stringify(confirmation.value.err));
        }
      }
      if (output) output.textContent =
        "SWAP CONFIRMED · " + signatures.join(" · ") +
        " · " + quote.amount + " " + inputLabel + " → estimated " +
        executionExpectedOutput + " " + outputLabel + " · minimum out: " + executionMinimumOutput + " " + outputLabel + ". Verify final balances in Phantom.";
      setStatus("Raydium mainnet swap confirmed. Signature(s): " + signatures.join(", "));
    } catch (error) {
      const reason = error.message || "Swap could not be completed.";
      const partial = submittedSignatures.length
        ? " Transaction signature(s) already submitted: " + submittedSignatures.join(" · ") +
          ". Check each signature on Solscan and verify Phantom balances before retrying."
        : "";
      if (output) output.textContent = reason + partial;
      setStatus(reason + (submittedSignatures.length
        ? " Submitted signature(s): " + submittedSignatures.join(", ") + ". Check chain status before retrying."
        : ""), true);
    } finally {
      if (button) button.disabled = false;
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

  async function loadHistory() {
    const walletId = Number(walletSelect?.value);
    if (!Number.isSafeInteger(walletId) || walletId <= 0) throw new Error("Register and select a wallet first.");
    const data = await authenticated("token-trades", { operation: "list", walletId });
    const output = $("multiBotHistory");
    if (!output) return;
    output.replaceChildren();
    const trades = data.trades || [];
    if (!trades.length) {
      output.textContent = "No dry-run execution records for this wallet yet. Enable a configuration and wait for the next scheduler tick.";
      return;
    }
    for (const trade of trades) {
      const row = document.createElement("div");
      row.style.cssText = "padding:9px 0;border-bottom:1px solid rgba(255,229,0,.14);overflow-wrap:anywhere";
      const amount = trade.side === "SELL"
        ? (trade.amount_token == null ? "—" : String(trade.amount_token) + " token")
        : (trade.amount_sol == null ? "—" : String(trade.amount_sol) + " SOL");
      row.textContent = "#" + trade.id + " · " + String(trade.status || "unknown").toUpperCase() +
        " · " + String(trade.side || "—") + " · " + amount +
        " · price $" + (trade.price_usd == null ? "unavailable" : Number(trade.price_usd).toPrecision(6)) +
        " · config #" + (trade.token_config_id || "—") +
        " · " + (trade.created_at || "time unavailable");
      output.append(row);
    }
  }

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
        details.textContent = "#" + config.id + " · " + config.token_mint + " · " + config.strategy + " " + (config.side || "BUY") + " · Amount " + config.trade_amount + " · Every " + config.interval_seconds + "s · " + String(config.mode || "dry_run").toUpperCase() + (Number(config.enabled) ? " · ENABLED" : " · DISABLED");
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
    await loadHistory();
    setStatus("Loaded " + configs.length + " token configuration(s) and refreshed dry-run history.");
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