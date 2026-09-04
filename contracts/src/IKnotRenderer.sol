// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/// @notice Renderer splotu. Osobny kontrakt, żeby dało się go poprawić
/// dla przyszłych dób bez dotykania tokenów już wziętych.
interface IKnotRenderer {
    function svg(uint256 epoch) external pure returns (string memory);
    function paletteName(uint256 epoch) external pure returns (string memory);
    function tokenURI(uint256 day, uint256 epoch) external view returns (string memory);
}
