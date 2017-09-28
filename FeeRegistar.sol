//! FeeRegistrar contract.
//! By Parity Technologies, 2017.
//! Released under the Apache Licence 2.

pragma solidity ^0.4.16;

/// @title Fee Registrar
/// @author Nicolas Gotchac <nicolas@parity.io>
/// @notice This contract records fee payments. The address who deploys the contract
/// is set as the `owner` of the contract (which can be latter modified). The `fee`
/// which users will have to pay must be specified, as well as the address of the treasury
/// to which the fee will be forwarded to.
/// A payment is a transaction with the value set as the `fee` value, and an address is
/// given as an argument. The given address will be marked as _paid for_, and the number
/// of times it was paid for will be recorded. We also record who is at the origin of the
/// payment.
/// For example, Alice can pay for Bob, and Eve can pay for Bob as well. This contract
/// will record that Bob is marked as paid, 2 times, by Alice and Eve.
contract FeeRegistrar {

  /// STRUCTURES

  struct Payer {
    // the number of times the fee has been paid
    uint count;
    // who paid for the fee
    address[] origins;
  }


  /// STORAGE

  address public owner;
  address public treasury;
  uint public fee;

  // a mapping of addresses to a `Payer` struct
  mapping(address => Payer) s_paid;
  // a list of each payers
  address[] s_payers;


  /// EVENTS

  event Paid (address who);


  /// MODIFIERS

  // Only the owner of the contract restriction
  modifier only_owner {
    require(msg.sender == owner);
    _;
  }


  /// CONSTRUCTOR

  /// @notice Contructor method of the contract, which
  /// will set the `treasury` where payments will be send to,
  /// and the `fee` users have to pay
  /// @param _treasury The address to which the payments will be forwarded
  /// @param _fee The fee users have to pay, in wei
  function FeeRegistrar (address _treasury, uint _fee) public {
    owner = msg.sender;
    treasury = _treasury;
    fee = _fee;
  }


  /// PUBLIC CONSTANT METHODS

  /// @notice Returns the number of addresses marked as paid
  /// @return The number of addresses marked as paid
  function count () public constant returns (uint) {
    return s_payers.length;
  }

  /// @notice Returns for the given address the number of times
  /// it paid, and an array of addresses who actually paid for the fee
  /// (as one might pay the fee for another address)
  /// @param who The address of the payer whose info we check
  /// @return The count (number of payments) and the origins (the senders of the
  /// payment)
  function payer (address who) public constant returns (uint _count, address[] _origins) {
    address[] memory m_origins = s_paid[who].origins;

    return (s_paid[who].count, m_origins);
  }

  /// @notice Returns whether the given address paid or not
  /// @param who The address whose payment status we check
  /// @ return Whether the address is marked as paid or not
  function paid (address who) public constant returns (bool) {
    return s_paid[who].count > 0;
  }

  /// @notice Returns an array of at most `limit` addresses, starting at index
  /// `start`, marked as paid
  /// @param start From which index to start (used for paging)
  /// @param limit Maximum number of elements in the array
  /// @return An array of addresses marked as paid
  function payers (uint start, uint limit) public constant returns (address[]) {
    // Compute the size of the returned array
    uint size = (start + limit > count())
      ? count() - start
      : limit;

    // Init the payers array in memory
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

      // store the number of elements at the beggining
      mstore(m_payers, size)
    }

    // Fill up the array
    for (uint i = 0; i < size; i++) {
      m_payers[i] = s_payers[i + start];
    }

    return m_payers;
  }


  /// PUBLIC METHODS

  /// @notice This method is used to pay for the fee. You can pay
  /// the fee for one address (then marked as paid), from another
  /// address. The number of times the given address is marked as
  /// paid is saved, as well as the origin of the transaction, the
  /// fee payer (`msg.sender`). The value of the transaction must
  /// match the fee that was set in the contructor.
  /// The only restriction is that you can't pay for the null
  /// address.
  /// The value that is received is directly transfered to the
  /// `treasury`.
  /// @param who The address which should be marked as paid.
  function pay (address who) external payable {
    // We first check that the given address is not the null address
    require(who != 0x0);
    // Then check that the value matches with the fee
    require(msg.value == fee);

    uint _count = s_paid[who].count;
    address[] memory m_payers = s_paid[who].origins;

    // If `count == 0`, it's the first time this address is paid for.
    // Thus it must be added to the list of addresses.
    if (_count == 0) {
      s_payers.push(who);
    }

    // We need to check whether `msg.sender` already
    // paid for this address : if not, it must be added
    // to the list of payers for `who`
    bool senderPaid;

    for (uint i = 0; i < m_payers.length; i++) {
      if (m_payers[i] == msg.sender) {
        senderPaid = true;
      }
    }

    if (!senderPaid) {
      s_paid[who].origins.push(msg.sender);
    }

    // Increment the count by 1
    s_paid[who].count = _count + 1;

    // Send the paid event
    Paid(who);

    // Send the message value to the treasury
    treasury.transfer(msg.value);
  }


  /// RESTRICTED (owner only) METHODS

  /// @notice Change the owner of the contract. The sender
  /// must be the actual contract owner at the time of the
  /// transaction.
  /// @param _owner The address of the new owner
  function setOwner (address _owner) external only_owner {
    owner = _owner;
  }

  /// @notice Change the address of the treasury, the address to which
  /// the payments are forwarded to. Only the owner of the contract
  /// can execute this method.
  /// @param _treasury The new treasury address
  function setTreasury (address _treasury) external only_owner {
    treasury = _treasury;
  }
}
