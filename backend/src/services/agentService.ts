import axios from 'axios';
import prisma from '../db/prismaClient';
import { getIO } from '../socket';

const MASTER_AGENT_URL = process.env.MASTER_AGENT_URL || 'http://master-agent:8000';
const VALIDATION_AGENT_URL = process.env.VALIDATION_AGENT_URL || 'http://validation-agent:8002';
const PRICING_AGENT_URL = process.env.PRICING_AGENT_URL || 'http://pricing-agent:8001';
const WORKER_AGENT_URL = process.env.WORKER_AGENT_URL || 'http://worker-agent:9000';

/**
 * Phase 1: Send prompt to master agent.
 * If it needs clarification, pause and wait for user reply.
 * If it returns a ready plan, continue through the full pipeline.
 */
export async function orchestratePipeline(requestId: number, prompt: string, region?: string) {
  try {
    // 1. Planning Phase — may ask questions
    await updateRequestStatus(requestId, 'planning', '🧠 Sending prompt to Master Agent...');
    const masterResponse = await axios.post(`${MASTER_AGENT_URL}/plan`, { prompt, region, requestId });
    const masterResult = masterResponse.data;

    if (masterResult.status === 'needs_clarification') {
      // Store questions and pause — wait for user reply
      const questionList = masterResult.questions.map((q: string, i: number) => `❓ ${i + 1}. ${q}`).join('\n');
      await updateRequestStatus(
        requestId,
        'awaiting_input',
        `🤖 AI needs more details:\n${questionList}`
      );
      // Store original prompt for later continuation
      await prisma.request.update({
        where: { id: requestId },
        data: { prompt: prompt }
      });
      return; // Stop here — user must reply via /api/request/:id/reply
    }

    // Plan is ready — continue to execution pipeline
    await executeReadyPlan(requestId, masterResult);

  } catch (error: any) {
    console.error(`Orchestration failed for Request ID ${requestId}:`, error.message);
    const errorMsg = error.response?.data ? JSON.stringify(error.response.data) : error.message;
    await updateRequestStatus(requestId, 'failed', `❌ Error in pipeline: ${errorMsg}`);
  }
}

/**
 * Phase 2: Resume after user answers clarification questions.
 * Calls master-agent /plan/continue, then runs the full pipeline.
 */
export async function resumePipeline(requestId: number, originalPrompt: string, answers: string, region?: string) {
  try {
    await updateRequestStatus(requestId, 'planning', `💬 Received your answers. Generating final plan...`);

    const continueResponse = await axios.post(`${MASTER_AGENT_URL}/plan/continue`, {
      original_prompt: originalPrompt,
      answers: answers,
      region: region,
      requestId: requestId
    });
    const plan = continueResponse.data;

    if (plan.status === 'needs_clarification') {
      const questionList = plan.questions.map((q: string, i: number) => `❓ ${i + 1}. ${q}`).join('\n');
      await updateRequestStatus(
        requestId,
        'awaiting_input',
        `🤖 AI still needs more details:\n${questionList}`
      );
      return;
    }

    await executeReadyPlan(requestId, plan);

  } catch (error: any) {
    console.error(`Resume failed for Request ID ${requestId}:`, error.message);
    const errorMsg = error.response?.data ? JSON.stringify(error.response.data) : error.message;
    await updateRequestStatus(requestId, 'failed', `❌ Error resuming pipeline: ${errorMsg}`);
  }
}

/**
 * Execute the full validation → pricing → worker pipeline
 * once we have a ready plan from the master agent.
 */
