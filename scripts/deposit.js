const crypto = require("crypto");
const { buildBabyjub, buildMimc7, buildEddsa } = require("circomlibjs");

class Deposit {
    constructor(accountId, amount, pubKey0, pubKey1, babyJub, mimc7, eddsa) {
        this.accountId = accountId;
        this.amount = amount;
        this.pubKey0 = pubKey0;
        this.pubKey1 = pubKey1;
        this.babyJub = babyJub;
        this.mimc7 = mimc7;
        this.eddsa = eddsa;
    }

    hash() {
        let bytesArray = [
            this.accountId & 0x00ff,
            this.amount & 0xff000000,
            this.amount & 0x00ff0000,
            this.amount & 0x0000ff00,
            this.amount & 0x000000ff,
        ];
        bytesArray = bytesArray.concat(this._F2bytesArray(this.pubKey0, 32));
        bytesArray = bytesArray.concat(this._F2bytesArray(this.pubKey1, 32));
        const bytes = Buffer.from(bytesArray);
        const hash = crypto.createHash("sha256")
            .update(bytes);
        return hash;
    }

    getDecomposedHash() {
        const txHash = this.hash().digest("hex");
        const txHashFormer = txHash.slice(0, 32);
        const txHashLatter = txHash.slice(32, 64);
        return [txHashFormer, txHashLatter];
    }

    sign(privKey) {
        const [txHashFormer, txHashLatter] = this.getDecomposedHash();
        const msg = this.mimc7.multiHash(["0x" + txHashFormer, "0x" + txHashLatter], 1);
        return this.eddsa.signMiMC(privKey, msg);
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

    _F2bytesArray(e, numBytes) {
        let bytes = [];
        const F = this.babyJub.F;
        e = BigInt(F.toObject(e));
        const mask = 0xffn;
        for (let i = 0; i < numBytes; i++) {
            bytes.push(Number(e & mask));
            e = e >> 8n;
        }
        console.assert(e == 0n);
        bytes = bytes.reverse();
        return bytes
    }
}
module.exports = Deposit;
