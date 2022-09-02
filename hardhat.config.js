require("@nomiclabs/hardhat-waffle")
require("@nomiclabs/hardhat-etherscan")
require("hardhat-deploy")
require("solidity-coverage")
require("hardhat-gas-reporter")
require("hardhat-contract-sizer")
require("dotenv").config()

// migrate to Goerli, it is a Rinkeby testnet error.
// Here is the deployed contract address on Rinkeby testnet: 0x566F98dAEc6FF6873aD3e89C5FD7D64Ba1333cA9

const MAINNET_RPC_URL = process.env.MAINNET_RPC_URL || process.env.ALCHEMY_MAINNET_RPC_URL || "https://eth-mainnet.alchemyapi.io/v2/your-api-key";
const RINKEBY_RPC_URL = process.env.RINKEBY_RPC_URL || "https://eth-rinkeby.alchemyapi.io/v2/your-api-key";
const KOVAN_RPC_URL = process.env.KOVAN_RPC_URL || "https://eth-kovan.alchemyapi.io/v2/your-api-key";
const POLYGON_MAINNET_RPC_URL = process.env.POLYGON_MAINNET_RPC_URL || "https://polygon-mainnet.alchemyapi.io/v2/your-api-key";
const PRIVATE_KEY = process.env.PRIVATE_KEY || "0x";
// optional
const MNEMONIC = process.env.MNEMONIC || "your mnemonic";

// Your API key for Etherscan, obtain one at https://etherscan.io/
const ETHERSCAN_API_KEY = process.env.ETHERSCAN_API_KEY || "Your etherscan API key";
const POLYGONSCAN_API_KEY = process.env.POLYGONSCAN_API_KEY || "Your polygonscan API key";
const REPORT_GAS = process.env.REPORT_GAS || false;

/** @type import('hardhat/config').HardhatUserConfig */

module.exports = {
	defaultNetwork: "hardhat",
	networks: {
		hardhat: {
			chainId: 31337,
		},
		rinkeby: {
			chainId: 4,
			url: RINKEBY_RPC_URL,
			accounts: [PRIVATE_KEY],
			saveDeployments: true,
		}
	},
	gasReporter: {
	  enabled: false,
	  currency: "USD",
	  outputFile: "gas-report.txt",
	  noColors: true,
	  // coinmarketcap: process.env.COINMARKETCAP_API_KEY,
	},
  solidity: "0.8.7",
  namedAccounts: {
  	deployer: {
  		default: 0,
  	},
  	player: {
  		default: 1,
  	},
  },
  mocha: {
  	timeout: 300000, // 300 seconds max
  }
};