async function executeReadyPlan(requestId: number, plan: any) {
  await updateRequestStatus(
    requestId,
    'planning',
    `📋 Plan generated: ${plan.service} → ${plan.action} (${JSON.stringify(plan.parameters)})`
  );

  // 2. Validation Phase
  await updateRequestStatus(requestId, 'planning', '🛡️ Sending plan to Validation Agent...');
  const validationResponse = await axios.post(`${VALIDATION_AGENT_URL}/validate`, { ...plan, requestId });
  const validationResult = validationResponse.data;

  if (!validationResult.approved) {
    const reasons = validationResult.reasons.map((r: string) => `⛔ ${r}`).join('\n');
    await updateRequestStatus(requestId, 'failed', `🛡️ Validation REJECTED:\n${reasons}`);
    return;
  }
  await updateRequestStatus(requestId, 'planning', '✅ Validation approved.');

  // 3. Pricing Phase
  await updateRequestStatus(requestId, 'planning', '💰 Estimating cost with Pricing Agent...');
  const pricingResponse = await axios.post(`${PRICING_AGENT_URL}/estimate`, { ...plan, requestId });
  const pricingResult = pricingResponse.data;

  const costDisplay = pricingResult.estimated_monthly_cost_usd
    ? `$${pricingResult.estimated_monthly_cost_usd}/month`
    : 'Unable to estimate';
  await updateRequestStatus(
    requestId,
    'planning',
    `💰 Estimated Cost: ${costDisplay}\n📊 ${pricingResult.breakdown || 'N/A'}\n⚠️ ${pricingResult.warning || 'Estimate only.'}`
  );

  // 4. Execution Phase
  await updateRequestStatus(requestId, 'executing', '🚀 Executing on AWS via Worker Agent...');
  const workerResponse = await axios.post(`${WORKER_AGENT_URL}/execute`, { ...plan, requestId });
  const workerResult = workerResponse.data;

  if (workerResult.status === 'failed') {
    await updateRequestStatus(requestId, 'failed', `❌ Execution failed: ${workerResult.error}`);
  } else {
    // Format detailed resource info
    let successMsg = `✅ AWS Resource Created Successfully!\n`;
    successMsg += `🆔 Resource ID: ${workerResult.resource_id}`;

    if (workerResult.details) {
      const d = workerResult.details;
      if (d.InstanceId) {
        successMsg += `\n\n📦 EC2 Instance Details:`;
        successMsg += `\n   Instance ID: ${d.InstanceId}`;
        successMsg += `\n   Type: ${d.InstanceType || 'N/A'}`;
        successMsg += `\n   Region: ${d.Region || 'N/A'}`;
        successMsg += `\n   Public IP: ${d.PublicIp || 'N/A'}`;
        successMsg += `\n   Private IP: ${d.PrivateIp || 'N/A'}`;
        successMsg += `\n   State: ${d.State || 'N/A'}`;
        successMsg += `\n   Key Pair: ${d.KeyName || 'None'}`;
        successMsg += `\n   Launch Time: ${d.LaunchTime || 'N/A'}`;
      }
      if (d.instances) {
        successMsg += `\n\n📋 Instances:\n${JSON.stringify(d.instances, null, 2)}`;
      }
      if (d.BucketName) {
        successMsg += `\n\n🪣 S3 Bucket Details:`;
        successMsg += `\n   Name: ${d.BucketName}`;
        successMsg += `\n   Region: ${d.Region || 'N/A'}`;
      }
    }

    await updateRequestStatus(requestId, 'success', successMsg);

    // PERSISTENCE FOR TEARDOWN & COST AGGREGATOR
    try {
      await prisma.request.update({
        where: { id: requestId },
        data: {
          resource_type: plan.service,
          resource_id: workerResult.resource_id,
          region: plan.parameters?.Region || plan.parameters?.region,
          cost: pricingResult.estimated_monthly_cost_usd || 0
        }
      });
    } catch (dbError) {
      console.error('Failed to store resource metadata:', dbError);
    }
  }
}


async function updateRequestStatus(id: number, status: string, newLog: string) {
  const request = await prisma.request.findUnique({ where: { id } });
  let logs: string[] = request?.result_logs ? JSON.parse(JSON.stringify(request.result_logs)) : [];
  if (!Array.isArray(logs)) {
    logs = [];
  }

  const formattedLog = `[${new Date().toISOString()}] ${newLog}`;
  logs.push(formattedLog);

  // Emit real-time log update via WebSocket
  try {
    const io = getIO();
    io.to(`request_${id}`).emit('log_update', {
      requestId: id,
      log: formattedLog
    });
    io.to(`request_${id}`).emit('status_update', {
      requestId: id,
      status: status
    });
  } catch (error) {
    // Socket not initialized yet or other issue — silent fail
  }

  await prisma.request.update({
    where: { id },
    data: {
      status,
      result_logs: logs
    }
  });
}
