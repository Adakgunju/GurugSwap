const mint = "G8zUWL2mz8DJ16BrfDJPCo7657kJU3Y5NcrGZ6jtpBm5";

document.getElementById("copyMint").addEventListener("click", async () => {
  try {
    await navigator.clipboard.writeText(mint);
    document.getElementById("copyText").textContent = "COPIED!";
    setTimeout(() => document.getElementById("copyText").textContent = "COPY", 1400);
  } catch (e) {
    alert(mint);
  }
});

const connectWalletBtn = document.getElementById("connectWallet");

function getPhantomProvider() {
  if (window.phantom?.solana?.isPhantom) return window.phantom.solana;
  if (window.solana?.isPhantom) return window.solana;
  return null;
}

function shortAddress(address) {
  return address ? address.slice(0, 4) + "..." + address.slice(-4) : "CONNECT WALLET";
}

function updateWalletButton(publicKey) {
  const label = publicKey ? shortAddress(publicKey.toString()) : "CONNECT WALLET";
  if (connectWalletBtn) connectWalletBtn.textContent = label;
  const heroBtn = document.getElementById("heroConnectWallet");
  if (heroBtn) heroBtn.textContent = label;
}

function isMobileDevice() {
  return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
}

function openInPhantom() {
  const pageUrl = encodeURIComponent(window.location.href);
  const ref = encodeURIComponent(window.location.origin);
  window.location.href = `https://phantom.app/ul/browse/${pageUrl}?ref=${ref}`;
}

async function connectPhantom() {
  const provider = getPhantomProvider();

  if (!provider) {
    if (isMobileDevice()) {
      // Regular mobile browsers do not inject Phantom's provider.
      // Open this exact page inside Phantom's in-app browser so the
      // normal provider connection path becomes available.
      openInPhantom();
      return;
    }

    if (swapStatus) {
      setSwapStatus("Opening Phantom wallet...");
    }
    return;
  }

  try {
    const response = await provider.connect();
    const connectedKey = response?.publicKey || provider.publicKey;
    updateWalletButton(connectedKey);
    if (connectedKey) {
      setTimeout(() => updateWalletButton(provider.publicKey || connectedKey), 250);
    }
  } catch (err) {
    console.log("Wallet connection cancelled or failed.", err);
  }
}

if (connectWalletBtn) {
  connectWalletBtn.addEventListener("click", async () => {
    const provider = getPhantomProvider();
    if (provider?.publicKey) {
      try {
        await provider.disconnect();
        updateWalletButton(null);
      } catch (err) {
        console.log(err);
      }
    } else {
      await connectPhantom();
    }
  });
}

const provider = getPhantomProvider();
if (provider) {
  provider.on("connect", (publicKey) => {
    updateWalletButton(publicKey);
    refreshBalancesSoon();
  });
  provider.on("disconnect", () => {
    updateWalletButton(null);
    refreshBalancesSoon();
  });
  provider.on("accountChanged", (publicKey) => {
    updateWalletButton(publicKey);
    refreshBalancesSoon();
  });
  if (provider.publicKey) updateWalletButton(provider.publicKey);
  // Phantom may finish restoring the session shortly after the page loads.
  setTimeout(() => {
    if (provider.publicKey) updateWalletButton(provider.publicKey);
  }, 500);
}


const RAYDIUM_API = "https://transaction-v1.raydium.io";
const RAYDIUM_BASE_API = "https://api-v3.raydium.io";
const SOL_MINT = "So11111111111111111111111111111111111111112";
const TX_VERSION = "V0";
const solAmountInput = document.getElementById("solAmount");
const gurugAmountEl = document.getElementById("gurugAmount");
const slippageEl = document.getElementById("slippage");
const fromTokenButton = document.getElementById("fromTokenButton");
const toTokenButton = document.getElementById("toTokenButton");
const tokenPicker = document.getElementById("tokenPicker");
const tokenSearch = document.getElementById("tokenSearch");
const tokenList = document.getElementById("tokenList");
const closeTokenPicker = document.getElementById("closeTokenPicker");
const swapDirectionButton = document.getElementById("swapDirection");

const TOKEN_CATALOG = [
  {symbol:"SOL", name:"Solana", mint:SOL_MINT, decimals:9, icon:"sol"},
  {symbol:"GURUG", name:"Gurug", mint, decimals:null, icon:"https://raw.githubusercontent.com/Adakgunju/Gurug/main/assets/logo/gurug-logo2.png"},
  {symbol:"USDC", name:"USD Coin", mint:"EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v", decimals:6},
  {symbol:"RAY", name:"Raydium", mint:"4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R", decimals:6},
  {symbol:"JUP", name:"Jupiter", mint:"JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN", decimals:6}
];

