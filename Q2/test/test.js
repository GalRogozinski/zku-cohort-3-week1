const { expect } = require("chai");
const { ethers } = require("hardhat");
const fs = require("fs");
const { groth16, plonk } = require("snarkjs");

function unstringifyBigInts(o) {
    if ((typeof(o) == "string") && (/^[0-9]+$/.test(o) ))  {
        return BigInt(o);
    } else if ((typeof(o) == "string") && (/^0x[0-9a-fA-F]+$/.test(o) ))  {
        return BigInt(o);
    } else if (Array.isArray(o)) {
        return o.map(unstringifyBigInts);
    } else if (typeof o == "object") {
        if (o===null) return null;
        const res = {};
        const keys = Object.keys(o);
        keys.forEach( (k) => {
            res[k] = unstringifyBigInts(o[k]);
        });
        return res;
    } else {
        return o;
    }
}

describe("HelloWorld", function () {
    let Verifier;
    let verifier;

    beforeEach(async function () {
        Verifier = await ethers.getContractFactory("HelloWorldVerifier");
        verifier = await Verifier.deploy();
        await verifier.deployed();
    });

    it("Should return true for correct proof", async function () {
        //Runs the snarkJS prover that emits the proof itself and the public signals. In our case the public signals is simply the output of the single constraint.
        //In order to tune the prover we need the witness, the circuit in wasm format, and the proving key that was created with the trusted setup.
        const { proof, publicSignals } = await groth16.fullProve({"a":"1","b":"2"}, "contracts/circuits/HelloWorld/HelloWorld_js/HelloWorld.wasm","contracts/circuits/HelloWorld/circuit_final.zkey");

        //Prints the output of the circuit, which is the product of the private witness inputs.
        console.log('1x2 =',publicSignals[0]);

        //The edited public signals hold the circuit's output in big int form
        const editedPublicSignals = unstringifyBigInts(publicSignals);
        // Make sure the proof (3 elliptic curve points) are represented as BigInts
        const editedProof = unstringifyBigInts(proof);
        //concatenate the proof (3 EC points) and public signals (output) as a hexadecimal array string
        const calldata = await groth16.exportSolidityCallData(editedProof, editedPublicSignals);
        
        // Clears the array string from brackets, and split on comma (to create an array) so each hexadecimal string will be in an array slot.
        // Now for each array element (hexadecimal string) cast to BigInt and then stringified to a base10 string representation.
        // So all the logic so far was just so we can put the proof and public signals in a comfortable argv array.
        const argv = calldata.replace(/["[\]\s]/g, "").split(',').map(x => BigInt(x).toString());
    
        // extract the first elliptic curve point A
        const a = [argv[0], argv[1]];
        // extract the second EC point on 2 different subgroups
        const b = [[argv[2], argv[3]], [argv[4], argv[5]]];
        // extract the third EC point
        const c = [argv[6], argv[7]];
        // extract the circuit public signals
        const Input = argv.slice(8);
        
        // ascertain the contract verifies the proof
        expect(await verifier.verifyProof(a, b, c, Input)).to.be.true;
    });
    it("Should return false for invalid proof", async function () {
        let a = [0, 0];
        let b = [[0, 0], [0, 0]];
        let c = [0, 0];
        let d = [0]
        expect(await verifier.verifyProof(a, b, c, d)).to.be.false;
    });
});


describe("Multiplier3 with Groth16", function () {

    beforeEach(async function () {
        Verifier = await ethers.getContractFactory("Multiplier3GrothVerifier");
        verifier = await Verifier.deploy();
        await verifier.deployed();
    });

    it("Should return true for correct proof", async function () {
        //Runs the snarkJS prover that emits the proof itself and the public signals. In our case the public signals is simply the output of the single constraint.
        //In order to tune the prover we need the witness, the circuit in wasm format, and the proving key that was created with the trusted setup.
        const { proof, publicSignals } = await groth16.fullProve({"a":"1","b":"2","c":"3"}, "contracts/circuits/Multiplier3_groth16/Multiplier3_js/Multiplier3.wasm","contracts/circuits/Multiplier3_groth16/circuit_final.zkey");

        //Prints the output of the computational trace
        console.log('1 x 2 =',publicSignals[0]);
        console.log(publicSignals[0],'x 3 =',publicSignals[1]);

        //The edited public signals hold the circuit's output in big int form
        const editedPublicSignals = unstringifyBigInts(publicSignals);
        // Make sure the proof (3 elliptic curve points) are represented as BigInts
        const editedProof = unstringifyBigInts(proof);
        //concatenate the proof (3 EC points) and public signals (output) as a hexadecimal array string
        const calldata = await groth16.exportSolidityCallData(editedProof, editedPublicSignals);
        
        // Clears the array string from brackets, and split on comma (to create an array) so each hexadecimal string will be in an array slot.
        // Now for each array element (hexadecimal string) cast to BigInt and then stringified to a base10 string representation.
        // So all the logic so far was just so we can put the proof and public signals in a comfortable argv array.
        const argv = calldata.replace(/["[\]\s]/g, "").split(',').map(x => BigInt(x).toString());
    
        // extract the first elliptic curve point A
        const a = [argv[0], argv[1]];
        // extract the second EC point on 2 different subgroups
        const b = [[argv[2], argv[3]], [argv[4], argv[5]]];
        // extract the third EC point
        const c = [argv[6], argv[7]];
        // extract the input
        const Input = argv.slice(8);
        
        // ascertain the contract verifies the proof
        expect(await verifier.verifyProof(a, b, c, Input)).to.be.true;
    });
    it("Should return false for invalid proof", async function () {
        let a = [0, 0];
        let b = [[0, 0], [0, 0]];
        let c = [0, 0];
        let d = [0, 0]
        expect(await verifier.verifyProof(a, b, c, d)).to.be.false;
    });
});


describe("Multiplier3 with PLONK", function () {

    beforeEach(async function () {
        Verifier = await ethers.getContractFactory("Multiplier3PlonkVerifier");
        verifier = await Verifier.deploy();
        await verifier.deployed();
    });

    it("Should return true for correct proof", async function () {
        //Runs the snarkJS prover that emits the proof itself and the public signals. In our case the public signals is simply the output of the single constraint.
        //In order to tune the prover we need the witness, the circuit in wasm format, and the proving key that was created with the trusted setup.
        const { proof, publicSignals } = await plonk.fullProve({"a":"1","b":"2","c":"3"}, "contracts/circuits/Multiplier3_plonk/Multiplier3_js/Multiplier3.wasm","contracts/circuits/Multiplier3_plonk/circuit_final.zkey");

         //Prints the output of the computational trace
         console.log('1 x 2 =',publicSignals[0]);
         console.log(publicSignals[0],'x 3 =',publicSignals[1]);

        //The edited public signals hold the circuit's output in big int form
        const editedPublicSignals = unstringifyBigInts(publicSignals);
        // Make sure the proof are represented as BigInts
        const editedProof = unstringifyBigInts(proof);
        //concatenate the proof and public signals (output) as a hexadecimal array string
        const calldata = await plonk.exportSolidityCallData(editedProof, editedPublicSignals);
    
        const proofData = calldata.substring(0, calldata.indexOf(','))
        const inputs = JSON.parse(calldata.substring(calldata.indexOf(',') + 1))

        // ascertain the contract verifies the proof
        expect(await verifier.verifyProof(proofData, inputs)).to.be.true;
    });
    it("Should return false for invalid proof", async function () {
        let proofData = 0;
        let inputs = [0, 0];
        expect(await verifier.verifyProof(proofData, inputs)).to.be.false;
    });
});