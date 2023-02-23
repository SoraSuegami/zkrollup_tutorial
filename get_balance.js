const { genEntireInput } = require("./scripts/gen_entire_input.js");
const State = require("./scripts/state.js");
const StateTree = require("./scripts/state_tree.js");
const Tx = require("./scripts/tx.js");
const fs = require("fs");
const { buildBabyjub, buildMimc7, buildEddsa } = require("circomlibjs");
const Deposit = require("./scripts/deposit.js");
const process = require("process");
const { ethers } = require("hardhat");
const { assert } = require("console");
const { execSync } = require("child_process");

async function main() {
    const babyJub = await buildBabyjub();
    const mimc7 = await buildMimc7();
    const eddsa = await buildEddsa();
    const F = babyJub.F;

    const statesJson = JSON.parse(fs.readFileSync("./storage/states.json"));
    const states = statesJson.map(json => new State(json.accountId, F.fromObject(json.pubKey0), F.fromObject(json.pubKey1), json.balance, mimc7));
    const stateTree = new StateTree(8, F, mimc7, states);

    const accountId = Number(process.argv[2]);
    const accountJson = JSON.parse(fs.readFileSync(`./storage/account${accountId}.json`));
    const provider = ethers.getDefaultProvider("http://127.0.0.1:8545/");
    const signer = new ethers.Wallet.fromMnemonic(accountJson.phrase).connect(provider);
    // console.log(signer.address);
    console.log("L1 balance:", (await signer.getBalance()).toString());

    const state = stateTree.getState(accountId);
    console.log("L2 balance:", state.balance);
}


main().then(() => console.log("ok")).catch(e => console.error(e));