let fromToken = TOKEN_CATALOG[0];
let toToken = TOKEN_CATALOG[1];
const swapButton = document.getElementById("swapButton");
const swapStatus = document.getElementById("swapStatus");
const fromBalanceEl = document.getElementById("fromBalance");
const toBalanceEl = document.getElementById("toBalance");

let walletTokenBalance = null;
let walletSolBalance = null;
let balanceRefreshTimer = null;
let balanceRequestId = 0;

let gurugDecimals = null;
let lastSwapResponse = null;

const JUPITER_TOKEN_SEARCH = "https://lite-api.jup.ag/tokens/v2/search";

function isLikelyMint(value) {
  const q = String(value || "").trim();
  return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(q);
}

async function fetchTokenByMint(mintAddress) {
  const address = String(mintAddress || "").trim();
  if (!isLikelyMint(address)) return null;

  try {
    const res = await fetch(
      JUPITER_TOKEN_SEARCH + "?query=" + encodeURIComponent(address),
      {cache:"no-store"}
    );
    if (res.ok) {
      const data = await res.json();
      const found = Array.isArray(data)
        ? data.find(token => token?.id === address)
        : null;

      if (found) {
        return {
          symbol: found.symbol || "TOKEN",
          name: found.name || "Solana Token",
          mint: found.id,
          decimals: Number.isInteger(found.decimals) ? found.decimals : null,
          icon: found.icon || found.logoURI || "",
          verified: !!found.isVerified,
          source: "jupiter"
        };
      }
    }
  } catch (err) {
    console.warn("Mint lookup failed:", err);
  }

  // Keep mint-address lookup usable even if the token directory is unavailable.
  try {
    const supply = await rpcRequest(BALANCE_RPCS[0], "getTokenSupply", [address]);
    const decimals = Number(supply?.value?.decimals);
    if (Number.isInteger(decimals)) {
      return {
        symbol: address.slice(0, 4) + "…",
        name: "Solana Token",
        mint: address,
        decimals,
        icon: "",
        verified: false,
        source: "rpc"
      };
    }
  } catch (err) {
    console.warn("Mint RPC lookup failed:", err);
  }

  return null;
}

function updateSwapButtonState() {
  if (!swapButton) return;

  const amount = Number(solAmountInput?.value || 0);
  const hasAmount = Number.isFinite(amount) && amount > 0;
  const hasWallet = !!getPhantomProvider()?.publicKey;

  swapButton.textContent = hasWallet
    ? "SWAP " + toToken.symbol
    : "CONNECT WALLET";

  // Do not block the existing swap flow just because a public RPC is temporarily
  // unavailable. When a balance is available, enforce the insufficient-balance check.
  const insufficient =
    hasAmount &&
    walletTokenBalance !== null &&
    amount > walletTokenBalance;

  swapButton.disabled = insufficient;

  if (insufficient) {
    setSwapStatus(
      "INSUFFICIENT " + fromToken.symbol + " BALANCE",
      true
    );
  }
}

function setBalanceUnavailable(el) {
  if (!el) return;
  el.hidden = false;
  el.textContent = "BALANCE UNAVAILABLE";
}

const BALANCE_RPCS = [
  "https://rpc.solanatracker.io/public",
  "https://api.mainnet-beta.solana.com",
  "https://api.mainnet.solana.com",
  "https://solana-rpc.publicnode.com"
];

async function rpcRequest(rpcUrl, method, params) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 7000);

  try {
    const res = await fetch(rpcUrl, {
      method: "POST",
      headers: {"Content-Type":"application/json"},
      cache: "no-store",
      signal: controller.signal,
      body: JSON.stringify({
        jsonrpc:"2.0",
        id:1,
        method,
        params
      })
    });

    if (!res.ok) throw new Error("RPC HTTP " + res.status);

    const json = await res.json();
    if (json?.error) throw new Error(json.error.message || "RPC error");
    return json.result;
  } finally {
    clearTimeout(timeout);
  }
}

async function getJupiterHoldingBalance(owner, token) {
  const url = "https://api.jup.ag/ultra/v1/holdings/" + encodeURIComponent(owner);
  const res = await fetch(url, {
    cache: "no-store"
  });

  if (!res.ok) throw new Error("Jupiter holdings HTTP " + res.status);

  const data = await res.json();

  // Jupiter's holdings response can evolve, so locate the holding by mint
  // while accepting the common amount field shapes.
  const candidates = [];

  function collect(value) {
    if (!value) return;
    if (Array.isArray(value)) {
      value.forEach(collect);
      return;
    }
    if (typeof value !== "object") return;

    if (value.mint === token.mint || value.address === token.mint || value.id === token.mint) {
      candidates.push(value);
    }

    Object.values(value).forEach(collect);
  }

  collect(data);

  for (const item of candidates) {
    const raw =
      item.uiAmountString ??
      item.uiAmount ??
      item.balance ??
      item.amount;

    const amount = Number(raw);
    if (Number.isFinite(amount)) return amount;

    const rawAmount = Number(item.rawAmount ?? item.raw_amount);
    const decimals = Number(item.decimals);
    if (Number.isFinite(rawAmount) && Number.isInteger(decimals)) {
      return rawAmount / Math.pow(10, decimals);
    }
  }

  return null;
}

