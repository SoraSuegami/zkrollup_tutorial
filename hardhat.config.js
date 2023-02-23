/** @type import('hardhat/config').HardhatUserConfig */
require("@nomicfoundation/hardhat-toolbox");
require('hardhat-contract-sizer');

const API_KEY = "jkDiTebNtPyECqLXwTkDO289M4CLC-bf";
const PRIVATE_KEY = "0x4d6aba8440e3bbf1183003914727c55bf73f4cf35f38353cf5521200d584a929";
module.exports = {
  solidity: {
    version: "0.8.17",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200
      }
    }
  },
  networks: {
    goerli: {
      url: `https://eth-goerli.alchemyapi.io/v2/${API_KEY}`,
      accounts: [PRIVATE_KEY],
      allowUnlimitedContractSize: true,
      gasPrice: 30000000000
    },
    hardhat: {
      accounts: [
        {
          privateKey: "0x4d6aba8440e3bbf1183003914727c55bf73f4cf35f38353cf5521200d584a929",
          balance: "25624912500000000",
        },
        {
          privateKey: "0x177267cf35b56f1f4cdf99a9369b7c4d0a25232fa4062c01da646a09a26feb10",
          balance: "25624912500000000",
        },
        {
          privateKey: "0x7a4292ad52ce3bc8be5adb4c0b4b0c2b517e58c5392885cf08abb66a869551ea",
          balance: "25624912500000000",
        }
      ]
    }
  }
};
