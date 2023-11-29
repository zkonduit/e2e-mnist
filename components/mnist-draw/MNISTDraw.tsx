'use client'
import { Modal } from 'flowbite-react'
import { useState, FC } from 'react'
import './MNIST.css'
import './App.css'
import { useSharedResources } from '@/providers/ezkl'
import { Button } from '@/components/button/Button'
import styles from '../../app/styles.module.scss'
import { stringify } from 'json-bigint'
import { getContract } from 'wagmi/actions'
import { publicProvider } from 'wagmi/providers/public'
import { useAccount, useConnect, usePrepareContractWrite, useContractWrite, useWaitForTransaction, useDisconnect } from 'wagmi'
import { InjectedConnector } from 'wagmi/connectors/injected'
import hub from '@ezkljs/hub'
const size = 28
const MNISTSIZE = 784

const address = '0xe88e59063a5b1aA6cA20733B6DF414676Ee49Bc4'

const abi = [
    {
        "inputs": [
            {
                "internalType": "bytes",
                "name": "proof",
                "type": "bytes"
            },
            {
                "internalType": "uint256[]",
                "name": "instances",
                "type": "uint256[]"
            }
        ],
        "name": "submitDigit",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [
            {
                "internalType": "contract Verifier",
                "name": "_verifier",
                "type": "address"
            },
            {
                "internalType": "address",
                "name": "_admin",
                "type": "address"
            }
        ],
        "stateMutability": "nonpayable",
        "type": "constructor"
    },
    {
        "inputs": [],
        "name": "admin",
        "outputs": [
            {
                "internalType": "address",
                "name": "",
                "type": "address"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [
            {
                "internalType": "uint8",
                "name": "",
                "type": "uint8"
            }
        ],
        "name": "counts",
        "outputs": [
            {
                "internalType": "uint256",
                "name": "",
                "type": "uint256"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [
            {
                "internalType": "address",
                "name": "",
                "type": "address"
            }
        ],
        "name": "entered",
        "outputs": [
            {
                "internalType": "bool",
                "name": "",
                "type": "bool"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "getCounts",
        "outputs": [
            {
                "internalType": "uint256[10]",
                "name": "",
                "type": "uint256[10]"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "verifier",
        "outputs": [
            {
                "internalType": "contract Verifier",
                "name": "",
                "type": "address"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    }
]

interface IMNISTBoardProps {
    grid: number[][]
    onChange: (row: number, col: number) => void
}

const MNISTBoard: FC<IMNISTBoardProps> = ({ grid, onChange }) => {
    const [mouseDown, setMouseDown] = useState(false)

    const GridSquare = (row: number, col: number) => {
        const handleChange = () => {
            if (mouseDown) {
                onChange(row, col)
            }
        }

        const handleMouseDown = () => {
            setMouseDown(true)
            onChange(row, col)
        }

        const handleMouseUp = () => {
            setMouseDown(false)
        }

        return (
            <div
                className={`square ${grid[row][col] ? 'on' : 'off'}`}
                onMouseEnter={handleChange}
                onMouseDown={handleMouseDown}
                onMouseUp={handleMouseUp}
            />
        )
    }

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
    const { engine, utils } = useSharedResources()
    const [openModal, setOpenModal] = useState<string | undefined>()
    const props = { openModal, setOpenModal }
    const [prediction, setPrediction] = useState<number>(-1)
    const [proof, setProof] = useState<any | null>(null)
    const [buffer, setBuffer] = useState<Uint8Array | null>(null) // proof file buffer
    const [generatingProof, setGeneratingProof] = useState(false)
    const [counts, setCounts] = useState<any | null>(null)
    // On chain verification states
    const [generatingOnChainVerification, setGeneratingOnChainVerification] =
        useState(false)

    const [proofDone, setProofDone] = useState(false)
    const [grid, setGrid] = useState<number[][]>(
        Array(size)
            .fill(null)
            .map(() => Array(size).fill(0))
    ) // initialize to a 28x28 array of 0's

    const { isConnected } = useAccount()
    const { connect } = useConnect({
        connector: new InjectedConnector(),
    })
    const { disconnect } = useDisconnect()

    const {
        config,
        error: prepareError,
        isError: isPrepareError,
    } = usePrepareContractWrite({
        address: "0xe88e59063a5b1aA6cA20733B6DF414676Ee49Bc4",
        abi: [
            {
                name: 'submitDigit',
                type: 'function',
                stateMutability: 'nonpayable',
                inputs: [
                    {
                        "internalType": "bytes",
                        "name": "proof",
                        "type": "bytes"
                    },
                    {
                        "internalType": "uint256[]",
                        "name": "instances",
                        "type": "uint256[]"
                    }
                ],
                outputs: [],
            },
        ],
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

    // Replace with your contract's ABI and address

    const provider = publicProvider()

    // Instantiate the contract using wagmi's getContract hook
    const contract = getContract({
        address: "0xe88e59063a5b1aA6cA20733B6DF414676Ee49Bc4",
        abi: abi,
        walletClient: provider,
        chainId: 10,
    })


    const parseOutput = (output: any[][]) => {
        const convertedOutput = []
        for (let item of output[0]) {
            const result = engine.vecU64ToInt(engine.serialize(item))
            const resultInt = engine.deserialize(result)
            convertedOutput.push(resultInt)
        }
        return convertedOutput
    }


    async function doProof() {
        // get image from grid
        let imgTensor: number[] = Array(MNISTSIZE).fill(0)
        for (let i = 0; i < size; i++) {
            for (let j = 0; j < size; j++) {
                imgTensor[i * size + j] = grid[i][j]
            }
        }

        // console.log('imgTensor', imgTensor)
        const inputFile = JSON.stringify({ input_data: [imgTensor] })

        const url = 'https://hub-staging.ezkl.xyz/graphql'

        const artifactId = "04c04f68-0420-488a-8335-203a035b9d88"
        setGeneratingProof(true)
        try {
            const initiateProofResp = await hub.initiateProof({
                artifactId,
                inputFile,
                url,
            })
            // console.log('initiateProofResp', initiateProofResp)

            let { status } = initiateProofResp
            const { id } = initiateProofResp

            let getProofResp
            while (status !== 'SUCCESS') {
                getProofResp = await hub.getProof({
                    id,
                    url,
                })

                status = getProofResp.status

                if (status === 'SUCCESS') {
                    break
                }
                await new Promise((resolve) => setTimeout(resolve, 2_000))
            }
            console.log('getProofResp', getProofResp?.instances)

            const p = BigInt(
                '0x30644e72e131a029b85045b68181585d2833e84879b9709143e1f593f0000001'
            )
            setProof(getProofResp)
            console.log('proof', JSON.stringify(getProofResp?.instances))
            console.log("proof", getProofResp?.proof)
            const results = getProofResp?.instances?.map((instance) => {
                const bigInst = BigInt(instance)
                // is negative
                if (bigInst > BigInt(2) ** BigInt(128) - BigInt(1)) {
                    return bigInst - p
                } else {
                    return bigInst
                }
            })

            console.log('results', results)

            if (!results || results.length === 0) {
                throw new Error('Array is empty')
            }

            // find the the index of the max value of the results array which contains BigInts
            // const index = results?.indexOf(results.reduce((a, b) => (a > b ? a : b)))
            if (results.length === 0) {
                throw new Error('Array is empty')
            }

            let maxIndex = 0
            let maxValue = results[0] // Assuming results is a non-empty array of BigInts

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
            console.log('error', error)
        }
        setGeneratingProof(false)
    }


    async function doOnChainVerify() {
        if (!write) { return }
        write()
    }

    function resetImage() {
        var newArray = Array(size)
            .fill(null)
            .map((_) => Array(size).fill(0))
        setGrid(newArray)
        setProofDone(false)
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
                text='Verify on chain'
                disabled={!proofDone || !write || isLoading}
                loading={isLoading}
                loadingText='Verifying...'
                onClick={doOnChainVerify}
            />
        )
    }

    function ConnectWalletButton() {
        if (isConnected)
            return (
                <div>
                    <Button text='Disconnect' className={styles.button} onClick={() => disconnect()} />
                </div >
            )
        return <Button text='Connect' className={styles.button} onClick={() => connect()}>Connect Wallet</Button>
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
                    type='submit'
                    onClick={() => utils.handleFileDownload('test.pf', buffer!)}
                    text='Download Proof File'
                />
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
                <h2>Prediction</h2>
                {prediction}
            </div>
        )
    }

    async function getCounts() {
        let result = await contract.read.getCounts()
        result = stringify(result)
        setCounts(result);
    }

    function VerifyOnChainBlock() {
        return (
            <div className='verify'>
                <h1 className='text-2xl'>
                    Verified by on chain smart { }
                    <a
                        href={`https://optimistic.etherscan.io/address/0x2619aed377c6fc5bdc56d30a4347406de9cd2a2c`}
                        target='_blank'
                        rel='noopener noreferrer'
                        style={{ textDecoration: 'underline' }}
                    >
                        contract
                    </a>
                </h1>
                <h1 className='text-2xl'>
                    <Button
                        className={styles.button}
                        onClick={async () => await getCounts()}
                        data-modal-target='witness-modal'
                        data-modal-toggle='witness-modal'
                        text='Show MNIST Clan Digit results'
                    />
                </h1>
                <h1 className='text-2xl'>
                    {counts}
                </h1>
            </div>
        )
    }

    if (isPrepareError || isError) {
        window.alert(`Transaction Failed: ${(prepareError || error)?.message}`)
    }

    return (
        <div className='MNISTPage'>
            <h1 className='text-2xl'>Draw and classify a digit</h1>
            <MNISTBoard grid={grid} onChange={(r, c) => handleSetSquare(r, c)} />
            <div className='buttonPanel'>
                {proofDone && <ConnectWalletButton />}
                <ProofButton />
                <VerifyOnChainButton />
                <ResetButton />
            </div>
            {proofDone && PredictionBlock()}
            {proofDone && ProofBlock()}
            {isSuccess && VerifyOnChainBlock()}
        </div>
    )
}
