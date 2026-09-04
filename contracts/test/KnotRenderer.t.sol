// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Test} from "forge-std/Test.sol";
import {KnotRenderer} from "../src/KnotRenderer.sol";

contract KnotRendererTest is Test {
    KnotRenderer r;

    struct Fixture {
        string epoch;
        string palette;
        string svg;
    }

    function setUp() public {
        r = new KnotRenderer();
    }

    function parseUint(string memory s) internal pure returns (uint256 n) {
        bytes memory b = bytes(s);
        for (uint256 i = 0; i < b.length; i++) n = n * 10 + (uint8(b[i]) - 48);
    }

    /// Wzorce z `bun run contracts/fixtures.ts` — TS jest źródłem prawdy.
    function test_SvgMatchesTypeScriptByteForByte() public view {
        string memory json = vm.readFile("test/fixtures/knots.json");
        bytes memory raw = vm.parseJson(json);
        Fixture[] memory fx = abi.decode(raw, (Fixture[]));
        assertGt(fx.length, 5);
        for (uint256 i = 0; i < fx.length; i++) {
            uint256 epoch = parseUint(fx[i].epoch);
            assertEq(keccak256(bytes(r.svg(epoch))), keccak256(bytes(fx[i].svg)), fx[i].epoch);
            assertEq(r.paletteName(epoch), fx[i].palette, fx[i].epoch);
        }
    }

    function test_TokenUriIsBase64Json() public view {
        string memory uri = r.tokenURI(1, 1178);
        assertEq(bytes(uri).length > 5000, true);
        bytes memory prefix = bytes("data:application/json;base64,");
        for (uint256 i = 0; i < prefix.length; i++) assertEq(bytes(uri)[i], prefix[i]);
    }

    function testFuzz_AllCellStatesAreTwoBits(uint64 epoch) public view {
        (uint256 pi, uint8[64] memory st) = r.cells(epoch);
        assertLt(pi, 8);
        for (uint256 i = 0; i < 64; i++) assertLt(st[i], 4);
    }
}
