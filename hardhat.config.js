require("@nomiclabs/hardhat-waffle")
require("@nomiclabs/hardhat-etherscan") // for verifying automatically on etherscan.
require("hardhat-deploy") // for deploying the contract.
require("solidity-coverage") // for displaying the coverage of the unit tests.
require("hardhat-gas-reporter") // for gas reporting purposes.
require("hardhat-contract-sizer")
require("dotenv").config() // for accessing environmental variables.

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: "0.8.7",
};
