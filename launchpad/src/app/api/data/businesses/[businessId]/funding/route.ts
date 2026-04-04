import { NextRequest, NextResponse } from "next/server";
import { requireBusinessAccess } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { serializeFundingOpportunity } from "@/lib/serializers";

type Params = { params: Promise<{ businessId: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const { businessId } = await params;
    await requireBusinessAccess(businessId);
    const docs = await prisma.fundingOpportunity.findMany({
      where: { businessId, status: { notIn: ["denied", "dismissed"] } },
      orderBy: { fitScore: "desc" },
    });
    return NextResponse.json(docs.map(serializeFundingOpportunity));
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unauthorized" }, { status: 401 });
  }
}

export async function POST(req: NextRequest, { params }: Params) {
  try {
    const { businessId } = await params;
    await requireBusinessAccess(businessId);
    const data = await req.json();
    const doc = await prisma.fundingOpportunity.create({
      data: {
        businessId,
        name: data.name ?? "",
        provider: data.provider ?? "",
        type: data.type ?? "other",
        amountMin: data.amount?.min ?? data.amountMin ?? 0,
        amountMax: data.amount?.max ?? data.amountMax ?? 0,
        interestRate: data.interestRate ?? null,
        repaymentTerms: data.repaymentTerms ?? null,
        eligibilityMatch: data.eligibilityMatch ?? 0,
        eligibilityCriteria: data.eligibilityCriteria ?? [],
        applicationUrl: data.applicationUrl ?? "",
        applicationDeadline: data.applicationDeadline ?? null,
        status: data.status ?? "discovered",
        applicationProgress: data.applicationProgress ?? 0,
        prefilledFields: data.prefilledFields ?? {},
        fitScore: data.fitScore ?? 0,
        recommendation: data.recommendation ?? "",
        estimatedTimeToApply: data.estimatedTimeToApply ?? "",
      },
    });
    return NextResponse.json({ id: doc.id });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unauthorized" }, { status: 401 });
  }
}
