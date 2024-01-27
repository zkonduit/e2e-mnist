'use client'
import { Modal } from 'flowbite-react'
import { useState, useEffect, FC } from 'react'
import './MNIST.css'
import './App.css'
import { Button } from '@/components/button/Button'
import styles from '../../app/styles.module.scss'
import { stringify } from 'json-bigint'
import { getContract } from 'wagmi/actions'
import { publicProvider } from 'wagmi/providers/public'
import { useAccount, usePrepareContractWrite, useContractWrite, useWaitForTransaction } from 'wagmi'
import { ConnectButton } from '@rainbow-me/rainbowkit';
import BarGraph from '../bargraph/BarGraph'; // Adjust the path as necessary
import MNIST from '../../contract_data/MnistClan.json'
import Verifier from '../../contract_data/Halo2Verifier.json'
import axios from 'axios'
const size = 28
const MNISTSIZE = 784

interface IMNISTBoardProps {
    grid: number[][]
    onChange: (row: number, col: number) => void
}

const MNISTBoard: FC<IMNISTBoardProps> = ({ grid, onChange }) => {
    const [mouseDown, setMouseDown] = useState(false)

    const GridSquare = (row: number, col: number) => {
        const handleChange = () => {
            if (mouseDown) {
                onChange(row, col);
            }
        };

        const handleInteractionStart = () => {
            setMouseDown(true);
            onChange(row, col);
        };

        const handleInteractionEnd = () => {
            setMouseDown(false);
        };

        return (
            <div
                className={`square ${grid[row][col] ? 'on' : 'off'}`}
                onMouseEnter={handleChange}
                onMouseDown={handleInteractionStart}
                onMouseUp={handleInteractionEnd}
                onTouchStart={handleInteractionStart}
                onTouchEnd={handleInteractionEnd}
            />
        );
    };


    const renderCol = (col: number) => {
        const mycol = []
        for (let row = 0; row < size; row++) {
            mycol.push(<div key={`row-${row}`}>{GridSquare(row, col)}</div>)
        }
        return <div key={`col-${col}`}>{mycol}</div>
    }

    const RenderGrid = () => {
        const mygrid = []
        for (let i = 0; i < size; i++) {
            mygrid.push(renderCol(i))
        }
        return mygrid
    }

    return (
        <div className='MNISTBoard'>
            <div className='centerObject'>
                <div className='grid'>{RenderGrid()}</div>
            </div>
        </div>
    )
}