async function getWalletTokenBalance(token) {
  const provider = getPhantomProvider();
  if (!provider?.publicKey) throw new Error("Wallet not connected");

  const owner = provider.publicKey.toString();
  let lastError = null;

  // Prefer Jupiter's wallet-holdings service for SPL tokens. It is designed
  // specifically for wallet holdings and avoids browser RPC token-account
  // edge cases. Fall back to direct Solana RPC below.
  if (token.symbol !== "SOL") {
    try {
      const jupiterBalance = await getJupiterHoldingBalance(owner, token);
      if (jupiterBalance !== null) return jupiterBalance;
    } catch (jupiterError) {
      lastError = jupiterError;
      console.warn("Jupiter holdings balance failed:", jupiterError);
    }
  }

  for (const rpcUrl of BALANCE_RPCS) {
    try {
      if (token.symbol === "SOL") {
        const result = await rpcRequest(rpcUrl, "getBalance", [
          owner,
          {commitment:"confirmed"}
        ]);
        const lamports = Number(result?.value);
        if (!Number.isFinite(lamports)) {
          throw new Error("Invalid SOL balance response");
        }
        walletSolBalance = lamports / 1e9;
        return walletSolBalance;
      }

      // For SPL tokens, first resolve the deterministic Associated Token
      // Account (ATA) and ask the RPC directly for that account's balance.
      // This is much lighter and more reliable than scanning every token
      // account owned by the wallet.
      const ownerKey = new solanaWeb3.PublicKey(owner);
      const mintKey = new solanaWeb3.PublicKey(token.mint);
      const associatedProgram = new solanaWeb3.PublicKey(
        "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"
      );

      const tokenPrograms = [
        "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
        "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb"
      ];

      let foundAccount = false;

      for (const programId of tokenPrograms) {
        const tokenProgram = new solanaWeb3.PublicKey(programId);
        const [ata] = solanaWeb3.PublicKey.findProgramAddressSync(
          [
            ownerKey.toBuffer(),
            tokenProgram.toBuffer(),
            mintKey.toBuffer()
          ],
          associatedProgram
        );

        try {
          const result = await rpcRequest(rpcUrl, "getTokenAccountBalance", [
            ata.toBase58(),
            {commitment:"confirmed"}
          ]);

          const amount = Number(result?.value?.uiAmountString ?? 0);
          if (Number.isFinite(amount)) {
            foundAccount = true;
            return amount;
          }
        } catch (ataError) {
          lastError = ataError;
        }
      }

      // Fallback for wallets that hold the token in an ancillary account
      // rather than the standard ATA.
      let total = 0;
      let successfulProgramReads = 0;

      for (const programId of tokenPrograms) {
        try {
          const result = await rpcRequest(rpcUrl, "getTokenAccountsByOwner", [
            owner,
            {programId},
            {encoding:"jsonParsed", commitment:"confirmed"}
          ]);

          successfulProgramReads++;

          for (const account of result?.value || []) {
            const info = account?.account?.data?.parsed?.info;
            if (info?.mint !== token.mint) continue;

            const amount = Number(info?.tokenAmount?.uiAmountString ?? 0);
            if (Number.isFinite(amount)) total += amount;
          }
        } catch (programError) {
          lastError = programError;
        }
      }

      if (successfulProgramReads > 0) return total;
    } catch (err) {
      lastError = err;
      console.warn("Balance RPC failed:", rpcUrl, token.symbol, err);
    }
  }

  throw lastError || new Error("Could not read " + token.symbol + " balance");
}

