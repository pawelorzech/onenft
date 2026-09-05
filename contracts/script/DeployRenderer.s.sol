// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Script, console} from "forge-std/Script.sol";
import {KnotRendererV4} from "../src/KnotRendererV4.sol";

/// Deploys the v3 renderer only. The token contract stays; the owner switches
/// with `setRenderer` afterwards (contracts/set-renderer.sh).
contract DeployRenderer is Script {
    function run() external {
        vm.startBroadcast();
        KnotRendererV4 renderer = new KnotRendererV4();
        vm.stopBroadcast();
        console.log("KnotRendererV4", address(renderer));
    }
}
