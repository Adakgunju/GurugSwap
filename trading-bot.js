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
          startButton.disabled = true;
          startButton.textContent = Number(data.enabled) === 1 ? "BOT RUNNING" : "START REQUIRES BACKEND CONTROL";
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

  saveButton?.addEventListener("click", () => {
    const strategy = strategyButtons.find(button => button.classList.contains("active"))?.dataset.strategy || "dca";
    const payload = {
      strategy,
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
    try {
      localStorage.setItem("gurugSwap.tradingBotConfig", JSON.stringify(payload));
      statusCard?.classList.remove("error");
      statusLabel.textContent = "SAVED";
      statusMeta.textContent = "LOCAL CONFIG";
      statusMessage.textContent = "Strategy saved locally. Cloudflare bot backend is connected; live settings are controlled by the backend.";
    } catch {
      statusCard?.classList.add("error");
      statusLabel.textContent = "SAVE FAILED";
      statusMessage.textContent = "Could not save the strategy locally.";
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