async function refreshWalletBalances(fromSnapshot = fromToken, toSnapshot = toToken) {
  const provider = getPhantomProvider();
  const requestId = ++balanceRequestId;

  if (!provider?.publicKey) {
    walletTokenBalance = null;
    walletSolBalance = null;
    if (fromBalanceEl) {
      fromBalanceEl.hidden = false;
      fromBalanceEl.textContent = "BALANCE —";
    }
    if (toBalanceEl) {
      toBalanceEl.hidden = false;
      toBalanceEl.textContent = "BALANCE —";
    }
    updateSwapButtonState();
    return;
  }

  const results = await Promise.allSettled([
    getWalletTokenBalance(fromSnapshot),
    getWalletTokenBalance(toSnapshot)
  ]);

  if (requestId !== balanceRequestId) return;

  const fromResult = results[0];
  const toResult = results[1];

  if (fromResult.status === "fulfilled") {
    walletTokenBalance = fromResult.value;
    setBalanceMessage(fromBalanceEl, fromSnapshot, fromResult.value);
  } else {
    setBalanceUnavailable(fromBalanceEl);
    console.warn("FROM balance failed:", fromResult.reason);
  }

  if (toResult.status === "fulfilled") {
    setBalanceMessage(toBalanceEl, toSnapshot, toResult.value);
  } else {
    setBalanceUnavailable(toBalanceEl);
    console.warn("TO balance failed:", toResult.reason);
  }

  updateSwapButtonState();
}

function refreshBalancesSoon() {
  clearTimeout(balanceRefreshTimer);
  balanceRequestId++;

  const fromSnapshot = fromToken;
  const toSnapshot = toToken;

  balanceRefreshTimer = setTimeout(() => {
    refreshWalletBalances(fromSnapshot, toSnapshot);
  }, 120);
}

function formatBalance(value, decimals = 6) {
  if (!Number.isFinite(value)) return "0";
  return value.toLocaleString("en-US", {maximumFractionDigits: Math.min(decimals, 6)});
}

function setBalanceMessage(el, token, amount) {
  if (!el) return;
  el.hidden = false;
  el.textContent = "BALANCE " + formatBalance(amount, token.decimals ?? 6);
}

function tokenIconMarkup(token) {
  if (token.icon === "sol") {
    return '<span class="sol-logo" aria-hidden="true"><i></i><i></i><i></i></span>';
  }
  return token.icon ? '<img src="' + token.icon + '" alt="">' : '<span class="token-fallback">' + token.symbol.slice(0,1) + '</span>';
}

const TOKEN_ICON_CACHE = new Map(
  TOKEN_CATALOG
    .filter(token => token.icon && token.icon !== "sol")
    .map(token => [token.mint, token.icon])
);

async function hydrateTokenIcon(token) {
  if (!token || token.icon === "sol" || token.icon) return token;

  const cached = TOKEN_ICON_CACHE.get(token.mint);
  if (cached) {
    token.icon = cached;
    return token;
  }

  try {
    const found = await fetchTokenByMint(token.mint);
    if (found?.icon) {
      token.icon = found.icon;
      token.name = found.name || token.name;
      token.decimals = found.decimals ?? token.decimals;
      token.verified = found.verified ?? token.verified;
      TOKEN_ICON_CACHE.set(token.mint, found.icon);

      const catalogToken = TOKEN_CATALOG.find(item => item.mint === token.mint);
      if (catalogToken) Object.assign(catalogToken, token);
    }
  } catch (err) {
    console.warn("Token icon lookup failed:", token.symbol, err);
  }

  return token;
}

function attachTokenImageFallback(img, symbol) {
  img.addEventListener("error", () => {
    const fallback = document.createElement("span");
    fallback.className = "token-fallback token-dynamic-icon";
    fallback.textContent = String(symbol || "?").slice(0, 1).toUpperCase();
    img.replaceWith(fallback);
  }, {once:true});
}

async function hydrateCatalogIcons() {
  const targets = TOKEN_CATALOG.filter(token =>
    token.symbol !== "SOL" && token.icon !== "sol" && !token.icon
  );
  await Promise.allSettled(targets.map(token => hydrateTokenIcon(token)));
  updateTokenButtons();
}

