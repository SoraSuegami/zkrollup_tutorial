/** @type import('hardhat/config').HardhatUserConfig */
require("@nomicfoundation/hardhat-toolbox");
require('hardhat-contract-sizer');

const API_KEY = "jkDiTebNtPyECqLXwTkDO289M4CLC-bf";
const PRIVATE_KEY = "0x4d6aba8440e3bbf1183003914727c55bf73f4cf35f38353cf5521200d584a929";
module.exports = {
  solidity: "0.8.17",
  networks: {
    goerli: {
      url: `https://eth-goerli.alchemyapi.io/v2/${API_KEY}`,
      accounts: [PRIVATE_KEY],
      allowUnlimitedContractSize: true,
      gasPrice: 20000000000
    }
  }
};
