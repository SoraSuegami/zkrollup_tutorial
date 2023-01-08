pragma circom 2.0.0;
include "./check_leaf_existence.circom";
include "./get_merkle_root.circom";
include "../../node_modules/circomlib/circuits/mimc.circom";
include "../../node_modules/circomlib/circuits/eddsamimc.circom";

template ProcessTx(k){
    // k is the depth of accounts tree

    // accounts tree info
    signal input accounts_root; // 変更前のmerkle treeのroot値
    signal input intermediate_root;// 新しいsenderのstateのみを追加したときの、merkle treeのroot値。
    signal input accounts_pubkey[2**k][2];
    signal input accounts_balance[2**k];

    // transactions info 
    signal input sender_pubkey[2];
    signal input sender_balance;
    signal input receiver_pubkey[2];
    signal input receiver_balance;
    signal input amount;
    signal input signature_R8x;
    signal input signature_R8y;
    signal input signature_S;
    signal input sender_proof[k];
    signal input sender_proof_pos[k];
    signal input receiver_proof[k];
    signal input receiver_proof_pos[k];
    signal input enabled;
    
    signal output new_accounts_root; // 新しいsenderのstateとreceiverのstateを追加したときの、merkle treeのroot値。

    // verify sender account exists in accounts_root
    // 1. senderのstateがaccounts_rootのmerkle treeに含まれていることを検証する。
    // [Hint] LeafExistence componentを利用する。stateを構成しているデータをpreimageに入力する。
    component senderExistence = /*
        [TODO]
    */

    // hash msg
    // 2. transaction (tx)のhash値を求める。
    // [Hint] MultiMiMC7 componentを利用する。入力値は、txを構成するデータの全て。
    component msg = /*
        [TODO] 
    */

    // check that transaction was signed by sender
    // 3. senderの電子署名(signature)を検証する。
    // [Hint] EdDSAMiMCVerifier componentを利用する。Ax, Ayはそれぞれsender_pubkeyの0番目、1番目の要素を表す。（具体的には、楕円曲線上の点のx座標、y座標を表す。）
    // Mは署名対象のメッセージを表す。
    component signatureCheck = /*
        [TODO]
    */

    // debit sender account and hash new sender leaf
    // 4. 新しいsenderのstateのhash値を求める。公開鍵は変わらないが、残高が変化するはず。
    // [Hint] 2と同様にMultiMiMC7 componentを利用する。ここで求めたhash値が、次のステップでmerkle treeに追加される。
    component newSenderLeaf = /*
        [TODO]
    */
    
    // 5. sender stateに対応するleafをnewSenderLeafに置き換えた時の、新しいmerkle treeのrootを求める。
    // [Hint] GetMerkleRootを使う。root値を求めるためにはpaths2_rootやpaths2_root_posの値が必要だが、1とは異なり入力値には直接含まれていない。
    // 更新するleafの位置や他のleafの値は変わらないことに着目する。
    component compute_intermediate_root = /*
        [TODO]
    */

    // 6. 入力値として与えられたintermediate_rootと、5で計算したroot値が等しいことを確認する。
    // [TODO]

    // verify receiver account exists in intermediate_root
    // 7. receiverのstateがintermediate_rootのmerkle treeに含まれていることを検証する。
    // [Hint] LeafExistence componentを利用する。stateを構成しているデータをpreimageに入力する。
    component receiverExistence = /*
        [TODO]
    */

    // credit receiver account and hash new receiver leaf
    // 8. 新しいreceiverのstateのhash値を求める。公開鍵は変わらないが、残高が変化するはず。
    // [Hint] 2と同様にMultiMiMC7 componentを利用する。ここで求めたhash値が、次のステップでmerkle treeに追加される。
    component newReceiverLeaf = MultiMiMC7(3,91);
    newReceiverLeaf.in[0] <== receiver_pubkey[0];
    newReceiverLeaf.in[1] <== receiver_pubkey[1];
    newReceiverLeaf.in[2] <== (receiver_balance + amount);
    newReceiverLeaf.k <== 1;

    // update accounts_root
    // 9. receiver stateに対応するleafをnewSenderLeafに置き換えた時の、新しいmerkle treeのrootを求める。
    // [Hint] GetMerkleRootを使う。root値を求めるためにはpaths2_rootやpaths2_root_posの値が必要だが、7とは異なり入力値には直接含まれていない。
    // 更新するleafの位置や他のleafの値は変わらないことに着目する。
    component compute_final_root = /*
        [TODO]
    */

    // 10. 出力値のnew_accounts_rootに、9で計算したroot値を代入する。(同時に、それらの値が等しいというconstraintを作る。)
    // [TODO]
}
component main = ProcessTx(1);