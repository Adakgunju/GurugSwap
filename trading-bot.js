(() => {
  const card = document.querySelector(".trading-bot-card");
  const strategyButtons = [...document.querySelectorAll(".bot-strategy")];
  const saveButton = document.getElementById("botSaveButton");
  const statusCard = document.getElementById("botStatusCard");
  const statusLabel = document.getElementById("botStatusLabel");
  const statusMeta = document.getElementById("botStatusMeta");
  const statusMessage = document.getElementById("botStatusMessage");
  const storageKey = "gurugSwap.tradingBotStrategy";
  const backendUrl = "https://gurug-trading-bot.pcaticom.workers.dev/?action=status";
  const decisionUrl = "https://gurug-trading-bot.pcaticom.workers.dev/?action=decision";
  const historyUrl = "https://gurug-trading-bot.pcaticom.workers.dev/?action=history";
  const settingsUrl = "https://gurug-trading-bot.pcaticom.workers.dev/trade?action=settings";

  function setStrategy(strategy) {
    strategyButtons.forEach(button => {
      button.classList.toggle("active", button.dataset.strategy === strategy);
    });
    card?.classList.remove("strategy-dca","strategy-target","strategy-advanced");
    card?.classList.add("strategy-" + strategy);
    try { localStorage.setItem(storageKey, strategy); } catch {}
  }

  strategyButtons.forEach(button => {
    button.addEventListener("click", () => setStrategy(button.dataset.strategy));
  });

  try {
    const saved = localStorage.getItem(storageKey);
    if (saved && ["dca","target","advanced"].includes(saved)) setStrategy(saved);
    else setStrategy("dca");
  } catch {
    setStrategy("dca");
  }

  async function refreshBackendStatus() {
    try {
      const response = await fetch(backendUrl, { cache: "no-store" });
      const data = await response.json();
      const backendStatus = document.getElementById("botBackendStatus");
      const startButton = document.getElementById("botStartButton");
      if (data?.ok) {
        backendStatus.textContent = Number(data.enabled) === 1 ? "BACKEND ONLINE / ACTIVE" : "BACKEND ONLINE / STOPPED";
        statusCard?.classList.remove("error");
        statusLabel.textContent = Number(data.enabled) === 1 ? "ACTIVE" : "STOPPED";
        statusMeta.textContent = `${String(data.strategy || "DCA").toUpperCase()} / ${String(data.side || "BUY").toUpperCase()}`;
        statusMessage.textContent = `Backend connected. Wallet ${data.wallet_matches ? "verified" : "mismatch"} · Balance ${Number(data.sol_balance || 0).toFixed(4)} SOL · Price ${data.market_price_usd == null ? "—" : "$" + Number(data.market_price_usd).toFixed(6)}.`;
        if (startButton) {
          startButton.disabled = false;
          startButton.dataset.enabled = Number(data.enabled) === 1 ? "1" : "0";
          startButton.textContent = Number(data.enabled) === 1 ? "STOP BOT" : "START BOT";
        }
      }
    } catch {
      const backendStatus = document.getElementById("botBackendStatus");
      if (backendStatus) backendStatus.textContent = "BACKEND OFFLINE";
    }
  }

  async function refreshHistory() {
    try {
      const response = await fetch(historyUrl, { cache: "no-store" });
      const data = await response.json();
      const history = document.querySelector(".bot-history");
      if (!data?.ok || !history) return;

      const rows = Array.isArray(data.trades) ? data.trades : [];
      const empty = history.querySelector(".bot-history-empty");
      if (empty) empty.remove();

      history.querySelectorAll(".bot-history-row").forEach(el => el.remove());

      if (!rows.length) {
        const el = document.createElement("div");
        el.className = "bot-history-empty";
        el.textContent = "No automated trades yet.";
        history.appendChild(el);
        return;
      }

      rows.forEach(trade => {
        const row = document.createElement("div");
        row.className = "bot-history-row";
        const side = String(trade.side || "").toUpperCase();
        const status = String(trade.status || "").toUpperCase();
        const amount = side === "SELL"
          ? Number(trade.amount_token || 0).toFixed(6) + " GURUG"
          : Number(trade.amount_sol || 0).toFixed(4) + " SOL";
        const price = trade.price_usd == null ? "—" : "$" + Number(trade.price_usd).toFixed(6);
        row.innerHTML = "<span>" + side + "</span><span>" + amount + "</span><span>" + price + "</span><span>" + status + "</span>";
        history.appendChild(row);
      });
    } catch {}
  }

  async function refreshDecision() {
    try {
      const response = await fetch(decisionUrl, { cache: "no-store" });
      const data = await response.json();
      if (!data?.ok) return;
      const tp = data.take_profit_usd == null ? "—" : "$" + Number(data.take_profit_usd).toFixed(6);
      const sl = data.stop_loss_usd == null ? "—" : "$" + Number(data.stop_loss_usd).toFixed(6);
      const balance = Number(data.token_balance || 0);
      const exit = data.exit_triggered ? " · EXIT " + String(data.exit_reason || "").replace("_"," ").toUpperCase() : "";
      const decisionLine = document.getElementById("botDecisionStatus");
      if (decisionLine) decisionLine.textContent = "TP " + tp + " · SL " + sl + " · Token balance " + balance.toFixed(6) + exit;
    } catch {}
  }

  refreshBackendStatus();
  refreshDecision();
  refreshHistory();
  setInterval(() => {
    refreshBackendStatus();
    refreshDecision();
    refreshHistory();
  }, 30000);

  function bytesToBase58(bytes) {
    const alphabet = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
    if (!bytes?.length) return "";

    let digits = [0];
    for (const byte of bytes) {
      let carry = byte;
      for (let i = 0; i < digits.length; i++) {
        const x = digits[i] * 256 + carry;
        digits[i] = x % 58;
        carry = Math.floor(x / 58);
      }
      while (carry) {
        digits.push(carry % 58);
        carry = Math.floor(carry / 58);
      }
    }

    let leadingZeros = 0;
    while (leadingZeros < bytes.length && bytes[leadingZeros] === 0) {
      leadingZeros++;
    }

    return "1".repeat(leadingZeros) +
      digits.reverse().map(i => alphabet[i]).join("");
  }

  async function getWalletSignature() {
    const provider = window.solana;
    if (!provider?.publicKey || !provider?.signMessage) {
      throw new Error("Connect the bot wallet in Phantom first.");
    }
    const publicKey = provider.publicKey.toBase58();
    const timestamp = Date.now();
    const message = "Gurug Bot Settings:\n" + timestamp;
    const result = await provider.signMessage(new TextEncoder().encode(message), "utf8");
    return {
      publicKey,
      timestamp,
      signatureBytes: Array.from(result.signature || [])
    };
  }

  function syncSideFields() {
    const side = document.getElementById("botSide")?.value || "buy";
    const tradeAmountLabel = document.querySelector('label[for="botTradeAmount"] small') ||
      document.getElementById("botTradeAmount")?.closest(".bot-field")?.querySelector("small");
    const tradeAmountInput = document.getElementById("botTradeAmount");
    const field = document.getElementById("botMaxSpend")?.closest(".bot-field");
    const input = document.getElementById("botMaxSpend");
    const isSell = side === "sell";

    if (tradeAmountLabel) {
      tradeAmountLabel.textContent = isSell ? "TRADE AMOUNT (GURUG)" : "TRADE AMOUNT (SOL)";
    }
    if (tradeAmountInput) {
      tradeAmountInput.step = isSell ? "1" : "0.001";
      tradeAmountInput.placeholder = isSell ? "100" : "0.10";
    }

    if (input) {
      input.disabled = isSell;
      input.setAttribute("aria-disabled", isSell ? "true" : "false");
    }
    if (field) field.classList.toggle("is-disabled", isSell);
  }

  document.getElementById("botSide")?.addEventListener("change", syncSideFields);
  syncSideFields();

  function collectSettings() {
    return {
      strategy: strategyButtons.find(button => button.classList.contains("active"))?.dataset.strategy || "dca",
      tokenMint: document.getElementById("botTokenMint")?.value.trim() || "",
      side: document.getElementById("botSide")?.value || "buy",
      tradeAmount: document.getElementById("botTradeAmount")?.value || "",
      interval: document.getElementById("botInterval")?.value || "300",
      maxTrades: document.getElementById("botMaxTrades")?.value || "",
      targetPrice: document.getElementById("botTargetPrice")?.value || "",
      stopLoss: document.getElementById("botStopLoss")?.value || "",
      takeProfit: document.getElementById("botTakeProfit")?.value || "",
      maxSpend: document.getElementById("botMaxSpend")?.value || ""
    };
  }

  async function saveBackendSettings(enabled) {
    const payload = collectSettings();
    const auth = await getWalletSignature();
    const response = await fetch(settingsUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...payload, enabled, ...auth })
    });
    const data = await response.json();
    if (!response.ok || !data?.ok) throw new Error(data?.error || "Could not save bot settings.");
    return data;
  }

  saveButton?.addEventListener("click", async () => {
    try {
      const enabled = Number(document.getElementById("botStartButton")?.dataset.enabled || "0");
      const data = await saveBackendSettings(enabled);
      try { localStorage.setItem("gurugSwap.tradingBotConfig", JSON.stringify(collectSettings())); } catch {}
      statusCard?.classList.remove("error");
      statusLabel.textContent = "SAVED";
      statusMeta.textContent = String(data.strategy || "DCA") + " / " + String(data.side || "BUY");
      statusMessage.textContent = enabled ? "Bot settings saved to the live Cloudflare backend." : "Bot settings saved. Bot is currently stopped.";
      refreshBackendStatus();
      refreshDecision();
    } catch (error) {
      statusCard?.classList.add("error");
      statusLabel.textContent = "SAVE FAILED";
      statusMessage.textContent = error?.message || "Could not save bot settings.";
    }
  });

  document.getElementById("botStartButton")?.addEventListener("click", async () => {
    const button = document.getElementById("botStartButton");
    const currentEnabled = Number(button?.dataset.enabled || "0");
    const enabled = currentEnabled === 1 ? 0 : 1;
    try {
      let data;
      if (enabled === 0) {
        const response = await fetch("https://gurug-trading-bot.pcaticom.workers.dev/trade?action=stop", {
          method: "POST",
          cache: "no-store"
        });
        data = await response.json();
        if (!response.ok || !data?.ok) throw new Error(data?.error || "Could not stop bot.");
      } else {
        data = await saveBackendSettings(1);
      }
      statusCard?.classList.remove("error");
      if (button) {
        button.dataset.enabled = enabled ? "1" : "0";
        button.textContent = enabled ? "STOP BOT" : "START BOT";
      }
      statusLabel.textContent = enabled ? "ACTIVE" : "STOPPED";
      statusMeta.textContent = String(data.strategy || "DCA") + " / " + String(data.side || "BUY");
      statusMessage.textContent = enabled ? "Bot started on the live Cloudflare backend." : "Bot stopped.";
      await refreshBackendStatus();
    } catch (error) {
      statusCard?.classList.add("error");
      statusLabel.textContent = "ACTION FAILED";
      statusMessage.textContent = error?.message || "Could not change bot state.";
    }
  });

  try {
    const raw = localStorage.getItem("gurugSwap.tradingBotConfig");
    if (raw) {
      const config = JSON.parse(raw);
      const map = {
        botTokenMint:"tokenMint", botSide:"side", botTradeAmount:"tradeAmount",
        botInterval:"interval", botMaxTrades:"maxTrades", botTargetPrice:"targetPrice",
        botStopLoss:"stopLoss", botTakeProfit:"takeProfit", botMaxSpend:"maxSpend"
      };
      Object.entries(map).forEach(([id,key]) => {
        const el = document.getElementById(id);
        if (el && config[key] !== undefined) el.value = config[key];
      });
      if (config.strategy) setStrategy(config.strategy);
    }
  } catch {}
})();
