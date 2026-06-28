import type { DishaSignal } from "../contracts";
import { repoEvidence, type AdapterResult } from "./shared";

export async function analyzeMemoryContext(signal: DishaSignal): Promise<Pick<AdapterResult, "summary" | "evidence" | "limitations">> {
  const evidence = [
    repoEvidence(signal, "disha/brain/memory/working.py", "Working memory module exists for active mission context."),
    repoEvidence(signal, "disha/brain/memory/episodic.py", "Episodic memory module exists for prior mission traces."),
    repoEvidence(signal, "disha/brain/memory/semantic.py", "Semantic memory module exists for durable concept retrieval."),
  ];

  return {
    summary: signal.context.memoryRefs.length
      ? `Memory adapter observed ${signal.context.memoryRefs.length} memory reference(s).`
      : "No memory references supplied; memory enrichment is [PROMOTION PENDING].",
    evidence,
    limitations: ["[PROMOTION PENDING] Durable memory lookup requires authenticated storage adapter and evidence logging."],
  };
}
