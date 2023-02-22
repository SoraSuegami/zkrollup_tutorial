// SPDX-License-Identifier: MIT

pragma solidity ^0.8.9;

library Pairing {
    uint256 constant PRIME_Q =
        21888242871839275222246405745257275088696311157297823662689037894645226208583;

    struct G1Point {
        uint256 X;
        uint256 Y;
    }

    // Encoding of field elements is: X[0] * z + X[1]
    struct G2Point {
        uint256[2] X;
        uint256[2] Y;
    }

    /*
     * @return The negation of p, i.e. p.plus(p.negate()) should be zero
     */
    function negate(G1Point memory p) internal pure returns (G1Point memory) {
        // The prime q in the base field F_q for G1
        if (p.X == 0 && p.Y == 0) {
            return G1Point(0, 0);
        } else {
            return G1Point(p.X, PRIME_Q - (p.Y % PRIME_Q));
        }
    }

    /*
     * @return r the sum of two points of G1
     */
    function plus(G1Point memory p1, G1Point memory p2)
        internal
        view
        returns (G1Point memory r)
    {
        uint256[4] memory input = [p1.X, p1.Y, p2.X, p2.Y];
        bool success;

        // solium-disable-next-line security/no-inline-assembly
        assembly {
            success := staticcall(sub(gas(), 2000), 6, input, 0xc0, r, 0x60)
            // Use "invalid" to make gas estimation work
            switch success
            case 0 {
                invalid()
            }
        }

        require(success, "pairing-add-failed");
    }

    /*
     * @return r the product of a point on G1 and a scalar, i.e.
     *         p == p.scalarMul(1) and p.plus(p) == p.scalarMul(2) for all
     *         points p.
     */
    function scalarMul(G1Point memory p, uint256 s)
        internal
        view
        returns (G1Point memory r)
    {
        uint256[3] memory input = [p.X, p.Y, s];
        bool success;

        // solium-disable-next-line security/no-inline-assembly
        assembly {
            success := staticcall(sub(gas(), 2000), 7, input, 0x80, r, 0x60)
            // Use "invalid" to make gas estimation work
            switch success
            case 0 {
                invalid()
            }
        }

        require(success, "pairing-mul-failed");
    }

    /* @return The result of computing the pairing check
     *         e(p1[0], p2[0]) *  .... * e(p1[n], p2[n]) == 1
     *         For example,
     *         pairing([P1(), P1().negate()], [P2(), P2()]) should return true.
     */
    function pairing(
        G1Point memory a1,
        G2Point memory a2,
        G1Point memory b1,
        G2Point memory b2,
        G1Point memory c1,
        G2Point memory c2,
        G1Point memory d1,
        G2Point memory d2
    ) internal view returns (bool) {
        uint256[24] memory input = [
            a1.X,
            a1.Y,
            a2.X[0],
            a2.X[1],
            a2.Y[0],
            a2.Y[1],
            b1.X,
            b1.Y,
            b2.X[0],
            b2.X[1],
            b2.Y[0],
            b2.Y[1],
            c1.X,
            c1.Y,
            c2.X[0],
            c2.X[1],
            c2.Y[0],
            c2.Y[1],
            d1.X,
            d1.Y,
            d2.X[0],
            d2.X[1],
            d2.Y[0],
            d2.Y[1]
        ];
        uint256[1] memory out;
        bool success;

        // solium-disable-next-line security/no-inline-assembly
        assembly {
            success := staticcall(
                sub(gas(), 2000),
                8,
                input,
                mul(24, 0x20),
                out,
                0x20
            )
            // Use "invalid" to make gas estimation work
            switch success
            case 0 {
                invalid()
            }
        }

        require(success, "pairing-opcode-failed");
        return out[0] != 0;
    }
}

