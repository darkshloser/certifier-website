pragma solidity ^0.4.10;

contract FeeRegistrar {
  /// STORAGE
  address public owner;
  address public treasury;
  uint public fee;
  
  // a mapping of addresses to their position
  // in the `s_payers` list
  mapping(address => uint) s_paid;
  // a list of each payers
  address[] s_payers;
  
  /// EVENTS
  event Paid (address who);
  event Transfer (address from, address to);
  
  /// MODIFIERS
  modifier only_owner {
    require(msg.sender == owner);
    _;
  }
  
  /// CONSTRUCTOR
  function FeeRegistrar (address _treasury, uint _fee) {
    owner = msg.sender;
    treasury = _treasury;
    fee = _fee;
  }
  
  /// PUBLIC CONSTANT METHODS
  function count () public constant returns (uint) {
    return s_payers.length;
  }
  
  function paid (address who) public constant returns (bool) {
    return s_paid[who] > 0;
  }
  
  function payers (uint start, uint limit) public constant returns (address[]) {
    uint size = (start + limit > count())
      ? count() - start
      : limit;
      
    address[] memory m_payers;
    
    // Set the right size for the memory array
    assembly {
      // the used memory size is :
      //   - 32 bytes per element
      //   - 32 bytes for the array length 
      let m_size := mul(0x20, add(size, 1))
      
      // malloc the right memory size
      m_payers := mload(0x40)
      mstore(0x40, add(m_payers, m_size))
      
      // store the number of elements
      mstore(m_payers, size)
    }
    
    for (uint i = 0; i < size; i++) {
      m_payers[i] = s_payers[i + start];
    }
    
    return m_payers;
  }
  
  /// PUBLIC METHODS
  function pay (address who) external payable {
    require(!paid(who));
    require(who != 0x0);
    require(msg.value == fee);
    
    s_payers.push(who);
    s_paid[who] = s_payers.length;
    
    Paid(who);
    
    treasury.transfer(msg.value);
  }
  
  function transfer (address who) external {
    require(paid(msg.sender));
    require(!paid(who));
    
    uint index = s_paid[msg.sender] - 1;
    
    delete s_paid[msg.sender];
    s_paid[who] = index + 1;
    s_payers[index] = who;
    
    Transfer(msg.sender, who);
  }
  
  /// RESTRICTED (owner only) METHODS
  function setFee (uint _fee) external only_owner {
    fee = _fee;
  }
  
  function setOwner (address _owner) external only_owner {
    owner = _owner;
  }
  
  function setTreasury (address _treasury) external only_owner {
    treasury = _treasury;
  }
}
