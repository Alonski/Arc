pragma solidity ^0.4.18;

import "zeppelin-solidity/contracts/token/MintableToken.sol";
import "zeppelin-solidity/contracts/token/BurnableToken.sol";
import "zeppelin-solidity/contracts/lifecycle/Destructible.sol";
import "./TokenReceiver.sol";


/**
 * @title DAOToken, base on zeppelin contract.
 * @dev ERC20 compatible token. It is a mintable, destructible, burnable token.
 */

contract DAOToken is MintableToken,Destructible,BurnableToken {

    event Transact(address indexed from, address indexed to, uint value, uint _ethValue, bytes _data);

    string public name;
    string public symbol;
    uint public constant DECIMAL = 18;

    /**
     * @dev the constructor takes a token name and a symbol
     */
    function DAOToken(string _name, string _symbol) public {
        name = _name;
        symbol = _symbol;
    }

    function transfer(address _to, uint256 _value) public returns(bool) {
        return (_transfer(msg.sender, _to, _value));
    }

    function transfer(address _to, uint _value, bytes _data) public returns(bool) {
        _transfer(msg.sender, _to, _value);
        if (isContract(_to)) {
            if (! TokenReceiver(_to).tokenFallback(msg.sender, _value, _data)) {
                revert();
            }
        }
        return true;
    }

    function isContract(address _address) private view returns(bool) {
        uint codeLength;
        assembly {
            // Retrieve the size of the code on target address, this needs assembly .
            codeLength := extcodesize(_address)
        }
        return(codeLength != 0);
    }

    function _transfer(address _from, address _to, uint256 _value) private returns (bool) {
        require(_to != address(0));
        require(_value <= balances[_from]);

        // SafeMath.sub will throw if there is not enough balance.
        balances[_from] = balances[_from].sub(_value);
        balances[_to] = balances[_to].add(_value);
        Transfer(_from, _to, _value);
        return true;
    }
}
