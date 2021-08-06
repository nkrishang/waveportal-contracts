require("@nomiclabs/hardhat-ethers");
require("@nomiclabs/hardhat-waffle");
require("@nomiclabs/hardhat-etherscan");
require("hardhat-abi-exporter")

require('dotenv').config()

// Ensure that we have all the environment variables we need.
let testPrivateKey = process.env.TEST_PRIVATE_KEY;
let alchemyKey = process.env.ALCHEMY_KEY;
let etherscanKey = process.env.ETHERSCAN_API_KEY;

const chainIds = {
  mainnet: 1,
  rinkeby: 4,
};

function createNetworkConfig(network) {
  if (!alchemyKey) {
    throw new Error("Missing ALCHEMY_KEY");
  }
  let nodeUrl = `https://eth-${network}.alchemyapi.io/v2/${alchemyKey}`;

  return {
    chainId: chainIds[network],
    url: nodeUrl,
    accounts: [`${testPrivateKey}`],
  };
}

/**
 * @type import('hardhat/config').HardhatUserConfig
 */
const config = {
  solidity: "0.8.0",

  abiExporter: {
    flat: true,
  },
  etherscan: {
    apiKey: etherscanKey,
  },
};

if (testPrivateKey) {
  config.networks = {
    mainnet: createNetworkConfig("mainnet"),
    rinkeby: createNetworkConfig("rinkeby"),
  };
}

module.exports = config
