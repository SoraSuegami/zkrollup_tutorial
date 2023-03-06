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
    const maxDeposit = 32;
    const maxTx = 32;

    const statesJson = JSON.parse(fs.readFileSync("./storage/states.json"));
    const states = statesJson.map(json => new State(json.accountId, F.fromObject(json.pubKey0), F.fromObject(json.pubKey1), json.balance, mimc7));
    console.log(states);
    const stateTree = new StateTree(8, F, mimc7, states);

    const depositJsonPath = "./storage/deposits.json";
    const depositsJson = JSON.parse(fs.readFileSync(depositJsonPath));
    assert(depositsJson.num_deposit <= maxDeposit);
    const txsJsonPath = "./storage/txs.json";
    const txsJson = JSON.parse(fs.readFileSync(txsJsonPath));
    assert(txsJson.num_tx <= maxTx);

    const deposits = depositsJson.deposits.map(depositJson => new Deposit(depositJson.accountId, depositJson.amount, F.fromObject(depositJson.pubKey0), F.fromObject(depositJson.pubKey1), babyJub, mimc7, eddsa));
    // console.log(deposits[0].pubKey0);
    // console.log(deposits[0].pubKey1);
    const txs = txsJson.txs.map(txJson => new Tx(txJson.senderAccountId, txJson.receiverAccountId, txJson.amount, mimc7, eddsa));
    const signatures = [];
    for (let i = 0; i < depositsJson.num_deposit; i++) {
        const signature = eddsa.unpackSignature(Uint8Array.from(Buffer.from(depositsJson.signature[i].slice(2), "hex")));
        signatures.push(signature);
    }
    for (let i = 0; i < txsJson.num_tx; i++) {
        const signature = eddsa.unpackSignature(Uint8Array.from(Buffer.from(txsJson.signature[i].slice(2), "hex")));
        signatures.push(signature);
    }
    console.log(stateTree);
    console.log(deposits);
    console.log(signatures[0]);
    const entire_input = await genEntireInput(stateTree, deposits, txs, signatures, maxDeposit, maxTx);
    fs.writeFileSync("./build/input.json", JSON.stringify(entire_input, null, "\t"), 'utf-8');
    execSync(`node ./build/main_js/generate_witness.js ./build/main_js/main.wasm ./build/input.json ./build/witness.wtns`);
    execSync(`zkutil prove -c ./build/main.r1cs -p ./build/params.bin -r ./build/proof.json -o ./build/public.json -w ./build/witness.wtns`);
    const proofJson = JSON.parse(fs.readFileSync("./build/proof.json"));
    const proof = "0x" + proofJson.proof;
    const publicInputJson = JSON.parse(fs.readFileSync("./build/public.json"));
    const newRoot = "0x" + BigInt(publicInputJson[0]).toString(16);
    let txInputs = [];
    for (const tx of txs) {
        txInputs.push([tx.senderAccountId, tx.receiverAccountId, tx.amount]);
    }
    const inputs = ethers.utils.defaultAbiCoder.encode(["tuple(uint8, uint8, uint32)[]", "bytes32"], [txInputs, newRoot]);

    const contractAddress = process.argv[2];
    const accountJson = JSON.parse(fs.readFileSync(`./storage/account0.json`));
    const provider = ethers.getDefaultProvider("http://127.0.0.1:8545/");
    const signer = new ethers.Wallet.fromMnemonic(accountJson.phrase).connect(provider);
    const abiJson = JSON.parse(fs.readFileSync("./artifacts/contracts/Rollup.sol/Rollup.json"));
    const rollup = new ethers.Contract(contractAddress, abiJson.abi, signer);

    const processTx = await rollup.process(inputs, proof);
    await processTx.wait();

    const stateJsons = stateTree.states.map(state => state.toJson(F));
    fs.writeFileSync("./storage/states.json", JSON.stringify(stateJsons, null, "\t"));
    const emptyDeposits = { num_deposit: 0, deposits: [], signatureR8x: [], signatureR8y: [], signatureS: [] };
    fs.writeFileSync(depositJsonPath, JSON.stringify(emptyDeposits, null, "\t"));
    const emptyTxs = { num_tx: 0, txs: [], signatureR8x: [], signatureR8y: [], signatureS: [] };
    fs.writeFileSync(txsJsonPath, JSON.stringify(emptyTxs, null, "\t"));


    // const depositTx = await rollup.connect(signer).deposit(accountJson.l2PublicKey0, accountJson.l2PublicKey1, { from: signer.address, value: amount });
    // await depositTx.wait();

    // const depositJson = deposit.toJson(F);
    // deposits.num_deposit += 1;
    // deposits.deposits.push(depositJson);
    // deposits.signatureR8x.push(BigInt(F.toObject(signature.R8[0])).toString());
    // deposits.signatureR8y.push(BigInt(F.toObject(signature.R8[1])).toString());
    // deposits.signatureS.push(BigInt(signature.S).toString());
    // fs.writeFileSync(depositJsonPath, JSON.stringify(deposits, null, "\t"));
}


main().then(() => console.log("ok")).catch(e => console.error(e));