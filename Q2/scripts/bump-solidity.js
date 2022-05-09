const fs = require("fs");
const solidityRegex = /pragma solidity \^\d+\.\d+\.\d+/

const verifierRegex = /contract .*Verifier/

const HelloWorldPath = "./contracts/HelloWorldVerifier.sol";
const HelloWorldVerifier = 'contract HelloWorldVerifier';

const Multiplier3Groth16Path = "./contracts/Multiplier3Verifier_groth16.sol"
const Multiplier3GrothVerifier = 'contract Multiplier3GrothVerifier'

const Multiplier3PlonkPath = "./contracts/Multiplier3Verifier_plonk.sol"
const Multiplier3PlonkVerifier = 'contract Multiplier3PlonkVerifier'


//
function bumbContract(contractPath, contractName) {
    let content = fs.readFileSync(contractPath, { encoding: 'utf-8' });
    let bumped = content.replace(solidityRegex, 'pragma solidity ^0.8.0');
    bumped = bumped.replace(verifierRegex, contractName);
    
    fs.writeFileSync(contractPath, bumped);
}

bumbContract(HelloWorldPath, HelloWorldVerifier);
bumbContract(Multiplier3Groth16Path, Multiplier3GrothVerifier);
// Solidity regex won't work on plonk but it is fine
bumbContract(Multiplier3PlonkPath, Multiplier3PlonkVerifier);