function updateTokenButtons() {
  const fromSymbol = document.getElementById("fromTokenSymbol");
  const toSymbol = document.getElementById("toTokenSymbol");
  const toIcon = document.getElementById("toTokenIcon");
  const fromButton = document.getElementById("fromTokenButton");
  const toButton = document.getElementById("toTokenButton");

  if (fromSymbol) fromSymbol.textContent = fromToken.symbol;
  if (toSymbol) toSymbol.textContent = toToken.symbol;

  // FROM: remove every old icon, including the original HTML SOL icon.
  if (fromButton) {
    fromButton.querySelectorAll("img, .sol-logo, .token-dynamic-icon, .token-fallback").forEach(el => el.remove());

    if (fromToken.symbol === "SOL") {
      const solLogo = document.createElement("span");
      solLogo.className = "sol-logo";
      solLogo.setAttribute("aria-hidden", "true");
      solLogo.innerHTML = "<i></i><i></i><i></i>";
      fromButton.insertBefore(solLogo, fromButton.firstChild);
    } else if (fromToken.icon && fromToken.icon !== "sol") {
      const img = document.createElement("img");
      img.className = "token-dynamic-icon";
      img.src = fromToken.icon;
      img.alt = "";
      attachTokenImageFallback(img, fromToken.symbol);
      fromButton.insertBefore(img, fromButton.firstChild);
    } else {
      const fallback = document.createElement("span");
      fallback.className = "token-fallback token-dynamic-icon";
      fallback.textContent = fromToken.symbol.slice(0, 1);
      fromButton.insertBefore(fallback, fromButton.firstChild);
    }
  }

  // TO: the existing image is only used for non-SOL tokens.
  if (toIcon) {
    if (toToken.symbol === "SOL" || !toToken.icon || toToken.icon === "sol") {
      toIcon.style.display = "none";
    } else {
      toIcon.src = toToken.icon;
      toIcon.alt = toToken.symbol;
      toIcon.style.display = "block";
      toIcon.onerror = () => {
        toIcon.style.display = "none";
      };
    }
  }

  if (toButton) toButton.classList.toggle("is-gurug", toToken.symbol === "GURUG");

  refreshBalancesSoon();
  updateSwapButtonState();
}
async function renderTokenList(query = "") {
  if (!tokenList) return;
  const q = query.trim().toLowerCase();

  const catalogMatches = TOKEN_CATALOG.filter(token =>
    !q ||
    token.symbol.toLowerCase().includes(q) ||
    token.name.toLowerCase().includes(q) ||
    token.mint.toLowerCase() === q
  );

  let matches = catalogMatches;
  if (q.length >= 2 && !isLikelyMint(q)) {
    try {
      const res = await fetch(JUPITER_TOKEN_SEARCH + "?query=" + encodeURIComponent(query.trim()), {
        cache: "no-store"
      });
      if (res.ok) {
        const remote = await res.json();
        if (Array.isArray(remote)) {
          const remoteTokens = remote
            .filter(token => token?.id && token?.symbol)
            .map(token => ({
              symbol: token.symbol,
              name: token.name || "Solana Token",
              mint: token.id,
              decimals: Number.isInteger(token.decimals) ? token.decimals : null,
              icon: token.icon || token.logoURI || "",
              verified: !!token.isVerified,
              source: "jupiter"
            }));

          remoteTokens.forEach(token => {
            const existing = TOKEN_CATALOG.find(item => item.mint === token.mint);
            if (existing) Object.assign(existing, token);
            else TOKEN_CATALOG.push(token);
          });

          const seen = new Set();
          matches = [...catalogMatches, ...remoteTokens]
            .filter(token => {
              if (seen.has(token.mint)) return false;
              seen.add(token.mint);
              return true;
            })
            .slice(0, 30);
        }
      }
    } catch (err) {
      console.warn("Token search failed:", err);
    }
  }

  tokenList.innerHTML = "";

  matches.forEach(token => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "token-option";
    const trust = token.verified ? " ✓" : "";
    button.innerHTML =
      tokenIconMarkup(token) +
      '<span><strong>' + token.symbol + trust + '</strong><small>' +
      token.name + '</small></span><em>' +
      (token.mint === fromToken.mint ? "FROM" : token.mint === toToken.mint ? "TO" : "") +
      '</em>';

    button.addEventListener("click", async () => {
      // Search results already carry Jupiter's icon URL. Catalog tokens such
      // as USDC/RAY/JUP may not, so enrich them automatically by mint.
      await hydrateTokenIcon(token);

      if (tokenPicker.dataset.target === "from") {
        if (token.mint === toToken.mint) toToken = fromToken;
        fromToken = token;
      } else {
        if (token.mint === fromToken.mint) fromToken = toToken;
        toToken = token;
      }
      // Close immediately after a token is selected.
      if (tokenPicker) tokenPicker.hidden = true;
      updateTokenButtons();
      resetQuoteForTokenChange();
    });

    tokenList.appendChild(button);
  });

  if (!matches.length) {
    const empty = document.createElement("div");
    empty.className = "token-empty";
    empty.textContent = isLikelyMint(q)
      ? "Looking up this mint address..."
      : "No matching Solana token found.";
    tokenList.appendChild(empty);

    if (isLikelyMint(q)) {
      const token = await fetchTokenByMint(query.trim());
      if (token) {
        renderTokenList(token.symbol);
      } else {
        empty.textContent = "Mint address not found or not a supported token.";
      }
    }
  }
}
function openTokenPicker(target) {
  if (!tokenPicker) return;
  tokenPicker.dataset.target = target;
  tokenPicker.hidden = false;
  if (tokenSearch) {
    tokenSearch.value = "";
    renderTokenList();
    setTimeout(() => tokenSearch.focus(), 0);
  }
}

