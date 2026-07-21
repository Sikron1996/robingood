# Robin Good Premium Mint Site

Contracts are already configured.

NFT: 0x0049Bf8b64114fD28c75E6C77deDaD40aD3CbE9a
GOOD: 0xc9c05bF105346379f201b41100d166f76a4F0E94

Run locally:
npx serve .

Deploy to Vercel as a static site. Edit X and OpenSea links in config.js.

Wallets supported: MetaMask, Rabby, Coinbase Wallet extension, Trust Wallet browser/extension and mobile wallet in-app browsers.


## My Collection page

`collection.html` is a separate wallet gallery.

It reads:
- `balanceOf`
- `tokenOfOwnerByIndex`
- `tokenURI`

For each owned NFT it shows:
- NFT image
- Token ID
- Rank when metadata contains `rank`, `rarity_rank`, or `rarityRank`
- Up to six traits
- OpenSea button
- Blockscout button

OpenSea and Blockscout item URL templates can be changed in `config.js`.
