const { ethers } = require("hardhat");
const fs = require("fs");
const { buildBabyjub, buildMimc7, buildEddsa } = require("circomlibjs");
const State = require("./state.js");
const StateTree = require("./state_tree.js");

async function main() {
    const [deployer] = await ethers.getSigners();
    console.log("Deploying contracts with the account:", deployer.address);

    console.log("Account balance:", (await deployer.getBalance()).toString());

    const Verifier = await ethers.getContractFactory("Verifier");
    const Rollup = await ethers.getContractFactory("Rollup");

    const babyJub = await buildBabyjub();
    const mimc7 = await buildMimc7();
    const eddsa = await buildEddsa();
    const F = babyJub.F;
    const zeroId = 0;
    const zeroIdPubKey = [F.e(["1"]), F.e("1")];
    console.log(zeroIdPubKey[0]);
    const zeroState = new State(zeroId, zeroIdPubKey[0], zeroIdPubKey[1], 0, mimc7);
    const stateTree = new StateTree(8, F, mimc7);
    stateTree.insertState(zeroState);
    const initRoot = "0x" + BigInt(F.toObject(stateTree.getRoot())).toString(16);
    const stateJsons = stateTree.states.map(state => state.toJson(F));
    // console.log(F.fromObject(BigInt(stateJsons[0].pubKey0)));
    fs.writeFileSync("./storage/states.json", JSON.stringify(stateJsons, null, "\t"), { flag: "w" });

    const verifier = await Verifier.deploy();
    await verifier.deployed()
    console.log("verifier deployed");
    const rollup = await Rollup.deploy(initRoot, 32, 32, verifier.address);
    await rollup.deployed();
    console.log("rollup deployed");
    console.log("rollup contract address:", rollup.address);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });