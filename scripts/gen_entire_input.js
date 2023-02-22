const { buildBabyjub, buildMimc7, buildEddsa } = require("circomlibjs");
const State = require("./state.js");
const StateTree = require("./state_tree.js");
const Tx = require("./tx.js");
const { genSingleTxInput } = require("./gen_single_tx_input.js");
const assert = require("assert");
const crypto = require("crypto");
const { genDepositInput } = require("./gen_deposit_input.js");

async function genEntireInput(stateTree, deposits, txs, signatureArray, maxDeposits, maxTxs) {
    const babyJub = await buildBabyjub();
    const F = babyJub.F;
    const oldStateRoot = stateTree.getRoot();

    const depositAccountIds = deposits.map(deposit => deposit.accountId);
    const depositAmounts = deposits.map(deposit => deposit.amount);
    const depositPubKey0 = deposits.map(deposit => deposit.pubKey0);
    const depositPubKey1 = deposits.map(deposit => deposit.pubKey1);
    const numDeposits = depositAccountIds.length;
    assert(numDeposits == depositAmounts.length);
    assert(numDeposits == depositPubKey0.length);
    assert(numDeposits == depositPubKey1.length);

    const senderAccountIdArray = txs.map(tx => tx.senderAccountId);
    const receiverAccountIdArray = txs.map(tx => tx.receiverAccountId);
    const amountArray = txs.map(tx => tx.amount);
    const numTxs = senderAccountIdArray.length;
    assert(numTxs == receiverAccountIdArray.length);
    assert(numTxs == amountArray.length);
    assert(numDeposits + numTxs == signatureArray.length);

    const entire_input = {
        old_accounts_root: BigInt(F.toObject(oldStateRoot)).toString(),
        deposit_account_id_array: [],
        deposit_amount_array: [],
        deposit_pubkey_array: [],
        deposit_hash_former_array: [],
        deposit_hash_latter_array: [],
        deposit_proof_array: [],
        deposit_proof_pos_array: [],
        last_deposit_index: (numDeposits - 1).toString(),
        sender_account_id_array: [],
        receiver_account_id_array: [],
        amount_array: [],
        tx_hash_former_array: [],
        tx_hash_latter_array: [],
        signature_R8x_array: [],
        signature_R8y_array: [],
        signature_S_array: [],
        sender_pubkey_array: [],
        sender_balance_array: [],
        receiver_pubkey_array: [],
        receiver_balance_array: [],
        sender_proof_array: [],
        sender_proof_pos_array: [],
        receiver_proof_array: [],
        receiver_proof_pos_array: [],
        last_tx_index: (numTxs - 1).toString(),
    }
    for (let i = 0; i < numDeposits; i++) {
        let input = await genDepositInput(stateTree, depositAccountIds[i], depositAmounts[i], depositPubKey0[i], depositPubKey1[i], signatureArray[i]);
        entire_input.deposit_account_id_array.push(input.deposit_account_id);
        entire_input.deposit_amount_array.push(input.deposit_amount);
        entire_input.deposit_pubkey_array.push(input.deposit_pubkey);
        entire_input.deposit_hash_former_array.push(input.deposit_hash_former);
        entire_input.deposit_hash_latter_array.push(input.deposit_hash_latter);
        entire_input.signature_R8x_array.push(input.signature_R8x);
        entire_input.signature_R8y_array.push(input.signature_R8y);
        entire_input.signature_S_array.push(input.signature_S);
        entire_input.deposit_proof_array.push(input.deposit_proof);
        entire_input.deposit_proof_pos_array.push(input.deposit_proof_pos);
    }
    let allDepositInputs = "";
    for (let i = 0; i < numTxs; i++) {
        allDepositInputs = allDepositInputs + entire_input.deposit_hash_former_array[i].slice(2) + entire_input.deposit_hash_latter_array[i].slice(2);
    }

    // dummy deposits
    const numDummyDeposit = maxDeposits - numDeposits;
    const zeroArray = Array.apply(null, Array(stateTree.k)).map(() => "0");
    for (let i = 0; i < numDummyDeposit; i++) {
        entire_input.deposit_account_id_array.push("0");
        entire_input.deposit_amount_array.push("0");
        entire_input.deposit_pubkey_array.push(["1", "1"]);
        entire_input.deposit_hash_former_array.push("0");
        entire_input.deposit_hash_latter_array.push("0");
        entire_input.signature_R8x_array.push("0");
        entire_input.signature_R8y_array.push("0");
        entire_input.signature_S_array.push("0");
        entire_input.deposit_proof_array.push(zeroArray);
        entire_input.deposit_proof_pos_array.push(zeroArray);
    }
    allDepositInputs = allDepositInputs + Array.apply(null, Array(numDummyDeposit * 32)).map(() => "00").reduce((res, val) => res + val, "");
    const allDepositHash = crypto.createHash("sha256")
        .update(Buffer.from(allDepositInputs, "hex"))
        .digest("hex");
    entire_input.all_deposits_hash_former = "0x" + allDepositHash.slice(0, 32);
    entire_input.all_deposits_hash_latter = "0x" + allDepositHash.slice(32, 64);


    for (let i = 0; i < numTxs; i++) {
        let input = await genSingleTxInput(stateTree, senderAccountIdArray[i], receiverAccountIdArray[i], amountArray[i], signatureArray[numDeposits + i]);
        entire_input.sender_account_id_array.push(input.sender_account_id);
        entire_input.receiver_account_id_array.push(input.receiver_account_id);
        entire_input.amount_array.push(input.amount);
        entire_input.tx_hash_former_array.push(input.tx_hash_former);
        entire_input.tx_hash_latter_array.push(input.tx_hash_latter);
        entire_input.signature_R8x_array.push(input.signature_R8x);
        entire_input.signature_R8y_array.push(input.signature_R8y);
        entire_input.signature_S_array.push(input.signature_S);
        entire_input.sender_pubkey_array.push(input.sender_pubkey);
        entire_input.sender_balance_array.push(input.sender_balance);
        entire_input.receiver_pubkey_array.push(input.receiver_pubkey);
        entire_input.receiver_balance_array.push(input.receiver_balance);
        entire_input.sender_proof_array.push(input.sender_proof);
        entire_input.sender_proof_pos_array.push(input.sender_proof_pos);
        entire_input.receiver_proof_array.push(input.receiver_proof);
        entire_input.receiver_proof_pos_array.push(input.receiver_proof_pos);
    }

    let allTxInputs = "";
    for (let i = 0; i < numTxs; i++) {
        allTxInputs = allTxInputs + entire_input.tx_hash_former_array[i].slice(2) + entire_input.tx_hash_latter_array[i].slice(2);
    }

    // dummy txs
    const numDummyTx = maxTxs - numTxs;
    for (let i = 0; i < numDummyTx; i++) {
        entire_input.sender_account_id_array.push("0");
        entire_input.receiver_account_id_array.push("0");
        entire_input.amount_array.push("0");
        entire_input.tx_hash_former_array.push("0");
        entire_input.tx_hash_latter_array.push("0");
        entire_input.signature_R8x_array.push("0");
        entire_input.signature_R8y_array.push("0");
        entire_input.signature_S_array.push("0");
        entire_input.sender_pubkey_array.push(["1", "1"]);
        entire_input.sender_balance_array.push("0");
        entire_input.receiver_pubkey_array.push(["1", "1"]);
        entire_input.receiver_balance_array.push("0");
        entire_input.sender_proof_array.push(zeroArray);
        entire_input.sender_proof_pos_array.push(zeroArray);
        entire_input.receiver_proof_array.push(zeroArray);
        entire_input.receiver_proof_pos_array.push(zeroArray);
    }
    allTxInputs = allTxInputs + Array.apply(null, Array(numDummyTx * 32)).map(() => "00").reduce((res, val) => res + val, "");
    const allTxHash = crypto.createHash("sha256")
        .update(Buffer.from(allTxInputs, "hex"))
        .digest("hex");
    entire_input.all_txs_hash_former = "0x" + allTxHash.slice(0, 32);
    entire_input.all_txs_hash_latter = "0x" + allTxHash.slice(32, 64);
    return entire_input
}
exports.genEntireInput = genEntireInput;
