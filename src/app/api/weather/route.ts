import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireFarmAccess } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { apiError } from "@/lib/api";
export async function GET(request:NextRequest){try{const farmId=z.string().min(1).parse(request.nextUrl.searchParams.get("farmId"));await requireFarmAccess(farmId);const farm=await prisma.farm.findUniqueOrThrow({where:{id:farmId}});const base=process.env.WEATHER_PROVIDER_URL;if(!base)return NextResponse.json({error:"Weather integration has not been configured."},{status:503});const url=new URL(base);url.searchParams.set("latitude",String(farm.latitude));url.searchParams.set("longitude",String(farm.longitude));url.searchParams.set("current","temperature_2m,relative_humidity_2m,wind_speed_10m");url.searchParams.set("daily","precipitation_probability_max");url.searchParams.set("timezone","auto");const response=await fetch(url,{next:{revalidate:900}});if(!response.ok)return NextResponse.json({error:"Weather provider is temporarily unavailable."},{status:503});return NextResponse.json(await response.json());}catch(error){return apiError(error);}}
