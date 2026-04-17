import { Request, Response } from 'express';
import prisma from '../db/prismaClient';
import { orchestratePipeline, resumePipeline } from '../services/agentService';

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
      prompt: requestRecord.prompt,
      message: requestRecord.status === 'success'
        ? 'Execution completed successfully'
        : requestRecord.status === 'awaiting_input'
          ? 'AI needs more information from you'
          : 'In progress',
      logs: requestRecord.result_logs
    });
  } catch (error) {
    console.error('Error fetching request status:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

export const handleReply = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const { answer } = req.body;

  if (!answer || typeof answer !== 'string') {
    res.status(400).json({ error: 'Valid string answer is required' });
    return;
  }

  try {
    const requestRecord = await prisma.request.findUnique({
      where: { id: parseInt(id, 10) }
    });

    if (!requestRecord) {
      res.status(404).json({ error: 'Request not found' });
      return;
    }

    if (requestRecord.status !== 'awaiting_input') {
      res.status(400).json({ error: 'This request is not awaiting input' });
      return;
    }

    // Fire-and-forget resume
    resumePipeline(requestRecord.id, requestRecord.prompt, answer);

    res.status(202).json({
      id: requestRecord.id,
      status: 'planning',
      message: 'Reply received, resuming pipeline...'
    });
  } catch (error) {
    console.error('Error handling reply:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

export const handleGetHistory = async (req: Request, res: Response): Promise<void> => {
  try {
    const requests = await prisma.request.findMany({
      orderBy: { created_at: 'desc' },
      take: 50,
    });

    const history = requests.map(r => ({
      id: r.id,
      prompt: r.prompt,
      status: r.status,
      created_at: r.created_at,
      logs: r.result_logs,
    }));

    res.json(history);
  } catch (error) {
    console.error('Error fetching history:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};
