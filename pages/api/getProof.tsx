// pages/api/getProof.tsx
// ROute for polling the status of the proof generation
import type { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs';
import path from 'path';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method === 'GET') {
        const { id } = req.query;

        try {
            const filePath = path.join('proof_data', `${id}.json`);
            if (fs.existsSync(filePath)) {
                const proofData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
                res.status(200).json({ message: 'Proof ready', data: proofData, status: 'success' });
            } else {
                res.status(202).json({ message: 'Proof not ready', status: 'pending' });
            }
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Internal Server Error' });
        }
    } else {
        res.setHeader('Allow', ['GET']);
        res.status(405).end(`Method ${req.method} Not Allowed`);
    }
}