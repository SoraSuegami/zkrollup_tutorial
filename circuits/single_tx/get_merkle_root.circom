pragma circom 2.0.0;
include "../../node_modules/circomlib/circuits/mimc.circom";

// sはselectorでbit値(=0 or 1)。s==1の場合にのみ、2つの入力値を入れ替えて出力する。
// if(s==0): out[0] = in[0], out[1] = in[1]
// else: out[0] = in[1], out[1] = in[0]
// ただし、circomでは動的に変わる変数の値に基づいて条件分岐することはできない！
template DualMux(){
    signal input in[2];
    signal input s;
    signal output out[2];
    
    s*(s-1) === 0;

    out[0] <== (in[1] - in[0])*s + in[0];
    out[1] <== (in[0] - in[1])*s + in[1];
}

// leaf値とmerkle proofから、merkle rootを計算する。
template GetMerkleRoot(k){
    // k is depth of tree

    signal input leaf; // leaf値
    signal input paths2_root[k]; // 高さi (0<=i<k)ごとの兄弟ノードのハッシュ値
    signal input paths2_root_pos[k]; // 高さi (0<=i<k)ごとの兄弟ノードが右側にある場合は0、左側にある場合は1。

    signal output out; // root値

    component selectors[k];
    component hashers[k];

    for(var i = 0; i < k; i++){
        selectors[i] = DualMux();
        selectors[i].in[0] <== i == 0 ? leaf : /*[TODO]*/;
        selectors[i].in[1] <== /*[TODO]*/;
        selectors[i].s <== /*[TODO]*/;

        hashers[i] = MultiMiMC7(2,91);
        hashers[i].k <== 1;
        hashers[i].in[0] <== /*[TODO]*/;
        hashers[i].in[1] <== /*[TODO]*/;
        // log(i);
        // log(hashers[i].in[0]);
        // log(hashers[i].in[1]);
        // log(hashers[i].out);
    }

    out <== hashers[k-1].out;
}
