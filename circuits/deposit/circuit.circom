pragma circom 2.0.0;
include "../single_tx/check_leaf_existence.circom";
include "../single_tx/get_merkle_root.circom";
include "../../node_modules/circomlib/circuits/mimc.circom";
include "../../node_modules/circomlib/circuits/eddsamimc.circom";
include "../../node_modules/circomlib/circuits/sha256/sha256.circom";
include "../../node_modules/circomlib/circuits/bitify.circom";
include "../../node_modules/circomlib/circuits/comparators.circom";


template ProcessDeposit(k,idBitSize,amoutnBitSize,pubkeyBitSize){
    // k is the depth of accounts tree

    // accounts tree info
    signal input old_accounts_root; // 変更前のmerkle treeのroot値

    // deposit info 
    signal input account_id; // idBitSize bit
    signal input amount; // amoutnBitSize bit
    signal input pubkey[2]; // pubkeyBitSize bit * 2 // 254 bit * 2
    // deposit_hash = SHA256(account_id || amount || pubkey[0] || pubkey[1]) 
    signal input deposit_hash_former; // 256 bitのdeposit_hashのうち、前半128 bit。
    signal input deposit_hash_latter; // 256 bitのdeposit_hashのうち、後半128 bit。
    signal input signature_R8x;
    signal input signature_R8y;
    signal input signature_S;

    // state info
    signal input proof[k];
    signal input proof_pos[k];
    
    // enable flag
    signal input is_enable;
    // 新しいsenderのstateとreceiverのstateを追加したときの、merkle treeのroot値。
    signal output new_accounts_root;


    // 1. 元々のaccounts_rootのmerkle treeには、追加されるstateの位置に他のstateが含まれていない（=空である）ことを検証する。
    // [Hint] GetMerkleRoot componentを利用する。空のstateのleaf値は0。
    component before_deposit_root = 
    // [TODO]

    // 2. depositのhash値を求め、入力されたdeposit_hashの値と等しいことを確認する。。
    // [Hint] Sha256 componentを利用する。入力値はbit値で入力する必要があるため、Num2Bits componentで変換する。
    component depositHasher = // [TODO]
    component idBits = // [TODO]
    component amountBits = // [TODO]
    component pubkey0Bits = // [TODO]
    component pubkey1Bits = // [TODO]
    // [TODO]
    // depositHasherにidBits、amountBits、pubkey0Bits、pubkey1Bitsを入力する。ただし、Num2Bitsはlittle endianのビット列を出力するので、反転して入力する。
    // [TODO]
    // depositHasherの出力を、depositHashFormer、depositHashFormerで整数値に変換してdeposit_hash_former、deposit_hash_latterと等しいか確認する。ただし、Bits2Numはlittle endianのビット列を想定しているので、反転して入力する。
    component depositHashFormer = // [TODO]
    component depositHashLatter = // [TODO]
    // [TODO]

    // 3. senderの電子署名(signature)を検証する。ただし、署名対象のメッセージはMultiMiMC7(tx_hash_former, tx_hash_latter)。
    // メッセージの計算
    component msg = // [TODO]
    // [TODO]
    // 署名を検証する。
    // [Hint] EdDSAMiMCVerifier componentを利用する。Ax, Ayはそれぞれsender_pubkeyの0番目、1番目の要素を表す。（具体的には、楕円曲線上の点のx座標、y座標を表す。）
    // Mは署名対象のメッセージを表す。
    component signatureCheck = // [TODO]
    // [TODO]

    // 4. 追加するstateのhash値を求める。公開鍵、残高はdeposit infoと同じ。
    // [Hint] MultiMiMC7 componentを利用する。ここで求めたhash値が、次のステップでmerkle treeに追加される。
    component newStateLeaf = // [TODO]
    // [TODO]

    // 5. stateを追加した時の、新しいmerkle treeのrootを求める。
    // [Hint] GetMerkleRootを使う。root値を求めるためにはpaths2_rootやpaths2_root_posの値が必要だが、1とは異なり入力値には直接含まれていない。
    // 更新するleafの位置や他のleafの値は変わらないことに着目する。
    component compute_out_root = // [TODO]
    // [TODO]

    // 6. 出力値のnew_accounts_rootに、5で計算したroot値を代入する。(同時に、それらの値が等しいというconstraintを作る。)ただし、is_enable==0の場合は、new_accounts_rootの値を変えてはいけない。
    // [TODO]
}
