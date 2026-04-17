import { Request, Response } from 'express';
import axios from 'axios';
import prisma from '../db/prismaClient';
import { orchestratePipeline, resumePipeline } from '../services/agentService';

export const handleRequestCreation = async (req: Request, res: Response): Promise<void> => {
  const { prompt, region } = req.body;

  if (!prompt || typeof prompt !== 'string') {
    res.status(400).json({ error: 'Valid string prompt is required' });
    return;
  }

  try {
    const requestRecord = await prisma.request.create({
      data: {
        prompt,
        region,
        status: 'pending',
        result_logs: []
      }
    });

    // Fire-and-forget background orchestration
    orchestratePipeline(requestRecord.id, prompt, region);

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
    resumePipeline(requestRecord.id, requestRecord.prompt, answer, requestRecord.region ?? undefined);

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
      resource_type: r.resource_type,
      resource_id: r.resource_id,
      cost: r.cost
    }));

    res.json(history);
  } catch (error) {
    console.error('Error fetching history:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

const WORKER_AGENT_URL = process.env.WORKER_AGENT_URL || 'http://worker-agent:9000';

export const handleDestroy = async (req: Request, res: Response): Promise<void> => {
  const { resource_type, resource_id, requestId } = req.body;

  if (!resource_type || !resource_id || !requestId) {
    res.status(400).json({ error: 'resource_type, resource_id, and requestId are required' });
    return;
  }

  try {
    let action = "";
    let parameters: any = {};

    if (resource_type === 'ec2') {
      action = "terminate_instances";
      parameters = { "InstanceIds": [resource_id] };
    } else if (resource_type === 's3') {
      action = "delete_bucket";
      parameters = { "Bucket": resource_id };
    } else {
      res.status(400).json({ error: 'Unsupported resource type for destruction' });
      return;
    }

    const workerResponse = await axios.post(`${WORKER_AGENT_URL}/execute`, {
      service: resource_type,
      action: action,
      parameters: parameters,
      region: req.body.region // Optional region override
    });

    if (workerResponse.data.status === 'success') {
      await prisma.request.update({
        where: { id: parseInt(requestId, 10) },
        data: { status: 'destroyed' }
      });
      res.json({ message: 'Resource destroyed successfully' });
    } else {
      res.status(500).json({ error: workerResponse.data.error });
    }
  } catch (error: any) {
    console.error('Error destroying resource:', error);
    res.status(500).json({ error: 'Failed to destroy resource' });
  }
};

export const handleGetCostSummary = async (req: Request, res: Response): Promise<void> => {
  try {
    const aggregate = await prisma.request.aggregate({
      _sum: { cost: true }
    });
    res.json({ total_cost: aggregate._sum.cost || 0 });
  } catch (error) {
    console.error('Error fetching cost summary:', error);
    res.status(500).json({ error: 'Failed to fetch cost summary' });
  }
};
