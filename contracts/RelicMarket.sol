// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

contract TestRelic is ERC20 {
    mapping(address => bool) public claimed;

    constructor() ERC20("Relic Vale Test", "RELIC") {}

    function claim() external {
        require(!claimed[msg.sender], "Already claimed");
        claimed[msg.sender] = true;
        _mint(msg.sender, 2 ether);
    }

    function burn(uint256 amount) external {
        _burn(msg.sender, amount);
    }
}

contract VaultRelic is ERC721 {
    constructor(address initialOwner) ERC721("Relic Vale Test Items", "VAULT") {
        _mint(initialOwner, 1);
    }
}

contract RelicMarket {
    using SafeERC20 for IERC20;

    uint256 public constant PRICE = 1 ether;
    uint256 public constant SHARE = PRICE / 200;
    uint256 public constant ITEM = 1;
    TestRelic public immutable coin;
    VaultRelic public immutable relic;
    address public immutable treasury;
    address public seller;
    uint256 public listingId;

    event Listed(uint256 indexed id, address indexed seller);
    event Cancelled(uint256 indexed id);
    event Settled(uint256 indexed id, address indexed seller, address indexed buyer, uint256 paid, uint256 proceeds, uint256 fee, uint256 burned);

    constructor(address treasuryAddress) {
        require(treasuryAddress != address(0) && treasuryAddress != msg.sender, "Use a separate treasury");
        treasury = treasuryAddress;
        coin = new TestRelic();
        relic = new VaultRelic(msg.sender);
    }

    function list() external {
        require(seller == address(0) && relic.ownerOf(ITEM) == msg.sender, "Current owner only");
        seller = msg.sender;
        ++listingId;
        relic.transferFrom(msg.sender, address(this), ITEM);
        emit Listed(listingId, msg.sender);
    }

    function cancel(uint256 id) external {
        require(id == listingId && seller == msg.sender, "Listing unavailable");
        seller = address(0);
        relic.transferFrom(address(this), msg.sender, ITEM);
        emit Cancelled(id);
    }

    function buy(uint256 id) external {
        address recipient = seller;
        require(id == listingId && recipient != address(0), "Listing unavailable");
        require(msg.sender != recipient, "Seller cannot buy");
        seller = address(0);

        IERC20(address(coin)).safeTransferFrom(msg.sender, address(this), PRICE);
        uint256 proceeds = PRICE - 2 * SHARE;
        IERC20(address(coin)).safeTransfer(recipient, proceeds);
        IERC20(address(coin)).safeTransfer(treasury, SHARE);
        coin.burn(SHARE);
        relic.safeTransferFrom(address(this), msg.sender, ITEM);
        emit Settled(id, recipient, msg.sender, PRICE, proceeds, SHARE, SHARE);
    }
}
