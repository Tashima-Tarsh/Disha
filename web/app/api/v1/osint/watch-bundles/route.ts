import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import {
  createContinuousOsintWatchBundle,
  listContinuousOsintBundleTemplates,
  type ContinuousOsintBundleInput,
} from "@/lib/unified/continuous-osint";
import { withContext } from "@/lib/unified/api";

export const dynamic = "force-dynamic";

const bundleSchema = z.discriminatedUnion("kind", [
  z.object({ kind:z.literal("domain"), domain:z.string().trim().min(4).max(253) }),
  z.object({ kind:z.literal("topic"), query:z.string().trim().min(1).max(512) }),
  z.object({ kind:z.literal("company"), cik:z.string().trim().regex(/^\d{1,10}$/), query:z.string().trim().min(1).max(512) }),
  z.object({ kind:z.literal("repository"), repository:z.string().trim().min(3).max(200) }),
  z.object({ kind:z.literal("vulnerability"), cve:z.string().trim().max(40).optional(), vendor:z.string().trim().max(120).optional(), product:z.string().trim().max(160).optional() })
    .refine((value)=>Boolean(value.cve||value.vendor||value.product),"vulnerability_target_required"),
  z.object({ kind:z.literal("macro"), country:z.string().trim().min(2).max(32), indicator:z.string().trim().min(2).max(80) }),
  z.object({ kind:z.literal("official_source"), sourceId:z.string().trim().min(3).max(120) }),
  z.object({ kind:z.literal("dynamic_source"), sourceId:z.string().trim().min(3).max(80), path:z.string().trim().startsWith("/").max(300).optional(), query:z.record(z.string().max(100),z.string().max(1000)).optional() }),
]);

const requestSchema=z.object({
  missionId:z.string().trim().min(1).max(128).optional(),
  purpose:z.string().trim().min(3).max(1000),
  reviewOnChange:z.boolean().optional(),
  bundle:bundleSchema,
});

export async function GET(req:NextRequest){
  return withContext(req,"agent:read",async(ctx)=>NextResponse.json({
    templates:listContinuousOsintBundleTemplates(),
    safetyRule:"Bundles combine only governed passive/public adapters. Active reconnaissance, covert identity enumeration, credential access, leaked/private data and intrusive target scanning are excluded.",
  },{headers:{"X-Request-ID":ctx.requestId}}));
}

export async function POST(req:NextRequest){
  return withContext(req,"agent:run",async(ctx)=>{
    const body=requestSchema.parse(await req.json());
    const watches=await createContinuousOsintWatchBundle({
      userId:ctx.principal.userId,
      missionId:body.missionId,
      purpose:body.purpose,
      reviewOnChange:body.reviewOnChange,
      bundle:body.bundle as ContinuousOsintBundleInput,
    });
    return NextResponse.json({created:watches.length,watches},{status:201,headers:{"X-Request-ID":ctx.requestId}});
  });
}
