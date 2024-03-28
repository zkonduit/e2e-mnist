// pages/api/generateProof.ts
// Route that calls into Archon API to generate a proof by first:
// 1. Uploading the input data to Archon
// 2. Calling GenWitness and Prove commands on the uploaded data
// 3. Polling for the status of the proof generation
// 4. Returning the proof once it is generated
import type { NextApiRequest, NextApiResponse } from 'next';
import axios from 'axios';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method === 'POST') {
        try {

            let formData = new FormData();
            formData.append("data", new Blob([JSON.stringify(req.body)], { type: "application/json" }));

            const axiosResponse = await axios.put(`${process.env.NEXT_PUBLIC_ARCHON_URL}/artifact/minst`, formData, {
                headers: {
                    'X-API-KEY': process.env.ARCHON_API_KEY,
                    'Content-Type': 'multipart/form-data'// Ensures the correct Content-Type header for multipart/form-data
                },
            });

            // get the latest uuid
            const uuid = axiosResponse.data.latest_uuid;

            // Prepare data for gen-witness and prove requests
            const requestBody = [
                {
                    "ezkl_command": {
                        "GenWitness": {
                            "data": `input_${uuid}.json`,
                            "compiled_circuit": "model.compiled",
                            "output": `witness_${uuid}.json`,
                        },
                    },
                    "working_dir": "minst",
                },
                {
                    "ezkl_command": {
                        "Prove": {
                            "witness": `witness_${uuid}.json`,
                            "compiled_circuit": "model.compiled",
                            "pk_path": "pk.key",
                            "proof_path": `proof_${uuid}.json`,
                            "proof_type": "Single",
                            "check_mode": "UNSAFE",
                        },
                    },
                    "working_dir": "minst",
                },
            ];

            // Prove request using axios
            const proveRes = await axios.post(`${process.env.NEXT_PUBLIC_ARCHON_URL}/recipe`, requestBody, {
                headers: {
                    'X-API-KEY': process.env.ARCHON_API_KEY,
                }
            });

            console.log("proveRes.data.id: ", proveRes.data.id)

            let getProofResp
            let status = null
            while (status !== 'Complete') {
                getProofResp = await axios.get(`${process.env.NEXT_PUBLIC_ARCHON_URL}/recipe/${proveRes.data.id}`, {
                    headers: {
                        'X-API-KEY': process.env.ARCHON_API_KEY
                    }
                });
                status = getProofResp.data[1].status
                if (status === 'Complete') {
                    break
                }
                await new Promise((resolve) => setTimeout(resolve, 2_000))
            }
            const proofFileResp = await axios.get(`${process.env.NEXT_PUBLIC_ARCHON_URL}/artifact/minst/proof_${uuid}.json`, {
                headers: {
                    'X-API-KEY': process.env.ARCHON_API_KEY
                }
            });

            res.status(200).json({ message: 'Proof generation successful', data: proofFileResp.data });
        } catch (error) {
            console.error(error);
            res.status(500).json({ error });

        }
    } else {
        res.setHeader('Allow', ['POST']);
        res.status(405).end(`Method ${req.method} Not Allowed`);
    }
}