import {
  prove,
  verify,
  genWitness
} from "@ezkljs/engine/web";

async function getDataBuffer(name: string): Promise<Uint8ClampedArray> {
  const response = await fetch(`/data/${name}`);
  const buffer = await response.arrayBuffer();
  return new Uint8ClampedArray(buffer);
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

interface Uint8ArrayResult {
  output: Uint8Array;
  executionTime: number;
}

export async function handleGenProofButton(witness: Uint8ClampedArray) {
  const start = performance.now(); // Start the timer
  console.log("proof start")
  let output = prove(
    witness,
    await getDataBuffer("key.pk"),
    await getDataBuffer("network.compiled"),
    await getDataBuffer("kzg.srs")
  );

  const end = performance.now(); // End the timer

  return {
    output,
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
    await getDataBuffer("network.compiled"),
    new Uint8ClampedArray(
      new TextEncoder().encode(JSON.stringify(formattedInput))
    )
  );

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
