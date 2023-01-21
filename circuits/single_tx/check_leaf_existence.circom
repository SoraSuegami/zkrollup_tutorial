pragma circom 2.0.0;
include "./get_merkle_root.circom";
include "../../node_modules/circomlib/circuits/mimc.circom";

// l個の要素からleaf値を求め、それが深さkのmerkle treeに含まれることを検証する。
template LeafExistence(k,l){
    // k is depth of the tree, l is length preimage of leaf

    signal input preimage[l]; // leaf値を求めるための、l個の要素。
    signal input root; // merkle treeのroot値
    signal input paths2_root_pos[k]; // 高さi (0<=i<k)ごとの兄弟ノードが右側にある場合は0、左側にある場合は1。
    signal input paths2_root[k]; // 高さi (0<=i<k)ごとの兄弟ノードのハッシュ値
    signal input is_enable; // enableフラグ

    // 1. l個の要素からleaf値を求める。
    // [Hint] MultiMiMC7 componentを利用する。
    component leaf = MultiMiMC7(l,91);
    leaf.k <== 1;
    for(var i = 0; i < l; i++){
        leaf.in[i] <== preimage[i];
    }

    // 2. 1のleaf値(hash値)とpaths2_root_pos、paths2_rootから、merkle treeのroot値を求める。
    // [Hint] GetMerkleRoot componentを利用する。
    component computed_root = GetMerkleRoot(k);
    computed_root.leaf <== leaf.out;

    for (var w = 0; w < k; w++){
        computed_root.paths2_root[w] <== paths2_root[w];
        computed_root.paths2_root_pos[w] <== paths2_root_pos[w];
    }
    // log("root");
    // log(root);

    // 3. 2で求めたroot値と、入力値のrootが等しいことを検証する。
    is_enable * (root - computed_root.out) === 0;
}
