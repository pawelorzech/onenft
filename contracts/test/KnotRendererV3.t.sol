// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Test} from "forge-std/Test.sol";
import {KnotRendererV3} from "../src/KnotRendererV3.sol";
import {Strings} from "@openzeppelin/contracts/utils/Strings.sol";

contract KnotRendererV3Test is Test {
    using Strings for uint256;

    KnotRendererV3 r;

    function setUp() public {
        r = new KnotRendererV3();
    }

    function parseUint(string memory s) internal pure returns (uint256 n) {
        bytes memory b = bytes(s);
        for (uint256 i = 0; i < b.length; i++) n = n * 10 + (uint8(b[i]) - 48);
    }

    /// Fixtures from `bun run contracts/fixtures.ts`. TypeScript is the source of truth.
    /// Read one fixture at a time: decoding all sixty at once blows the EVM memory limit.
    function test_SvgMatchesTypeScriptByteForByte() public view {
        string memory json = vm.readFile("test/fixtures/knots_v3.json");
        uint256 count = 0;
        while (vm.keyExistsJson(json, string.concat("$[", count.toString(), "].epoch"))) count++;
        assertGt(count, 40);
        for (uint256 i = 0; i < count; i++) {
            string memory k = string.concat("$[", i.toString(), "]");
            uint256 epoch = parseUint(vm.parseJsonString(json, string.concat(k, ".epoch")));
            assertEq(keccak256(bytes(r.svg(epoch))), keccak256(bytes(vm.parseJsonString(json, string.concat(k, ".svg")))), k);
            assertEq(r.paletteName(epoch), vm.parseJsonString(json, string.concat(k, ".palette")), k);
            (KnotRendererV3.Traits memory t,,) = r.cells(epoch);
            assertEq(t.grid, vm.parseJsonUint(json, string.concat(k, ".traits.grid")), "grid");
            assertEq(r.weaveName(t.weave), vm.parseJsonString(json, string.concat(k, ".traits.weave")), "weave");
            assertEq(r.symmetryName(t.symmetry), vm.parseJsonString(json, string.concat(k, ".traits.symmetry")), "symmetry");
            assertEq(r.weightName(t.weight), vm.parseJsonString(json, string.concat(k, ".traits.weight")), "weight");
            assertEq(t.caps == 0 ? "butt" : "round", vm.parseJsonString(json, string.concat(k, ".traits.caps")), "caps");
            assertEq(r.accentName(t.accent), vm.parseJsonString(json, string.concat(k, ".traits.accent")), "accent");
        }
    }

    function test_TokenUriIsBase64JsonWithTraits() public view {
        string memory uri = r.tokenURI(2, 20702);
        assertGt(bytes(uri).length, 5000);
        bytes memory prefix = bytes("data:application/json;base64,");
        for (uint256 i = 0; i < prefix.length; i++) assertEq(bytes(uri)[i], prefix[i]);
    }

    function testFuzz_StatesAndMarksAreWellFormed(uint64 epoch) public view {
        (KnotRendererV3.Traits memory t, uint8[] memory st, bool[] memory marks) = r.cells(epoch);
        assertLt(t.palette, 16);
        assertEq(st.length, t.grid * t.grid);
        assertEq(marks.length, st.length);
        for (uint256 i = 0; i < st.length; i++) {
            assertLt(st[i], 6);
            if (t.accent < 0) assertEq(marks[i], false);
            if (t.weave == 0) assertLt(st[i], 2);
            if (t.weave == 1) assertLt(st[i], 4);
        }
        // The SVG never fails to build for any day.
        assertGt(bytes(r.svg(epoch)).length, 200);
    }
}
