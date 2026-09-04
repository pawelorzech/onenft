// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Base64} from "@openzeppelin/contracts/utils/Base64.sol";
import {Strings} from "@openzeppelin/contracts/utils/Strings.sol";
import {IKnotRenderer} from "./IKnotRenderer.sol";

/// @title KnotRenderer
/// @notice Przepisanie 1:1 `src/knot.ts`. Ten sam strumień splitmix64, ta sama
/// siatka 8×8, ten sam string SVG — test zgodności porównuje keccak z wzorcami
/// wygenerowanymi przez TS. Zmiana czegokolwiek tutaj bez zmiany w TS to błąd.
contract KnotRenderer is IKnotRenderer {
    using Strings for uint256;

    uint256 internal constant GRID = 8;
    uint256 internal constant CELL = 64;
    uint256 internal constant HALF = 32;
    uint256 internal constant SIZE = 512;

    struct Palette {
        string name;
        string bg;
        string cord;
        string shade;
    }

    function palettes(uint256 i) internal pure returns (Palette memory) {
        if (i == 0) return Palette(unicode"atrament", "#12131a", "#e8e4d9", "#5b6478");
        if (i == 1) return Palette(unicode"miedź", "#1a1210", "#e0a060", "#7a4426");
        if (i == 2) return Palette(unicode"mech", "#101a14", "#9fd8a8", "#2f5c3f");
        if (i == 3) return Palette(unicode"popiół", "#e8e6e1", "#22242c", "#9a9891");
        if (i == 4) return Palette(unicode"ultramaryna", "#0e1430", "#d8dcf0", "#3a4a8c");
        if (i == 5) return Palette(unicode"rdza", "#f0e8dc", "#8c3a20", "#c8a882");
        if (i == 6) return Palette(unicode"sól", "#f4f4f2", "#3a4450", "#b8bcc4");
        return Palette(unicode"smoła", "#08080a", "#c8c4bc", "#3a3a40");
    }

    /// @dev splitmix64: jeden krok. W uint64 z zawijaniem, jak `nextRandom` w TS.
    function mix(uint64 x) internal pure returns (uint64) {
        unchecked {
            x += 0x9e3779b97f4a7c15;
            x = (x ^ (x >> 30)) * 0xbf58476d1ce4e5b9;
            x = (x ^ (x >> 27)) * 0x94d049bb133111eb;
            return x ^ (x >> 31);
        }
    }

    /// @dev Pobiera `bits` górnych bitów z kolejnego elementu strumienia.
    function draw(uint64 counter, uint256 bits) internal pure returns (uint64 next, uint256 value) {
        unchecked {
            next = counter + 1;
        }
        uint64 m = mix(next);
        value = uint256(m >> (64 - bits)) & ((1 << bits) - 1);
    }

    /// @notice Indeks palety i 64 stany komórek dla epoki.
    function cells(uint256 epoch) public pure returns (uint256 paletteIdx, uint8[64] memory states) {
        uint64 counter = mix(uint64(epoch));
        uint256 v;
        (counter, v) = draw(counter, 8);
        paletteIdx = v % 8;
        for (uint256 i = 0; i < 64; i++) {
            (counter, v) = draw(counter, 2);
            states[i] = uint8(v);
        }
    }

    function cellPath(uint8 state, uint256 x, uint256 y) internal pure returns (string memory) {
        string memory xs = x.toString();
        string memory ys = y.toString();
        string memory xh = (x + HALF).toString();
        string memory yh = (y + HALF).toString();
        string memory xs2 = (x + CELL).toString();
        string memory ys2 = (y + CELL).toString();
        if (state == 0) {
            return string.concat("M", xs, " ", yh, "A32 32 0 0 1 ", xh, " ", ys, "M", xh, " ", ys2, "A32 32 0 0 0 ", xs2, " ", yh);
        }
        if (state == 1) {
            return string.concat("M", xh, " ", ys, "A32 32 0 0 1 ", xs2, " ", yh, "M", xs, " ", yh, "A32 32 0 0 0 ", xh, " ", ys2);
        }
        if (state == 2) {
            return string.concat("M", xh, " ", ys, "L", xh, " ", ys2);
        }
        return string.concat("M", xs, " ", yh, "L", xs2, " ", yh);
    }

    function path(uint8[64] memory states) internal pure returns (string memory d) {
        for (uint256 i = 0; i < 64; i++) {
            d = string.concat(d, cellPath(states[i], (i % GRID) * CELL, (i / GRID) * CELL));
        }
    }

    function svg(uint256 epoch) public pure returns (string memory) {
        (uint256 pi, uint8[64] memory states) = cells(epoch);
        Palette memory p = palettes(pi);
        string memory d = path(states);
        return string.concat(
            '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">',
            '<rect width="512" height="512" fill="', p.bg, '"/>',
            '<g fill="none" stroke-linecap="round">',
            '<path d="', d, '" stroke="', p.shade, '" stroke-width="21"/>',
            '<path d="', d, '" stroke="', p.cord, '" stroke-width="9"/>',
            "</g></svg>"
        );
    }

    function paletteName(uint256 epoch) public pure returns (string memory) {
        (uint256 pi,) = cells(epoch);
        return palettes(pi).name;
    }

    function tokenURI(uint256 day, uint256 epoch) external pure returns (string memory) {
        (uint256 pi,) = cells(epoch);
        string memory image = string.concat("data:image/svg+xml;base64,", Base64.encode(bytes(svg(epoch))));
        string memory json = string.concat(
            '{"name":"Doba ', day.toString(),
            unicode'","description":"Jeden splot Truchet na dobę, wyliczony z numeru bloku Base. Doba ',
            day.toString(), ", epoka ", epoch.toString(), unicode". Nieodebrana doba zostaje pusta na zawsze.",
            '","image":"', image,
            '","attributes":[{"trait_type":"Doba","value":', day.toString(),
            '},{"trait_type":"Epoka","value":', epoch.toString(),
            '},{"trait_type":"Paleta","value":"', palettes(pi).name, '"}]}'
        );
        return string.concat("data:application/json;base64,", Base64.encode(bytes(json)));
    }
}
