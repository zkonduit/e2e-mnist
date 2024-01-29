// pages/api/callback.ts
// Callback route that is called by Archon when the proof has finished generating
import type { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs';
import path from 'path';


export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method === 'POST') {
        try {
            const data = req.body;
            const dataOutput = JSON.parse(data[1].output);
            console.log("callback", dataOutput)

            const filePath = path.join('proof_data', `${data[0].spell_id}.json`);
            fs.writeFileSync(filePath, JSON.stringify(dataOutput));

            res.status(200).json({ status: 'ok' });
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Internal Server Error' });
        }
    } else {
        res.setHeader('Allow', ['POST']);
        res.status(405).end('Method Not Allowed');
    }
}