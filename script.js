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

async function connectPhantom() {
  const provider = getPhantomProvider();

  if (!provider) {
    alert("Phantom wallet was not detected. Please open this site with the Phantom wallet extension or Phantom's in-app browser.");
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
