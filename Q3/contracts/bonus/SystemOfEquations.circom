pragma circom 2.0.0;

include "../../node_modules/circomlib-matrix/circuits/matMul.circom";
include "../../node_modules/circomlib/circuits/comparators.circom";


template SystemOfEquations(n) { // n is the number of variables in the system of equations
    signal input x[n]; // this is the solution to the system of equations
    signal input A[n][n]; // this is the coefficient matrix
    signal input b[n]; // this are the constants in the system of equations
    signal output out; // 1 for correct solution, 0 for incorrect solution

    component eql[n];
    component mulMat = matMul(n,n,1);
    for (var i=0; i<n; i++) {
        for (var j=0; j<n; j++) {
            A[i][j] ==> mulMat.a[i][j];
        }
        x[i] ==> mulMat.b[i][0];
    }
    
    for (var i=0; i<n; i++) {
        eql[i] = IsEqual();
        eql[i].in[0] <== mulMat.out[i][0];
        eql[i].in[1] <== b[i];
    }
    
    signal inter[n];
    inter[0] <== eql[0].out;
    for (var i=0; i<n-1; i++) {
        inter[i+1] <== inter[i] * eql[i+1].out;
    }
    out <== inter[n-1];
}

component main {public [A, b]} = SystemOfEquations(3);