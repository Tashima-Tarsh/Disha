import { failWorkflow, completeWorkflow, leaseWorkflowItems, renewWorkflowLease, type DurableWorkItem } from "./durable-workflow-store";
import { runChangeDrivenActivation, type IntelligenceActivationInput } from "./intelligence-activation";
import { runScheduledSourceIngestion } from "./scheduled-source-ingestion";

export type WorkflowTickResult = { workerId: string; leased: number; completed: string[]; failed: Array<{ workId: string; error: string }> };

export async function processWorkflowTick(input: { workerId: string; maxJobs?: number; leaseSeconds?: number }): Promise<WorkflowTickResult> {
  const items = await leaseWorkflowItems({ workerId: input.workerId, workflowTypes: ["source_ingestion","intelligence_activation"], maxItems: input.maxJobs ?? 10, leaseSeconds: input.leaseSeconds ?? 120 });
  const completed: string[] = []; const failed: Array<{workId:string;error:string}> = [];
  for (const item of items) {
    const leaseSeconds = input.leaseSeconds ?? 120;
    const heartbeat = setInterval(() => { void renewWorkflowLease(item.workId, input.workerId, leaseSeconds); }, Math.max(5_000, Math.floor(leaseSeconds * 1000 / 3)));
    try {
      const result = await execute(item);
      if (!await completeWorkflow(item.workId, input.workerId, result)) throw new Error("workflow_lease_lost_before_completion");
      completed.push(item.workId);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      await failWorkflow(item.workId, input.workerId, error); failed.push({ workId:item.workId,error:message });
    } finally {
      clearInterval(heartbeat);
    }
  }
  return { workerId: input.workerId, leased: items.length, completed, failed };
}

async function execute(item: DurableWorkItem): Promise<unknown> {
  if (item.workflowType === "source_ingestion") {
    const sourceId = typeof item.payload.sourceId === "string" ? item.payload.sourceId : "";
    if (!sourceId) throw new Error("source_ingestion_work_missing_source_id");
    const summary = await runScheduledSourceIngestion({ sourceIds: [sourceId] });
    const retryableFailures = summary.runs.filter((run) => run.status === "failed");
    if (retryableFailures.length) {
      throw new Error(`source_ingestion_failed:${retryableFailures.map((run) => run.sourceId).join(",")}`);
    }
    return summary;
  }
  if (item.workflowType === "intelligence_activation") {
    const result = await runChangeDrivenActivation(item.payload as unknown as IntelligenceActivationInput);
    if (result.status === "failed") throw new Error("intelligence_activation_all_components_unavailable");
    return result;
  }
  throw new Error(`unsupported_workflow_type:${item.workflowType}`);
}
