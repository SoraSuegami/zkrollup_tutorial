pragma circom 2.0.0;
include "./single_tx/circuit.circom";
include "./deposit/circuit.circom";
include "../node_modules/circomlib/circuits/comparators.circom";
include "../node_modules/circomlib/circuits/sha256/sha256.circom";
include "../node_modules/circomlib/circuits/bitify.circom";

template Rollup(state_k, max_deposit_k, max_tx_k, amoutnBitSize, pubkeyBitSize) {
    var max_deposit = 2**max_deposit_k;
    var max_tx = 2**max_tx_k;

    // accounts tree info
    signal input old_accounts_root; // 変更前のmerkle treeのroot値

    // 全てのdeposit_hashを連結したビット列のSHA256ハッシュ。
    signal input all_deposits_hash_former; //前半128 bit
    signal input all_deposits_hash_latter; //後半128 bit
    // 全てのtx_hashを連結したビット列のSHA256ハッシュ。
    signal input all_txs_hash_former; //前半128 bit
    signal input all_txs_hash_latter; //後半128 bit

    // signature array
    signal input signature_R8x_array[max_deposit+max_tx];
    signal input signature_R8y_array[max_deposit+max_tx];
    signal input signature_S_array[max_deposit+max_tx];

    // deposit info array
    signal input deposit_account_id_array[max_deposit];
    signal input deposit_amount_array[max_deposit];
    signal input deposit_pubkey_array[max_deposit][2];
    signal input deposit_hash_former_array[max_deposit]; // 256 bitのdeposit_hashのうち、前半128 bit。
    signal input deposit_hash_latter_array[max_deposit]; // 256 bitのdeposit_hashのうち、後半128 bit。

    // deposit-related state info array
    signal input deposit_proof_array[max_deposit][state_k];
    signal input deposit_proof_pos_array[max_deposit][state_k];

    // dummyではないdepositのうち、最後にあるもののindex。つまり、最初からlast_deposit_index+1個のtxがdummyではない。
    signal input last_deposit_index; 

    // transactions info array
    signal input sender_account_id_array[max_tx];
    signal input receiver_account_id_array[max_tx];
    signal input amount_array[max_tx];
    signal input tx_hash_former_array[max_tx];
    signal input tx_hash_latter_array[max_tx];

    // transactions-related state info array
    signal input sender_pubkey_array[max_tx][2];
    signal input sender_balance_array[max_tx];
    signal input receiver_pubkey_array[max_tx][2];
    signal input receiver_balance_array[max_tx];
    signal input sender_proof_array[max_tx][state_k];
    signal input sender_proof_pos_array[max_tx][state_k];
    signal input receiver_proof_array[max_tx][state_k];
    signal input receiver_proof_pos_array[max_tx][state_k];

    // dummyではないtxのうち、最後にあるもののindex。つまり、最初からlast_tx_index+1個のtxがdummyではない。
    signal input last_tx_index; 
    
    signal output new_accounts_root; // 新しいsenderのstateとreceiverのstateを追加したときの、merkle treeのroot値。

    component is_deposit_enable_array[max_deposit]; // 各depositを処理する際のenableフラグの配列。
    component deposit_processers[max_deposit];  // ProcessDepositの配列。
    component is_tx_enable_array[max_tx]; // 各txを処理する際のenableフラグの配列。
    component tx_processers[max_tx]; // ProcessTxの配列。
    signal intermediate_root_array[/* [TODO]*/]; // 途中のmerkle treeのroot値の配列。i個のtxを処理した後のroot値がi+1番目の要素になる。

    // Process deposits
     // 1. last_deposit_indexの値からis_deposit_enable_arrayを求める。
    // [Hint] LessEqThanを使う。
    for(var i = 0; i < max_deposit; i++) {
        is_deposit_enable_array[i] = LessEqThan(max_deposit_k);
        is_deposit_enable_array[i].in[0] <== i;
        is_deposit_enable_array[i].in[1] <== last_deposit_index;
    }
    
    // 2. deposit_hash_former_array, deposit_hash_latter_arrayの連結ビット列からSHA256ハッシュを求め、all_deposits_hashと一致することを確認する。ただし、dummyのdepositに関しては、0が256個連続したbit列を使用する。
    component allDepositHasher = Sha256(256 * max_deposit);
    // Num2Bits.Bits2Numはlittle endianのビット列を想定しているので、反転する必要があることに注意。
    // deposit_hash_former_array、deposit_hash_latter_arrayの各要素をビット列に変換し、それらを順にallDepositHasherの入力に入れる。
    component depositHashFormers[max_deposit];
    component depositHashLatters[max_deposit];
    for(var i=0;i<max_deposit;i++) {
        depositHashFormers[i] = Num2Bits(128);
        depositHashLatters[i] = Num2Bits(128);
        depositHashFormers[i].in <== deposit_hash_former_array[i];
        depositHashLatters[i].in <== deposit_hash_latter_array[i];
        for(var j=0;j<128;j++) {
            allDepositHasher.in[256*i+j] <== depositHashFormers[i].out[127-j];
            allDepositHasher.in[256*i+128+j] <== depositHashLatters[i].out[127-j];
        }
    }
    // allDepositHasherの出力のうち、前半128bitをallDepositHashFormer、後半128bitをallDepositHashLatterで整数に変換し、それぞれall_deposits_hash_former、all_deposits_hash_latterと等しいことを確かめる。
    component allDepositHashFormer = Bits2Num(128);
    component allDepositHashLatter = Bits2Num(128);
    for(var i=0;i<128;i++) {
        // [TODO]
    }
    // [TODO]

    // 3. ProcessDepositでそれぞれのdepositのintermediate_rootを求める。
    // [Hint] old_accounts_rootにはintermediate_root_arrayの適切な要素を入れる。では、intermediate_root_arrayの初期値は？
    intermediate_root_array[0] <== old_accounts_root;
    for(var i = 0; i < max_deposit; i++) {
        deposit_processers[i] = ProcessDeposit(state_k,state_k,amoutnBitSize,pubkeyBitSize);
        deposit_processers[i].old_accounts_root <== intermediate_root_array[i];

        deposit_processers[i].account_id <== deposit_account_id_array[i];
        deposit_processers[i].amount <== deposit_amount_array[i];
        for(var j=0; j<2; j++) {
            deposit_processers[i].pubkey[j] <== deposit_pubkey_array[i][j];
        }
        deposit_processers[i].deposit_hash_former <== deposit_hash_former_array[i];
        deposit_processers[i].deposit_hash_latter <== deposit_hash_latter_array[i];
        deposit_processers[i].signature_R8x <== signature_R8x_array[i];
        deposit_processers[i].signature_R8y <== signature_R8y_array[i];
        deposit_processers[i].signature_S <== signature_S_array[i];

        for(var j=0; j<state_k; j++) {
            deposit_processers[i].proof[j] <== deposit_proof_array[i][j];
            deposit_processers[i].proof_pos[j] <== deposit_proof_pos_array[i][j];
        }
        deposit_processers[i].is_enable <== is_deposit_enable_array[i].out;
        intermediate_root_array[i+1] <== deposit_processers[i].new_accounts_root;
    }


    // Process txs
    // 1. last_tx_indexの値からis_tx_enable_arrayを求める。
    // [Hint] LessEqThanを使う。
    for(var i = 0; i < max_tx; i++) {
        is_tx_enable_array[i] = LessEqThan(max_tx_k);
        is_tx_enable_array[i].in[0] <== i;
        is_tx_enable_array[i].in[1] <== last_tx_index;
    }

    // 2. tx_hash_former_array, tx_hash_latter_arrayの連結ビット列からSHA256ハッシュを求め、all_txs_hashと一致することを確認する。ただし、dummyのtxに関しては、0が256個連続したbit列を使用する。
    component allTxHasher = Sha256(256 * max_tx);
    // Num2Bits.Bits2Numはlittle endianのビット列を想定しているので、反転する必要があることに注意。
    // tx_hash_former_array、tx_hash_latter_arrayの各要素をビット列に変換し、それらを順にallTxHasherの入力に入れる。
    component txHashFormers[max_tx];
    component txHashLatters[max_tx];
    for(var i=0;i<max_tx;i++) {
        txHashFormers[i] = Num2Bits(128);
        txHashLatters[i] = Num2Bits(128);
        txHashFormers[i].in <== tx_hash_former_array[i];
        txHashLatters[i].in <== tx_hash_latter_array[i];
        for(var j=0;j<128;j++) {
            allTxHasher.in[256*i+j] <== txHashFormers[i].out[127-j];
            allTxHasher.in[256*i+128+j] <== txHashLatters[i].out[127-j];
        }
    }
    // allTxHasherの出力のうち、前半128bitをallTxHashFormer、後半128bitをallTxHashLatterで整数に変換し、それぞれall_txs_hash_former、all_txs_hash_latterと等しいことを確かめる。
    component allTxHashFormer = Bits2Num(128);
    component allTxHashLatter = Bits2Num(128);
    for(var i=0;i<128;i++) {
        allTxHashFormer.in[i] <== allTxHasher.out[127-i];
        allTxHashLatter.in[i] <== allTxHasher.out[128+127-i];
    }
    allTxHashFormer.out === all_txs_hash_former;
    allTxHashLatter.out === all_txs_hash_latter;

    // 3. ProcessTxでそれぞれのtxのintermediate_rootを求める。
    // [Hint] old_accounts_rootにはintermediate_root_arrayの適切な要素を入れる。では、intermediate_root_arrayの初期値は？
    for(var i = 0; i < max_tx; i++) {
        tx_processers[i] = ProcessTx(state_k,state_k,amoutnBitSize);
        tx_processers[i].old_accounts_root <== // [TODO]

        tx_processers[i].sender_account_id <== sender_account_id_array[i];
        tx_processers[i].receiver_account_id <== receiver_account_id_array[i];
        tx_processers[i].amount <== amount_array[i];
        tx_processers[i].tx_hash_former <== tx_hash_former_array[i];
        tx_processers[i].tx_hash_latter <== tx_hash_latter_array[i];
        tx_processers[i].signature_R8x <== signature_R8x_array[max_deposit+i];
        tx_processers[i].signature_R8y <== signature_R8y_array[max_deposit+i];
        tx_processers[i].signature_S <== signature_S_array[max_deposit+i];

        tx_processers[i].sender_balance <== sender_balance_array[i];
        tx_processers[i].receiver_balance <== receiver_balance_array[i];
        for(var j=0; j<2; j++) {
            tx_processers[i].sender_pubkey[j] <== sender_pubkey_array[i][j];
            tx_processers[i].receiver_pubkey[j] <== receiver_pubkey_array[i][j];
        }
        
        for(var j=0; j<state_k; j++) {
            tx_processers[i].sender_proof[j] <== sender_proof_array[i][j];
            tx_processers[i].sender_proof_pos[j] <== sender_proof_pos_array[i][j];
            tx_processers[i].receiver_proof[j] <== receiver_proof_array[i][j];
            tx_processers[i].receiver_proof_pos[j] <== receiver_proof_pos_array[i][j];
        }
        tx_processers[i].is_enable <== is_tx_enable_array[i].out;
        intermediate_root_array[max_deposit+i+1] <== tx_processers[i].new_accounts_root;
    }

    // 4. new_accounts_rootに最後に計算されたmerkle treeのroot値を代入する。
    new_accounts_root <== // [TODO]
}

component main {public [old_accounts_root, all_deposits_hash_former, all_deposits_hash_latter, last_deposit_index, all_txs_hash_former, all_txs_hash_latter, last_tx_index]} = Rollup(8,5,5,32,256);
