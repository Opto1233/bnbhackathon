// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;
import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

import "@openzeppelin/contracts/utils/Strings.sol";
import "@openzeppelin/contracts/utils/Base64.sol";

/// One whole-unit token ID per creator. Reserve is the integral of the price curve.
contract Pulse is ERC1155, ReentrancyGuard {
    mapping(uint256 => uint256) public supply;
    mapping(uint256 => bool) public listed;
    event Trade(uint256 indexed id, address indexed trader, bool bought, uint256 quantity, uint256 amount);
    constructor() ERC1155("") {
        require(block.chainid == 97, "BSC testnet only");
        for (uint256 id = 1; id <= 4; ++id) listed[id] = true;
    }
    function uri(uint256 id) public view override returns (string memory) {
        require(listed[id], "Unknown creator");
        bytes memory metadata = abi.encodePacked('{"name":"Pulse Creator Coin #', Strings.toString(id),
            '","description":"Whole-unit Pulse creator coin on BSC Testnet.","decimals":0}');
        return string.concat("data:application/json;base64,", Base64.encode(metadata));
    }

    function launch() external {
        uint256 id = uint160(msg.sender);
        require(!listed[id], "Already listed");
        listed[id] = true;
    }
    function reserve(uint256 n) public pure returns (uint256) {
        return 1e12 * n + 1e9 * n * n;
    }
    function quote(uint256 id, uint256 qty, bool buySide) public view returns (uint256) {
        require(listed[id] && qty > 0 && qty <= 1000000, "Invalid order");
        uint256 n = supply[id];
        if (buySide) require(n + qty <= 1000000, "Supply cap reached");
        return buySide ? reserve(n + qty) - reserve(n) : reserve(n) - reserve(n - qty);
    }
    function buy(uint256 id, uint256 qty) external payable nonReentrant {
        uint256 cost = quote(id, qty, true);
        require(cost == msg.value, "Quote changed");
        supply[id] += qty;
        _mint(msg.sender, id, qty, "");
        emit Trade(id, msg.sender, true, qty, cost);
    }
    function sell(uint256 id, uint256 qty, uint256 minimum) external nonReentrant {
        uint256 payout = quote(id, qty, false);
        require(payout >= minimum, "Quote changed");
        _burn(msg.sender, id, qty);
        supply[id] -= qty;
        (bool ok,) = msg.sender.call{value:payout}("");
        require(ok, "Payout failed");
        emit Trade(id, msg.sender, false, qty, payout);
    }
}
