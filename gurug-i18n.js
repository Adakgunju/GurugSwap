/* GURUGSWAP — KOREAN UI
 * Translation-only layer. Does not observe or intercept navigation.
 */
(() => {
  const T = {
    "TOKEN CREATION":"토큰 생성","TOKEN DISTRIBUTION":"토큰 배포","LIQUIDITY POOL":"유동성 풀",
    "TOKEN SWAP":"토큰 스왑","MULTI AIRDROP":"멀티 에어드롭","TOKEN BURN":"토큰 소각",
    "TOKEN MINT":"토큰 추가 발행","TOKEN AUTHORITY":"토큰 권한 관리","CONNECT WALLET":"지갑 연결",
    "MENU":"메뉴","CLOSE":"닫기","YOU PAY":"지불","YOU RECEIVE":"수령","SELECT TOKEN":"토큰 선택",
    "SLIPPAGE":"슬리피지","SWAP":"스왑","COPY":"복사","COPIED!":"복사 완료!","PRICE":"가격",
    "LIQUIDITY":"유동성","24H VOLUME":"24시간 거래량","VIEW CHART ↗":"차트 보기 ↗",
    "TOKEN INFO":"토큰 정보","LIVE MARKET":"실시간 시장","CONTRACT":"컨트랙트",
    "MULTI":"멀티","Airdrop.":"에어드롭.","Burn":"소각","Tokens.":"토큰.",
    "Permanently remove your SPL tokens from circulation on Solana.":"솔라나에서 SPL 토큰을 영구적으로 소각합니다.",
    "Manage your token":"토큰","authorities.":"권한을 관리하세요.",
    "View, change or permanently revoke the Mint Authority and Freeze Authority for your Solana token.":"솔라나 토큰의 Mint Authority와 Freeze Authority를 확인하고 변경하거나 영구 폐기할 수 있습니다.",
    "OFFICIAL":"공식","MARKET":"시장","FOLLOW":"팔로우","COMMUNITY":"커뮤니티","TRACK":"차트",
    "WEBSITE":"웹사이트","CHART":"차트","PLAY":"플레이","EXPLORE":"탐험","GURUG ARCADE":"GURUG ARCADE",
    "GURUG MINING":"GURUG MINING","PARTNER ADS":"파트너 광고","SPONSOR":"스폰서","YOUR AD HERE":"광고 문의",
    "TOKEN NAME":"토큰 이름","SYMBOL":"심볼","TOTAL SUPPLY":"총 발행량","DECIMALS":"소수점",
    "TOKEN LOGO":"토큰 로고","UPLOAD LOGO":"로고 업로드","FIX TOTAL SUPPLY":"총 발행량 고정",
    "REVOKE FREEZE AUTHORITY":"Freeze Authority 폐기","CREATE TOKEN":"토큰 생성하기",
    "TOKEN MINT ADDRESS":"토큰 Mint 주소","AMOUNT TO MINT":"추가 발행 수량","MINT TOKENS":"토큰 추가 발행",
    "TOKEN PROGRAM":"토큰 프로그램","CURRENT SUPPLY":"현재 발행량","YOUR TOKEN ACCOUNT":"내 토큰 계정",
    "AUTHORITY NOT CHECKED":"권한 확인 전","READY":"준비 완료","CHECKING":"확인 중",
    "CHECK FAILED":"확인 실패","INVALID MINT":"잘못된 Mint 주소","AUTHORITIES LOADED":"권한 확인 완료",
    "PERMANENTLY REVOKE":"영구 폐기","CHANGE AUTHORITY":"권한 변경","MINT AUTHORITY":"Mint Authority",
    "FREEZE AUTHORITY":"Freeze Authority","ACTIVE":"활성","REVOKED":"폐기됨",
    "NONE — PERMANENTLY REVOKED":"없음 — 영구 폐기됨","NON-CUSTODIAL":"비수탁형",
    "PHANTOM SIGNATURE":"Phantom 서명"
  };
  const R=Object.fromEntries(Object.entries(T).map(([a,b])=>[b,a]));
  let ko=localStorage.getItem("gurug-language")==="ko";
  function convert(root,map){
    const w=document.createTreeWalker(root,NodeFilter.SHOW_TEXT); const nodes=[]; let n;
    while(n=w.nextNode()){const p=n.parentElement;if(p&&!["SCRIPT","STYLE","NOSCRIPT"].includes(p.tagName)&&n.nodeValue.trim())nodes.push(n);}
    nodes.forEach(n=>{let s=n.nodeValue;for(const[a,b]of Object.entries(map))if(s.includes(a))s=s.split(a).join(b);if(s!==n.nodeValue)n.nodeValue=s;});
    root.querySelectorAll("[placeholder],[aria-label],[title]").forEach(el=>["placeholder","aria-label","title"].forEach(a=>{if(el.hasAttribute(a)){let s=el.getAttribute(a);for(const[x,y]of Object.entries(map))if(s.includes(x))s=s.split(x).join(y);el.setAttribute(a,s);}}));
  }
  function apply(){convert(document.body,ko?T:R);const b=document.getElementById("languageToggle");if(b)b.textContent=ko?"ENGLISH":"한국어";document.documentElement.lang=ko?"ko":"en";}
  function init(){const b=document.getElementById("languageToggle");if(!b)return;b.addEventListener("click",()=>{ko=!ko;localStorage.setItem("gurug-language",ko?"ko":"en");apply();});if(ko)apply();}
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init,{once:true});else init();
})();