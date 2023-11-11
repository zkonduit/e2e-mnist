import {
  elgamalGenRandom,
  elgamalEncrypt,
  elgamalDecrypt,
  prove,
  poseidonHash,
  verify,
  genWitness,
  genVk,
  genPk,
} from "@ezkljs/engine/web";
import localEVMVerify from "@ezkljs/verify";
import { Hardfork } from "@ezkljs/verify";
import JSZip from "jszip";
import { saveAs } from "file-saver";
import JSONBig from "json-bigint";
// import type { Tensor } from "@tensorflow/tfjs";

async function getDataBuffer(name: string): Promise<ArrayBuffer> {
  // Helper function to fetch and create a file object from a public URL
  const fetchAndCreateBuffer = async (path: string): Promise<ArrayBuffer> => {
    const response = await fetch(path);
    const buffer = await response.arrayBuffer();
    return buffer;
  };

  // Fetch each sample file and create a File object
  const buffer = await fetchAndCreateBuffer(
    `https://wagmi-studio.fra1.cdn.digitaloceanspaces.com/secret-id/${name}`
  );
  return buffer;
}

export function readUploadedFileAsBuffer(file: File) {
  return new Promise<Uint8ClampedArray>((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (event) => {
      if (event.target && event.target.result instanceof ArrayBuffer) {
        resolve(new Uint8ClampedArray(event.target.result));
      } else {
        reject(new Error("Failed to read file"));
      }
    };

    reader.onerror = (error) => {
      reject(new Error("File could not be read: " + error));
    };
    reader.readAsArrayBuffer(file);
  });
}

interface FileDownloadProps {
  fileName: string;
  buffer: Uint8Array | null;
  handleDownloadCompleted: () => void;
}

export function handleFileDownload(fileName: string, buffer: Uint8Array) {
  // Create a blob from the buffer
  const blob = new Blob([buffer], { type: "application/octet-stream" });

  // Create an Object URL from the blob
  const url = window.URL.createObjectURL(blob);

  // Create an anchor element for the download
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);

  // Trigger the download by simulating a click on the anchor element
  a.click();

  // Remove the anchor element after download
  document.body.removeChild(a);

  // Free up the Object URL
  window.URL.revokeObjectURL(url);
}

export function ElgamalZipFileDownload(fileName: string, buffer: Uint8Array) {
  const blob = new Blob([buffer], { type: "application/octet-stream" });
  const reader = new FileReader();

  reader.onloadend = async () => {
    const base64data = reader.result;

    if (typeof base64data === "string") {
      const elgamalVar = JSONBig.parse(atob(base64data.split(",")[1]));

      // Create a new Zip file
      var zip = new JSZip();
      zip.file("pk.txt", JSONBig.stringify(elgamalVar.pk));
      zip.file("r.txt", JSONBig.stringify(elgamalVar.r));
      zip.file("sk.txt", JSONBig.stringify(elgamalVar.sk));

      // Generate the zip file asynchronously
      const content = await zip.generateAsync({ type: "blob" });

      saveAs(content, fileName);
    }
  };

  // Convert the Blob to a Data URL
  reader.readAsDataURL(blob);
}

type FileMapping = {
  [key: string]: File;
};

type FileSerMapping = {
  [key: string]: Uint8ClampedArray;
};

async function convertFilesToFilesSer<T extends FileMapping>(
  files: T
): Promise<FileSerMapping> {
  const fileReadPromises = Object.entries(files).map(async ([key, file]) => {
    const fileContent = await readUploadedFileAsBuffer(file);
    return { key, fileContent };
  });

  const fileContents = await Promise.all(fileReadPromises);

  const filesSer: FileSerMapping = {};
  for (const { key, fileContent } of fileContents) {
    filesSer[key] = fileContent;
  }

  return filesSer;
}

interface Uint8ArrayResult {
  output: Uint8Array;
  executionTime: number;
}

export async function handleGenProofButton(witness: Uint8ClampedArray) {
  const start = performance.now(); // Start the timer
  console.log("proof start")
  let output = prove(
    witness,
    new Uint8ClampedArray(await getDataBuffer("key.pk")),
    new Uint8ClampedArray(await getDataBuffer("compiled_model.ezkl")),
    new Uint8ClampedArray(await getDataBuffer("kzg.srs"))
  );

  const end = performance.now(); // End the timer

  return {
    output,
    executionTime: end - start,
  };
}

