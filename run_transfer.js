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

    let txs = { num_tx: 0, txs: [], signatureR8x: [], signatureR8y: [], signatureS: [] };
    const txsJsonPath = "./storage/txs.json";
    if (!fs.existsSync(txsJsonPath)) {
        fs.writeFileSync(txsJsonPath, JSON.stringify([], null, "\t"));
    } else {
        txs = JSON.parse(fs.readFileSync(txsJsonPath));
    }

    const contractAddress = process.argv[2];
    const senderAccountId = Number(process.argv[3]);
    const receiverAccountId = Number(process.argv[4]);
    const amount = Number(process.argv[5]);
    const accountJson = JSON.parse(fs.readFileSync(`./storage/account${senderAccountId}.json`));
    const privKey = F.fromObject(accountJson.l2PrivateKey);
    const tx = new Tx(senderAccountId, receiverAccountId, amount, mimc7, eddsa);
    const signature = tx.sign(privKey);

    const txJson = tx.toJson(F);
    txs.num_tx += 1;
    txs.txs.push(txJson);
    txs.signatureR8x.push(BigInt(F.toObject(signature.R8[0])).toString());
    txs.signatureR8y.push(BigInt(F.toObject(signature.R8[1])).toString());
    txs.signatureS.push(BigInt(signature.S).toString());
    fs.writeFileSync(txsJsonPath, JSON.stringify(txs, null, "\t"));
}


main().then(() => console.log("ok")).catch(e => console.error(e));