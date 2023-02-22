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
        this.numNotEmptyStates = 0;
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

    getNumNotEmptyState() {
        return this.numNotEmptyStates;
    }

    insertState(state) {
        assert(this.states.length < this.size);
        this.states.push(state);
        this.root = this._computeRoot();
        this.numNotEmptyStates++;
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
        return this._getProofFromIndex(index);
    }

    getExclusionProof(accountId) {
        assert(this.getIndexOfAccountId(accountId) == -1);
        return this._getProofFromIndex(accountId)
    }

    _getProofFromIndex(index) {
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
    }


    _computeRoot() {
        this.layers = [];
        let nodes = Array.from(Array(this.size).keys()).map(i => {
            if (i <= this.states.length - 1) {
                return this.states[i].hash();
            }
            else return this.F.e(0);
        });
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
