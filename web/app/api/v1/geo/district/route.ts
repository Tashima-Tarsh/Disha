import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { listOperationalGeoFeatures } from "@/lib/geospatial/spatial-query";
import { withContext } from "@/lib/unified/api";
const schema=z.object({lgdCode:z.string().trim().min(1).max(64).optional(),q:z.string().trim().min(1).max(120).optional(),limit:z.coerce.number().int().min(1).max(500).optional()});
export async function GET(req:NextRequest){return withContext(req,"agent:read",async(ctx)=>{const q=schema.parse(Object.fromEntries(req.nextUrl.searchParams));return NextResponse.json(await listOperationalGeoFeatures({geographyLevel:"district",lgdCode:q.lgdCode,query:q.q,limit:q.limit}),{headers:{"X-Request-ID":ctx.requestId}});});}
