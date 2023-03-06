const { genEntireInput } = require("./scripts/gen_entire_input.js");
const State = require("./scripts/state.js");
const StateTree = require("./scripts/state_tree.js");
const Tx = require("./scripts/tx.js");
const fs = require("fs");
const { buildBabyjub, buildMimc7, buildEddsa } = require("circomlibjs");
const Deposit = require("./scripts/deposit.js");

async function main() {
    // setup accounts
    const babyJub = await buildBabyjub();
    const mimc7 = await buildMimc7();
    const eddsa = await buildEddsa();
    const F = babyJub.F;


    const zeroId = 0;
    const zeroIdPubKey = [F.e(["1"]), F.e("1")];
    const alicePrvKey = F.fromObject("0x25376ebd1d1a31472580740aa066274eb114ce629440b270004361c69ff6c9b6");//Buffer.from("1".toString().padStart(64, "0"), "hex");
    const bobPrvKey = F.fromObject("0xc9b1e11a74429922e9ed986460d941c185068c19e981630ea48f3d7cacd9053");// Buffer.from("2".toString().padStart(64, "0"), "hex");
    const alicePubKey = eddsa.prv2pub(alicePrvKey);
    const bobPubKey = eddsa.prv2pub(bobPrvKey);
    const aliceAccountId = 1;
    const bobAccountId = 2;

    const zeroState = new State(zeroId, zeroIdPubKey[0], zeroIdPubKey[1], 0, mimc7);
    const stateTree = new StateTree(8, F, mimc7);
    stateTree.insertState(zeroState);

    // deposits
    const deposit0 = new Deposit(aliceAccountId, 10, alicePubKey[0], alicePubKey[1], babyJub, mimc7, eddsa);
    const signature0 = deposit0.sign(alicePrvKey);
    const deposit1 = new Deposit(bobAccountId, 5, bobPubKey[0], bobPubKey[1], babyJub, mimc7, eddsa);
    const signature1 = deposit1.sign(bobPrvKey);

    // txs
    const tx0 = new Tx(aliceAccountId, bobAccountId, 5, mimc7, eddsa);
    const signature2 = tx0.sign(alicePrvKey);
    const tx1 = new Tx(bobAccountId, aliceAccountId, 2, mimc7, eddsa);
    const signature3 = tx1.sign(bobPrvKey);
    const entire_input = await genEntireInput(stateTree, [deposit0, deposit1], [tx0, tx1], [signature0, signature1, signature2, signature3], 1 << 5, 1 << 5);
    console.log("final alice balance: " + stateTree.getState(aliceAccountId).balance);
    console.log("final bob balance: " + stateTree.getState(bobAccountId).balance);
    console.log("final state root: " + BigInt(F.toObject(stateTree.getRoot())).toString());
    fs.writeFileSync("./build/input.json", JSON.stringify(entire_input, null, "\t"), 'utf-8');
}


main().then(() => console.log("ok")).catch(e => console.error(e));