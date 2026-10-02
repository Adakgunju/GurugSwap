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
  if (!connectWalletBtn) return;
  connectWalletBtn.textContent = publicKey ? shortAddress(publicKey.toString()) : "CONNECT WALLET";
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

    alert("Phantom wallet was not detected. Please install Phantom or open this site with the Phantom extension.");
    return;
  }

  try {
    const response = await provider.connect();
    updateWalletButton(response.publicKey);
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
  provider.on("connect", (publicKey) => updateWalletButton(publicKey));
  provider.on("disconnect", () => updateWalletButton(null));
  provider.on("accountChanged", (publicKey) => updateWalletButton(publicKey));
  if (provider.publicKey) updateWalletButton(provider.publicKey);
}


const RAYDIUM_API = "https://transaction-v1.raydium.io";
const RAYDIUM_BASE_API = "https://api-v3.raydium.io";
const SOL_MINT = "So11111111111111111111111111111111111111112";
const TX_VERSION = "V0";
const solAmountInput = document.getElementById("solAmount");
const gurugAmountEl = document.getElementById("gurugAmount");
const slippageEl = document.getElementById("slippage");
const swapButton = document.getElementById("swapButton");
const swapStatus = document.getElementById("swapStatus");

let lastSwapResponse = null;
let gurugDecimals = null;

function setSwapStatus(message, error = false) {
  if (!swapStatus) return;
  swapStatus.textContent = message;
  swapStatus.classList.toggle("error", error);
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

async function getQuote() {
  const amount = parseSolToLamports(solAmountInput?.value);
  if (!amount) {
    if (gurugAmountEl) gurugAmountEl.textContent = "0.00";
    lastSwapResponse = null;
    setSwapStatus("Connect your wallet to swap.");
    return;
  }

  try {
    setSwapStatus("Getting live Raydium quote...");
    const slippageBps = Math.round(Number(slippageEl?.value || 0.5) * 100);
    const url = RAYDIUM_API + "/compute/swap-base-in"
      + "?inputMint=" + encodeURIComponent(SOL_MINT)
      + "&outputMint=" + encodeURIComponent(mint)
      + "&amount=" + amount
      + "&slippageBps=" + slippageBps
      + "&txVersion=" + TX_VERSION;

    const res = await fetch(url);
    const json = await res.json();
    if (!res.ok || !json.success || !json.data) throw new Error(json.msg || "Quote failed");

    lastSwapResponse = json;
    const decimals = await getGurugDecimals();
    if (gurugAmountEl) gurugAmountEl.textContent = formatToken(json.data.outputAmount, decimals);
    setSwapStatus("Quote ready. Review the amount, then approve in Phantom.");
  } catch (err) {
    lastSwapResponse = null;
    if (gurugAmountEl) gurugAmountEl.textContent = "—";
    setSwapStatus("Could not get a quote. Try again in a moment.", true);
    console.error(err);
  }
}

let quoteTimer;
if (solAmountInput) {
  solAmountInput.addEventListener("input", () => {
    clearTimeout(quoteTimer);
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

  const amount = parseSolToLamports(solAmountInput?.value);
  if (!amount) {
    setSwapStatus("Enter a SOL amount first.", true);
    return;
  }

  swapButton.disabled = true;
  setSwapStatus("Preparing transaction...");

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
        wrapSol: true,
        unwrapSol: false
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

    setSwapStatus("Transaction sent. Waiting for confirmation...");
    // Use a fallback RPC list for confirmation. The public Solana RPC can rate-limit
    // browser traffic with HTTP 403 even when the swap itself has already landed.
    const confirmationRpcs = [
      "https://solana-rpc.publicnode.com",
      "https://api.mainnet-beta.solana.com"
    ];

    for (const signature of signatures) {
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

    setSwapStatus("Swap confirmed! Enter an amount for your next swap.");
    lastSwapResponse = null;
    if (solAmountInput) solAmountInput.value = "";
    if (gurugAmountEl) gurugAmountEl.textContent = "0.00";
  } catch (err) {
    console.error("GURUG swap failed:", err);
    const message = err?.message || "Swap cancelled or failed.";
    setSwapStatus(message, true);
  } finally {
    swapButton.disabled = false;
  }
}

if (swapButton) swapButton.addEventListener("click", executeGurugSwap);
