/** Robinhood Chain mainnet config */
export const ROBINHOOD_CHAIN = {
  id: 4663,
  name: "Robinhood Chain",
  network: "robinhood",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: {
    default: { http: ["https://rpc.mainnet.chain.robinhood.com"] },
    public: { http: ["https://rpc.mainnet.chain.robinhood.com"] },
  },
  blockExplorers: {
    default: {
      name: "Blockscout",
      url: "https://robinhoodchain.blockscout.com",
    },
  },
} as const;

export const DEXSCREENER_CHAIN = "robinhood";
export const UNISWAP_APP = "https://app.uniswap.org";
export const WETH_ADDRESS = "0x0Bd7D308f8E1639FAb988df18A8011f41EAcAD73";

/** Seeds DexScreener multi-query so the board is full of real RH tokens day 1 */
export const DISCOVERY_QUERIES = [
  "CASHCAT",
  "HOODIE",
  "FOX",
  "DIH",
  "POOCH",
  "WOJAK",
  "CAT",
  "DOG",
  "PEPE",
  "hood",
  "robin",
  "meme",
  "4663",
  "cash",
  "trench",
] as const;