export function handleGenREVButton(): Uint8Array {
  const seed = generate256BitSeed();
  return elgamalGenRandom(seed);
}

export async function handleGenElgamalEncryptionButton<T extends FileMapping>(
  files: T
): Promise<Uint8ArrayResult> {
  const result = await convertFilesToFilesSer(files);

  const start = performance.now(); // Start the timer

  let output = elgamalEncrypt(result["pk"], result["message"], result["r"]);

  const end = performance.now(); // End the timer

  return {
    output: output,
    executionTime: end - start,
  };
}

export async function handleGenElgamalDecryptionButton<T extends FileMapping>(
  files: T
): Promise<Uint8ArrayResult> {
  const result = await convertFilesToFilesSer(files);
  const start = performance.now(); // Start the timer

  let output = elgamalDecrypt(result["cipher"], result["sk"]);

  const end = performance.now(); // End the timer

  return {
    output: output,
    executionTime: end - start,
  };
}

export async function handleGenWitnessButton(
  input: any[]
): Promise<Uint8ArrayResult> {
  const start = performance.now(); // Start the timer
  const formattedInput = {
    input_data: [input],
  };
  console.log("formattedInput", formattedInput);
  let output = genWitness(
    new Uint8ClampedArray(await getDataBuffer("compiled_model.ezkl")),
    new Uint8ClampedArray(
      new TextEncoder().encode(JSON.stringify(formattedInput))
    )
  );

  /*let witness = deserialize(output);

  console.log(JSON.stringify(witness, null, 2));*/

  const end = performance.now(); // End the timer

  return {
    output: output,
    executionTime: end - start,
  };
}

export async function handleGenVkButton<T extends FileMapping>(
  files: T
): Promise<Uint8ArrayResult> {
  const result = await convertFilesToFilesSer(files);
  const start = performance.now(); // Start the timer

  let output = genVk(result["compiled_onnx"], result["srs"]);

  const end = performance.now(); // End the timer

  return {
    output: output,
    executionTime: end - start,
  };
}

export async function handleGenPkButton<T extends FileMapping>(
  files: T
): Promise<Uint8ArrayResult> {
  const result = await convertFilesToFilesSer(files);
  const start = performance.now(); // Start the timer

  let output = genPk(result["vk"], result["compiled_onnx"], result["srs"]);

  const end = performance.now(); // End the timer

  return {
    output: output,
    executionTime: end - start,
  };
}

interface HashResult {
  output: Uint8ClampedArray;
  executionTime: number;
}

export async function handleGenHashButton(message: File): Promise<HashResult> {
  const message_hash = await readUploadedFileAsBuffer(message);
  const start = performance.now(); // Start the timer
  const output = poseidonHash(message_hash);
  const end = performance.now(); // End the timer
  return {
    output: output,
    executionTime: end - start,
  };
}

interface VerifyResult {
  output: boolean;
  executionTime: number;
}

export async function handleVerifyButton(
  proof: Uint8ClampedArray
): Promise<VerifyResult> {
  const start = performance.now(); // Start the timer

  let output = verify(
    proof,
    new Uint8ClampedArray(await getDataBuffer("key.vk")),
    new Uint8ClampedArray(await getDataBuffer("settings.json")),
    new Uint8ClampedArray(await getDataBuffer("kzg.srs"))
  );

  const end = performance.now(); // End the timer

  return {
    output: output,
    executionTime: end - start,
  };
}

export async function handleEvmVerifyButton<T extends FileMapping>(
  files: T,
  evmVersion: Hardfork
): Promise<VerifyResult> {
  const result = await convertFilesToFilesSer(files);
  console.log("evmVersion", evmVersion);

  const start = performance.now(); // Start the timer

  let output = await localEVMVerify(
    result["proof"],
    new TextDecoder().decode(result["bytecodeVerifier"]),
    evmVersion
  );

  const end = performance.now(); // End the timer

  return {
    output: output,
    executionTime: end - start,
  };
}

function stringToUint8Array(str: string): Uint8Array {
  const encoder = new TextEncoder();
  const uint8Array = encoder.encode(str);
  return uint8Array;
}

function generate256BitSeed(): Uint8ClampedArray {
  const uuid = self.crypto.randomUUID();
  const buffer = stringToUint8Array(uuid);
  let seed = self.crypto.getRandomValues(buffer);
  seed = seed.slice(0, 32);
  return new Uint8ClampedArray(seed.buffer);
}
