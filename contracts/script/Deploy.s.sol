// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Script, console} from "forge-std/Script.sol";
import {KnotRenderer} from "../src/KnotRenderer.sol";
import {OneNFT} from "../src/OneNFT.sol";

/// forge script script/Deploy.s.sol --rpc-url base_sepolia --broadcast --verify
/// env: START_EPOCH, AUTHOR (właściciel i odbiorca co dziesiątej doby)
contract Deploy is Script {
    function run() external {
        uint256 startEpoch = vm.envUint("START_EPOCH");
        address author = vm.envAddress("AUTHOR");
        vm.startBroadcast();
        KnotRenderer renderer = new KnotRenderer();
        OneNFT nft = new OneNFT("onenft.click", "ONAD", startEpoch, author, address(renderer));
        vm.stopBroadcast();
        console.log("KnotRenderer", address(renderer));
        console.log("OneNFT", address(nft));
        console.log("startEpoch", startEpoch);
    }
}
