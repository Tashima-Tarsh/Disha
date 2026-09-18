import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { withContext } from "@/lib/unified/api";
import { listActivationPolicies, upsertActivationPolicy } from "@/lib/unified/activation-policy";
const schema=z.object({materiality:z.enum(["none","low","medium","high","critical"]),enabled:z.boolean(),minScore:z.number().min(0).max(1),components:z.array(z.enum(["disha-brain","cognitive-engine","memory-graph"])).max(3),retrievalLimit:z.number().int().min(1).max(50)});
export async function GET(req:NextRequest){return withContext(req,"agent:read",async(ctx)=>NextResponse.json({generatedAt:new Date().toISOString(),policies:await listActivationPolicies()},{headers:{"X-Request-ID":ctx.requestId,"Cache-Control":"no-store"}}));}
export async function PUT(req:NextRequest){return withContext(req,"agent:run",async(ctx)=>{if(!ctx.principal.roles.includes("admin"))return NextResponse.json({error:"admin_required"},{status:403,headers:{"X-Request-ID":ctx.requestId}});const parsed=schema.safeParse(await req.json().catch(()=>null));if(!parsed.success)return NextResponse.json({error:"invalid_policy",issues:parsed.error.issues},{status:400,headers:{"X-Request-ID":ctx.requestId}});const policy=await upsertActivationPolicy(parsed.data);return NextResponse.json({policy},{headers:{"X-Request-ID":ctx.requestId}});});}