function resetQuoteForTokenChange() {
  clearTimeout(quoteTimer);
  lastSwapResponse = null;
  if (gurugAmountEl) gurugAmountEl.textContent = "0.00";
  if (solAmountInput) {
    solAmountInput.value = "";
    solAmountInput.placeholder = "0.00";
  }
  setSwapStatus("Select an amount to get a live quote.");
}

if (fromTokenButton) fromTokenButton.addEventListener("click", () => openTokenPicker("from"));
if (toTokenButton) toTokenButton.addEventListener("click", () => openTokenPicker("to"));
if (closeTokenPicker) closeTokenPicker.addEventListener("click", () => { if (tokenPicker) tokenPicker.hidden = true; });
let tokenSearchTimer;
if (tokenSearch) tokenSearch.addEventListener("input", () => {
  clearTimeout(tokenSearchTimer);
  tokenSearchTimer = setTimeout(() => renderTokenList(tokenSearch.value), 250);
});
if (tokenPicker) tokenPicker.addEventListener("click", (event) => { if (event.target === tokenPicker) tokenPicker.hidden = true; });
document.addEventListener("keydown", (event) => { if (event.key === "Escape" && tokenPicker) tokenPicker.hidden = true; });

if (swapDirectionButton) {
  swapDirectionButton.addEventListener("click", () => {
    const oldFrom = fromToken;
    fromToken = toToken;
    toToken = oldFrom;
    updateTokenButtons();
    resetQuoteForTokenChange();
    refreshBalancesSoon();
  });
}

updateTokenButtons();
refreshBalancesSoon();
hydrateCatalogIcons();
setInterval(refreshWalletBalances, 30000);

function setSwapStatus(message, error = false, state = "") {
  if (!swapStatus) return;
  const label = document.getElementById("swapStatusLabel");
  const messageEl = document.getElementById("swapStatusMessage");
  const progress = document.getElementById("swapProgressFill");
  const txLink = document.getElementById("swapTxLink");

  swapStatus.classList.remove("error", "success", "active");
  if (state === "active") swapStatus.classList.add("active");
  if (state === "success") swapStatus.classList.add("success");
  if (error) swapStatus.classList.add("error");

  if (label) {
    label.textContent = error ? "SWAP FAILED"
      : state === "success" ? "SWAP SUCCESSFUL"
      : state === "active" ? "PROCESSING"
      : "READY TO SWAP";
  }
  if (messageEl) messageEl.textContent = message;
  if (progress) progress.style.width = error ? "100%" : state === "success" ? "100%" : state === "active" ? "72%" : "0%";
  if (txLink && state !== "success") {
    txLink.hidden = true;
    txLink.removeAttribute("href");
  }
}

function showSwapSuccess(solAmount, gurugAmount, signature) {
  if (!swapStatus) return;
  const label = document.getElementById("swapStatusLabel");
  const messageEl = document.getElementById("swapStatusMessage");
  const progress = document.getElementById("swapProgressFill");
  const txLink = document.getElementById("swapTxLink");

  swapStatus.classList.remove("error", "active");
  swapStatus.classList.add("success");

  if (label) label.textContent = "SWAP SUCCESSFUL";
  if (messageEl) messageEl.textContent = solAmount + " " + fromToken.symbol + " → " + gurugAmount + " " + toToken.symbol;
  if (progress) progress.style.width = "100%";
  if (txLink && signature) {
    txLink.href = "https://solscan.io/tx/" + signature;
    txLink.hidden = false;
  }
}

async function getGurugDecimals() {
  if (gurugDecimals !== null) return gurugDecimals;
  const res = await fetch("https://api.mainnet-beta.solana.com", {
    method: "POST",
    headers: {"Content-Type":"application/json"},
    body: JSON.stringify({
      jsonrpc:"2.0", id:1, method:"getTokenSupply",
      params:[mint]
    })
  });
  const json = await res.json();
  gurugDecimals = json?.result?.value?.decimals ?? 6;
  return gurugDecimals;
}

function parseSolToLamports(value) {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.round(n * 1000000000).toString();
}

function formatToken(raw, decimals) {
  const n = Number(raw) / Math.pow(10, decimals);
  if (!Number.isFinite(n)) return "0.00";
  return n.toLocaleString("en-US", {maximumFractionDigits: 4});
}

function parseTokenAmount(value, decimals) {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.round(n * Math.pow(10, decimals)).toString();
}

