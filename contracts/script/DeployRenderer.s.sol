// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Script, console} from "forge-std/Script.sol";
import {KnotRendererV3} from "../src/KnotRendererV3.sol";

/// Deploys the v3 renderer only. The token contract stays; the owner switches
/// with `setRenderer` afterwards (contracts/set-renderer.sh).
contract DeployRenderer is Script {
    function run() external {
        vm.startBroadcast();
        KnotRendererV3 renderer = new KnotRendererV3();
        vm.stopBroadcast();
        console.log("KnotRendererV3", address(renderer));
    }
}
