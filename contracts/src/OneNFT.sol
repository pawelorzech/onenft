// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {IKnotRenderer} from "./IKnotRenderer.sol";

/// @title OneNFT — jeden splot na dobę
/// @notice Zegarem jest łańcuch: doba to `block.number / 43200`. W każdej dobie
/// można wziąć dokładnie jeden token o numerze równym numerowi doby. Doba, po
/// którą nikt nie przyszedł, zostaje pusta na zawsze — nie ma dogrywek.
///
/// Co dziesiąta doba do 1000. włącznie należy do autora: wywołanie `claim()`
/// w takiej dobie mintuje token autorowi, nie wołającemu. Jawne od dnia 1.
///
/// Renderer jest osobnym kontraktem. Jego adres zapisuje się per token w chwili
/// wzięcia, więc `setRenderer` dotyka wyłącznie przyszłych dób; raz wzięty splot
/// nie zmieni się nigdy. `lockRenderer` zamyka nawet tę furtkę, jednokierunkowo.
contract OneNFT is ERC721, Ownable {
    uint256 public constant EPOCH_BLOCKS = 43200;
    uint256 public constant AUTHOR_UNTIL_DAY = 1000;

    uint256 public immutable startEpoch;
    address public immutable author;

    address public renderer;
    bool public rendererLocked;
    mapping(uint256 tokenId => address) public rendererOf;

    event Claimed(uint256 indexed day, address indexed to, uint256 epoch, address renderer);
    event RendererSet(address indexed renderer);
    event RendererLocked();

    error BeforeFirstDay();
    error DayAlreadyClaimed(uint256 day);
    error RendererIsLocked();
    error ZeroRenderer();

    constructor(
        string memory name_,
        string memory symbol_,
        uint256 startEpoch_,
        address author_,
        address renderer_
    ) ERC721(name_, symbol_) Ownable(author_) {
        if (renderer_ == address(0)) revert ZeroRenderer();
        startEpoch = startEpoch_;
        author = author_;
        renderer = renderer_;
        emit RendererSet(renderer_);
    }

    // ---- zegar ----

    function currentEpoch() public view returns (uint256) {
        return block.number / EPOCH_BLOCKS;
    }

    /// @return 0 przed pierwszą dobą, potem 1, 2, 3...
    function currentDay() public view returns (uint256) {
        uint256 e = currentEpoch();
        return e < startEpoch ? 0 : e - startEpoch + 1;
    }

    function epochOf(uint256 day) public view returns (uint256) {
        return startEpoch + day - 1;
    }

    /// @return Bloki do końca bieżącej doby.
    function blocksLeft() public view returns (uint256) {
        return (currentEpoch() + 1) * EPOCH_BLOCKS - block.number;
    }

    function isAuthorDay(uint256 day) public pure returns (bool) {
        return day % 10 == 0 && day <= AUTHOR_UNTIL_DAY;
    }

    // ---- odbiór ----

    function claimed(uint256 day) public view returns (bool) {
        return _ownerOf(day) != address(0);
    }

    /// @notice Bierze dzisiejszą dobę. Bez ceny; płacisz tylko gaz.
    function claim() external returns (uint256 day) {
        day = currentDay();
        if (day == 0) revert BeforeFirstDay();
        if (claimed(day)) revert DayAlreadyClaimed(day);
        address to = isAuthorDay(day) ? author : msg.sender;
        rendererOf[day] = renderer;
        // _mint, nie _safeMint: odbiorca sam woła claim(), a po EIP-7702 zwykłe portfele
        // bywają kontem z kodem delegacji, które nie odpowiada na onERC721Received.
        _mint(to, day);
        emit Claimed(day, to, epochOf(day), renderer);
    }

    // ---- renderer ----

    function setRenderer(address renderer_) external onlyOwner {
        if (rendererLocked) revert RendererIsLocked();
        if (renderer_ == address(0)) revert ZeroRenderer();
        renderer = renderer_;
        emit RendererSet(renderer_);
    }

    function lockRenderer() external onlyOwner {
        rendererLocked = true;
        emit RendererLocked();
    }

    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        _requireOwned(tokenId);
        return IKnotRenderer(rendererOf[tokenId]).tokenURI(tokenId, epochOf(tokenId));
    }

    /// @notice Podgląd splotu dowolnej doby, także niewziętej — z bieżącym rendererem.
    function preview(uint256 day) external view returns (string memory) {
        return IKnotRenderer(renderer).svg(epochOf(day));
    }
}
