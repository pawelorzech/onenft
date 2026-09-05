// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Base64} from "@openzeppelin/contracts/utils/Base64.sol";
import {Strings} from "@openzeppelin/contracts/utils/Strings.sol";
import {IKnotRenderer} from "./IKnotRenderer.sol";

/// @title KnotRendererV3
/// @notice A one-to-one port of `src/knot.ts` (version 3): the same splitmix64
/// stream, the same trait tables, the same SVG string. The equality test compares
/// keccak hashes against fixtures generated from TypeScript. Changing anything
/// here without the same change in TS is a bug.
///
/// Traits drawn from the day number: palette (16), grid (6, 8, 10 or 12), weave
/// (arcs, passes, loose, cross), symmetry (none, mirror, quad, turn), weight
/// (thin, regular, heavy), caps (butt, round) and a rare accent color.
contract KnotRendererV3 is IKnotRenderer {
    using Strings for uint256;

    uint256 internal constant CELL = 64;
    uint256 internal constant HALF = 32;

    struct Palette {
        string name;
        string bg;
        string cord;
        string shade;
    }

    struct Traits {
        uint256 palette;
        uint256 grid;
        uint8 weave; // 0 arcs, 1 passes, 2 loose, 3 cross
        uint8 symmetry; // 0 none, 1 mirror, 2 quad, 3 turn
        uint8 weight; // 0 thin, 1 regular, 2 heavy
        uint8 caps; // 0 butt, 1 round
        int8 accent; // -1 none, else 0..3
    }

    function palettes(uint256 i) internal pure returns (Palette memory) {
        if (i == 0) return Palette("ink", "#12131a", "#e8e4d9", "#5b6478");
        if (i == 1) return Palette("copper", "#1a1210", "#e0a060", "#7a4426");
        if (i == 2) return Palette("moss", "#101a14", "#9fd8a8", "#2f5c3f");
        if (i == 3) return Palette("ash", "#e8e6e1", "#22242c", "#9a9891");
        if (i == 4) return Palette("ultramarine", "#0e1430", "#d8dcf0", "#3a4a8c");
        if (i == 5) return Palette("rust", "#f0e8dc", "#8c3a20", "#c8a882");
        if (i == 6) return Palette("salt", "#f4f4f2", "#3a4450", "#b8bcc4");
        if (i == 7) return Palette("tar", "#08080a", "#c8c4bc", "#3a3a40");
        if (i == 8) return Palette("plum", "#1c1020", "#e6c8f0", "#6a3c7a");
        if (i == 9) return Palette("bone", "#efe9dc", "#4a3a2a", "#c2b49c");
        if (i == 10) return Palette("pine", "#0c1a1a", "#b8e0d0", "#2a5a52");
        if (i == 11) return Palette("brick", "#2a1412", "#f0b8a8", "#8a3a2c");
        if (i == 12) return Palette("fog", "#d8dde2", "#2a3038", "#9aa4ae");
        if (i == 13) return Palette("ochre", "#1c1806", "#f0d060", "#7a6420");
        if (i == 14) return Palette("wine", "#f2e4e6", "#5a1a2c", "#c89aa4");
        return Palette("slate", "#242a32", "#e0e6ec", "#6a7684");
    }

    function accentName(int8 a) public pure returns (string memory) {
        if (a == 0) return "flame";
        if (a == 1) return "gold";
        if (a == 2) return "sky";
        if (a == 3) return "rose";
        return "none";
    }

    function accentColor(int8 a) internal pure returns (string memory) {
        if (a == 0) return "#e04040";
        if (a == 1) return "#f0c040";
        if (a == 2) return "#40c0e0";
        return "#e060b0";
    }

    function weaveName(uint8 w) public pure returns (string memory) {
        if (w == 0) return "arcs";
        if (w == 1) return "passes";
        if (w == 2) return "loose";
        return "cross";
    }

    function symmetryName(uint8 s) public pure returns (string memory) {
        if (s == 0) return "none";
        if (s == 1) return "mirror";
        if (s == 2) return "quad";
        return "turn";
    }

    function weightName(uint8 w) public pure returns (string memory) {
        if (w == 0) return "thin";
        if (w == 1) return "regular";
        return "heavy";
    }

    /// @dev splitmix64, one step, wrapping in uint64 like `nextRandom` in TS.
    function mix(uint64 x) internal pure returns (uint64) {
        unchecked {
            x += 0x9e3779b97f4a7c15;
            x = (x ^ (x >> 30)) * 0xbf58476d1ce4e5b9;
            x = (x ^ (x >> 27)) * 0x94d049bb133111eb;
            return x ^ (x >> 31);
        }
    }

    /// @dev Takes the top `bits` bits of the next stream element.
    function draw(uint64 counter, uint256 bits) internal pure returns (uint64 next, uint256 value) {
        unchecked {
            next = counter + 1;
        }
        uint64 m = mix(next);
        value = uint256(m >> (64 - bits)) & ((1 << bits) - 1);
    }

    /// @dev Trait tables from TS: GRIDS, WEAVES, SYMMETRIES, WEIGHTS, CAPS.
    function gridOf(uint256 v) internal pure returns (uint256) {
        uint8[16] memory g = [6, 8, 8, 8, 8, 10, 10, 12, 8, 8, 6, 10, 8, 12, 8, 10];
        return g[v];
    }

    function weaveOf(uint256 v) internal pure returns (uint8) {
        uint8[8] memory w = [0, 0, 1, 1, 1, 2, 3, 1];
        return w[v];
    }

    function symmetryOf(uint256 v) internal pure returns (uint8) {
        uint8[8] memory s = [0, 0, 0, 0, 1, 1, 2, 3];
        return s[v];
    }

    function weightOf(uint256 v) internal pure returns (uint8) {
        uint8[4] memory w = [0, 1, 1, 2];
        return w[v];
    }

    /// @dev Three drawn bits to a cell state, by weave. States: 0,1 arcs; 2 vertical;
    /// 3 horizontal; 4 empty; 5 crossing.
    function stateOf(uint8 weave, uint256 v) internal pure returns (uint8) {
        if (weave == 0) return uint8(v & 1);
        if (weave == 1) return uint8(v & 3);
        if (v < 4) return uint8(v);
        if (v < 6) return uint8(v - 4);
        return weave == 2 ? 4 : 5;
    }

    function mirrored(uint8 s) internal pure returns (uint8) {
        return s < 2 ? s ^ 1 : s;
    }

    function turned(uint8 s) internal pure returns (uint8) {
        return s < 4 ? s ^ 1 : s;
    }

    function isFree(uint8 symmetry, uint256 x, uint256 y, uint256 half) internal pure returns (bool) {
        return symmetry == 0 || (x < half && (symmetry == 1 || y < half));
    }

    /// @notice Traits, cell states and accent marks for an epoch.
    function cells(uint256 epoch) public pure returns (Traits memory t, uint8[] memory states, bool[] memory marks) {
        uint64 counter = mix(uint64(epoch));
        uint256 v;
        (counter, v) = draw(counter, 8);
        t.palette = v % 16;
        (counter, v) = draw(counter, 4);
        t.grid = gridOf(v);
        (counter, v) = draw(counter, 3);
        t.weave = weaveOf(v);
        (counter, v) = draw(counter, 3);
        t.symmetry = symmetryOf(v);
        (counter, v) = draw(counter, 2);
        t.weight = weightOf(v);
        (counter, v) = draw(counter, 2);
        t.caps = v == 0 ? 0 : 1;
        (counter, v) = draw(counter, 4);
        t.accent = -1;
        if (v == 0) {
            (counter, v) = draw(counter, 2);
            t.accent = int8(uint8(v));
        }

        uint256 grid = t.grid;
        uint256 half = grid / 2;
        uint256 n = grid * grid;
        states = new uint8[](n);
        marks = new bool[](n);

        // First pass: draw the free cells in row order. Second pass: copy the
        // rest from their source cell, so the source is always already drawn.
        for (uint256 i = 0; i < n; i++) {
            if (!isFree(t.symmetry, i % grid, i / grid, half)) continue;
            (counter, v) = draw(counter, 3);
            states[i] = stateOf(t.weave, v);
            if (t.accent >= 0 && states[i] != 4) {
                (counter, v) = draw(counter, 4);
                marks[i] = v == 0;
            }
        }
        for (uint256 i = 0; i < n; i++) {
            uint256 x = i % grid;
            uint256 y = i / grid;
            if (isFree(t.symmetry, x, y, half)) continue;
            uint256 sx;
            uint256 sy;
            uint8 s;
            if (t.symmetry == 1) {
                sx = grid - 1 - x;
                sy = y;
                s = mirrored(states[sy * grid + sx]);
            } else if (t.symmetry == 2) {
                sx = x < half ? x : grid - 1 - x;
                sy = y < half ? y : grid - 1 - y;
                s = states[sy * grid + sx];
                if ((x >= half) != (y >= half)) s = mirrored(s);
            } else {
                if (x >= half && y < half) {
                    sx = y;
                    sy = grid - 1 - x;
                } else if (x >= half) {
                    sx = grid - 1 - x;
                    sy = grid - 1 - y;
                } else {
                    sx = grid - 1 - y;
                    sy = x;
                }
                s = states[sy * grid + sx];
                if (!(x >= half && y >= half)) s = turned(s);
            }
            states[i] = s;
            marks[i] = marks[sy * grid + sx];
        }
    }

    function cellPath(uint8 state, uint256 x, uint256 y) internal pure returns (string memory) {
        if (state == 4) return "";
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
        if (state == 3) {
            return string.concat("M", xs, " ", yh, "L", xs2, " ", yh);
        }
        return string.concat("M", xh, " ", ys, "L", xh, " ", ys2, "M", xs, " ", yh, "L", xs2, " ", yh);
    }

    /// @dev The three path strings: every cell (shade layer), plain cells (cord), accent cells.
    function paths(uint8[] memory states, bool[] memory marks, uint256 grid)
        internal
        pure
        returns (string memory all, string memory cord, string memory loud)
    {
        for (uint256 i = 0; i < states.length; i++) {
            string memory c = cellPath(states[i], (i % grid) * CELL, (i / grid) * CELL);
            all = string.concat(all, c);
            if (marks[i]) loud = string.concat(loud, c);
            else cord = string.concat(cord, c);
        }
    }

    function head(Traits memory t, Palette memory p) internal pure returns (string memory) {
        string memory size = (t.grid * CELL).toString();
        return string.concat(
            '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ', size, " ", size, '" width="512" height="512">',
            '<rect width="', size, '" height="', size, '" fill="', p.bg, '"/>',
            '<g fill="none" stroke-linecap="', t.caps == 0 ? "butt" : "round", '">'
        );
    }

    function strokes(Traits memory t, Palette memory p, string memory all, string memory cord, string memory loud)
        internal
        pure
        returns (string memory)
    {
        string memory wCord = t.weight == 0 ? "5" : t.weight == 1 ? "9" : "15";
        string memory wShade = t.weight == 0 ? "13" : t.weight == 1 ? "21" : "30";
        string memory body = string.concat(
            '<path d="', all, '" stroke="', p.shade, '" stroke-width="', wShade, '"/>',
            '<path d="', cord, '" stroke="', p.cord, '" stroke-width="', wCord, '"/>'
        );
        if (bytes(loud).length == 0) return string.concat(body, "</g></svg>");
        return string.concat(body, '<path d="', loud, '" stroke="', accentColor(t.accent), '" stroke-width="', wCord, '"/></g></svg>');
    }

    function svg(uint256 epoch) public pure returns (string memory) {
        (Traits memory t, uint8[] memory states, bool[] memory marks) = cells(epoch);
        Palette memory p = palettes(t.palette);
        (string memory all, string memory cord, string memory loud) = paths(states, marks, t.grid);
        return string.concat(head(t, p), strokes(t, p, all, cord, loud));
    }

    function paletteName(uint256 epoch) public pure returns (string memory) {
        (Traits memory t,,) = cells(epoch);
        return palettes(t.palette).name;
    }

    function attributes(uint256 day, uint256 epoch, Traits memory t) internal pure returns (string memory) {
        string memory g = t.grid.toString();
        return string.concat(
            '[{"trait_type":"Day","value":', day.toString(),
            '},{"trait_type":"Epoch","value":', epoch.toString(),
            '},{"trait_type":"Palette","value":"', palettes(t.palette).name,
            '"},{"trait_type":"Grid","value":"', g, " by ", g,
            '"},{"trait_type":"Weave","value":"', weaveName(t.weave),
            '"},{"trait_type":"Symmetry","value":"', symmetryName(t.symmetry),
            '"},{"trait_type":"Weight","value":"', weightName(t.weight),
            '"},{"trait_type":"Caps","value":"', t.caps == 0 ? "butt" : "round",
            '"},{"trait_type":"Accent","value":"', accentName(t.accent),
            '"}]'
        );
    }

    function tokenURI(uint256 day, uint256 epoch) external pure returns (string memory) {
        (Traits memory t,,) = cells(epoch);
        string memory image = string.concat("data:image/svg+xml;base64,", Base64.encode(bytes(svg(epoch))));
        string memory json = string.concat(
            '{"name":"Day ', day.toString(),
            '","description":"One Truchet knot a day, computed from the clock of the Base chain. Day ',
            day.toString(), ", epoch ", epoch.toString(), ". A day nobody claims stays empty forever. CC0.",
            '","image":"', image,
            '","attributes":', attributes(day, epoch, t), "}"
        );
        return string.concat("data:application/json;base64,", Base64.encode(bytes(json)));
    }
}
