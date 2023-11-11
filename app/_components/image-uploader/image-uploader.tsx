"use client";
import { preprocessImage } from "@/lib/image-processing";
import styles from "./image-uploader.module.scss";
import { FileUploader } from "@/components/file-uploader/FileUploader";
import { useRef, useState } from "react";
import { useSharedResources } from "@/providers/ezkl";
import { Button } from "@/components/button/Button";
import { Proof } from "@/type";
import { BigNumber } from "ethers";
import Image from "next/image";

export default function ImageUploader() {
  const { engine, utils } = useSharedResources();
  const fileUploaderRef = useRef<HTMLInputElement>();
  const [file, setFile] = useState<{
    file?: File | undefined;
    url: string;
  }>();
  const [processingImage, setProcessingImage] = useState(false);
  const [generatingProof, setGeneratingProof] = useState(false);
  const [prediction, setPrediction] = useState<number>(-1);

  const generateWitness = async () => {
    const imageTensor = await preprocessImage(file?.file!);
    try {
      const { output, executionTime } = await utils.handleGenWitnessButton(
        imageTensor
      );
      const witness = engine.deserialize(output);
      console.log("witness", witness);
      return output;
    } catch (error) {
      console.error("An error occurred:", error);
    }
  };

  const verifyProof = async (proof: any) => {
    // Transform the proof object into a Uint8ClampedArray
    const convertedProof = engine.serialize(proof);
    const verifRes = await utils.handleVerifyButton(convertedProof);
    return verifRes;
  };

  const onUpload = async () => {
    if (fileUploaderRef && fileUploaderRef.current) {
      setProcessingImage(true);
      fileUploaderRef.current.click();
    }
  };

  const parseOutput = (output: BigNumber[][], scale = 14) => {
    const convertedOutput = [];
    for (let item of output[0]) {
      const result = engine.vecU64ToFloat(engine.serialize(item), scale);
      convertedOutput.push(result);
    }
    return convertedOutput;
  };

  const getPrediction = (output: BigNumber[][]) => {
    const convertedOutput = parseOutput(output);
    console.log("convertedOutput", convertedOutput);
    const index = convertedOutput.indexOf(Math.max(...convertedOutput));
    return index;
  };

  const onGenerateProof = async () => {
    try {
      setGeneratingProof(true);
      const witness = await generateWitness();
      const { output } = await utils.handleGenProofButton(
        new Uint8ClampedArray(witness!)
      );
      const proof: Proof = engine.deserialize(output);
      console.log("proof", proof);
      const prediction = getPrediction(proof.instances);
      setPrediction(prediction);
      console.log("prediction", prediction);
      const verifRes = await verifyProof(proof);
      console.log("verifRes", verifRes);
      setGeneratingProof(false);
    } catch (error) {
      console.error("An error occurred:", error);
    }
  };

  return (
    <div className={styles.container}>
      <FileUploader
        onFileUploaded={(file) => {
          setFile(file);
          setProcessingImage(false);
          setPrediction(-1);
        }}
        inputRef={fileUploaderRef}
      />
      {file && file.url && (
        <div className={styles.image}>
          <Image
            alt=""
            src={file?.url}
            fill
            style={{
              objectFit: "contain",
            }}
          />
        </div>
      )}
      {prediction >= 0 && (
        <div>
          <p className={styles.prediction__label}>This looks like a</p>
          <p className={styles.prediction__value}>{prediction}</p>
        </div>
      )}
      <div className={styles.buttons}>
        <Button
          className={styles.button}
          text="Upload"
          loading={processingImage}
          loadingText="Uploading..."
          onClick={onUpload}
        />
        {file && (
          <Button
            className={styles.button}
            text="Generate proof"
            loading={generatingProof}
            loadingText="Generating..."
            onClick={onGenerateProof}
          />
        )}
      </div>
    </div>
  );
}
