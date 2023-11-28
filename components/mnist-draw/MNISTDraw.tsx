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
import hub from '@ezkljs/hub'
const size = 28
const MNISTSIZE = 784

const address = '0xAB5d009d3dcbdCB8432e53cde6BeF4A38Db7Bdc4'

const abi = [
  {
    inputs: [
      {
        internalType: 'bytes',
        name: 'proof',
        type: 'bytes',
      },
      {
        internalType: 'uint256[]',
        name: 'instances',
        type: 'uint256[]',
      },
    ],
    name: 'verifyProof',
    outputs: [
      {
        internalType: 'bool',
        name: '',
        type: 'bool',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
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
  const [artifactId, setArtifactId] = useState<string>('')
  const { engine, utils } = useSharedResources()
  const [openModal, setOpenModal] = useState<string | undefined>()
  const props = { openModal, setOpenModal }
  const [prediction, setPrediction] = useState<number>(-1)
  const [proof, setProof] = useState<any | null>(null)
  const [buffer, setBuffer] = useState<Uint8Array | null>(null) // proof file buffer
  const [generatingProof, setGeneratingProof] = useState(false)
  // On chain verification states
  const [generatingOnChainVerification, setGeneratingOnChainVerification] =
    useState(false)
  const [isVerifiedOnChain, setIsVerifiedOnChain] = useState(false)
  const [verifyOnChainDone, setVerifyOnChainDone] = useState(false)
  // In browser verification states
  const [generatingInBrowserVerification, setGeneratingInBrowserVerification] =
    useState(false)
  const [isVerifiedInBrowser, setIsVerifiedInBrowser] = useState(false)
  const [verifyInBrowserDone, setVerifyInBrowserDone] = useState(false)

  const [proofDone, setProofDone] = useState(false)
  const [predictionDone, setPredictionDone] = useState(false)
  const [grid, setGrid] = useState<number[][]>(
    Array(size)
      .fill(null)
      .map(() => Array(size).fill(0))
  ) // initialize to a 28x28 array of 0's

  const parseInputs = (inputs: string[]) => {
    const convertedInputs = []
    for (let item of inputs) {
      const result = BigInt(item)
      convertedInputs.push(result)
    }
    return convertedInputs
  }

  const parseOutput = (output: any[][]) => {
    const convertedOutput = []
    for (let item of output[0]) {
      const result = engine.vecU64ToInt(engine.serialize(item))
      const resultInt = engine.deserialize(result)
      convertedOutput.push(resultInt)
    }
    return convertedOutput
  }

  const getPrediction = (output: any[][]) => {
    const convertedOutput = parseOutput(output)
    console.log('convertedOutput', convertedOutput)
    const index = convertedOutput.indexOf(Math.max(...convertedOutput))
    return index
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
    // imgTensor = [
    //   0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
    //   0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
    //   0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
    //   0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
    //   0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
    //   0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
    //   0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
    //   0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
    //   0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
    //   0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
    //   0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
    //   0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
    //   0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
    //   0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
    //   0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
    //   0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
    //   0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
    //   0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
    //   0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
    //   0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
    //   0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
    //   0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
    //   0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
    //   0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
    //   0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
    //   0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
    //   0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
    //   0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
    //   0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
    //   0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
    //   0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
    //   0, 0, 0, 0, 0, 0, 0, 0, 0,
    // ]

    console.log('imgTensor', imgTensor)
    // const artifactId = 'c1cb0bea-5b9d-421c-89a8-65b8886d6251'
    // const artifactId = '88676bfc-8421-48d1-84a7-8551216397cf'
    const inputFile = JSON.stringify({ input_data: [imgTensor] })

    const url = 'https://hub-staging.ezkl.xyz/graphql'

    try {
      const initiateProofResp = await hub.initiateProof({
        artifactId,
        inputFile,
        url,
      })
      console.log('initiateProofResp', initiateProofResp)

      let { status } = initiateProofResp
      const { id } = initiateProofResp

      let getProofResp
      while (status !== 'SUCCESS') {
        await new Promise((resolve) => setTimeout(resolve, 5_000))

        getProofResp = await hub.getProof({
          id,
          url,
        })

        status = getProofResp.status
        console.log('getProofResp', getProofResp)
      }

      const p = BigInt(
        '0x30644e72e131a029b85045b68181585d2833e84879b9709143e1f593f0000001'
      )
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
      console.log('maxIndex', maxIndex)

      // console.log('index', index)
    } catch (error) {
      console.log('error', error)
    }

    return

    let witnessSer
    try {
      const { output } = await utils.handleGenWitnessButton(imgTensor)
      witnessSer = output
      let witness = engine.deserialize(output)
      const prediction = getPrediction(witness.outputs)
      setPrediction(prediction)
      setPredictionDone(true)
    } catch (error) {
      console.error('An error occurred:', error)
    }
    setGeneratingProof(true)
    const { output, executionTime } = await utils.handleGenProofButton(
      new Uint8ClampedArray(witnessSer!)
    )
    setBuffer(output)
    setGeneratingProof(false)
    const proof = engine.deserialize(output)

    console.log(`Proving time: ${executionTime}ms`)
    let instances = []
    // console.log("proof instances", proof.instances);
    for (let i = 0; i < proof.instances[0].length; i++) {
      let intSerialized = engine.serialize(proof.instances[0][i])
      let intHex = engine.vecU64ToFelt(intSerialized)
      let int = BigInt(intHex).toString()
      instances.push(int)
    }
    const proofObj = {
      proof: engine.printProofHex(new Uint8ClampedArray(output)),
      instances,
    }
    setProof(proofObj)
    console.log('proof', proof)

    setProofDone(true)
  }

  async function doInBrowserVerify() {
    const { output, executionTime } = await utils.handleVerifyButton(
      new Uint8ClampedArray(buffer!)
    )
    console.log(`Verifying in browser time: ${executionTime}ms`)
    setIsVerifiedInBrowser(output)
    setVerifyInBrowserDone(true)
  }

  async function doOnChainVerify() {
    // Replace with your contract's ABI and address

    const provider = publicProvider()

    // Instantiate the contract using wagmi's getContract hook
    const contract = getContract({
      address: address,
      abi: abi,
      walletClient: provider,
      chainId: 80001,
    })

    try {
      let result: boolean
      result = (await contract.read.verifyProof([
        `0x${proof.proof}`,
        proof.instances,
      ])) as boolean

      setIsVerifiedOnChain(result)
      setVerifyOnChainDone(true)
    } catch (error) {
      // window error popup
      window.alert(`Verification failed with error: ${error}`)
      console.log(`Verification failed with error: ${error}`)
      setVerifyOnChainDone(false)
    }
  }

  function resetImage() {
    var newArray = Array(size)
      .fill(null)
      .map((_) => Array(size).fill(0))
    setGrid(newArray)
    setPredictionDone(false)
    setProofDone(false)
    setVerifyInBrowserDone(false)
    setVerifyOnChainDone(false)
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

  function VerifyInBrowserButton() {
    return (
      <Button
        className={styles.button}
        text='Verify in Browser'
        disabled={!proofDone}
        loading={generatingInBrowserVerification}
        loadingText='Verifying...'
        onClick={doInBrowserVerify}
      />
    )
  }

  function VerifyOnChainButton() {
    return (
      <Button
        className={styles.button}
        text='Verify on chain'
        disabled={!proofDone}
        loading={generatingOnChainVerification}
        loadingText='Verifying...'
        onClick={doOnChainVerify}
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

  function VerifyInBrowserBlock() {
    return (
      <div className='verify'>
        <h1 className='text-2xl'>
          Verified in the browser: {JSON.stringify(isVerifiedInBrowser)}
        </h1>
      </div>
    )
  }

  function VerifyOnChainBlock() {
    return (
      <div className='verify'>
        <h1 className='text-2xl'>
          Verified by on chain smart {}
          <a
            href={`https://mumbai.polygonscan.com/address/${address}`}
            target='_blank'
            rel='noopener noreferrer'
            style={{ textDecoration: 'underline' }}
          >
            contract
          </a>
          : {JSON.stringify(isVerifiedOnChain)}
        </h1>
      </div>
    )
  }

  return (
    <div className='MNISTPage'>
      <h1 className='text-2xl'>Draw and classify a digit</h1>
      <MNISTBoard grid={grid} onChange={(r, c) => handleSetSquare(r, c)} />
      <input
        className='m-auto w-3/12 mt-5'
        type='text'
        value={artifactId}
        placeholder='Artifact ID'
        onChange={(e) => {
          // console.log('artifactId', artifactId)
          setArtifactId(e.target.value)
        }}
      />
      <div className='buttonPanel'>
        <ProofButton />
        <VerifyInBrowserButton />
        <VerifyOnChainButton />
        <ResetButton />
      </div>
      {predictionDone && PredictionBlock()}
      {proofDone && ProofBlock()}
      {verifyInBrowserDone && VerifyInBrowserBlock()}
      {verifyOnChainDone && VerifyOnChainBlock()}
    </div>
  )
}
