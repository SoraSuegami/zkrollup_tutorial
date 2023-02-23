class State {
    constructor(accountId, pubKey0, pubKey1, balance, mimc7) {
        this.accountId = accountId;
        this.pubKey0 = pubKey0;
        this.pubKey1 = pubKey1;
        this.balance = balance;
        this.mimc7 = mimc7
    }


    hash() {
        return this.mimc7.multiHash([this.accountId, this.pubKey0, this.pubKey1, this.balance], 1);
    }

    toJson(F) {
        return {
            accountId: this.accountId,
            pubKey0: F.toObject(this.pubKey0).toString(16),
            pubKey1: F.toObject(this.pubKey1).toString(16),
            balance: this.balance
        }
    }
}

module.exports = State;
