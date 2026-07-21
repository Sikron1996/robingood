
(() => {
  const cfg = window.ROBIN_GOOD_CONFIG;
  const NFT_ABI = [
    "function balanceOf(address owner) view returns (uint256)",
    "function tokenOfOwnerByIndex(address owner,uint256 index) view returns (uint256)",
    "function tokenURI(uint256 tokenId) view returns (string)"
  ];
  const TOKEN_ABI = ["function balanceOf(address owner) view returns (uint256)"];

  let provider = null;
  let signer = null;
  let account = null;

  const $ = id => document.getElementById(id);
  const short = a => a ? `${a.slice(0,6)}...${a.slice(-4)}` : "Not connected";
  const fmt = n => new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(Number(n));

  $("xLink").href = cfg.links.x;
  $("openSeaLink").href = cfg.links.openSea;
  $("explorerLink").href = cfg.links.blockscoutNft;

  function setStatus(message, type = "") {
    $("collectionStatus").textContent = message;
    $("collectionStatus").className = `collection-status ${type}`.trim();
  }

  function ipfsToHttp(uri) {
    if (!uri) return "";
    if (uri.startsWith("ipfs://")) {
      return `https://ipfs.io/ipfs/${uri.replace("ipfs://", "")}`;
    }
    return uri;
  }

  async function switchChain() {
    if (!window.ethereum) throw new Error("No wallet detected.");
    try {
      await window.ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: cfg.chain.idHex }]
      });
    } catch (err) {
      if (err.code !== 4902) throw err;
      await window.ethereum.request({
        method: "wallet_addEthereumChain",
        params: [{
          chainId: cfg.chain.idHex,
          chainName: cfg.chain.name,
          nativeCurrency: cfg.chain.nativeCurrency,
          rpcUrls: cfg.chain.rpcUrls,
          blockExplorerUrls: cfg.chain.blockExplorerUrls
        }]
      });
    }
  }

  async function connectWallet() {
    try {
      if (!window.ethereum) {
        setStatus("Open this page inside MetaMask, Rabby, Trust or Coinbase Wallet.", "error");
        return;
      }

      setStatus("Connecting wallet...");
      await window.ethereum.request({ method: "eth_requestAccounts" });
      await switchChain();

      provider = new ethers.BrowserProvider(window.ethereum);
      signer = await provider.getSigner();
      account = await signer.getAddress();

      $("connectBtn").querySelector("span").textContent = short(account);
      $("walletAddress").textContent = short(account);

      await loadCollection();
    } catch (err) {
      console.error(err);
      setStatus(err.shortMessage || err.message || "Wallet connection failed.", "error");
    }
  }

  async function fetchMetadata(uri) {
    const url = ipfsToHttp(uri);
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Metadata request failed: ${response.status}`);
    return await response.json();
  }

  function getRank(metadata) {
    return metadata.rank ?? metadata.rarity_rank ?? metadata.rarityRank ?? "—";
  }

  function createCard(tokenId, metadata) {
    const image = ipfsToHttp(metadata.image || metadata.image_url || "");
    const attributes = Array.isArray(metadata.attributes) ? metadata.attributes : [];
    const visibleTraits = attributes.slice(0, 6);

    const card = document.createElement("article");
    card.className = "nft-card";

    const traitsHtml = visibleTraits.map(trait => `
      <div class="trait">
        <small>${escapeHtml(trait.trait_type ?? trait.type ?? "Trait")}</small>
        <b title="${escapeHtml(String(trait.value ?? "—"))}">${escapeHtml(String(trait.value ?? "—"))}</b>
      </div>
    `).join("");

    const extra = attributes.length > 6
      ? `<div class="more-traits">+${attributes.length - 6} more traits</div>`
      : "";

    card.innerHTML = `
      <div class="nft-image-wrap">
        <span class="nft-id-badge">#${tokenId}</span>
        <img src="${escapeAttr(image)}" alt="Robin Good #${tokenId}" loading="lazy">
      </div>
      <div class="nft-card-body">
        <div class="nft-title-row">
          <h3>${escapeHtml(metadata.name || `Robin Good #${tokenId}`)}</h3>
          <span class="rank">RANK ${escapeHtml(String(getRank(metadata)))}</span>
        </div>
        <div class="traits">${traitsHtml || '<div class="more-traits">No traits found</div>'}</div>
        ${extra}
        <div class="card-actions">
          <a href="${cfg.links.openSeaItemBase}${tokenId}" target="_blank" rel="noreferrer">OPENSEA</a>
          <a href="${cfg.links.blockscoutItemBase}${tokenId}" target="_blank" rel="noreferrer">BLOCKSCOUT</a>
        </div>
      </div>
    `;

    const img = card.querySelector("img");
    img.onerror = () => {
      img.src = "./assets/robin-good-hero.jpeg";
    };

    return card;
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, char => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
    }[char]));
  }

  function escapeAttr(value) {
    return escapeHtml(value);
  }

  async function loadCollection() {
    if (!account || !provider) return;

    const grid = $("nftGrid");
    const empty = $("emptyState");
    grid.innerHTML = "";
    empty.classList.add("hidden");
    setStatus("Reading wallet balances and NFT ownership...");

    try {
      const nft = new ethers.Contract(cfg.nftContract, NFT_ABI, provider);
      const token = new ethers.Contract(cfg.goodToken, TOKEN_ABI, provider);

      const [balanceRaw, goodRaw] = await Promise.all([
        nft.balanceOf(account),
        token.balanceOf(account)
      ]);

      const count = Number(balanceRaw);
      $("walletNftCount").textContent = count;
      $("walletGoodBalance").textContent = fmt(ethers.formatEther(goodRaw));

      if (count === 0) {
        setStatus("No Robin Good NFTs found in this wallet.");
        empty.classList.remove("hidden");
        return;
      }

      setStatus(`Found ${count} Robin Good NFT${count === 1 ? "" : "s"}. Loading metadata...`);

      for (let i = 0; i < count; i++) {
        const skeleton = document.createElement("div");
        skeleton.className = "loading-card";
        grid.appendChild(skeleton);
      }

      const ids = await Promise.all(
        Array.from({ length: count }, (_, i) => nft.tokenOfOwnerByIndex(account, i))
      );

      const cards = await Promise.all(ids.map(async tokenIdRaw => {
        const tokenId = tokenIdRaw.toString();
        try {
          const uri = await nft.tokenURI(tokenIdRaw);
          const metadata = await fetchMetadata(uri);
          return createCard(tokenId, metadata);
        } catch (err) {
          console.warn(`Failed to load token ${tokenId}`, err);
          return createCard(tokenId, {
            name: `Robin Good #${tokenId}`,
            image: "./assets/robin-good-hero.jpeg",
            attributes: []
          });
        }
      }));

      grid.innerHTML = "";
      cards.forEach(card => grid.appendChild(card));
      setStatus(`Loaded ${count} Robin Good NFT${count === 1 ? "" : "s"}.`);
    } catch (err) {
      console.error(err);
      grid.innerHTML = "";
      setStatus(err.shortMessage || err.message || "Could not load collection.", "error");
    }
  }

  $("connectBtn").addEventListener("click", connectWallet);
  $("refreshBtn").addEventListener("click", loadCollection);

  window.addEventListener("mousemove", e => {
    $("cursorGlow").style.left = `${e.clientX}px`;
    $("cursorGlow").style.top = `${e.clientY}px`;
  });

  if (window.ethereum) {
    window.ethereum.on?.("accountsChanged", () => window.location.reload());
    window.ethereum.on?.("chainChanged", () => window.location.reload());
  }
})();
