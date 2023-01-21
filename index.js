const { genEntireInput } = require("./scripts/gen_entire_input.js");
const State = require("./scripts/state.js");
const StateTree = require("./scripts/state_tree.js");
const Tx = require("./scripts/tx.js");
const fs = require("fs");
const { buildBabyjub, buildMimc7, buildEddsa } = require("circomlibjs");

async function main() {
    // setup accounts
    const babyJub = await buildBabyjub();
    const mimc7 = await buildMimc7();
    const eddsa = await buildEddsa();
    const F = babyJub.F;

    const alicePrvKey = Buffer.from("1".toString().padStart(64, "0"), "hex");
    const bobPrvKey = Buffer.from("2".toString().padStart(64, "0"), "hex");
    const alicePubKey = eddsa.prv2pub(alicePrvKey);
    const bobPubKey = eddsa.prv2pub(bobPrvKey);
    const aliceAccountId = 1;
    const bobAccountId = 2;

    const alice = new State(aliceAccountId, alicePubKey[0], alicePubKey[1], 10, mimc7);
    const bob = new State(bobAccountId, bobPubKey[0], bobPubKey[1], 5, mimc7);

    const stateTree = new StateTree(8, F, mimc7);
    stateTree.insertState(alice);
    stateTree.insertState(bob);

    // txs
    const tx0 = new Tx(aliceAccountId, bobAccountId, 5, mimc7, eddsa);
    const signature0 = tx0.sign(alicePrvKey);
    const tx1 = new Tx(bobAccountId, aliceAccountId, 2, mimc7, eddsa);
    const signature1 = tx1.sign(bobPrvKey);
    const entire_input = await genEntireInput(stateTree, [tx0, tx1], [signature0, signature1], 1 << 5);
    console.log("final alice balance: " + stateTree.getState(aliceAccountId).balance);
    console.log("final bob balance: " + stateTree.getState(bobAccountId).balance);
    console.log("final state root: " + BigInt(F.toObject(stateTree.getRoot())).toString());
    fs.writeFileSync("./build/input.json", JSON.stringify(entire_input, null, "\t"), 'utf-8');
}


main().then(() => console.log("ok")).catch(e => console.error(e));