contract Verifier {
    uint256 constant SNARK_SCALAR_FIELD =
        21888242871839275222246405745257275088548364400416034343698204186575808495617;
    uint256 constant PRIME_Q =
        21888242871839275222246405745257275088696311157297823662689037894645226208583;
    using Pairing for *;

    struct VerifyingKey {
        Pairing.G1Point alfa1;
        Pairing.G2Point beta2;
        Pairing.G2Point gamma2;
        Pairing.G2Point delta2;
        Pairing.G1Point[9] IC;
    }

    function verifyingKey() internal pure returns (VerifyingKey memory vk) {
        vk.alfa1 = Pairing.G1Point(
            uint256(
                163805666561114323215227790525354282548608259171045072268385895914687774415
            ),
            uint256(
                19798469805500421614720760589890102258607963919583712946209228342352757354416
            )
        );
        vk.beta2 = Pairing.G2Point(
            [
                uint256(
                    20830127643980185505806411355077673148713948641264407335368894660609267359591
                ),
                uint256(
                    20853340600548113100559988367691191233075606178803110466766199981115244855802
                )
            ],
            [
                uint256(
                    20397756244205061419308063233219571962655953049829328577295318858755051265428
                ),
                uint256(
                    20093667137796097950420973309528156000405503118368988936344471785835324953826
                )
            ]
        );
        vk.gamma2 = Pairing.G2Point(
            [
                uint256(
                    341582118912154679755793320712000239240325619978902188430993207230938220631
                ),
                uint256(
                    8394412672696352413591238157341109570625022105737054417697709066372847241297
                )
            ],
            [
                uint256(
                    10158044101406811332516471352079504957613673110443347354447660203916702712986
                ),
                uint256(
                    2103799499616068835795438244717965714944475661964614307702977490534989513213
                )
            ]
        );
        vk.delta2 = Pairing.G2Point(
            [
                uint256(
                    14674941533713521419191018795205086108029712473681821488463210281382030466865
                ),
                uint256(
                    16699370519904876314352090142399174929520500946845478181247090178359991402672
                )
            ],
            [
                uint256(
                    16168440506537402087132167490193960025885788226112103731710597038564189843862
                ),
                uint256(
                    3693132340173789610659955787155610602698037319579289125186351023601282938361
                )
            ]
        );
        vk.IC[0] = Pairing.G1Point(
            uint256(
                18496353050534563231111463565173915900275119270057489075489794714110582499109
            ),
            uint256(
                18886354016999278863600108327159454232713215218061462142375371487284953582550
            )
        );
        vk.IC[1] = Pairing.G1Point(
            uint256(
                18073068970518404087250125912753544930716374623456111661133390650454977270525
            ),
            uint256(
                3829392070863306224445103307209772244444857081226777488508552552097221076760
            )
        );
        vk.IC[2] = Pairing.G1Point(
            uint256(
                18721431515673441217115243854232087850206502682204318233295605944196317843843
            ),
            uint256(
                12362186098795403570395226081326856298266994775633557121309379656890370595530
            )
        );
        vk.IC[3] = Pairing.G1Point(
            uint256(
                1726898613645013188972487659568053410119734931047036219703083112484409286759
            ),
            uint256(
                10613195631764310883893689895789201501525285558419186339580087644933814780831
            )
        );
        vk.IC[4] = Pairing.G1Point(
            uint256(
                19041925545258466946765977404644312987510746117573180995583694825573094097845
            ),
            uint256(
                16122476222676879834494624916985984843876815073368169000669197340361864728219
            )
        );
        vk.IC[5] = Pairing.G1Point(
            uint256(
                12866880391255922336678064463551700609933045377493017339771186259927087123930
            ),
            uint256(
                11064461192508935670610689199920220628278556715089983672041418042826286713295
            )
        );
        vk.IC[6] = Pairing.G1Point(
            uint256(
                15690778306811503959522227722955838002610525038332935371298049178870378474482
            ),
            uint256(
                12516943450975752290700630974431987947565561151749520981169834398665910346549
            )
        );
        vk.IC[7] = Pairing.G1Point(
            uint256(
                19923331422808764544171190437691170588273680210798466511009702797920879244298
            ),
            uint256(
                13135899593945355175852486845279171930548449918885326305838222773082489213335
            )
        );
        vk.IC[8] = Pairing.G1Point(
            uint256(
                1082085649344778267059691632930999289877096324372737146288864279777225624578
            ),
            uint256(
                3964856230154227736169230348303954741795130106280772865597097507673478157892
            )
        );
    }

    /*
     * @returns Whether the proof is valid given the hardcoded verifying key
     *          above and the public inputs
     */
    function verifyProof(bytes memory proof, uint256[8] memory input)
        public
        view
        returns (bool)
    {
        uint256[8] memory p = abi.decode(proof, (uint256[8]));
        for (uint8 i = 0; i < p.length; i++) {
            // Make sure that each element in the proof is less than the prime q
            require(p[i] < PRIME_Q, "verifier-proof-element-gte-prime-q");
        }
        Pairing.G1Point memory proofA = Pairing.G1Point(p[0], p[1]);
        Pairing.G2Point memory proofB = Pairing.G2Point(
            [p[2], p[3]],
            [p[4], p[5]]
        );
        Pairing.G1Point memory proofC = Pairing.G1Point(p[6], p[7]);

        VerifyingKey memory vk = verifyingKey();
        // Compute the linear combination vkX
        Pairing.G1Point memory vkX = vk.IC[0];
        for (uint256 i = 0; i < input.length; i++) {
            // Make sure that every input is less than the snark scalar field
            require(
                input[i] < SNARK_SCALAR_FIELD,
                "verifier-input-gte-snark-scalar-field"
            );
            vkX = Pairing.plus(vkX, Pairing.scalarMul(vk.IC[i + 1], input[i]));
        }

        return
            Pairing.pairing(
                Pairing.negate(proofA),
                proofB,
                vk.alfa1,
                vk.beta2,
                vkX,
                vk.gamma2,
                proofC,
                vk.delta2
            );
    }
}
