const { expect } = require("chai");
const { ethers } = require("hardhat");
const { buildBabyjub, buildMimc7, buildEddsa } = require("circomlibjs");
const State = require("../scripts/state.js");
const StateTree = require("../scripts/state_tree.js");

describe("Rollup contract", function () {
    it("Deployment", async function () {
        const [owner, alice, bob] = await ethers.getSigners();
        const provider = ethers.getDefaultProvider();

        const Verifier = await ethers.getContractFactory("Verifier");
        const Rollup = await ethers.getContractFactory("Rollup");

        const babyJub = await buildBabyjub();
        const mimc7 = await buildMimc7();
        const eddsa = await buildEddsa();
        const F = babyJub.F;

        const zeroId = 0;
        const zeroIdPubKey = [F.e(["1"]), F.e("1")];
        const alicePrvKey = Buffer.from("1".toString().padStart(64, "0"), "hex");
        const bobPrvKey = Buffer.from("2".toString().padStart(64, "0"), "hex");
        const alicePubKey = eddsa.prv2pub(alicePrvKey);
        const bobPubKey = eddsa.prv2pub(bobPrvKey);
        const aliceAccountId = 1;
        const bobAccountId = 2;
        const zeroState = new State(zeroId, zeroIdPubKey[0], zeroIdPubKey[1], 0, mimc7);
        const stateTree = new StateTree(8, F, mimc7);
        stateTree.insertState(zeroState);
        const initRoot = "0x" + BigInt(F.toObject(stateTree.getRoot())).toString(16);

        const verifier = await Verifier.deploy();
        await verifier.deployed()
        const rollup = await Rollup.deploy(initRoot, 32, 32, verifier.address);
        console.log("rollup contract address:", rollup.address);

        // deposits
        const aliceDeposit = await rollup.connect(alice).deposit(BigInt(F.toObject(alicePubKey[0])), BigInt(F.toObject(alicePubKey[1])), { from: alice.address, value: 10 });
        await aliceDeposit.wait();
        const bobDeposit = await rollup.connect(bob).deposit(BigInt(F.toObject(bobPubKey[0])), BigInt(F.toObject(bobPubKey[1])), { from: bob.address, value: 5 });
        await bobDeposit.wait();
        expect(await rollup.numAccount()).to.equal(3);
        let aliceState = new State(aliceAccountId, alicePubKey[0], alicePubKey[1], 10, mimc7);
        let bobState = new State(bobAccountId, bobPubKey[0], bobPubKey[1], 5, mimc7);
        stateTree.insertState(aliceState);
        stateTree.insertState(bobState);

        // process txs
        // const tx0 = new Tx(aliceAccountId, bobAccountId, 5, mimc7, eddsa);
        // const tx1 = new Tx(bobAccountId, aliceAccountId, 2, mimc7, eddsa);
        aliceState = new State(aliceAccountId, alicePubKey[0], alicePubKey[1], 10 - 5 + 2, mimc7);
        bobState = new State(bobAccountId, bobPubKey[0], bobPubKey[1], 5 + 5 - 2, mimc7);
        stateTree.updateState(aliceState);
        stateTree.updateState(bobState);
        const finalRoot = "0x" + BigInt(F.toObject(stateTree.getRoot())).toString(16);
        const inputs = ethers.utils.defaultAbiCoder.encode(["tuple(uint8, uint8, uint32)[]", "bytes32"], [[[aliceAccountId, bobAccountId, 5], [bobAccountId, aliceAccountId, 2]], finalRoot]);
        const proof = "0x02c45c217ab05fdbcda9a099f5d84d27833acb24a0051d6dba44ab39ed94321212fecd6d83e69b4c19f18f9d8f42e089d632a281d5a5d708552ef9eb2465e87e05a1f551a9069a4028668f7a9e7ac0630cdb5cd0e2d715d230a04ec9f7eeb52c273be5fd385dfd945d12d38c1f9c38a6b4ed5f8adffe8be2eb3ba49a0af80a0704dd9b424aa3fd0e0772acce7ff1b88064d4dca8352d113bb04c98f3f8db05a427812da498e78820d9f1175e64ee73995209dd09dceaefa6dfc4b88ed6d043d70fc4d097e38c95b08f53604c1ae24b1d7030a033dc5f88fe330e1faee17f8e981ef9dd27372334704d9741e1b0430d8eb6d3bf42d78c1ddd23fa20b407263071";
        const processed = await rollup.process(inputs, proof);
        await processed.wait();
    });
});