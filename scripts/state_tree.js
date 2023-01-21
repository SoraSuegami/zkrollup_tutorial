//const { MerkleTree } = require("merkletreejs");
const assert = require("assert");

class StateTree {
    constructor(k, F, mimc7) {
        this.k = k;
        this.size = 1 << k;
        this.F = F;
        this.mimc7 = mimc7;
        this.states = [];
        this.layers = [];
        this.root = this._computeRoot();
    }

    getRoot() {
        return this.root;
    }

    getIndexOfAccountId(accountId) {
        return this.states.findIndex(state => state.accountId == accountId);
    }

    getState(accountId) {
        const index = this.getIndexOfAccountId(accountId);
        assert(index != -1);
        return this.states[index];
    }

    insertState(state) {
        assert(this.states.length < this.size);
        this.states.push(state);
        this.root = this._computeRoot();
        // const index = this.states.length - 1;
        // const leaves = this.tree.getLeaves();
        // leaves[index] = state.hash();
        // this.tree = new MerkleTree(leaves, this.hash_fn);
    }

    updateState(state) {
        const index = this.getIndexOfAccountId(state.accountId);
        assert(index != -1);
        this.states[index] = state;
        this.root = this._computeRoot();
        // const leaves = this.tree.getLeaves();
        // leaves[index] = state.hash();
        // this.tree = new MerkleTree(leaves, this.hash_fn);
    }

    getProof(accountId) {
        const index = this.getIndexOfAccountId(accountId);
        assert(index != -1);
        const proofs = {
            data: [],
            positions: []
        };
        let curPos = index;

        for (let i = 0; i < this.k; i++) {
            proofs.positions.push(curPos % 2);
            let sibling = (curPos % 2 == 1) ? this.layers[i][curPos - 1] : this.layers[i][curPos + 1];
            proofs.data.push(BigInt(this.F.toObject(sibling)).toString());
            // console.log("i: " + i + " curPos: " + curPos);
            // console.log("layer size " + this.layers[i].length);
            // console.log(BigInt(this.F.toObject(this.layers[i][curPos])).toString());
            // console.log(BigInt(this.F.toObject(sibling)).toString());
            // console.log(BigInt(this.F.toObject(this.layers[i + 1][curPos])).toString());
            curPos = curPos / 2 | 0;

        }
        assert(this.layers[this.k][0], this.root);
        return proofs;
        // //const leaf = BigInt(this.F.toObject(this.tree.getLeaf(index)));
        // const leaf = this.tree.getLeaf(index);
        // console.log(leaf);
        // // console.log("index: " + index);
        // // console.log("state: ");
        // // console.log(this.states[index].pubKey0);
        // // console.log(BigInt(this.F.toObject(this.states[index].pubKey0)).toString(16));
        // const proof = this.tree.getProof(leaf, index);
        // console.log(proof[0].data);
        // return proof.map(p => {
        //     p.position = p.position == "left" ? 1 : 0;
        //     return p;
        // });


    }

    // verifyProof(accountId, proof, root) {
    //     const index = this.getIndexOfAccountId(accountId);
    //     assert(index != -1);
    //     const leaf = this.tree.getLeaf(index);
    //     return this.tree.verify(proof, leaf, root);
    // }

    _computeRoot() {
        this.layers = [];
        let nodes = Array.from(Array(this.size).keys()).map(i => this.states[i] == null ? 0 : this.states[i].hash());
        this.layers.push(nodes);
        for (let i = 0; i < this.k; i++) {
            const newNodes = [];
            for (let j = 0; j < nodes.length / 2; j++) {
                newNodes.push(this.mimc7.multiHash([nodes[2 * j], nodes[2 * j + 1]], 1));
            }
            nodes = newNodes;
            this.layers.push(nodes);
        }
        assert(nodes.length == 1);
        assert(this.layers.length == this.k + 1);
        return nodes[0];
    }

}

module.exports = StateTree;
