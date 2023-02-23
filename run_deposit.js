const { genEntireInput } = require("./scripts/gen_entire_input.js");
const State = require("./scripts/state.js");
const StateTree = require("./scripts/state_tree.js");
const Tx = require("./scripts/tx.js");
const fs = require("fs");
const { buildBabyjub, buildMimc7, buildEddsa } = require("circomlibjs");
const Deposit = require("./scripts/deposit.js");
const process = require("process");
const { ethers } = require("hardhat");

async function main() {
    const babyJub = await buildBabyjub();
    const mimc7 = await buildMimc7();
    const eddsa = await buildEddsa();
    const F = babyJub.F;

    const statesJson = JSON.parse(fs.readFileSync("./storage/states.json"));
    const states = statesJson.map(json => new State(json.accountId, F.fromObject(json.pubKey0), F.fromObject(json.pubKey1), json.balance, mimc7));
    const stateTree = new StateTree(8, F, mimc7, states);

    let deposits = { num_deposit: 0, deposits: [], signatureR8x: [], signatureR8y: [], signatureS: [] };
    const depositJsonPath = "./storage/deposits.json";
    if (!fs.existsSync(depositJsonPath)) {
        fs.writeFileSync(depositJsonPath, JSON.stringify([], null, "\t"));
    } else {
        deposits = JSON.parse(fs.readFileSync(depositJsonPath));
    }

    const contractAddress = process.argv[2];
    const accountId = Number(process.argv[3]);
    const amount = Number(process.argv[4]);
    const accountJson = JSON.parse(fs.readFileSync(`./storage/account${accountId}.json`));
    const privKey = F.fromObject(accountJson.l2PrivateKey);
    const pubKey0 = F.fromObject(accountJson.l2PublicKey0);
    const pubKey1 = F.fromObject(accountJson.l2PublicKey1);
    const deposit = new Deposit(accountId, amount, pubKey0, pubKey1, babyJub, mimc7, eddsa);
    const signature = deposit.sign(privKey);

    const provider = ethers.getDefaultProvider("http://127.0.0.1:8545/");

    const signer = new ethers.Wallet.fromMnemonic(accountJson.phrase).connect(provider);
    // console.log(signer.address);
    // console.log("Account balance:", (await signer.getBalance()).toString());
    const abiJson = JSON.parse(fs.readFileSync("./artifacts/contracts/Rollup.sol/Rollup.json"));
    const rollup = new ethers.Contract(contractAddress, abiJson.abi, signer);
    const depositTx = await rollup.connect(signer).deposit(accountJson.l2PublicKey0, accountJson.l2PublicKey1, { from: signer.address, value: amount });
    await depositTx.wait();

    const depositJson = deposit.toJson(F);
    deposits.num_deposit += 1;
    deposits.deposits.push(depositJson);
    deposits.signatureR8x.push(BigInt(F.toObject(signature.R8[0])).toString());
    deposits.signatureR8y.push(BigInt(F.toObject(signature.R8[1])).toString());
    deposits.signatureS.push(BigInt(signature.S).toString());
    fs.writeFileSync(depositJsonPath, JSON.stringify(deposits, null, "\t"));
}


main().then(() => console.log("ok")).catch(e => console.error(e));