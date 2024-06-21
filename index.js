const TelegramBot = require("node-telegram-bot-api");
const ethers = require("ethers");
const axios = require("axios");

require("dotenv").config();

// Replace with your own token
const token = "7112370797:AAGYgI6f0uqctDUwL7Av7zAd-e0H4gD6gS8";

// Create a bot that uses 'polling' to fetch new updates
const bot = new TelegramBot(token, { polling: true });

// Listen for any kind of message and respond
const provider = new ethers.InfuraProvider(
  "mainnet",
  process.env.INFURA_PROJECT_ID
);

// Uniswap Factory contract address and ABI
const factoryAddress = "0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f"; // Uniswap V2
const factoryAbi = [
  "event PairCreated(address indexed token0, address indexed token1, address pair, uint)",
  // ... other ABI elements if needed
];

const tokenAbi = [
  "function name() external view returns (string memory)",
  "function symbol() external view returns (string memory)",
];

const pairAbi = [
  "function getReserves() external view returns (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast)",
];

const factoryContract = new ethers.Contract(
  factoryAddress,
  factoryAbi,
  provider
);

const channelId = "@uniswapnewpairlist";

factoryContract.on("PairCreated", async (token0, token1, pair, event) => {
  try {
    const token0Contract = new ethers.Contract(token0, tokenAbi, provider);
    const token1Contract = new ethers.Contract(token1, tokenAbi, provider);
    const pairContract = new ethers.Contract(pair, pairAbi, provider);

    const name0 = await token0Contract.name();
    const symbol0 = await token0Contract.symbol();
    const symbol1 = await token1Contract.symbol();
    const [, reserve1] = await pairContract.getReserves();

    const query = `
        {
          bundle(id: "1") {
            ethPrice
          }
        }
      `;
    const response = await axios.post(
      "https://api.thegraph.com/subgraphs/name/uniswap/uniswap-v2",
      {
        query,
      }
    );
    const ethPriceInUsd = response.data.data.bundle.ethPrice;

    bot.sendMessage(
      channelId,
      `New pair at Uniswap V2 v2:

${name0} (${symbol0}/${symbol1})

Initial Liquidity: $${parseInt(parseFloat(reserve1) * ethPriceInUsd * 2)}

Token Contract:
${token0}

DEXTools:
https://www.dextools.io/app/ether/pair-explorer/${pair}
`
    );
  } catch (err) {
    console.log(err);
  }
});

console.log("Bot is running...");
