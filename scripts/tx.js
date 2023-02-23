const crypto = require("crypto");
const { buildBabyjub, buildMimc7, buildEddsa } = require("circomlibjs");

class Tx {
    constructor(senderAccountId, receiverAccountId, amount, mimc7, eddsa) {
        this.senderAccountId = senderAccountId;
        this.receiverAccountId = receiverAccountId;
        this.amount = amount;
        this.mimc7 = mimc7;
        this.eddsa = eddsa;
    }

    hash() {
        const bytes = Buffer.from([
            this.senderAccountId & 0x00ff,
            this.receiverAccountId & 0x00ff,
            this.amount & 0xff000000,
            this.amount & 0x00ff0000,
            this.amount & 0x0000ff00,
            this.amount & 0x000000ff,
        ]);
        //const bitArray = this._buffer2bitArray(bytes);
        const hash = crypto.createHash("sha256")
            .update(bytes);
        return hash;
    }

    getDecomposedHash() {
        const txHash = this.hash().digest("hex");
        // console.log("txHash: " + txHash);
        const txHashFormer = txHash.slice(0, 32);
        const txHashLatter = txHash.slice(32, 64);
        return [txHashFormer, txHashLatter];
    }

    sign(privKey) {
        const [txHashFormer, txHashLatter] = this.getDecomposedHash();
        const msg = this.mimc7.multiHash(["0x" + txHashFormer, "0x" + txHashLatter], 1);
        return this.eddsa.signMiMC(privKey, msg);
    }

    toJson(F) {
        return {
            senderAccountId: this.senderAccountId,
            receiverAccountId: this.receiverAccountId,
            amount: this.amount,
        }
    }

    // https://github.com/iden3/circomlib/blob/master/test/sha256.js#L18
    _buffer2bitArray(b) {
        const res = [];
        for (let i = 0; i < b.length; i++) {
            for (let j = 0; j < 8; j++) {
                res.push((b[i] >> (7 - j) & 1));
            }
        }
        return res;
    }
}
module.exports = Tx;
