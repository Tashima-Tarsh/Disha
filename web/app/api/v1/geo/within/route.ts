import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { featuresContainingPoint } from "@/lib/geospatial/spatial-query";
import { withContext } from "@/lib/unified/api";
const schema=z.object({lon:z.coerce.number().min(-180).max(180),lat:z.coerce.number().min(-90).max(90),level:z.string().trim().min(1).max(64).optional(),limit:z.coerce.number().int().min(1).max(100).default(25)});
export async function GET(req:NextRequest){return withContext(req,"agent:read",async(ctx)=>{const q=schema.parse(Object.fromEntries(req.nextUrl.searchParams));return NextResponse.json(await featuresContainingPoint({lon:q.lon,lat:q.lat,geographyLevel:q.level,limit:q.limit}),{headers:{"X-Request-ID":ctx.requestId}});});}