async function getTokenDecimals(token) {
  if (token.decimals !== null && token.decimals !== undefined) return token.decimals;
  if (token.mint === mint) return await getGurugDecimals();
  const res = await fetch("https://api.mainnet-beta.solana.com", {
    method:"POST", headers:{"Content-Type":"application/json"},
    body:JSON.stringify({jsonrpc:"2.0",id:1,method:"getTokenSupply",params:[token.mint]})
  });
  const json = await res.json();
  token.decimals = json?.result?.value?.decimals ?? 6;
  return token.decimals;
}

async function getQuote() {
  if (isSwapping) return;
  const decimals = await getTokenDecimals(fromToken);
  const amount = parseTokenAmount(solAmountInput?.value, decimals);
  if (!amount) {
    if (gurugAmountEl) gurugAmountEl.textContent = "0.00";
    lastSwapResponse = null;
    setSwapStatus("Enter an amount to get a live quote.");
    return;
  }

  try {
    setSwapStatus("Getting live Raydium quote...");
    const slippageBps = Math.round(Number(slippageEl?.value || 0.5) * 100);
    const url = RAYDIUM_API + "/compute/swap-base-in"
      + "?inputMint=" + encodeURIComponent(fromToken.mint)
      + "&outputMint=" + encodeURIComponent(toToken.mint)
      + "&amount=" + amount
      + "&slippageBps=" + slippageBps
      + "&txVersion=" + TX_VERSION;

    const res = await fetch(url);
    const json = await res.json();
    if (!res.ok || !json.success || !json.data) throw new Error(json.msg || "Quote failed");

    lastSwapResponse = json;
    const outputDecimals = await getTokenDecimals(toToken);
    if (gurugAmountEl) gurugAmountEl.textContent = formatToken(json.data.outputAmount, outputDecimals);
    setSwapStatus("Quote ready. Review the amount, then approve in Phantom.");
  } catch (err) {
    lastSwapResponse = null;
    if (gurugAmountEl) gurugAmountEl.textContent = "—";
    setSwapStatus("Could not get a quote. Try again in a moment.", true);
    console.error(err);
  }
}

let quoteTimer;
let isSwapping = false;
if (solAmountInput) {
  solAmountInput.addEventListener("input", () => {
    clearTimeout(quoteTimer);
    if (swapStatus?.classList.contains("success")) {
      swapStatus.classList.remove("success");
      const label = document.getElementById("swapStatusLabel");
      const messageEl = document.getElementById("swapStatusMessage");
      const progress = document.getElementById("swapProgressFill");
      const txLink = document.getElementById("swapTxLink");
      if (label) label.textContent = "PROCESSING";
      if (messageEl) messageEl.textContent = "Getting a new live Raydium quote...";
      if (progress) progress.style.width = "35%";
      if (txLink) {
        txLink.hidden = true;
        txLink.removeAttribute("href");
      }
    }
    updateSwapButtonState();
    quoteTimer = setTimeout(getQuote, 350);
  });
}
if (slippageEl) slippageEl.addEventListener("change", getQuote);

