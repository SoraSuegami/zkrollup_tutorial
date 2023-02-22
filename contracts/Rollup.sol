//SPDX-License-Identifier: UNLICENSED

pragma solidity ^0.8.9;
import "./Verifier.sol";

contract Rollup {
    bytes32 public stateRoot;
    address public operator;
    uint256 public nonce;
    uint256 public maxDeposit;
    uint256 public maxTx;
    uint8 public numAccount;
    mapping(uint256 => address) public addressOfAccountId;
    Deposit[] public nextDeposits;
    Verifier verifier;

    event DepositEvent(
        address indexed _address,
        uint256 indexed _accountId,
        uint256 indexed _amount
    );
    event WithdrawEvent(
        address indexed _address,
        uint256 indexed _accountId,
        uint256 indexed _amount
    );

    struct Deposit {
        uint8 accountId;
        uint32 amount;
        uint256 pubKey0;
        uint256 pubKey1;
    }

    struct Tx {
        uint8 senderAccountId;
        uint8 receiverAccountId;
        uint32 amount;
    }

    constructor(
        bytes32 _initStateRoot,
        uint256 _maxDeposit,
        uint256 _maxTx,
        address _verifier
    ) {
        stateRoot = _initStateRoot;
        operator = msg.sender;
        nonce = 0;
        maxDeposit = _maxDeposit;
        maxTx = _maxTx;
        numAccount = 1;
        verifier = Verifier(_verifier);
    }

    function deposit(uint256 _pubKey0, uint256 _pubKey1) public payable {
        require(nextDeposits.length < maxDeposit);
        Deposit memory newDeposit = Deposit(
            numAccount,
            uint32(msg.value),
            _pubKey0,
            _pubKey1
        );
        addressOfAccountId[numAccount] = msg.sender;
        numAccount += 1;
        nextDeposits.push(newDeposit);
    }

    function process(bytes calldata _inputs, bytes memory proof) public {
        require(msg.sender == operator, "only operator");
        (Tx[] memory txs, bytes32 newStateRoot) = abi.decode(
            _inputs,
            (Tx[], bytes32)
        );
        uint256 depositHash = uint256(_hashAllDeposit());
        uint256 depositHashFormer = depositHash >> 128;
        uint256 depositHashLatter = depositHash & ((1 << 128) - 1);
        uint256 allTxHash = uint256(_hashAllTx(txs));
        uint256 allTxHashFormer = allTxHash >> 128;
        uint256 allTxHashLatter = allTxHash & ((1 << 128) - 1);
        uint256[8] memory publicInputs = [
            uint256(newStateRoot),
            uint256(stateRoot),
            depositHashFormer,
            depositHashLatter,
            allTxHashFormer,
            allTxHashLatter,
            nextDeposits.length - 1,
            txs.length - 1
        ];
        require(verifier.verifyProof(proof, publicInputs), "invalid proof");
        stateRoot = newStateRoot;
        nonce += 1;
        delete nextDeposits;
    }

    function _hashAllDeposit() private view returns (bytes32) {
        uint256 numDeposit = nextDeposits.length;
        bytes memory allDepositBytes;
        for (uint256 i = 0; i < numDeposit; i++) {
            allDepositBytes = bytes.concat(
                allDepositBytes,
                abi.encodePacked(_hashDeposit(nextDeposits[i]))
            );
        }
        for (uint256 i = 0; i < (maxDeposit - numDeposit); i++) {
            allDepositBytes = bytes.concat(
                allDepositBytes,
                abi.encodePacked(bytes32(0))
            );
        }
        return sha256(allDepositBytes);
    }

    function _hashDeposit(Deposit memory _deposit)
        private
        pure
        returns (bytes32)
    {
        bytes memory depositBytes = abi.encodePacked(
            bytes1(_deposit.accountId),
            bytes4(_deposit.amount),
            bytes32(_deposit.pubKey0),
            bytes32(_deposit.pubKey1)
        );
        bytes32 hash = sha256(depositBytes);
        return hash;
    }

    function _hashAllTx(Tx[] memory _txs) private view returns (bytes32) {
        uint256 numTx = _txs.length;
        bytes memory allTxBytes;
        for (uint256 i = 0; i < numTx; i++) {
            allTxBytes = bytes.concat(
                allTxBytes,
                abi.encodePacked(_hashTx(_txs[i]))
            );
        }
        for (uint256 i = 0; i < (maxDeposit - numTx); i++) {
            allTxBytes = bytes.concat(allTxBytes, abi.encodePacked(bytes32(0)));
        }
        return sha256(allTxBytes);
    }

    function _hashTx(Tx memory _tx) private pure returns (bytes32) {
        bytes memory txBytes = abi.encodePacked(
            bytes1(_tx.senderAccountId),
            bytes1(_tx.receiverAccountId),
            bytes4(_tx.amount)
        );
        bytes32 hash = sha256(txBytes);
        return hash;
    }
}
