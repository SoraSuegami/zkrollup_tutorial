const { buildBabyjub, buildMimc7, buildEddsa } = require("circomlibjs");
const State = require("./state.js");
const StateTree = require("./state_tree.js");
const Tx = require("./tx.js");

async function genSingleTxInput(stateTree, senderAccountId, receiverAccountId, amount, signature) {
    const babyJub = await buildBabyjub();
    const mimc7 = await buildMimc7();
    const eddsa = await buildEddsa();
    const F = babyJub.F;
    const oldStateRoot = stateTree.getRoot();
    const tx = new Tx(senderAccountId, receiverAccountId, amount, mimc7, eddsa);
    const [txHashFormer, txHashLatter] = tx.getDecomposedHash();
    //const signature = tx.sign(senderPrivKey);

    const senderState = stateTree.getState(senderAccountId);
    const senderBalance = senderState.balance.toString()
    const receiverState = stateTree.getState(receiverAccountId);
    const receiverBalance = receiverState.balance.toString();
    const senderProof = stateTree.getProof(senderAccountId);
    const senderProofBytes = senderProof.data;//.map(p => BigInt(F.toObject(p.data)).toString());
    const senderProofPos = senderProof.positions//.map(p => p.position.toString());
    const newSenderState = new State(senderState.accountId, senderState.pubKey0, senderState.pubKey1, senderState.balance - amount, senderState.mimc7);
    stateTree.updateState(newSenderState);
    // console.log("new sender balance: " + stateTree.getState(senderAccountId).balance.toString());
    // console.log("new root: " + BigInt(F.toObject(stateTree.getRoot())).toString());
    // console.log("new sender state hash: ");
    // console.log(BigInt(F.toObject(stateTree.getState(senderAccountId).hash())).toString());
    // console.log("receiver state hash: ");
    // console.log(BigInt(F.toObject(stateTree.getState(receiverAccountId).hash())).toString());

    const receiverProof = stateTree.getProof(receiverAccountId);
    const receiverProofBytes = receiverProof.data;//.map(p => BigInt(F.toObject(p.data)).toString());
    const receiverProofPos = receiverProof.positions;//.map(p => p.position.toString());

    const inputs = {
        old_accounts_root: BigInt(F.toObject(oldStateRoot)).toString(),
        sender_account_id: senderAccountId.toString(),
        receiver_account_id: receiverAccountId.toString(),
        amount: amount.toString(),
        tx_hash_former: "0x" + txHashFormer,
        tx_hash_latter: "0x" + txHashLatter,
        signature_R8x: BigInt(F.toObject(signature.R8[0])).toString(),
        signature_R8y: BigInt(F.toObject(signature.R8[1])).toString(),
        signature_S: BigInt(signature.S).toString(),
        sender_balance: senderBalance,
        receiver_balance: receiverBalance,
        sender_pubkey: [
            BigInt(F.toObject(senderState.pubKey0)).toString(),
            BigInt(F.toObject(senderState.pubKey1)).toString(),
        ],
        receiver_pubkey: [
            BigInt(F.toObject(receiverState.pubKey0)).toString(),
            BigInt(F.toObject(receiverState.pubKey1)).toString(),
        ],
        sender_proof: senderProofBytes,
        sender_proof_pos: senderProofPos,
        receiver_proof: receiverProofBytes,
        receiver_proof_pos: receiverProofPos,
        enabled: "1"
    };


    const newReceiverState = new State(receiverState.accountId, receiverState.pubKey0, receiverState.pubKey1, receiverState.balance + amount, receiverState.mimc7);
    stateTree.updateState(newReceiverState);
    return inputs;
}
exports.genSingleTxInput = genSingleTxInput;
