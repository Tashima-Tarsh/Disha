import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { withContext } from "@/lib/unified/api";
import { analyzeEvidenceIndependence, linkEvidenceLineage, recordEvidenceLineageNode } from "@/lib/unified/evidence-lineage";

const nodeSchema = z.object({ nodeKind: z.enum(["source_document", "publication", "observation", "claim", "dataset_record"]), sourceId: z.string().min(1).max(200), sourceHash: z.string().min(8).max(256), content: z.string().max(100000).optional(), contentHash: z.string().min(8).max(256).optional(), sourceUrl: z.string().url().optional(), observedAt: z.string().datetime().optional(), publishedAt: z.string().datetime().optional(), title: z.string().max(1000).optional(), metadata: z.record(z.string(), z.unknown()).optional() });
const edgeSchema = z.object({ childNodeId: z.string().min(1).max(200), parentNodeId: z.string().min(1).max(200), relationType: z.enum(["derived_from", "cites", "reposts", "quotes", "confirms", "contradicts"]), confidence: z.number().min(0).max(1).optional(), evidence: z.record(z.string(), z.unknown()).optional() });
const requestSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("record_node"), node: nodeSchema }),
  z.object({ action: z.literal("link"), edge: edgeSchema }),
  z.object({ action: z.literal("analyze_independence"), nodeIds: z.array(z.string().min(1).max(200)).min(1).max(500) }),
]);

export async function POST(req: NextRequest) {
  return withContext(req, "agent:run", async (ctx) => {
    const input = requestSchema.parse(await req.json());
    const result = input.action === "record_node" ? await recordEvidenceLineageNode(input.node)
      : input.action === "link" ? await linkEvidenceLineage(input.edge)
        : await analyzeEvidenceIndependence(input.nodeIds);
    return NextResponse.json({ result }, { headers: { "X-Request-ID": ctx.requestId } });
  });
}
