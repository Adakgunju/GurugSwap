/* GURUGSWAP — TOKEN METADATA
 * Update an existing fungible token's Metaplex metadata URI/logo.
 * Existing feature scripts are intentionally untouched.
 */
(() => {
  const app = document.getElementById("tokenMetadataApp");
  if (!app || typeof solanaWeb3 === "undefined") return;

  const RPCS = [
    "https://solana-rpc.publicnode.com",
    "https://api.mainnet-beta.solana.com"
  ];
  const UMI_CDN = "https://esm.sh/@metaplex-foundation/umi@1.5.1?bundle";
  const UMI_DEFAULTS_CDN = "https://esm.sh/@metaplex-foundation/umi-bundle-defaults@1.5.1?bundle";
  const UMI_WALLET_CDN = "https://esm.sh/@metaplex-foundation/umi-signer-wallet-adapters@1.5.1?bundle";
  const MPL_METADATA_CDN = "https://esm.sh/@metaplex-foundation/mpl-token-metadata@3.4.0?bundle";
  const MPL_TOOLBOX_CDN = "https://esm.sh/@metaplex-foundation/mpl-toolbox@0.11.4?bundle";

  let activeRpc = RPCS[0];
  let metadataModulesPromise = null;
  let tokenState = null;

  app.innerHTML = `
    <div class="token-metadata-card">
      <div class="token-metadata-head">
        <div>
          <span class="token-metadata-kicker">METADATA MANAGER</span>
          <h3>Update your token <span>logo.</span></h3>
          <p>Replace the current logo without creating a new token. The Mint Address stays the same.</p>
        </div>
        <span class="token-metadata-network">SOLANA MAINNET</span>
      </div>

      <div class="token-metadata-lookup">
        <label>
          <small>TOKEN MINT ADDRESS</small>
          <input id="metadataMint" type="text" autocomplete="off" placeholder="Paste token mint address">
        </label>
        <button id="metadataCheck" class="connect" type="button">CHECK METADATA</button>
      </div>

      <div id="metadataWalletNote" class="token-metadata-note">
        Connect your wallet from the top-right. Only the current Metaplex Update Authority can change metadata.
      </div>

      <div id="metadataDetails" class="token-metadata-details" hidden>
        <div class="token-metadata-current">
          <div class="token-metadata-preview-wrap">
            <img id="metadataCurrentLogo" class="token-metadata-preview" alt="Current token logo">
            <div id="metadataCurrentPlaceholder" class="token-metadata-preview-placeholder">NO LOGO</div>
          </div>
          <div class="token-metadata-current-copy">
            <span>CURRENT METADATA</span>
            <strong id="metadataTokenName">—</strong>
            <small id="metadataTokenSymbol">—</small>
            <code id="metadataAuthority">—</code>
          </div>
        </div>

        <label class="token-metadata-upload" for="metadataLogo">
          <input id="metadataLogo" type="file" accept="image/png,image/jpeg,image/webp">
          <div id="metadataUploadPlaceholder"><b>UPLOAD NEW LOGO</b><span>PNG, JPG or WEBP · 2 MB MAX</span></div>
          <img id="metadataNewLogo" alt="New token logo preview">
        </label>

        <div class="token-metadata-replace">
          <div>
            <span>ON-CHAIN UPDATE</span>
            <strong>Replace the metadata URI with a new permanent Arweave record.</strong>
          </div>
          <button id="metadataUpdate" class="connect" type="button" disabled>UPDATE LOGO</button>
        </div>
      </div>

      <div id="metadataStatus" class="token-metadata-status">
        <div class="token-metadata-status-top"><i></i><span id="metadataStatusLabel">READY</span></div>
        <div id="metadataStatusMessage">Enter a token mint address to inspect its metadata.</div>
        <a id="metadataTxLink" href="#" target="_blank" rel="noopener noreferrer" hidden>VIEW TRANSACTION ↗</a>
        <a id="metadataUriLink" href="#" target="_blank" rel="noopener noreferrer" hidden>VIEW NEW METADATA ↗</a>
      </div>

      <div class="token-metadata-foot">
        <span>NON-CUSTODIAL</span>
        <span>METAPLEX TOKEN METADATA</span>
        <span>PERMANENT ARWEAVE STORAGE</span>
      </div>
    </div>
  `;

  const mintInput = document.getElementById("metadataMint");
  const checkButton = document.getElementById("metadataCheck");
  const details = document.getElementById("metadataDetails");
  const currentLogo = document.getElementById("metadataCurrentLogo");
  const currentPlaceholder = document.getElementById("metadataCurrentPlaceholder");
  const nameEl = document.getElementById("metadataTokenName");
  const symbolEl = document.getElementById("metadataTokenSymbol");
  const authorityEl = document.getElementById("metadataAuthority");
  const walletNote = document.getElementById("metadataWalletNote");
  const logoInput = document.getElementById("metadataLogo");
  const newLogo = document.getElementById("metadataNewLogo");
  const uploadPlaceholder = document.getElementById("metadataUploadPlaceholder");
  const updateButton = document.getElementById("metadataUpdate");
  const status = document.getElementById("metadataStatus");
  const statusLabel = document.getElementById("metadataStatusLabel");
  const statusMessage = document.getElementById("metadataStatusMessage");
  const txLink = document.getElementById("metadataTxLink");
  const uriLink = document.getElementById("metadataUriLink");

  function provider() {
    if (typeof getPhantomProvider === "function") return getPhantomProvider();
    if (window.phantom?.solana?.isPhantom) return window.phantom.solana;
    if (window.solana?.isPhantom) return window.solana;
    return null;
  }

  function validAddress(value) {
    try { return new solanaWeb3.PublicKey(String(value || "").trim()).toString(); }
    catch { return null; }
  }

  function short(value) {
    return value ? value.slice(0, 6) + "…" + value.slice(-6) : "—";
  }

  function setStatus(label, message, type = "") {
    status.className = "token-metadata-status" + (type ? " " + type : "");
    statusLabel.textContent = label;
    statusMessage.textContent = message;
    txLink.hidden = true;
    uriLink.hidden = true;
  }

  async function rpc(method, params) {
    let lastError = null;
    const candidates = [activeRpc, ...RPCS.filter(x => x !== activeRpc)];
    for (const url of candidates) {
      try {
        const response = await fetch(url, {
          method: "POST",
          headers: {"Content-Type":"application/json"},
          cache: "no-store",
          body: JSON.stringify({jsonrpc:"2.0", id:Date.now(), method, params})
        });
        if (!response.ok) {
          lastError = new Error("RPC HTTP " + response.status);
          continue;
        }
        const json = await response.json();
        if (json?.error) {
          lastError = new Error(json.error.message || "RPC error");
          continue;
        }
        activeRpc = url;
        return json.result;
      } catch (error) {
        lastError = error;
      }
    }
    throw lastError || new Error("Solana RPC unavailable.");
  }

  function walletMatches(authority) {
    return Boolean(provider()?.publicKey && authority && provider().publicKey.toString() === authority);
  }

  async function loadMetadataModules() {
    if (!metadataModulesPromise) {
      metadataModulesPromise = Promise.all([
        import(UMI_CDN),
        import(UMI_DEFAULTS_CDN),
        import(UMI_WALLET_CDN),
        import(MPL_METADATA_CDN)
      ]).then(([umi, defaults, walletAdapters, metadata]) => ({
        umi, defaults, walletAdapters, metadata
      }));
    }
    return metadataModulesPromise;
  }

  function createPhantomWalletAdapter(p) {
    return {
      publicKey: p.publicKey,
      signTransaction: async tx => p.signTransaction(tx),
      signAllTransactions: async txs => {
        if (typeof p.signAllTransactions === "function") return p.signAllTransactions(txs);
        const out = [];
        for (const tx of txs) out.push(await p.signTransaction(tx));
        return out;
      },
      signMessage: async message => {
        if (typeof p.signMessage !== "function") throw new Error("Phantom message signing is required for permanent storage.");
        const result = await p.signMessage(message);
        return result?.signature || result;
      }
    };
  }

  async function createUmiForWallet(p) {
    const modules = await loadMetadataModules();
    const {createUmi} = modules.defaults;
    const {walletAdapterIdentity} = modules.walletAdapters;
    const {mplTokenMetadata} = modules.metadata;
    const wallet = createPhantomWalletAdapter(p);
    const rpcUrl = activeRpc;
    const umi = createUmi(rpcUrl)
      .use(walletAdapterIdentity(wallet))
      .use(mplTokenMetadata());
    return {umi, modules};
  }

  function utf8(value) { return new TextEncoder().encode(String(value)); }

  function concatBytes(...arrays) {
    const total = arrays.reduce((sum, a) => sum + a.length, 0);
    const out = new Uint8Array(total);
    let offset = 0;
    for (const a of arrays) { out.set(a, offset); offset += a.length; }
    return out;
  }

  function littleEndianNumber(value, bytes) {
    const out = new Uint8Array(bytes);
    let n = Number(value);
    for (let i = 0; i < bytes; i++) { out[i] = n & 255; n = Math.floor(n / 256); }
    return out;
  }

  function avscLong(value) {
    let n = Number(value);
    if (!Number.isSafeInteger(n) || n < 0) throw new Error("Invalid Irys tag length.");
    let m = n * 2;
    const out = [];
    do {
      let b = m % 128;
      m = Math.floor(m / 128);
      if (m) b |= 128;
      out.push(b);
    } while (m);
    return new Uint8Array(out);
  }

  function serializeIrysTags(tags) {
    if (!tags?.length) return new Uint8Array(0);
    const parts = [avscLong(tags.length)];
    for (const tag of tags) {
      const name = utf8(tag.name), value = utf8(tag.value);
      parts.push(avscLong(name.length), name, avscLong(value.length), value);
    }
    parts.push(avscLong(0));
    return concatBytes(...parts);
  }

  async function sha384(bytes) {
    return new Uint8Array(await crypto.subtle.digest("SHA-384", bytes));
  }

  async function irysDeepHash(data) {
    if (Array.isArray(data)) {
      let acc = await sha384(concatBytes(utf8("list"), utf8(String(data.length))));
      for (const item of data) acc = await sha384(concatBytes(acc, await irysDeepHash(item)));
      return acc;
    }
    const bytes = data instanceof Uint8Array ? data : utf8(data);
    const tag = concatBytes(utf8("blob"), utf8(String(bytes.length)));
    return sha384(concatBytes(await sha384(tag), await sha384(bytes)));
  }

  function toHex(bytes) {
    return Array.from(bytes, b => b.toString(16).padStart(2, "0")).join("");
  }

  async function createSignedIrysDataItem(p, data, tags) {
    const owner = new Uint8Array(p.publicKey.toBytes());
    const anchor = crypto.getRandomValues(new Uint8Array(32));
    const target = new Uint8Array(0);
    const rawTags = serializeIrysTags(tags);
    const rawData = data instanceof Uint8Array ? data : utf8(data);
    const tagHeader = concatBytes(littleEndianNumber(tags.length, 8), littleEndianNumber(rawTags.length, 8));
    const signatureType = littleEndianNumber(4, 2);
    const signatureData = await irysDeepHash([
      utf8("dataitem"), utf8("1"), utf8("4"), owner, target, anchor, rawTags, rawData
    ]);
    if (typeof p.signMessage !== "function") throw new Error("Phantom message signing is required for permanent storage.");
    const signed = await p.signMessage(utf8(toHex(signatureData)));
    const signature = new Uint8Array(signed?.signature ?? signed);
    if (signature.length !== 64) throw new Error("Phantom returned an invalid storage signature.");
    return concatBytes(
      signatureType, signature, owner, new Uint8Array([0]), new Uint8Array([1]),
      anchor, tagHeader, rawTags, rawData
    );
  }

  async function irysRequest(path, options = {}) {
    const response = await fetch("https://node1.irys.xyz" + path, {
      ...options,
      headers: {"x-irys-js-sdk-version":"web-direct", ...(options.headers || {})}
    });
    const text = await response.text();
    let data = text;
    try { data = text ? JSON.parse(text) : null; } catch {}
    if (!response.ok) {
      const message = typeof data === "string" ? data : (data?.message || data?.error || response.statusText);
      throw new Error("Irys request failed: " + response.status + " " + message);
    }
    return data;
  }

  async function getIrysPrice(byteLength, address) {
    return BigInt(String(await irysRequest("/price/solana/" + byteLength + "?address=" + encodeURIComponent(address))));
  }

  async function getIrysBalance(address) {
    const data = await irysRequest("/account/balance/solana?address=" + encodeURIComponent(address));
    return BigInt(String(data?.balance ?? "0"));
  }

  async function fundIrysIfNeeded(p, amount, address) {
    if (amount <= 0n) return;
    const info = await irysRequest("/info");
    const destination = info?.addresses?.solana;
    if (!destination) throw new Error("Irys did not return a Solana funding address.");
    const connection = new solanaWeb3.Connection(activeRpc, "confirmed");
    const latest = await connection.getLatestBlockhash("confirmed");
    const tx = new solanaWeb3.Transaction({
      recentBlockhash: latest.blockhash,
      feePayer: new solanaWeb3.PublicKey(address)
    }).add(solanaWeb3.SystemProgram.transfer({
      fromPubkey: new solanaWeb3.PublicKey(address),
      toPubkey: new solanaWeb3.PublicKey(destination),
      lamports: Number(amount)
    }));
    setStatus("STORAGE FUNDING", "Approve the permanent Arweave storage funding transaction in Phantom…", "active");
    const signed = await p.signTransaction(tx);
    const sig = await connection.sendRawTransaction(signed.serialize(), {skipPreflight:false, maxRetries:2});
    await waitForConfirmation(connection, sig);
    await irysRequest("/account/balance/solana", {
      method:"POST",
      headers:{"content-type":"application/json"},
      body:JSON.stringify({tx_id:sig})
    });
  }

  async function uploadPermanent(p, data, contentType, label) {
    const bytes = data instanceof Uint8Array ? data : utf8(data);
    const tags = [];
    const itemSize = 2 + 64 + 32 + 1 + 1 + 32 + 16 + bytes.length;
    const price = await getIrysPrice(itemSize, p.publicKey.toString());
    if (price <= 0n) throw new Error(label + " storage price could not be calculated.");
    const balance = await getIrysBalance(p.publicKey.toString());
    if (balance < price) await fundIrysIfNeeded(p, price - balance, p.publicKey.toString());
    setStatus("UPLOADING " + label.toUpperCase(), "Sign the " + label.toLowerCase() + " for permanent Arweave storage in Phantom…", "active");
    const binary = await createSignedIrysDataItem(p, bytes, tags);
    const response = await fetch("https://node1.irys.xyz/tx/solana", {
      method:"POST",
      headers:{"Content-Type":"application/octet-stream","x-irys-js-sdk-version":"web-direct"},
      body:binary
    });
    const text = await response.text();
    let result = text;
    try { result = text ? JSON.parse(text) : null; } catch {}
    if (!response.ok) {
      const message = typeof result === "string" ? result : (result?.message || result?.error || response.statusText);
      throw new Error(label + " upload failed: " + response.status + " " + message);
    }
    const id = result?.id;
    if (!id) throw new Error(label + " upload completed without a storage ID.");
    return "https://arweave.net/" + id;
  }

  async function waitForConfirmation(connection, signature) {
    for (let i = 0; i < 40; i++) {
      const result = await connection.getSignatureStatuses([signature], {searchTransactionHistory:true});
      const s = result?.value?.[0];
      if (s?.err) throw new Error("Transaction failed on-chain.");
      if (s?.confirmationStatus === "confirmed" || s?.confirmationStatus === "finalized") return;
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    throw new Error("Transaction confirmation timed out. Check Solscan before retrying.");
  }

  function metadataPda(mint) {
    const [pda] = solanaWeb3.PublicKey.findProgramAddressSync([
      new TextEncoder().encode("metadata"),
      new solanaWeb3.PublicKey("metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s").toBytes(),
      new solanaWeb3.PublicKey(mint).toBytes()
    ], new solanaWeb3.PublicKey("metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s"));
    return pda;
  }

  async function checkMetadata() {
    const mint = validAddress(mintInput.value);
    if (!mint) {
      setStatus("INVALID MINT", "Enter a valid Solana mint address.", "error");
      return;
    }
    checkButton.disabled = true;
    details.hidden = true;
    tokenState = null;
    setStatus("CHECKING", "Reading the Metaplex metadata account…", "active");

    try {
      const p = provider();
      const {umi, modules} = await createUmiForWallet(p || {publicKey:new solanaWeb3.PublicKey(mint), signMessage:null});
      const {fetchDigitalAsset} = modules.metadata;
      const asset = await fetchDigitalAsset(umi, modules.umi.publicKey(mint));
      const md = asset.metadata;
      const authority = md.updateAuthority?.toString?.() || String(md.updateAuthority || "");
      const mutable = Boolean(md.isMutable);

      tokenState = {
        mint,
        name: md.name || "",
        symbol: md.symbol || "",
        uri: md.uri || "",
        sellerFeeBasisPoints: md.sellerFeeBasisPoints ?? 0,
        creators: md.creators ?? null,
        authority,
        mutable,
        asset
      };

      nameEl.textContent = md.name || "—";
      symbolEl.textContent = md.symbol ? "$" + md.symbol : "—";
      authorityEl.textContent = authority ? short(authority) : "NO UPDATE AUTHORITY";
      authorityEl.title = authority;

      const connected = provider()?.publicKey?.toString();
      walletNote.textContent = connected
        ? "Connected wallet: " + short(connected) + ". " + (walletMatches(authority) ? "You can update this token." : "This wallet is not the Update Authority.")
        : "Connect your wallet from the top-right. Only the current Metaplex Update Authority can change metadata.";

      currentLogo.hidden = true;
      currentPlaceholder.style.display = "flex";
      if (md.uri) {
        try {
          const json = await fetch(md.uri, {cache:"no-store"}).then(r => r.json());
          tokenState.json = json;
          if (json?.image) {
            currentLogo.src = json.image;
            currentLogo.onload = () => {
              currentLogo.hidden = false;
              currentPlaceholder.style.display = "none";
            };
            currentLogo.onerror = () => {
              currentLogo.hidden = true;
              currentPlaceholder.style.display = "flex";
            };
          }
        } catch {
          tokenState.json = null;
        }
      }

      details.hidden = false;
      updateButton.disabled = !(Boolean(authority) && mutable && walletMatches(authority) && logoInput.files?.[0]);
      if (!mutable) {
        setStatus("METADATA IS IMMUTABLE", "This token's Metaplex metadata is permanently locked and cannot be updated.", "error");
      } else if (!authority) {
        setStatus("NO UPDATE AUTHORITY", "This token has no Update Authority. Metadata cannot be changed.", "error");
      } else if (!walletMatches(authority)) {
        setStatus("AUTHORITY REQUIRED", "Connect the wallet that currently owns the Metaplex Update Authority.", "error");
      } else {
        setStatus("METADATA READY", "Current metadata loaded. Choose a new logo to replace the current one.", "success");
      }
    } catch (error) {
      console.error("Token metadata check failed:", error);
      setStatus("CHECK FAILED", error?.message || "Could not read token metadata.", "error");
    } finally {
      checkButton.disabled = false;
    }
  }

  async function updateLogo() {
    if (!tokenState) throw new Error("Check the token metadata first.");
    const p = provider();
    if (!p?.publicKey) throw new Error("Connect the Update Authority wallet first.");
    if (!walletMatches(tokenState.authority)) throw new Error("Connected wallet is not the current Update Authority.");
    if (!tokenState.mutable) throw new Error("This token's metadata is immutable.");
    const file = logoInput.files?.[0];
    if (!file) throw new Error("Choose a new logo first.");
    if (!/^image\/(png|jpeg|webp)$/.test(file.type)) throw new Error("Please choose a PNG, JPG or WEBP image.");
    if (file.size > 2 * 1024 * 1024) throw new Error("Logo image must be 2 MB or smaller.");

    updateButton.disabled = true;
    setStatus("PREPARING", "Uploading the new logo to permanent Arweave storage…", "active");

    const imageUri = await uploadPermanent(p, new Uint8Array(await file.arrayBuffer()), file.type, "Logo");
    const oldJson = tokenState.json || {};
    const nextJson = {
      ...oldJson,
      name: tokenState.name || oldJson.name || "",
      symbol: tokenState.symbol || oldJson.symbol || "",
      image: imageUri,
      properties: {
        ...(oldJson.properties || {}),
        files: [{uri:imageUri, type:file.type}],
        category: oldJson?.properties?.category || "image"
      }
    };

    const metadataUri = await uploadPermanent(
      p,
      JSON.stringify(nextJson),
      "application/json",
      "Metadata"
    );

    setStatus("UPDATING ON-CHAIN", "Approve the metadata update in Phantom. The token Mint Address will not change…", "active");

    const {umi, modules} = await createUmiForWallet(p);
    const {publicKey} = modules.umi;
    const {updateV1, fetchDigitalAsset} = modules.metadata;

    const builder = updateV1(umi, {
      mint: publicKey(tokenState.mint),
      authority: umi.identity,
      data: {
        ...tokenState.asset.metadata,
        uri: metadataUri
      }
    });

    const result = await builder.sendAndConfirm(umi, {send:{commitment:"confirmed", skipPreflight:false}});
    const signature = result?.signature ? String(result.signature) : "";
    if (!signature) throw new Error("Wallet did not return a metadata transaction signature.");

    setStatus("CONFIRMING", "Verifying the new metadata on Solana…", "active");
    const connection = new solanaWeb3.Connection(activeRpc, "confirmed");
    await waitForConfirmation(connection, signature);

    const verifyAsset = await fetchDigitalAsset(umi, publicKey(tokenState.mint));
    const verifiedUri = verifyAsset.metadata?.uri || "";
    if (verifiedUri !== metadataUri) {
      throw new Error("Transaction confirmed, but the new metadata URI could not be verified yet. Please wait for RPC indexing and check again.");
    }

    setStatus("LOGO UPDATED", "New logo metadata is now registered on-chain. Wallets and services can refresh their cached token data.", "success");
    txLink.href = "https://solscan.io/tx/" + signature;
    txLink.hidden = false;
    uriLink.href = metadataUri;
    uriLink.hidden = false;

    tokenState.uri = metadataUri;
    tokenState.json = nextJson;
    currentLogo.src = imageUri;
    currentLogo.hidden = false;
    currentPlaceholder.style.display = "none";
    logoInput.value = "";
    newLogo.hidden = true;
    uploadPlaceholder.style.display = "flex";
  }

  logoInput.addEventListener("change", () => {
    const file = logoInput.files?.[0];
    if (!file) return;
    if (!/^image\/(png|jpeg|webp)$/.test(file.type) || file.size > 2 * 1024 * 1024) {
      setStatus("INVALID LOGO", "Use PNG, JPG or WEBP up to 2 MB.", "error");
      logoInput.value = "";
      return;
    }
    newLogo.src = URL.createObjectURL(file);
    newLogo.hidden = false;
    uploadPlaceholder.style.display = "none";
    updateButton.disabled = !(tokenState && tokenState.mutable && walletMatches(tokenState.authority));
    setStatus("NEW LOGO READY", "Review the preview, then approve the permanent metadata update.", "success");
  });

  checkButton.addEventListener("click", checkMetadata);
  mintInput.addEventListener("keydown", e => { if (e.key === "Enter") checkMetadata(); });
  updateButton.addEventListener("click", async () => {
    try { await updateLogo(); }
    catch (error) {
      console.error("Token metadata update failed:", error);
      setStatus("UPDATE FAILED", error?.message || "The metadata update could not be completed.", "error");
      updateButton.disabled = false;
    }
  });

  function refreshWallet() {
    const wallet = provider()?.publicKey?.toString();
    if (wallet) {
      walletNote.textContent = tokenState?.authority
        ? "Connected wallet: " + short(wallet) + ". " + (walletMatches(tokenState.authority) ? "You can update this token." : "This wallet is not the Update Authority.")
        : "Connected wallet: " + short(wallet) + ". Check a token to continue.";
    }
    if (tokenState) updateButton.disabled = !(tokenState.mutable && walletMatches(tokenState.authority) && logoInput.files?.[0]);
  }

  const gp = provider();
  if (gp?.on) {
    gp.on("connect", refreshWallet);
    gp.on("accountChanged", refreshWallet);
    gp.on("disconnect", refreshWallet);
  }
  window.addEventListener("load", refreshWallet);
  refreshWallet();
})();
