const { expect } = require("chai");
const { ethers } = require("hardhat");
const fs = require("fs");
const { groth16 } = require("snarkjs");

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

describe("SystemOfEquations", function () {
    let Verifier;
    let verifier;

    beforeEach(async function () {
        Verifier = await ethers.getContractFactory("SystemOfEquationsVerifier");
        verifier = await Verifier.deploy();
        await verifier.deployed();
    });

    it("Should return true for correct proof", async function () {
        //Runs the snarkJS prover that emits the proof itself and the public signals. In our case the public signals is simply the output of the single constraint.
        //In order to tune the prover we need the witness, the circuit in wasm format, and the proving key that was created with the trusted setup.
        const { proof, publicSignals } = await groth16.fullProve({
            "x": ["15","17","19"],
            "A": [["1","1","1"],["1","2","3"],["2","-1","1"]],
            "b": ["51", "106", "32"]
        },
            "contracts/bonus/SystemOfEquations/SystemOfEquations_js/SystemOfEquations.wasm","contracts/bonus/SystemOfEquations/circuit_final.zkey");

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
        // ascertain the contract verifies the proof
        const Input = argv.slice(8);
        // ascertain the contract verifies the proof
        expect(await verifier.verifyProof(a, b, c, Input)).to.be.true;
    });
    it("Should return false for invalid proof", async function () {
        let a = [0, 0];
        let b = [[0, 0], [0, 0]];
        let c = [0, 0];
        let d = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
        expect(await verifier.verifyProof(a, b, c, d)).to.be.false;
    });
});