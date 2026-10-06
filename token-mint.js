/* GURUGSWAP — TOKEN MINT
 * Mint additional SPL / Token-2022 tokens when the connected wallet
 * is the current Mint Authority.
 */
(() => {
  const RPCS = [
    "https://api.mainnet-beta.solana.com",
    "https://api.mainnet.solana.com",
    "https://solana-rpc.publicnode.com"
  ];
  const TOKEN_PROGRAM = "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA";
  const TOKEN_2022_PROGRAM = "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb";
  const ASSOCIATED_TOKEN_PROGRAM = "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL";
  const SYSTEM_PROGRAM = "11111111111111111111111111111111";
  let activeRpc = RPCS[0];
  let mintState = null;

  const css = `
#token-mint{padding:54px 5vw 24px}
.token-mint-shell{max-width:1180px;margin:0 auto}
.token-mint-card{max-width:760px;margin:0 auto;padding:30px;border:1px solid rgba(255,229,0,.30);border-radius:22px;background:linear-gradient(145deg,rgba(27,29,17,.94),rgba(12,14,9,.94));box-shadow:0 18px 55px rgba(0,0,0,.34)}
.token-mint-grid{display:grid;grid-template-columns:minmax(0,1fr) 190px;gap:12px;align-items:end}
.token-mint-field{display:flex;flex-direction:column;gap:7px}
.token-mint-field.full{grid-column:1/-1}
.token-mint-field label{color:#f1f1e9;font-size:14px;font-weight:800;letter-spacing:.12em}
.token-mint-field input{width:100%;box-sizing:border-box;border:1px solid rgba(255,255,255,.18);border-radius:11px;background:#0b0d0a;color:#fff;padding:15px 14px;outline:0;font-size:16px}
.token-mint-field input:focus{border-color:rgba(255,229,0,.55);box-shadow:0 0 0 2px rgba(255,229,0,.05)}
.token-mint-field small{color:#c8c9bd;font-size:12px;line-height:1.45}
.token-mint-check{min-height:51px;border:1px solid rgba(255,255,255,.10);border-radius:11px;background:#10110d;color:#ddd;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:800;letter-spacing:.08em}
.token-mint-check.active{border-color:rgba(255,229,0,.35);color:#ffe500}
.token-mint-meta{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:16px}
.token-mint-meta-box{padding:14px;border:1px solid rgba(255,255,255,.08);border-radius:12px;background:#10110d}
.token-mint-meta-box span{display:block;color:#9b9c91;font-size:10px;letter-spacing:.12em}
.token-mint-meta-box strong{display:block;margin-top:5px;color:#fff;font-size:14px;word-break:break-all}
.token-mint-button{width:100%;margin-top:18px;min-height:54px;border:0;border-radius:11px;background:#ffe500;color:#10110d;font-size:14px;font-weight:900;letter-spacing:.13em;cursor:pointer}
.token-mint-button:hover{filter:brightness(1.04)}
.token-mint-button:disabled{opacity:.5;cursor:not-allowed}
.token-mint-status{margin-top:12px;padding:14px;border:1px solid rgba(255,255,255,.08);border-radius:11px;background:#10110d;color:#d4d5ca;font-size:13px;line-height:1.55}
.token-mint-status.success{border-color:rgba(255,229,0,.45);color:#fff}
.token-mint-status.error{border-color:rgba(255,120,120,.35);color:#ffadad}
.token-mint-status-top{display:flex;align-items:center;gap:8px;font-weight:900;letter-spacing:.06em}
.token-mint-dot{width:7px;height:7px;border-radius:50%;background:#ffe500;box-shadow:0 0 10px rgba(255,229,0,.55)}
.token-mint-tx{display:inline-block;margin-top:9px;color:#ffe500;text-decoration:none;font-size:12px;font-weight:800}
.token-mint-foot{display:flex;justify-content:space-between;gap:10px;margin-top:13px;color:#77786f;font-size:10px;letter-spacing:.11em}
@media(max-width:700px){
  #token-mint{padding:34px 18px 18px}
  .token-mint-card{padding:21px}
  .token-mint-grid{grid-template-columns:1fr}
  .token-mint-field.full{grid-column:auto}
  .token-mint-field label{font-size:14px}
  .token-mint-field input{font-size:17px;min-height:56px}
  .token-mint-field small{font-size:13px}
  .token-mint-meta{grid-template-columns:1fr}
  .token-mint-button{min-height:56px;font-size:15px}
  .token-mint-status{font-size:14px}
  .token-mint-foot{font-size:9px}
}
`;

  function addStyle(){
    if(document.getElementById("gurug-token-mint-style")) return;
    const s=document.createElement("style");
    s.id="gurug-token-mint-style";
    s.textContent=css;
    document.head.appendChild(s);
  }

  function addSection(){
    if(document.getElementById("token-mint")) return;
    const authority=document.getElementById("authority-manager");
    if(!authority) return;
    authority.insertAdjacentHTML("beforebegin", `
      <section id="token-mint" class="platform-placeholder-section" aria-label="Token mint">
        <div class="platform-placeholder-head">
          <div class="platform-section-kicker">10 / TOKEN MINT</div>
          <h2>Mint more <span class="section-title-accent">tokens.</span></h2>
          <p>Mint additional SPL tokens when your wallet is the active Mint Authority.</p>
        </div>
        <div class="token-mint-shell">
          <div class="token-mint-card">
            <div class="token-mint-grid">
              <div class="token-mint-field full">
                <label for="tokenMintAddress">TOKEN MINT ADDRESS</label>
                <input id="tokenMintAddress" type="text" autocomplete="off" placeholder="Paste token mint address">
                <small>Only a token with an active Mint Authority can mint additional supply.</small>
              </div>
              <div class="token-mint-field">
                <label for="tokenMintAmount">AMOUNT TO MINT</label>
                <input id="tokenMintAmount" type="text" inputmode="decimal" autocomplete="off" placeholder="0.00">
                <small>Enter the human-readable token amount.</small>
              </div>
              <div id="tokenMintAuthorityCheck" class="token-mint-check">AUTHORITY NOT CHECKED</div>
            </div>

            <div class="token-mint-meta">
              <div class="token-mint-meta-box"><span>TOKEN PROGRAM</span><strong id="tokenMintProgram">—</strong></div>
              <div class="token-mint-meta-box"><span>DECIMALS</span><strong id="tokenMintDecimals">—</strong></div>
              <div class="token-mint-meta-box"><span>CURRENT SUPPLY</span><strong id="tokenMintSupply">—</strong></div>
              <div class="token-mint-meta-box"><span>YOUR TOKEN ACCOUNT</span><strong id="tokenMintAccount">—</strong></div>
            </div>

            <button id="tokenMintButton" class="token-mint-button" type="button" disabled>MINT TOKENS</button>

            <div id="tokenMintStatus" class="token-mint-status">
              <div class="token-mint-status-top"><span class="token-mint-dot"></span><span id="tokenMintStatusLabel">READY</span></div>
              <div id="tokenMintStatusMessage">Enter a token mint address to inspect its Mint Authority.</div>
              <a id="tokenMintTx" class="token-mint-tx" href="#" target="_blank" rel="noopener noreferrer" hidden>VIEW TRANSACTION ↗</a>
            </div>

            <div class="token-mint-foot"><span>NON-CUSTODIAL</span><span>ON-CHAIN MINT</span><span>PHANTOM SIGNATURE</span></div>
          </div>
        </div>
      </section>
    `);
  }

  function provider(){
    if(typeof getPhantomProvider==="function") return getPhantomProvider();
    if(window.phantom?.solana?.isPhantom) return window.phantom.solana;
    if(window.solana?.isPhantom) return window.solana;
    return null;
  }

  const BASE58="123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
  function validAddress(value){
    const text=String(value||"").trim().replace(/[\s\u200B-\u200D\uFEFF]/g,"");
    if(!text) return null;
    try{
      let n=0n;
      for(const ch of text){
        const digit=BASE58.indexOf(ch);
        if(digit<0) return null;
        n=n*58n+BigInt(digit);
      }
      const raw=[];
      while(n>0n){raw.push(Number(n&255n));n>>=8n;}
      raw.reverse();
      let leading=0;
      while(leading<text.length&&text[leading]==="1") leading++;
      const bytes=new Uint8Array(leading+raw.length);
      for(let i=0;i<raw.length;i++) bytes[leading+i]=raw[i];
      if(bytes.length!==32) return null;
      return text;
    }catch{return null;}
  }

  async function rpc(method, params){
    let last=null;
    const list=[activeRpc,...RPCS.filter(x=>x!==activeRpc)];
    for(const url of list){
      try{
        const response=await fetch(url,{method:"POST",headers:{"Content-Type":"application/json"},cache:"no-store",
          body:JSON.stringify({jsonrpc:"2.0",id:Date.now(),method,params})});
        if(!response.ok){last=new Error("RPC HTTP "+response.status);continue;}
        const json=await response.json();
        if(json?.error){last=new Error(json.error.message||"RPC error");continue;}
        activeRpc=url;
        return json.result;
      }catch(e){last=e;}
    }
    throw last||new Error("Solana RPC unavailable.");
  }

  function setStatus(label,message,type=""){
    const box=document.getElementById("tokenMintStatus");
    if(!box)return;
    box.className="token-mint-status"+(type?" "+type:"");
    document.getElementById("tokenMintStatusLabel").textContent=label;
    document.getElementById("tokenMintStatusMessage").textContent=message;
    const tx=document.getElementById("tokenMintTx");
    tx.hidden=true;
  }

  function reset(){
    mintState=null;
    document.getElementById("tokenMintAuthorityCheck").textContent="AUTHORITY NOT CHECKED";
    document.getElementById("tokenMintAuthorityCheck").className="token-mint-check";
    ["tokenMintProgram","tokenMintDecimals","tokenMintSupply","tokenMintAccount"].forEach(id=>document.getElementById(id).textContent="—");
    document.getElementById("tokenMintButton").disabled=true;
  }

  async function readMint(mint){
    const result=await rpc("getAccountInfo",[mint,{encoding:"jsonParsed",commitment:"confirmed"}]);
    const value=result?.value;
    if(!value) throw new Error("Token mint account was not found.");
    if(value.owner!==TOKEN_PROGRAM&&value.owner!==TOKEN_2022_PROGRAM) throw new Error("This address is not an SPL Token or Token-2022 mint.");
    const info=value.data?.parsed?.info;
    if(value.data?.parsed?.type!=="mint"||!info) throw new Error("This address is not a valid token mint.");
    return {
      mint,
      programId:value.owner,
      decimals:Number(info.decimals),
      supply:String(info.supply||"0"),
      mintAuthority:info.mintAuthority||null,
      freezeAuthority:info.freezeAuthority||null
    };
  }

  function rawToUi(raw,decimals){
    const n=BigInt(raw);
    const d=10n**BigInt(decimals);
    const whole=n/d;
    const frac=n%d;
    if(!frac)return whole.toString();
    return whole.toString()+"."+frac.toString().padStart(decimals,"0").replace(/0+$/,"");
  }

  function parseUiAmount(text,decimals){
    const value=String(text||"").trim().replace(/,/g,"");
    if(!/^\d+(?:\.\d+)?$/.test(value)) throw new Error("Enter a valid amount to mint.");
    const parts=value.split(".");
    const whole=parts[0]||"0";
    const fraction=(parts[1]||"");
    if(fraction.length>decimals) throw new Error("Amount has more decimal places than this token supports.");
    const padded=fraction.padEnd(decimals,"0");
    const raw=BigInt(whole)*10n**BigInt(decimals)+(padded?BigInt(padded):0n);
    if(raw<=0n) throw new Error("Mint amount must be greater than zero.");
    if(raw>18446744073709551615n) throw new Error("Mint amount is too large.");
    return raw;
  }

  function walletAddress(){
    const value=provider()?.publicKey;
    if(!value) return null;
    try{
      if(typeof value.toBase58==="function") return value.toBase58();
      if(typeof value.toString==="function"){
        const text=value.toString();
        if(text && text!=="[object Object]") return text;
      }
      const text=String(value);
      if(text && text!=="[object Object]") return text;
    }catch{}
    throw new Error("Connected wallet returned an invalid public key.");
  }

  function walletPublicKey(){
    const address=walletAddress();
    return address ? new solanaWeb3.PublicKey(address) : null;
  }

  function authorityMatches(){
    try{
      const wallet=walletAddress();
      return Boolean(wallet&&mintState?.mintAuthority&&wallet===mintState.mintAuthority);
    }catch{
      return false;
    }
  }

  function ataAddress(owner,mint,programId){
    const ownerKey = owner instanceof solanaWeb3.PublicKey ? owner : new solanaWeb3.PublicKey(String(owner));
    const mintKey = mint instanceof solanaWeb3.PublicKey ? mint : new solanaWeb3.PublicKey(String(mint));
    let tokenProgramKey;
    if(programId===TOKEN_2022_PROGRAM){
      tokenProgramKey=new solanaWeb3.PublicKey(TOKEN_2022_PROGRAM);
    }else if(programId===TOKEN_PROGRAM){
      tokenProgramKey=new solanaWeb3.PublicKey(TOKEN_PROGRAM);
    }else{
      throw new Error("Unknown token program: "+String(programId));
    }
    const associatedProgramKey=new solanaWeb3.PublicKey(ASSOCIATED_TOKEN_PROGRAM);
    const seedBytes=[ownerKey.toBytes(),tokenProgramKey.toBytes(),mintKey.toBytes()];
    if(seedBytes.some(b=>b.length!==32)) throw new Error("ATA seed length error");
    return solanaWeb3.PublicKey.findProgramAddressSync(seedBytes,associatedProgramKey)[0];
  }

  function createAtaInstruction(ata,owner,mint,programId){
    return new solanaWeb3.TransactionInstruction({
      programId:new solanaWeb3.PublicKey(ASSOCIATED_TOKEN_PROGRAM),
      keys:[
        {pubkey:owner,isSigner:true,isWritable:true},
        {pubkey:ata,isSigner:false,isWritable:true},
        {pubkey:owner,isSigner:false,isWritable:false},
        {pubkey:mint,isSigner:false,isWritable:false},
        {pubkey:new solanaWeb3.PublicKey(SYSTEM_PROGRAM),isSigner:false,isWritable:false},
        {pubkey:new solanaWeb3.PublicKey(programId),isSigner:false,isWritable:false}
      ],
      data:Uint8Array.from([1])
    });
  }

  function mintToInstruction(mint,destination,authority,programId,rawAmount){
    const data=new Uint8Array(9);
    data[0]=7;
    let n=BigInt(rawAmount);
    for(let i=0;i<8;i++){data[1+i]=Number(n&255n);n>>=8n;}
    return new solanaWeb3.TransactionInstruction({
      programId:new solanaWeb3.PublicKey(programId),
      keys:[
        {pubkey:mint,isSigner:false,isWritable:true},
        {pubkey:destination,isSigner:false,isWritable:true},
        {pubkey:authority,isSigner:true,isWritable:false}
      ],
      data
    });
  }

  async function checkMint(){
    const input=document.getElementById("tokenMintAddress");
    const mint=validAddress(input.value);
    reset();
    if(!mint){
      setStatus("INVALID MINT","Enter a valid Solana mint address.","error");
      return;
    }
    setStatus("CHECKING","Reading the mint directly from Solana…","active");
    let stage="RPC mint lookup";
    try{
      mintState=await readMint(mint);
      stage="mint metadata";
      const authority= mintState.mintAuthority;
      const program=mintState.programId===TOKEN_2022_PROGRAM?"TOKEN-2022":"SPL TOKEN";
      document.getElementById("tokenMintProgram").textContent=program;
      document.getElementById("tokenMintDecimals").textContent=String(mintState.decimals);
      document.getElementById("tokenMintSupply").textContent=rawToUi(mintState.supply,mintState.decimals);
      const p=provider();
      const check=document.getElementById("tokenMintAuthorityCheck");

      // Read the authority state first. A revoked Mint Authority must be
      // reported cleanly without attempting any ATA derivation.
      if(!authority){
        check.textContent="MINT AUTHORITY REVOKED";
        document.getElementById("tokenMintAccount").textContent=p?.publicKey ? "—" : "Connect wallet";
        setStatus("MINT DISABLED","This token has no Mint Authority. Additional tokens cannot be minted.","error");
        return;
      }

      if(!p?.publicKey){
        check.textContent="WALLET NOT CONNECTED";
        document.getElementById("tokenMintAccount").textContent="Connect wallet";
        setStatus("CONNECT WALLET","This token can be minted, but you must connect the current Mint Authority wallet first.","");
        return;
      }

      // Compare the connected wallet to the on-chain authority first.
      // Do not derive an ATA until the wallet is confirmed as the authority.
      let walletAddressValue;
      try{
        walletAddressValue=walletAddress();
      }catch(e){
        throw new Error("Connected wallet public key could not be read.");
      }

      if(!walletAddressValue){
        check.textContent="WALLET NOT CONNECTED";
        document.getElementById("tokenMintAccount").textContent="Connect wallet";
        setStatus("CONNECT WALLET","This token can be minted, but you must connect the current Mint Authority wallet first.","");
        return;
      }

      if(walletAddressValue!==authority){
        check.textContent="AUTHORITY IS ANOTHER WALLET";
        setStatus("AUTHORITY REQUIRED","This token has an active Mint Authority, but the connected wallet is not that authority.","");
        return;
      }

      stage="wallet public key conversion";
      const walletKey=new solanaWeb3.PublicKey(walletAddressValue);
      stage="mint public key conversion";
      const mintKey=new solanaWeb3.PublicKey(mint);
      stage="associated token account derivation";
      const ata=ataAddress(walletKey,mintKey,mintState.programId);
      document.getElementById("tokenMintAccount").textContent=ata.toString();

      check.textContent="MINT AUTHORITY VERIFIED";
      check.className="token-mint-check active";
      document.getElementById("tokenMintButton").disabled=false;
      setStatus("READY TO MINT","Your connected wallet is the current Mint Authority. Enter an amount and mint on-chain.","success");
    }catch(e){
      reset();
      const message=e?.message||"Could not read the token mint.";
      console.error("TOKEN MINT CHECK FAILED:",{stage,error:e,mint});
      setStatus("CHECK FAILED",stage+": "+message,"error");
    }
  }

  async function mintTokens(){
    if(!mintState||!authorityMatches()) throw new Error("The connected wallet is not the current Mint Authority.");
    const rawAmount=parseUiAmount(document.getElementById("tokenMintAmount").value,mintState.decimals);
    const p=provider();
    if(!p?.publicKey) throw new Error("Connect your wallet from the top-right button first.");
    const mint=new solanaWeb3.PublicKey(mintState.mint);
    const owner=p.publicKey;
    const ata=ataAddress(owner,mint,mintState.programId);
    const ataInfo=await rpc("getAccountInfo",[ata.toString(),{encoding:"base64",commitment:"confirmed"}]);
    const tx=new solanaWeb3.Transaction();
    if(!ataInfo?.value) tx.add(createAtaInstruction(ata,owner,mint,mintState.programId));
    tx.add(mintToInstruction(mint,ata,owner,mintState.programId,rawAmount));

    const connection=new solanaWeb3.Connection(activeRpc,"confirmed");
    const latest=await connection.getLatestBlockhash("confirmed");
    tx.recentBlockhash=latest.blockhash;
    tx.feePayer=owner;

    const button=document.getElementById("tokenMintButton");
    button.disabled=true;
    setStatus("AWAITING APPROVAL","Approve the token mint transaction in Phantom.","active");
    const signed=await p.signTransaction(tx);
    const txId=await connection.sendRawTransaction(signed.serialize(),{skipPreflight:false,maxRetries:3});
    setStatus("CONFIRMING","Checking the mint transaction on Solana…","active");

    for(let i=0;i<40;i++){
      const result=await connection.getSignatureStatuses([txId],{searchTransactionHistory:true});
      const sig=result?.value?.[0];
      if(sig?.err) throw new Error("The mint transaction failed on-chain.");
      if(sig?.confirmationStatus==="confirmed"||sig?.confirmationStatus==="finalized"){
        setStatus("MINT SUCCESSFUL","Tokens were minted to your connected wallet.","success");
        const link=document.getElementById("tokenMintTx");
        link.href="https://solscan.io/tx/"+txId;
        link.hidden=false;
        await checkMint();
        link.href="https://solscan.io/tx/"+txId;
        link.hidden=false;
        return;
      }
      await new Promise(r=>setTimeout(r,1000));
    }
    throw new Error("The transaction was sent, but confirmation timed out. Check Solscan before retrying.");
  }

  function bind(){
    addStyle(); addSection();
    const input=document.getElementById("tokenMintAddress");
    const button=document.getElementById("tokenMintButton");
    if(!input||!button||button.dataset.bound)return;
    button.dataset.bound="1";
    input.addEventListener("keydown",e=>{if(e.key==="Enter")checkMint();});
    input.addEventListener("change",checkMint);
    input.addEventListener("blur",()=>{if(input.value.trim())checkMint();});
    button.addEventListener("click",async()=>{
      try{await mintTokens();}
      catch(e){console.error("TOKEN MINT failed:",e);setStatus("MINT FAILED",e?.message||"Token mint failed or was cancelled.","error");}
      finally{button.disabled=!authorityMatches();}
    });
    window.addEventListener("load",()=>{if(input.value.trim())checkMint();});
    const p=provider();
    if(p?.on){
      p.on("connect",()=>{if(input.value.trim())checkMint();});
      p.on("accountChanged",()=>{if(input.value.trim())checkMint();});
      p.on("disconnect",()=>reset());
    }
  }

  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",bind,{once:true});
  else bind();
})();
