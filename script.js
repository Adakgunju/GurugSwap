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
