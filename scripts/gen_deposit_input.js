const { buildBabyjub, buildMimc7, buildEddsa } = require("circomlibjs");
const State = require("./state.js");
const StateTree = require("./state_tree.js");
const Deposit = require("./deposit.js");

async function genDepositInput(stateTree, accountId, amount, pubKey0, pubKey1, signature) {
    const babyJub = await buildBabyjub();
    const mimc7 = await buildMimc7();
    const eddsa = await buildEddsa();
    const F = babyJub.F;
    const oldStateRoot = stateTree.getRoot();
    const deposit = new Deposit(accountId, amount, pubKey0, pubKey1, babyJub, mimc7, eddsa);
    const [depositHashFormer, depositHashLatter] = deposit.getDecomposedHash();

    const proof = stateTree.getExclusionProof(accountId);
    const proofBytes = proof.data;
    const proofPos = proof.positions;
    // console.log("new sender balance: " + stateTree.getState(senderAccountId).balance.toString());
    // console.log("new root: " + BigInt(F.toObject(stateTree.getRoot())).toString());
    // console.log("new sender state hash: ");
    // console.log(BigInt(F.toObject(stateTree.getState(senderAccountId).hash())).toString());
    // console.log("receiver state hash: ");
    // console.log(BigInt(F.toObject(stateTree.getState(receiverAccountId).hash())).toString());

    const inputs = {
        old_accounts_root: BigInt(F.toObject(oldStateRoot)).toString(),
        deposit_account_id: accountId.toString(),
        deposit_amount: amount.toString(),
        deposit_pubkey: [
            BigInt(F.toObject(pubKey0)).toString(),
            BigInt(F.toObject(pubKey1)).toString(),
        ],
        deposit_hash_former: "0x" + depositHashFormer,
        deposit_hash_latter: "0x" + depositHashLatter,
        signature_R8x: BigInt(F.toObject(signature.R8[0])).toString(),
        signature_R8y: BigInt(F.toObject(signature.R8[1])).toString(),
        signature_S: BigInt(signature.S).toString(),
        deposit_proof: proofBytes,
        deposit_proof_pos: proofPos,
        enabled: "1"
    };

    const state = new State(accountId, pubKey0, pubKey1, amount, mimc7);
    stateTree.insertState(state);

    return inputs;
}
exports.genDepositInput = genDepositInput;
