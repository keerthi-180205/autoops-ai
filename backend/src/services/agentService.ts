import axios from 'axios';
import prisma from '../db/prismaClient';

const MASTER_AGENT_URL = process.env.MASTER_AGENT_URL || 'http://master-agent:8000';
const VALIDATION_AGENT_URL = process.env.VALIDATION_AGENT_URL || 'http://validation-agent:8002';
const PRICING_AGENT_URL = process.env.PRICING_AGENT_URL || 'http://pricing-agent:8001';
const WORKER_AGENT_URL = process.env.WORKER_AGENT_URL || 'http://worker-agent:9000';

export async function orchestratePipeline(requestId: number, prompt: string) {
  try {
    // 1. Planning Phase
    await updateRequestStatus(requestId, 'planning', 'Starting Master Agent planning phase...');
    const masterResponse = await axios.post(`${MASTER_AGENT_URL}/plan`, { prompt });
    const plan = masterResponse.data;
    await updateRequestStatus(requestId, 'planning', `Plan generated successfully: ${JSON.stringify(plan)}`);

    // 2. Validation Phase
    await updateRequestStatus(requestId, 'planning', 'Sending plan to Validation Agent...');
    const validationResponse = await axios.post(`${VALIDATION_AGENT_URL}/validate`, plan);
    const validationResult = validationResponse.data;
    
    if (!validationResult.approved) {
      await updateRequestStatus(requestId, 'failed', `Validation rejected: ${JSON.stringify(validationResult.reasons)}`);
      return;
    }
    await updateRequestStatus(requestId, 'planning', 'Validation approved.');

    // 3. Pricing Phase
    await updateRequestStatus(requestId, 'planning', 'Sending plan to Pricing Agent...');
    const pricingResponse = await axios.post(`${PRICING_AGENT_URL}/estimate`, plan);
    const pricingResult = pricingResponse.data;
    await updateRequestStatus(requestId, 'planning', `Estimated cost: $${pricingResult.estimated_monthly_cost_usd} - ${pricingResult.breakdown}`);

    // 4. Execution Phase
    await updateRequestStatus(requestId, 'executing', 'Sending plan to Worker Agent for AWS execution...');
    const workerResponse = await axios.post(`${WORKER_AGENT_URL}/execute`, plan);
    const workerResult = workerResponse.data;

    if (workerResult.status === 'failed') {
      await updateRequestStatus(requestId, 'failed', `Execution failed: ${workerResult.error}`);
    } else {
      await updateRequestStatus(requestId, 'success', `Execution completed successfully: ${JSON.stringify(workerResult)}`);
    }

  } catch (error: any) {
    console.error(`Orchestration failed for Request ID ${requestId}:`, error.message);
    const errorMsg = error.response?.data ? JSON.stringify(error.response.data) : error.message;
    await updateRequestStatus(requestId, 'failed', `Error in pipeline: ${errorMsg}`);
  }
}

async function updateRequestStatus(id: number, status: string, newLog: string) {
  const request = await prisma.request.findUnique({ where: { id } });
  let logs: string[] = request?.result_logs ? JSON.parse(JSON.stringify(request.result_logs)) : [];
  if (!Array.isArray(logs)) {
    logs = [];
  }
  
  logs.push(`[${new Date().toISOString()}] ${newLog}`);

  await prisma.request.update({
    where: { id },
    data: {
      status,
      result_logs: logs
    }
  });
}