export function MNISTDraw() {
    const [openModal, setOpenModal] = useState<string | undefined>()
    const props = { openModal, setOpenModal }
    const [prediction, setPrediction] = useState<number>(-1)
    const [proof, setProof] = useState<any | null>(null)
    const [generatingProof, setGeneratingProof] = useState(false)
    const [counts, setCounts] = useState<number[] | null>(null)
    const [clan, setClan] = useState<number | null>(null)
    const [clanRank, setClanRank] = useState<number | null>(null)
    const [verifyResult, setVerifyResult] = useState<boolean | null>(null)

    const [proofDone, setProofDone] = useState(false)
    const [grid, setGrid] = useState<number[][]>(
        Array(size)
            .fill(null)
            .map(() => Array(size).fill(0))
    ) // initialize to a 28x28 array of 0's

    const { address, isConnected } = useAccount()

    const {
        config
    } = usePrepareContractWrite({
        address: MNIST.address as `0x${string}`,
        abi: MNIST.abi,
        functionName: 'submitDigit',
        args: [
            proof?.proof,
            proof?.instances
        ],
        enabled: true,
    })
    const { data, error, isError, write } = useContractWrite(config)
    const { isLoading, isSuccess } = useWaitForTransaction({
        hash: data?.hash,
    })

    const provider = publicProvider()

    // Instantiate the contract using wagmi's getContract hook
    const contract = getContract({
        address: MNIST.address as `0x${string}`,
        abi: MNIST.abi,
        walletClient: publicProvider(),
        chainId: 420,
    })

    async function getAccountClanInfo() {
        let entry = await contract.read.entered([address]) as boolean
        let clan = await contract.read.clan([address]) as number
        setClan(entry ? clan : null)
        console.log('entry', entry)
        console.log('clan', clan)
        let counts = await contract.read.getCounts() as number[]
        // convert BigInt to number
        counts = counts.map((count) => Number(count))
        // determine clan rank
        setCounts(counts)
        if (!entry) {
            return
        }
        let rank = 1
        for (let i = 0; i < counts.length; i++) {
            if (counts[i] > counts[clan]) {
                rank++
            }
        }
        setClanRank(rank)
        console.log('counts', counts)
    }

    useEffect(() => {
        (async () => {
            if (isConnected && (!clan || isSuccess)) {
                getAccountClanInfo()
            }
            if (!isConnected && clan) {
                setClan(null)
                setCounts(null)
            }
        })()
    }, [isConnected, isSuccess, address])

    // Reload clan info when account changes
    useEffect(() => {
        if (isConnected) {
            setClan(null)
            setCounts(null)
        }
    }, [address, isConnected]);

    function ShowClanResultsBlock() {
        if (!counts) {
            return
        }
        return (
            <div>
                <div className="MNISTClanChart">
                    <div className="chart-container">
                        <BarGraph data={counts} />
                    </div>
                </div>

            </div>
        )
    }


    async function doProof() {
        // get image from grid
        let imgTensor: number[] = Array(MNISTSIZE).fill(0)
        for (let i = 0; i < size; i++) {
            for (let j = 0; j < size; j++) {
                imgTensor[i * size + j] = grid[i][j]
            }
        }

        const inputFile = JSON.stringify({ input_data: [imgTensor] })

        setGeneratingProof(true)
        try {
            let formData = new FormData();
            formData.append("data", new Blob([inputFile], { type: "application/json" }));

            // API request to update artifacts with new input.json using axios
            await axios.put(`${process.env.NEXT_PUBLIC_ARCHON_URL}/artifact/mnist`, formData, {
                headers: {
                    'X-API-KEY': process.env.NEXT_PUBLIC_ARCHON_API_KEY,
                    'Content-Type': 'multipart/form-data'
                }
            });

            // Prepare data for gen-witness and prove requests
            const requestBody = [
                {
                    "ezkl_command": {
                        "GenWitness": {
                            "data": "input.json",
                            "compiled_circuit": "model.compiled",
                            "output": "witness.json",
                        },
                    },
                    "working_dir": "idol_model_2",
                },
                {
                    "ezkl_command": {
                        "Prove": {
                            "witness": "witness.json",
                            "compiled_circuit": "model.compiled",
                            "pk_path": "pk.key",
                            "proof_path": "proof.json",
                            "srs_path": null,
                            "proof_type": "Single",
                            "check_mode": "UNSAFE",
                        },
                    },
                    "working_dir": "mnist",
                },
            ];

            // Prove request using axios
            const proveRes = await axios.post(`${process.env.NEXT_PUBLIC_ARCHON_URL}/spell}`, requestBody, {
                headers: {
                    'X-API-KEY': process.env.NEXT_PUBLIC_ARCHON_API_KEY,
                    'Content-Type': 'application/json'
                }
            });

            console.log("full data: ", proveRes.data);
            console.log("id: ", proveRes.data.id);

            let getProofResp
            let status = null
            while (status !== 'SUCCESS') {
                getProofResp = await axios.get(`${process.env.NEXT_PUBLIC_BACKEND}/spell/${proveRes.data.id}`);
                status = getProofResp.data.status
                if (status === 'SUCCESS') {
                    break
                }
                await new Promise((resolve) => setTimeout(resolve, 2_000))
            }
            setProof(getProofResp?.data)
            const results = getProofResp?.data?.pretty_public_inputs?.rescaled_outputs

            console.log('results', results)

            if (!results || results.length === 0) {
                throw new Error('Array is empty')
            }

            let maxIndex = 0
            let maxValue = results[0]

            for (let i = 1; i < results.length; i++) {
                if (results[i] > maxValue) {
                    maxValue = results[i]
                    maxIndex = i
                }
            }
            setPrediction(maxIndex)
            setProofDone(true)
            // console.log('index', index)
        } catch (error) {
            alert(error);
            console.log('error', error)
        }
        setGeneratingProof(false)
    }


    async function doOnChainVerify() {

        let verifierContract = getContract({
            address: Verifier.address as `0x${string}`,
            abi: Verifier.abi,
            walletClient: provider,
            chainId: 420,
        })

        let result = await verifierContract.read.verifyProof([proof?.hex_proof, proof?.pretty_public_inputs?.outputs]) as boolean
        setVerifyResult(result);
    }

    async function doSubmitMnistDigit() {
        if (!write) { return }
        write()
    }

    function resetImage() {
        var newArray = Array(size)
            .fill(null)
            .map((_) => Array(size).fill(0))
        setGrid(newArray)
        setProofDone(false)
        setVerifyResult(null)
    }

    function handleSetSquare(myrow: number, mycol: number) {
        var newArray = []
        for (var i = 0; i < grid.length; i++) newArray[i] = grid[i].slice()
        newArray[myrow][mycol] = 1
        setGrid(newArray)
    }

    function ProofButton() {
        return (
            <Button
                className={styles.button}
                text='Classify & Prove'
                loading={generatingProof}
                loadingText='Proving...'
                onClick={doProof}
            />
        )
    }

    function VerifyOnChainButton() {
        return (
            <Button
                className={styles.button}
                text='Verify On Chain'
                disabled={!proofDone}
                loading={isLoading}
                loadingText='Verifying...'
                onClick={doOnChainVerify}
            />
        )
    }

    function SubmitMnistDigitButton() {
        return (
            <Button
                className={styles.button}
                text='Submit Mnist Digit'
                disabled={!proofDone || !write || isLoading}
                loading={isLoading}
                loadingText='Verifying...'
                onClick={doSubmitMnistDigit}
            />
        )
    }

    function ResetButton() {
        return (
            <Button className={styles.button} text='Reset' onClick={resetImage} />
        )
    }

    function ProofBlock() {
        return (
            <div className='proof'>
                <Button
                    className='w-auto'
                    onClick={() => props.setOpenModal('default')}
                    data-modal-target='witness-modal'
                    data-modal-toggle='witness-modal'
                    text='Show Proof'
                />
                <Modal
                    show={props.openModal === 'default'}
                    onClose={() => props.setOpenModal(undefined)}
                >
                    <Modal.Header>Proof: </Modal.Header>
                    <Modal.Body className='bg-black'>
                        <div className='mt-4 p-4 bg-black-100 rounded'>
                            <pre className='blackspace-pre-wrap'>
                                {stringify(proof, null, 6)}
                            </pre>
                        </div>
                    </Modal.Body>
                </Modal>
            </div>
        )
    }

    function PredictionBlock() {
        return (
            <div className='predction color-white'>
                <h1>Prediction</h1>
                {prediction}
            </div>
        )
    }

    function VerifyOnChainBlock() {
        return (
            <div className='verify'>
                <h1 className='text-2xl'>
                    Verified on chain: { }
                    <a
                        href={`https://goerli-optimism.etherscan.io/address/${Verifier.address}#code`}
                        target='_blank'
                        rel='noopener noreferrer'
                        style={{ textDecoration: 'underline' }}
                    >
                        {Verifier.address}
                    </a>
                </h1>
            </div>
        )
    }

    if (proofDone && isError) {
        window.alert(`Transaction failed on MnistClan contract:${error?.message}`)
    }

    return (
        <div className='MNISTPage'>
            <h1 className='text-2xl'>Draw and classify a digit</h1>
            <MNISTBoard grid={grid} onChange={(r, c) => handleSetSquare(r, c)} />
            <div className='flex justify-center pt-7'>
                <ConnectButton />
            </div>
            {clan && <h1 className='text-2xl pt-7'>Your MNIST Clan: {clan} </h1>}
            {clan && <h1 className='text-2xl'>Your Clan Rank: {clanRank} </h1>}
            <div className='buttonPanel'>
                <ProofButton />
                {clan ? <VerifyOnChainButton /> : <SubmitMnistDigitButton />}
                <ResetButton />
            </div>
            {proofDone && PredictionBlock()}
            {proofDone && ProofBlock()}
            {(isSuccess || !(verifyResult == null)) && VerifyOnChainBlock()}
            {clan && ShowClanResultsBlock()}
        </div>
    )
}
