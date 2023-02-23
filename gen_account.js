const { ethers } = require("hardhat");
const fs = require("fs");
const process = require("process");
const { buildBabyjub, buildMimc7, buildEddsa } = require("circomlibjs");


async function main() {
    const deployer = ethers.Wallet.createRandom();
    const mnemonic = deployer.mnemonic;
    mnemonic.l1PrivateKey = deployer.privateKey;
    mnemonic.ethAddress = deployer.address;

    const babyJub = await buildBabyjub();
    const eddsa = await buildEddsa();
    const F = babyJub.F;
    const accountId = process.argv[2];
    const l2PrivateKey = F.random();
    const l2PublicKey = eddsa.prv2pub(l2PrivateKey);
    mnemonic.accountId = accountId;
    mnemonic.l2PrivateKey = "0x" + F.toObject(l2PrivateKey).toString(16);
    mnemonic.l2PublicKey = "0x" + F.toObject(l2PublicKey).toString(16);
    fs.writeFileSync(`./storage/account${accountId}.json`, JSON.stringify(mnemonic, null, "\t"));
}
main().then(() => console.log("ok")).catch(e => console.error(e));