async function executeGurugSwap() {
  const provider = getPhantomProvider();
  if (!provider?.publicKey) {
    setSwapStatus("Connect Phantom first.", true);
    await connectPhantom();
    return;
  }

  const inputDecimals = await getTokenDecimals(fromToken);
  const amount = parseTokenAmount(solAmountInput?.value, inputDecimals);

  await refreshWalletBalances();
  const requestedAmount = Number(solAmountInput?.value || 0);
  if (walletTokenBalance !== null && requestedAmount > walletTokenBalance) {
    updateSwapButtonState();
    return;
  }
  if (!amount) {
    setSwapStatus("Enter an amount first.", true);
    return;
  }

  clearTimeout(quoteTimer);
  isSwapping = true;
  swapButton.disabled = true;
  setSwapStatus("Preparing transaction...", false, "active");

  try {
    if (!lastSwapResponse) {
      await getQuote();
      if (!lastSwapResponse) throw new Error("No valid quote");
    }

    const feeRes = await fetch(RAYDIUM_BASE_API + "/main/auto-fee");
    const feeJson = await feeRes.json();
    const priorityFee = String(feeJson?.data?.default?.h || feeJson?.data?.default?.m || 0);

    const txRes = await fetch(RAYDIUM_API + "/transaction/swap-base-in", {
      method: "POST",
      headers: {"Content-Type":"application/json"},
      body: JSON.stringify({
        computeUnitPriceMicroLamports: priorityFee,
        swapResponse: lastSwapResponse,
        txVersion: TX_VERSION,
        wallet: provider.publicKey.toString(),
        wrapSol: fromToken.symbol === "SOL",
        unwrapSol: toToken.symbol === "SOL"
      })
    });

    const txJson = await txRes.json();
    if (!txRes.ok || !txJson.success || !txJson.data?.length) {
      throw new Error(txJson.msg || "Transaction build failed");
    }

    const transactions = txJson.data.map(item =>
      solanaWeb3.VersionedTransaction.deserialize(
        Uint8Array.from(atob(item.transaction), c => c.charCodeAt(0))
      )
    );

    const signatures = [];
    for (const tx of transactions) {
      setSwapStatus("Waiting for Phantom approval...");
      const signed = await provider.signAndSendTransaction(tx);
      signatures.push(signed.signature);
    }

    setSwapStatus("Transaction sent. Waiting for on-chain confirmation...", false, "active");
    // Use a fallback RPC list for confirmation. The public Solana RPC can rate-limit
    // browser traffic with HTTP 403 even when the swap itself has already landed.
    const confirmationRpcs = [
      "https://solana-rpc.publicnode.com",
      "https://api.mainnet-beta.solana.com"
    ];

    for (const signature of signatures) {
      setSwapStatus("Confirming your swap on Solana...", false, "active");
      let confirmed = false;
      let lastRpcError = null;

      for (const rpcUrl of confirmationRpcs) {
        try {
          const connection = new solanaWeb3.Connection(rpcUrl, "confirmed");

          for (let attempt = 0; attempt < 45; attempt++) {
            const statusResult = await connection.getSignatureStatuses([signature], {
              searchTransactionHistory: true
            });
            const status = statusResult?.value?.[0];

            if (status?.err) {
              throw new Error("Transaction failed on-chain. Check the transaction details.");
            }

            if (status?.confirmationStatus === "confirmed" || status?.confirmationStatus === "finalized") {
              confirmed = true;
              break;
            }

            await new Promise(resolve => setTimeout(resolve, 1000));
          }

          if (confirmed) break;
        } catch (rpcError) {
          lastRpcError = rpcError;
          console.warn("Confirmation RPC failed:", rpcUrl, rpcError);
        }
      }

      if (!confirmed) {
        const explorerUrl = "https://solscan.io/tx/" + signature;
        throw new Error("Swap was sent, but confirmation could not be checked automatically. Check the transaction: " + explorerUrl);
      }
    }

    const confirmedFromAmount = Number(solAmountInput?.value || 0).toLocaleString("en-US", { maximumFractionDigits: 6 });
    const confirmedToAmount = gurugAmountEl?.textContent || "0.00";
    const finalSignature = signatures[signatures.length - 1];

    showSwapSuccess(confirmedFromAmount, confirmedToAmount, finalSignature);

    lastSwapResponse = null;
    if (solAmountInput) solAmountInput.value = "";
    if (gurugAmountEl) gurugAmountEl.textContent = "0.00";
  } catch (err) {
    console.error("GURUG swap failed:", err);
    const message = err?.message || "Swap cancelled or failed.";
    setSwapStatus(message, true);
  } finally {
    isSwapping = false;
    swapButton.disabled = false;
  }
}

if (swapButton) swapButton.addEventListener("click", executeGurugSwap);


/* --- LIVE GURUG MARKET TICKER --- */
async function updateGurugMarketTicker() {
  const priceEl = document.getElementById("gurugPrice");
  const changeEl = document.getElementById("gurugChange");
  if (!priceEl || !changeEl) return;

  try {
    const res = await fetch("https://api.dexscreener.com/latest/dex/pairs/solana/88a3L9i5KHddtUEPJ1crt8yp8RJNoWrgb7sSGGoU1qqe", {
      cache: "no-store"
    });
    const json = await res.json();
    const pair = json?.pair;
    const price = Number(pair?.priceUsd);
    const change = Number(pair?.priceChange?.h24);

    if (Number.isFinite(price)) {
      priceEl.textContent = price < 0.000001
        ? "$" + price.toFixed(10)
        : price < 0.001
          ? "$" + price.toFixed(7)
          : "$" + price.toFixed(6);
    }

    if (Number.isFinite(change)) {
      changeEl.textContent = (change >= 0 ? "▲ " : "▼ ") + Math.abs(change).toFixed(2) + "%";
      changeEl.classList.toggle("down", change < 0);
    }
  } catch (err) {
    console.log("GURUG ticker update failed.", err);
  }
}

updateGurugMarketTicker();
setInterval(updateGurugMarketTicker, 30000);


const heroConnectWalletBtn = document.getElementById("heroConnectWallet");
if (heroConnectWalletBtn) {
  heroConnectWalletBtn.addEventListener("click", async () => {
    const provider = getPhantomProvider();
    if (provider?.publicKey) {
      try {
        await provider.disconnect();
        updateWalletButton(null);
      } catch (err) {
        console.log(err);
      }
    } else {
      await connectPhantom();
    }
  });
}
