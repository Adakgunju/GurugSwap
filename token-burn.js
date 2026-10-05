(() => {
  const app = document.getElementById("tokenBurnApp");
  if (!app) return;

  const RPCS = [
    "https://solana-rpc.publicnode.com",
    "https://rpc.solanatracker.io/public",
    "https://api.mainnet-beta.solana.com"
  ];
  const TOKEN_PROGRAM = "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA";
  const TOKEN_2022_PROGRAM = "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb";
  let activeRpc = RPCS[0];


  app.innerHTML = `
    <div class="token-burn-card">
      <div class="token-burn-head">
        <span>BURN SPL TOKENS</span>
        <span class="token-burn-live">SOLANA MAINNET</span>
      </div>
      <div class="token-burn-fields">
        <label>
          <small>TOKEN MINT ADDRESS</small>
          <input id="burnMint" type="text" inputmode="text" autocomplete="off" placeholder="Paste token mint address">
        </label>
        <label class="token-burn-amount-field">
          <div class="token-burn-field-label"><small>AMOUNT TO BURN</small><button id="burnMax" class="token-burn-max" type="button" disabled>MAX</button></div>
          <input id="burnAmount" type="text" inputmode="decimal" autocomplete="off" placeholder="0.00">
        </label>
      </div>
      <div class="token-burn-balance" id="burnBalance">Enter a token mint to check your balance.</div>
      <button class="connect token-burn-button" id="burnButton" type="button" disabled>BURN TOKENS</button>
      <div class="token-burn-status" id="burnStatus">
        <div class="token-burn-status-top"><span class="token-burn-dot"></span><span id="burnStatusLabel">READY TO BURN</span></div>
        <div id="burnStatusMessage">Burned tokens are permanently removed from the selected wallet and token supply.</div>
        <a id="burnTxLink" href="#" target="_blank" rel="noopener noreferrer" hidden>VIEW TRANSACTION ↗</a>
      </div>
      <div class="token-burn-foot"><span>NON-CUSTODIAL</span><span>NETWORK FEES SEPARATE</span><span>PERMANENT</span></div>
    </div>
  `;

  const mintInput = document.getElementById("burnMint");
  const amountInput = document.getElementById("burnAmount");
  const maxButton = document.getElementById("burnMax");
  const balanceEl = document.getElementById("burnBalance");
  const button = document.getElementById("burnButton");
  const status = document.getElementById("burnStatus");
  const statusLabel = document.getElementById("burnStatusLabel");
  const statusMessage = document.getElementById("burnStatusMessage");
  const txLink = document.getElementById("burnTxLink");

  let selectedAccount = null;
  let selectedDecimals = null;
  let selectedBalance = null;
  let lookupTimer = null;

  function provider() {
    if (typeof getPhantomProvider === "function") return getPhantomProvider();
    if (window.phantom?.solana?.isPhantom) return window.phantom.solana;
    if (window.solana?.isPhantom) return window.solana;
    return null;
  }

  function setStatus(label, message, type = "") {
    status.className = "token-burn-status" + (type ? " " + type : "");
    statusLabel.textContent = label;
    statusMessage.textContent = message;
    txLink.hidden = true;
  }

  function updateBurnButtonState() {
    if (!button) return;
    if (!provider()?.publicKey || !selectedAccount || selectedBalance === null || selectedBalance <= 0n) {
      button.disabled = true;
      return;
    }
    try {
      const raw = decimalToRaw(amountInput.value, selectedDecimals);
      button.disabled = raw <= 0n || raw > selectedBalance;
    } catch {
      button.disabled = true;
    }
  }

  function short(value) {
    return value ? value.slice(0, 6) + "…" + value.slice(-4) : "";
  }

  function isMint(value) {
    return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(String(value || "").trim());
  }


  async function rpc(method, params) {
    let lastError = null;
    const candidates = activeRpc
      ? [activeRpc, ...RPCS.filter(url => url !== activeRpc)]
      : RPCS;

    for (const url of candidates) {
      try {
        const res = await fetch(url, {
          method: "POST",
          headers: {"Content-Type":"application/json"},
          cache: "no-store",
          body: JSON.stringify({jsonrpc:"2.0", id:Date.now(), method, params})
        });

        if (!res.ok) {
          lastError = new Error("RPC HTTP " + res.status);
          continue;
        }

        const json = await res.json();

        if (json?.error) {
          lastError = new Error(json.error.message || "RPC error");
          continue;
        }

        activeRpc = url;
        return json.result;
      } catch (err) {
        lastError = err;
      }
    }

    throw lastError || new Error("RPC unavailable");
  }

  function rawToDecimal(value, decimals) {
    const raw = BigInt(value || 0);
    if (decimals === 0) return raw.toString();
    const text = raw.toString().padStart(decimals + 1, "0");
    const splitAt = text.length - decimals;
    const whole = text.slice(0, splitAt);
    const fraction = text.slice(splitAt).replace(/0+$/, "");
    return fraction ? whole + "." + fraction : whole;
  }

  function decimalToRaw(value, decimals) {
    const text = String(value || "").trim();
    if (!/^\d+(?:\.\d+)?$/.test(text)) throw new Error("Enter a valid burn amount.");
    const [whole, fraction = ""] = text.split(".");
    if (fraction.length > decimals) throw new Error("Amount has more decimal places than this token supports.");
    const rawText = whole + fraction.padEnd(decimals, "0");
    const raw = BigInt(rawText || "0");
    if (raw <= 0n) throw new Error("Burn amount must be greater than 0.");
    return raw;
  }

  function u64le(value) {
    const bytes = new Uint8Array(8);
    let n = BigInt(value);
    for (let i = 0; i < 8; i++) {
      bytes[i] = Number(n & 255n);
      n >>= 8n;
    }
    return bytes;
  }

  function burnCheckedInstruction(account, mint, owner, amount, decimals, programId) {
    const data = new Uint8Array(10);
    data[0] = 15; // BurnChecked
    data.set(u64le(amount), 1);
    data[9] = decimals;
    return new solanaWeb3.TransactionInstruction({
      programId: new solanaWeb3.PublicKey(programId),
      keys: [
        {pubkey: new solanaWeb3.PublicKey(account), isSigner:false, isWritable:true},
        {pubkey: new solanaWeb3.PublicKey(mint), isSigner:false, isWritable:true},
        {pubkey: new solanaWeb3.PublicKey(owner), isSigner:true, isWritable:false}
      ],
      data
    });
  }

  async function findTokenAccount(mint) {
    const p = provider();
    if (!p?.publicKey) throw new Error("Connect your wallet first.");

    const owner = p.publicKey.toString();

    // Do not use getTokenAccountsByOwner: several public RPCs reject it.
    // Instead, query the token programs directly with memcmp filters:
    // mint is at byte 0 and token-account owner is at byte 32.
    for (const programId of [TOKEN_PROGRAM, TOKEN_2022_PROGRAM]) {
      try {
        const result = await rpc("getProgramAccounts", [
          programId,
          {
            encoding:"jsonParsed",
            commitment:"confirmed",
            filters:[
              {memcmp:{offset:0, bytes:mint}},
              {memcmp:{offset:32, bytes:owner}}
            ]
          }
        ]);

        const matches = (result || [])
          .map(item => {
            const info = item?.account?.data?.parsed?.info;
            const amount = info?.tokenAmount;
            return {
              pubkey:item?.pubkey,
              programId,
              decimals:Number(amount?.decimals),
              rawAmount:String(amount?.amount || "0"),
              uiAmount:Number(amount?.uiAmountString || 0),
              mint:info?.mint,
              owner:info?.owner
            };
          })
          .filter(item =>
            item.pubkey &&
            item.mint === mint &&
            item.owner === owner &&
            Number.isFinite(item.decimals) &&
            item.decimals >= 0
          );

        const found = matches.find(item => item.rawAmount !== "0") || matches[0];
        if (found) return found;
      } catch (err) {
        console.warn("Program-account token lookup failed:", err);
      }
    }

    // Fallback: derive the standard ATA and read it directly.
    const ownerKey = new solanaWeb3.PublicKey(owner);
    const mintKey = new solanaWeb3.PublicKey(mint);
    const associatedTokenProgram = new solanaWeb3.PublicKey(
      "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"
    );

    for (const programId of [TOKEN_PROGRAM, TOKEN_2022_PROGRAM]) {
      try {
        const tokenProgramKey = new solanaWeb3.PublicKey(programId);
        const [ata] = solanaWeb3.PublicKey.findProgramAddressSync(
          [ownerKey.toBuffer(), tokenProgramKey.toBuffer(), mintKey.toBuffer()],
          associatedTokenProgram
        );

        const accountResult = await rpc("getAccountInfo", [
          ata.toString(),
          {encoding:"base64", commitment:"confirmed"}
        ]);
        const value = accountResult?.value;
        if (!value?.data?.[0] || value.owner !== programId) continue;

        const raw = Uint8Array.from(atob(value.data[0]), c => c.charCodeAt(0));
        if (raw.length < 72) continue;

        const accountMint = new solanaWeb3.PublicKey(raw.slice(0,32)).toString();
        const accountOwner = new solanaWeb3.PublicKey(raw.slice(32,64)).toString();
        if (accountMint !== mint || accountOwner !== owner) continue;

        let amount = 0n;
        for (let i = 0; i < 8; i++) amount |= BigInt(raw[64+i]) << BigInt(8*i);

        const mintResult = await rpc("getAccountInfo", [
          mint,
          {encoding:"base64", commitment:"confirmed"}
        ]);
        const mintValue = mintResult?.value;
        if (!mintValue?.data?.[0] || mintValue.owner !== programId) continue;

        const mintRaw = Uint8Array.from(atob(mintValue.data[0]), c => c.charCodeAt(0));
        if (mintRaw.length < 45) continue;

        const decimals = Number(mintRaw[44]);
        return {
          pubkey:ata.toString(),
          programId,
          decimals,
          rawAmount:amount.toString(),
          uiAmount:Number(amount) / Math.pow(10, decimals),
          mint,
          owner
        };
      } catch (err) {
        console.warn("Direct ATA token lookup failed:", err);
      }
    }

    return null;
  }

  async function refreshBalance() {
    const mint = mintInput.value.trim();
    selectedAccount = null;
    selectedDecimals = null;
    selectedBalance = null;

    if (!isMint(mint)) {
      balanceEl.textContent = "Enter a valid token mint address.";
      return;
    }

    if (!provider()?.publicKey) {
      maxButton.disabled = true;
      updateBurnButtonState();
      balanceEl.textContent = "Connect your wallet using the top-right button.";
      setStatus("WALLET REQUIRED", "Connect your wallet from the top-right of GurugSwap first.", "error");
      return;
    }

    balanceEl.textContent = "CHECKING WALLET BALANCE…";

    try {
      const account = await findTokenAccount(mint);
      if (!account) {
        maxButton.disabled = true;
        updateBurnButtonState();
        balanceEl.textContent = "No token account found for this wallet.";
        setStatus("READY TO BURN", "No token account was found for this mint.");
        return;
      }

      selectedAccount = account;
      selectedDecimals = account.decimals;
      selectedBalance = BigInt(account.rawAmount);
      maxButton.disabled = selectedBalance <= 0n;

      balanceEl.textContent =
        "YOUR BALANCE  " + account.uiAmount.toLocaleString("en-US", {maximumFractionDigits: Math.min(account.decimals, 9)}) +
        "  •  " + short(account.pubkey);
      setStatus("READY TO BURN", "Review the amount carefully. Burning is permanent.");
      updateBurnButtonState();
    } catch (err) {
      maxButton.disabled = true;
      updateBurnButtonState();
      balanceEl.textContent = "BALANCE CHECK FAILED";
      setStatus("ERROR", err.message || "Could not read your token account.", "error");
    }
  }

  async function burn() {
    const p = provider();
    if (!p?.publicKey) {
      setStatus("WALLET REQUIRED", "Connect your wallet from the top-right of GurugSwap first.", "error");
      return;
    }

    const mint = mintInput.value.trim();
    if (!isMint(mint)) {
      setStatus("INVALID MINT", "Enter a valid Solana token mint address.", "error");
      return;
    }

    try {
      if (!selectedAccount || selectedDecimals === null) await refreshBalance();
      if (!selectedAccount) throw new Error("No token account found for this wallet.");

      const rawAmount = decimalToRaw(amountInput.value, selectedDecimals);
      if (rawAmount > selectedBalance) throw new Error("Burn amount exceeds your wallet balance.");

      const owner = p.publicKey.toString();
      const transaction = new solanaWeb3.Transaction();
      transaction.add(
        burnCheckedInstruction(
          selectedAccount.pubkey,
          mint,
          owner,
          rawAmount,
          selectedDecimals,
          selectedAccount.programId
        )
      );

      const connection = new solanaWeb3.Connection(activeRpc || RPCS[0], "confirmed");
      const latest = await connection.getLatestBlockhash("confirmed");
      transaction.recentBlockhash = latest.blockhash;
      transaction.feePayer = p.publicKey;

      setStatus("AWAITING APPROVAL", "Approve the burn transaction in your wallet.", "active");
      button.disabled = true;

      const signed = await p.signTransaction(transaction);
      const txId = await connection.sendRawTransaction(signed.serialize(), {
        skipPreflight:false,
        maxRetries:3
      });

      setStatus("CONFIRMING", "Checking the burn transaction on Solana…", "active");

      // Do not rely only on confirmTransaction(blockhash), because a transaction
      // can land on-chain while the client-side blockhash confirmation window
      // expires. Always verify the signature status before reporting failure.
      const confirmationRpcs = [
        activeRpc || RPCS[0],
        ...RPCS.filter(url => url !== (activeRpc || RPCS[0]))
      ];

      let confirmed = false;
      let lastConfirmationError = null;

      for (const rpcUrl of confirmationRpcs) {
        try {
          const verifyConnection = new solanaWeb3.Connection(rpcUrl, "confirmed");

          for (let attempt = 0; attempt < 30; attempt++) {
            const result = await verifyConnection.getSignatureStatuses([txId], {
              searchTransactionHistory: true
            });
            const sigStatus = result?.value?.[0];

            if (sigStatus?.err) {
              throw new Error("Burn transaction failed on-chain. Check the transaction details.");
            }

            if (
              sigStatus?.confirmationStatus === "confirmed" ||
              sigStatus?.confirmationStatus === "finalized"
            ) {
              confirmed = true;
              break;
            }

            await new Promise(resolve => setTimeout(resolve, 1000));
          }

          if (confirmed) break;
        } catch (verifyError) {
          lastConfirmationError = verifyError;
          console.warn("Burn confirmation RPC failed:", rpcUrl, verifyError);
        }
      }

      if (!confirmed) {
        // A block-height expiration from confirmTransaction does NOT by itself
        // prove that the transaction failed. Give the signature one final
        // history lookup before showing BURN FAILED.
        for (const rpcUrl of confirmationRpcs) {
          try {
            const verifyConnection = new solanaWeb3.Connection(rpcUrl, "confirmed");
            const result = await verifyConnection.getSignatureStatuses([txId], {
              searchTransactionHistory: true
            });
            const sigStatus = result?.value?.[0];

            if (sigStatus?.err) {
              throw new Error("Burn transaction failed on-chain. Check the transaction details.");
            }

            if (sigStatus?.confirmationStatus) {
              confirmed = true;
              break;
            }
          } catch (verifyError) {
            lastConfirmationError = verifyError;
          }
        }
      }

      if (!confirmed) {
        throw lastConfirmationError || new Error(
          "Burn was sent, but Solana confirmation could not be verified. Check the transaction before retrying."
        );
      }

      status.className = "token-burn-status success";
      statusLabel.textContent = "BURN COMPLETE";
      statusMessage.textContent = "The selected tokens were permanently burned from your wallet.";
      txLink.href = "https://solscan.io/tx/" + txId;
      txLink.hidden = false;

      amountInput.value = "";
      await refreshBalance();
    } catch (err) {
      console.error("Token burn failed:", err);
      setStatus("BURN FAILED", err?.message || "The burn transaction could not be completed.", "error");
    } finally {
      button.disabled = false;
      button.textContent = "BURN TOKENS";
      updateBurnButtonState();
    }
  }

  maxButton.addEventListener("click", () => {
    if (selectedBalance === null || selectedDecimals === null || selectedBalance <= 0n) return;
    amountInput.value = rawToDecimal(selectedBalance, selectedDecimals);
    amountInput.dispatchEvent(new Event("input", {bubbles:true}));
    updateBurnButtonState();
  });

  mintInput.addEventListener("input", () => {
    clearTimeout(lookupTimer);
    lookupTimer = setTimeout(refreshBalance, 350);
  });

  amountInput.addEventListener("input", () => {
    if (selectedDecimals === null) {
      updateBurnButtonState();
      return;
    }
    try {
      const raw = decimalToRaw(amountInput.value, selectedDecimals);
      if (raw > selectedBalance) {
        setStatus("AMOUNT TOO HIGH", "Burn amount exceeds your wallet balance.", "error");
      } else {
        setStatus("READY TO BURN", "Review the amount carefully. Burning is permanent.");
      }
    } catch {}
    updateBurnButtonState();
  });

  button.addEventListener("click", async () => {
    if (!provider()?.publicKey) {
      setStatus("WALLET REQUIRED", "Connect your wallet from the top-right of GurugSwap first.", "error");
      return;
    }
    await burn();
  });

  function autoRefreshConnectedWallet() {
    button.textContent = "BURN TOKENS";
    updateBurnButtonState();
    if (provider()?.publicKey && isMint(mintInput.value.trim())) {
      refreshBalance();
    }
  }

  const globalProvider = provider();
  if (globalProvider?.on) {
    globalProvider.on("connect", () => autoRefreshConnectedWallet());
    globalProvider.on("accountChanged", () => autoRefreshConnectedWallet());
    globalProvider.on("disconnect", () => {
      selectedAccount = null;
      selectedDecimals = null;
      selectedBalance = null;
      maxButton.disabled = true;
      button.disabled = true;
      balanceEl.textContent = "Connect your wallet using the top-right button.";
      setStatus("WALLET REQUIRED", "Connect your wallet from the top-right of GurugSwap first.", "error");
    });
  }

  window.addEventListener("load", autoRefreshConnectedWallet);
  updateBurnButtonState();

  if (document.readyState !== "loading") {
    autoRefreshConnectedWallet();
  } else {
    document.addEventListener("DOMContentLoaded", autoRefreshConnectedWallet, {once:true});
  }
})();
