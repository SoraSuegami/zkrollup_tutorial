pragma circom 2.0.0;
include "./check_leaf_existence.circom";
include "./get_merkle_root.circom";
include "../../node_modules/circomlib/circuits/mimc.circom";
include "../../node_modules/circomlib/circuits/eddsamimc.circom";
include "../../node_modules/circomlib/circuits/sha256/sha256.circom";
include "../../node_modules/circomlib/circuits/bitify.circom";
include "../../node_modules/circomlib/circuits/comparators.circom";


template ProcessTx(k,idBitSize,amoutnBitSize){
    // k is the depth of accounts tree

    // accounts tree info
    signal input old_accounts_root; // 変更前のmerkle treeのroot値

    // transactions info 
    signal input sender_account_id; // idBitSize bit
    signal input receiver_account_id; // idBitSize bit
    signal input amount; // amoutnBitSize bit
    // tx_hash = SHA256(sender_account_id || receiver_account_id || amount) 
    signal input tx_hash_former; // 256 bitのtx_hashのうち、前半128 bit。
    signal input tx_hash_latter; // 256 bitのtx_hashのうち、後半128 bit。
    signal input signature_R8x;
    signal input signature_R8y;
    signal input signature_S;

    // state info
    signal input sender_balance;
    signal input receiver_balance;
    signal input sender_pubkey[2];
    signal input receiver_pubkey[2];
    signal input sender_proof[k];
    signal input sender_proof_pos[k];
    signal input receiver_proof[k];
    signal input receiver_proof_pos[k];
    
    // enable flag
    signal input is_enable;
    // 新しいsenderのstateとreceiverのstateを追加したときの、merkle treeのroot値。
    signal output new_accounts_root;

    // 新しいsenderのstateのみを追加したときの、merkle treeのroot値。
    signal intermediate_root;

    // verify sender account exists in accounts_root
    // 1. senderのstateがaccounts_rootのmerkle treeに含まれていることを検証する。
    // [Hint] LeafExistence componentを利用する。stateを構成しているデータをpreimageに入力する。
    component senderExistence = LeafExistence(k,4);
    senderExistence.preimage[0] <== sender_account_id;
    senderExistence.preimage[1] <== sender_pubkey[0];
    senderExistence.preimage[2] <== sender_pubkey[1];
    senderExistence.preimage[3] <== sender_balance;
    senderExistence.root <== old_accounts_root;
    for(var i = 0; i < k; i++){
        senderExistence.paths2_root_pos[i] <== sender_proof_pos[i];
        senderExistence.paths2_root[i] <== sender_proof[i];
    }
    senderExistence.is_enable <== is_enable;

    // hash msg
    // 2. transaction (tx)のhash値を求め、入力されたtx_hashの値と等しいことを確認する。。
    // [Hint] Sha256 componentを利用する。入力値はbit値で入力する必要があるため、Num2Bits componentで変換する。
    component txHasher = Sha256(idBitSize*2+amoutnBitSize);
    component senderIdBits = Num2Bits(idBitSize);
    component receiverIdBits = Num2Bits(idBitSize);
    component amountBits = Num2Bits(amoutnBitSize);
    senderIdBits.in <== sender_account_id;
    receiverIdBits.in <== receiver_account_id;
    amountBits.in <== amount;
    // txHasherにsenderIdBits、receiverIdBits、amountBitsを入力する。ただし、Num2Bitsはlittle endianのビット列を出力するので、反転して入力する。
    for(var i=0;i<idBitSize;i++) {
        txHasher.in[i] <== senderIdBits.out[idBitSize-i-1];
    }
    for(var i=0;i<idBitSize;i++) {
        txHasher.in[idBitSize+i] <== receiverIdBits.out[idBitSize-i-1];
    }
    for(var i=0;i<amoutnBitSize;i++) {
        txHasher.in[idBitSize*2+i] <== amountBits.out[amoutnBitSize-i-1];
    }
    // txHasherの出力を、txHashFormer、txHashFormerで整数値に変換してtx_hash_former、tx_hash_latterと等しいか確認する。ただし、Bits2Numはlittle endianのビット列を想定しているので、反転して入力する。
    component txHashFormer = Bits2Num(128);
    component txHashLatter = Bits2Num(128);
    for(var i=0;i<128;i++) {
        txHashFormer.in[i] <== txHasher.out[127-i];
    }
    for(var i=0;i<128;i++) {
        txHashLatter.in[i] <== txHasher.out[128+127-i];
    }
    is_enable*(tx_hash_former - txHashFormer.out) === 0;
    is_enable*(tx_hash_latter - txHashLatter.out) === 0;
    
    // check that transaction was signed by sender
    // 3. senderの電子署名(signature)を検証する。ただし、署名対象のメッセージはMultiMiMC7(tx_hash_former, tx_hash_latter)。
    // メッセージの計算
    component msg = MultiMiMC7(2,91);
    msg.k <== 1;
    msg.in[0] <== tx_hash_former;
    msg.in[1] <== tx_hash_latter;
    // 署名を検証する。
    // [Hint] EdDSAMiMCVerifier componentを利用する。Ax, Ayはそれぞれsender_pubkeyの0番目、1番目の要素を表す。（具体的には、楕円曲線上の点のx座標、y座標を表す。）
    // Mは署名対象のメッセージを表す。
    component signatureCheck = EdDSAMiMCVerifier();
    signatureCheck.enabled <== is_enable;
    signatureCheck.Ax <== sender_pubkey[0];
    signatureCheck.Ay <== sender_pubkey[1];
    signatureCheck.R8x <== signature_R8x;
    signatureCheck.R8y <== signature_R8y;
    signatureCheck.S <== signature_S;
    signatureCheck.M <== msg.out;

    // debit sender account and hash new sender leaf
    // 4. 新しいsenderのstateのhash値を求める。公開鍵は変わらないが、残高が変化するはず。
    // [Hint] MultiMiMC7 componentを利用する。ここで求めたhash値が、次のステップでmerkle treeに追加される。
    component newSenderLeaf = MultiMiMC7(4,91);
    newSenderLeaf.k <== 1;
    newSenderLeaf.in[0] <== sender_account_id;
    newSenderLeaf.in[1] <== sender_pubkey[0];
    newSenderLeaf.in[2] <== sender_pubkey[1];
    newSenderLeaf.in[3] <== (sender_balance - amount);
    // ただし、sender_balance >= amountでなくてはならない。
    // [Hint] GreaterEqThan componentを利用する。
    component compare_balance = GreaterEqThan(amoutnBitSize);
    compare_balance.in[0] <== sender_balance;
    compare_balance.in[1] <== amount;
    is_enable*(compare_balance.out - 1) === 0; 
    
    // 5. sender stateに対応するleafをnewSenderLeafに置き換えた時の、新しいmerkle treeのrootを求める。
    // [Hint] GetMerkleRootを使う。root値を求めるためにはpaths2_rootやpaths2_root_posの値が必要だが、1とは異なり入力値には直接含まれていない。
    // 更新するleafの位置や他のleafの値は変わらないことに着目する。
    component compute_intermediate_root = GetMerkleRoot(k);
    compute_intermediate_root.leaf <== newSenderLeaf.out;
    for(var i = 0; i < k; i++){
        compute_intermediate_root.paths2_root_pos[i] <== sender_proof_pos[i];
        compute_intermediate_root.paths2_root[i] <== sender_proof[i];
    }

    // 6. intermediate_rootに、5で計算したroot値を代入する。
    intermediate_root <== compute_intermediate_root.out;

    // verify receiver account exists in intermediate_root
    // 7. receiverのstateがintermediate_rootのmerkle treeに含まれていることを検証する。
    // [Hint] LeafExistence componentを利用する。stateを構成しているデータをpreimageに入力する。
    component receiverExistence = LeafExistence(k,4);
    receiverExistence.preimage[0] <== receiver_account_id;
    receiverExistence.preimage[1] <== receiver_pubkey[0];
    receiverExistence.preimage[2] <== receiver_pubkey[1];
    receiverExistence.preimage[3] <== receiver_balance;
    receiverExistence.root <== intermediate_root;
    for(var i = 0; i < k; i++){
        receiverExistence.paths2_root_pos[i] <== receiver_proof_pos[i];
        receiverExistence.paths2_root[i] <== receiver_proof[i];
    }
    receiverExistence.is_enable <== is_enable;

    // credit receiver account and hash new receiver leaf
    // 8. 新しいreceiverのstateのhash値を求める。公開鍵は変わらないが、残高が変化するはず。
    // [Hint] 2と同様にMultiMiMC7 componentを利用する。ここで求めたhash値が、次のステップでmerkle treeに追加される。
    component newReceiverLeaf = MultiMiMC7(4,91);
    newReceiverLeaf.in[0] <== receiver_account_id;
    newReceiverLeaf.in[1] <== receiver_pubkey[0];
    newReceiverLeaf.in[2] <== receiver_pubkey[1];
    newReceiverLeaf.in[3] <== (receiver_balance + amount);
    newReceiverLeaf.k <== 1;

    // update accounts_root
    // 9. receiver stateに対応するleafをnewSenderLeafに置き換えた時の、新しいmerkle treeのrootを求める。
    // [Hint] GetMerkleRootを使う。root値を求めるためにはpaths2_rootやpaths2_root_posの値が必要だが、7とは異なり入力値には直接含まれていない。
    // 更新するleafの位置や他のleafの値は変わらないことに着目する。
    component compute_final_root =  GetMerkleRoot(k);
    compute_final_root.leaf <== newReceiverLeaf.out;
    for(var i = 0; i < k; i++){
        compute_final_root.paths2_root_pos[i] <== receiver_proof_pos[i];
        compute_final_root.paths2_root[i] <== receiver_proof[i];
    }
     
    // 10. 出力値のnew_accounts_rootに、9で計算したroot値を代入する。(同時に、それらの値が等しいというconstraintを作る。)ただし、is_enable==0の場合は、new_accounts_rootの値を変えてはいけない。
    signal enable_root <== is_enable*compute_final_root.out;
    signal disable_root <== (1-is_enable)*old_accounts_root;
    new_accounts_root <== enable_root + disable_root;
}
