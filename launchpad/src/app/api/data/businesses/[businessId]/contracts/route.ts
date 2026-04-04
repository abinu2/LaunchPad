import { NextRequest, NextResponse } from "next/server";
import { requireBusinessAccess } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { serializeContract } from "@/lib/serializers";

// Skip prerendering for this API route
export const dynamic = "force-dynamic";

type Params = { params: Promise<{ businessId: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const { businessId } = await params;
    await requireBusinessAccess(businessId);
    const rows = await prisma.contract.findMany({ where: { businessId }, orderBy: { createdAt: "desc" } });
    return NextResponse.json(rows.map(serializeContract));
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unauthorized" }, { status: 401 });
  }
}

export async function POST(req: NextRequest, { params }: Params) {
  try {
    const { businessId } = await params;
    await requireBusinessAccess(businessId);
    const data = await req.json();
    const row = await prisma.contract.create({
      data: {
        businessId,
        fileName: data.fileName ?? "",
        fileUrl: data.fileUrl ?? "",
        fileType: data.fileType ?? "pdf",
        contractType: data.contractType ?? "other",
        counterpartyName: data.counterpartyName ?? "",
        effectiveDate: data.effectiveDate ?? null,
        expirationDate: data.expirationDate ?? null,
        autoRenews: data.autoRenews ?? false,
        autoRenewalDate: data.autoRenewalDate ?? null,
        autoRenewalNoticePeriod: data.autoRenewalNoticePeriod ?? null,
        terminationNoticePeriod: data.terminationNoticePeriod ?? null,
        totalValue: data.totalValue ?? null,
        monthlyValue: data.monthlyValue ?? null,
        healthScore: data.healthScore ?? 100,
        status: data.status ?? "active",
        analysis: data.generatedHtml
          ? { ...(data.analysis ?? {}), generatedHtml: data.generatedHtml }
          : (data.analysis ?? {}),
        obligations: data.obligations ?? [],
      },
    });
    return NextResponse.json({ id: row.id });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unauthorized" }, { status: 401 });
  }
}
