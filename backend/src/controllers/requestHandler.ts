import { Request, Response } from 'express';
import prisma from '../db/prismaClient';
import { orchestratePipeline } from '../services/agentService';

export const handleRequestCreation = async (req: Request, res: Response): Promise<void> => {
  const { prompt } = req.body;

  if (!prompt || typeof prompt !== 'string') {
    res.status(400).json({ error: 'Valid string prompt is required' });
    return;
  }

  try {
    const requestRecord = await prisma.request.create({
      data: {
        prompt,
        status: 'pending',
        result_logs: []
      }
    });

    // Fire-and-forget background orchestration
    orchestratePipeline(requestRecord.id, prompt);

    // Return identity immediately to frontend
    res.status(202).json({
      id: requestRecord.id,
      status: requestRecord.status
    });
  } catch (error) {
    console.error('Error creating request:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

export const handleGetStatus = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;

  try {
    const requestRecord = await prisma.request.findUnique({
      where: { id: parseInt(id, 10) }
    });

    if (!requestRecord) {
      res.status(404).json({ error: 'Request not found' });
      return;
    }

    res.json({
      id: requestRecord.id,
      status: requestRecord.status,
      message: requestRecord.status === 'success' ? 'Execution completed successfully' : 'In progress',
      logs: requestRecord.result_logs
    });
  } catch (error) {
    console.error('Error fetching request status:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};
