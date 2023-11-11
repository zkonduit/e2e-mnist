'use client'
import { useState, FC } from 'react';
import './MNIST.css';
import './App.css';

import { CopyBlock, dracula } from 'react-code-blocks';
import { useSharedResources } from "@/providers/ezkl";
import { Button } from "@/components/button/Button";
import styles from "../../app/_components/image-uploader/image-uploader.module.scss";
// import styles from "../_components/image-uploader.module.scss";
// import { generateProof, buildContractCallArgs } from './snarkUtils';
import { Tensor, InferenceSession } from 'onnxruntime-web';
// import { doClassify } from './Classify';
// import { verifyProof } from './MyVerify';

const size = 28;
const MNISTSIZE = 784;

interface IMNISTBoardProps {
    grid: number[][];
    onChange: (row: number, col: number) => void;
}

const MNISTBoard: FC<IMNISTBoardProps> = ({ grid, onChange }) => {
    const [mouseDown, setMouseDown] = useState(false);

    const GridSquare = (row: number, col: number) => {
        const handleChange = () => {
            if (mouseDown) {
                onChange(row, col);
            }
        };

        const handleMouseDown = () => {
            setMouseDown(true);
            onChange(row, col);
        };

        const handleMouseUp = () => {
            setMouseDown(false);
        };

        return (
            <div
                className={`square ${grid[row][col] ? 'on' : 'off'}`}
                onMouseEnter={handleChange}
                onMouseDown={handleMouseDown}
                onMouseUp={handleMouseUp}
            />
        );
    };

    const renderCol = (col: number) => {
        const mycol = [];
        for (let row = 0; row < size; row++) {
            mycol.push(<div key={`row-${row}`}>{GridSquare(row, col)}</div>);
        }
        return <div key={`col-${col}`}>{mycol}</div>;
    };

    const RenderGrid = () => {
        const mygrid = [];
        for (let i = 0; i < size; i++) {
            mygrid.push(renderCol(i));
        }
        return mygrid;
    };

    return (
        <div className="MNISTBoard">
            <div className="centerObject">
                <div className="grid">{RenderGrid()}</div>
            </div>
        </div>
    );
};


export function MNISTDraw() {
    const { engine, utils } = useSharedResources();
    const [quantizedEmbedding, setQuantizedEmbedding] = useState<number[]>([]);
    const [prediction, setPrediction] = useState<number>(-1);
    const [witnessSer, setWitnessSer] = useState<Uint8ClampedArray | null>(null);
    const [proof, setProof] = useState<any | null>(null);
    const [generatingProof, setGeneratingProof] = useState(false);
    const [generatingVerification, setGeneratingVerifaction] = useState(false);
    const [proofDone, setProofDone] = useState(false);
    const [predictionDone, setPredictionDone] = useState(false);
    const [publicSignal, setPublicSignal] = useState<number[]>([]);
    const [isVerified, setIsVerified] = useState(false);
    const [verifyDone, setVerifyDone] = useState(false);
    const batchSize = 16;
    const [grid, setGrid] = useState(Array(size).fill(null).map(() => Array(size).fill(0))); // initialize to a 28x28 array of 0's

    // async function requestAccount() {
    //     await window.ethereum.request({ method: 'eth_requestAccounts' });
    // }

    const parseOutput = (output: any[][], scale = 14) => {
        const convertedOutput = [];
        for (let item of output[0]) {
            const result = engine.vecU64ToFloat(engine.serialize(item), scale);
            convertedOutput.push(result);
        }
        return convertedOutput;
    };

    const getPrediction = (output: any[][]) => {
        const convertedOutput = parseOutput(output);
        console.log("convertedOutput", convertedOutput);
        const index = convertedOutput.indexOf(Math.max(...convertedOutput));
        return index;
    };

    async function doProof() {
        var start = performance.now();
        // get image from grid
        var imgTensor = Array(MNISTSIZE).fill(0);
        for (let i = 0; i < size; i++) {
            for (let j = 0; j < size; j++) {
                imgTensor[i * size + j] = grid[i][j];
            }
        }
        let witness
        try {
            const { output, executionTime } = await utils.handleGenWitnessButton(
                imgTensor
            );
            witness = output
            let witnessSer = engine.deserialize(output);
            setWitnessSer(witnessSer);
            const prediction = getPrediction(witnessSer.outputs);
            setPrediction(prediction);
            setPredictionDone(true);
            console.log("witnessSer", JSON.stringify(witnessSer, null, 4));
            console.log("witness", witness);
        } catch (error) {
            console.error("An error occurred:", error);
        }
        setGeneratingProof(true);
        const { output, executionTime } = await utils.handleGenProofButton(
            new Uint8ClampedArray(witness!)
        );
        setGeneratingProof(false);
        const proof = engine.deserialize(output);

        console.log(`Proof time: ${executionTime}ms`);
        setProof(proof);
        console.log("proof", proof);
        console.log("prediction", prediction);
        setProofDone(true);
    }

    async function doVerify() {
        const result = await verifyProof(proof, publicSignal)
        if (result != null) {
            setIsVerified(result);
            setVerifyDone(true);
        }
    }

    function resetImage() {
        var newArray = Array(size).fill(null).map(_ => Array(size).fill(0));
        setGrid(newArray);
        setPredictionDone(false);
        setProofDone(false);
        setVerifyDone(false);
    }

    function handleSetSquare(myrow: number, mycol: number) {
        var newArray = [];
        for (var i = 0; i < grid.length; i++)
            newArray[i] = grid[i].slice();
        newArray[myrow][mycol] = 1;
        setGrid(newArray);
    }

    function ProofButton() {
        return (
            <Button
                className={styles.button}
                text="Classify & Prove"
                loading={generatingProof}
                loadingText="Proving..."
                onClick={doProof}
            />
        );
    }

    function VerifyButton() {
        return (
            <Button
                className={styles.button}
                text="Verify"
                loading={generatingVerification}
                loadingText="Verifying..."
                onClick={doVerify}
            />
        );
    }

    function ResetButton() {
        return (
            <Button
                className={styles.button}
                text="Reset"
                onClick={resetImage}
            />
        );
    }

    function ProofBlock() {
        return (
            <div className="proof">
                <CopyBlock
                    text={JSON.stringify(proof.proof, null, 2)}
                    language="json"
                    theme={dracula}
                />
            </div>
        );
    }

    function PredictionBlock() {
        return (
            <div className="predction color-white">
                <h2>Prediction</h2>
                {prediction}
            </div>
        );
    }

    function VerifyBlock() {
        return (
            <div className="verify">
                <h2>Verified by on-chain smart contract: {JSON.stringify(isVerified)}</h2>
            </div>
        );
    }

    return (
        <div className="MNISTPage">
            <h2>Draw and classify a digit</h2>
            <div className="container">
                <MNISTBoard grid={grid} onChange={(r, c) => handleSetSquare(r, c)} />
                <div className="buttonPanel">
                    <ProofButton />
                    <VerifyButton />
                    <ResetButton />
                </div>
            </div>
            {predictionDone && PredictionBlock()}
            {proofDone && ProofBlock()}
            {verifyDone && VerifyBlock()}
        </div>
    );
};
