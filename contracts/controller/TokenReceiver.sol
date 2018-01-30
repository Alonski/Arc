pragma solidity ^0.4.18;


contract TokenReceiver {
    function tokenFallback(address _from, uint _value, bytes _data) external returns(bool);
}
