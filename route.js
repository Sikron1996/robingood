(() => {
const cfg=window.ROBIN_GOOD_CONFIG,$=id=>document.getElementById(id),short=a=>a?`${a.slice(0,6)}...${a.slice(-4)}`:"CONNECT WALLET";
if($("xLink"))$("xLink").href=cfg.links.x;
if($("openSeaLink"))$("openSeaLink").href=cfg.links.openSea;
if($("explorerLink"))$("explorerLink").href=cfg.links.blockscoutNft;
if($("tokenExplorerLink"))$("tokenExplorerLink").href=cfg.links.blockscoutToken;
async function switchChain(){if(!window.ethereum)throw Error("No wallet detected.");try{await ethereum.request({method:"wallet_switchEthereumChain",params:[{chainId:cfg.chain.idHex}]})}catch(e){if(e.code!==4902)throw e;await ethereum.request({method:"wallet_addEthereumChain",params:[{chainId:cfg.chain.idHex,chainName:cfg.chain.name,nativeCurrency:cfg.chain.nativeCurrency,rpcUrls:cfg.chain.rpcUrls,blockExplorerUrls:cfg.chain.blockExplorerUrls}]})}}
async function connect(){if(!window.ethereum){alert("Open this site inside MetaMask, Rabby, Trust or Coinbase Wallet.");return}await ethereum.request({method:"eth_requestAccounts"});await switchChain();const p=new ethers.BrowserProvider(ethereum),s=await p.getSigner(),a=await s.getAddress();$("connectBtn").querySelector("span").textContent=short(a)}
if($("connectBtn"))$("connectBtn").onclick=connect;
addEventListener("mousemove",e=>{const g=$("cursorGlow");if(g){g.style.left=e.clientX+"px";g.style.top=e.clientY+"px"}});
})();