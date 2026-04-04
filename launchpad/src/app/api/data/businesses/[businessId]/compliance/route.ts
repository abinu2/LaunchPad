import { NextRequest, NextResponse } from "next/server";
import { requireBusinessAccess } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { serializeComplianceItem } from "@/lib/serializers";

// Skip prerendering for this API route
export const dynamic = "force-dynamic";

type Params = { params: Promise<{ businessId: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const { businessId } = await params;
    await requireBusinessAccess(businessId);
    const docs = await prisma.complianceItem.findMany({ where: { businessId } });
    docs.sort((a: { status: string; daysUntilDue: number | null }, b: { status: string; daysUntilDue: number | null }) => {
      if (a.status === "overdue" && b.status !== "overdue") return -1;
      if (b.status === "overdue" && a.status !== "overdue") return 1;
      return (a.daysUntilDue ?? 999) - (b.daysUntilDue ?? 999);
    });
    return NextResponse.json(docs.map(serializeComplianceItem));
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unauthorized" }, { status: 401 });
  }
}

export async function POST(req: NextRequest, { params }: Params) {
  try {
    const { businessId } = await params;
    await requireBusinessAccess(businessId);
    const data = await req.json();
    const doc = await prisma.complianceItem.create({
      data: {
        businessId,
        title: data.title ?? "",
        description: data.description ?? "",
        jurisdiction: data.jurisdiction ?? "state",
        jurisdictionName: data.jurisdictionName ?? "",
        category: data.category ?? "license",
        isRequired: data.isRequired ?? true,
        legalCitation: data.legalCitation ?? null,
        status: data.status ?? "not_started",
        obtainedDate: data.obtainedDate ?? null,
        expirationDate: data.expirationDate ?? null,
        renewalDate: data.renewalDate ?? null,
        renewalFrequency: data.renewalFrequency ?? null,
        daysUntilDue: data.daysUntilDue ?? null,
        applicationUrl: data.applicationUrl ?? null,
        cost: data.cost ?? null,
        estimatedProcessingTime: data.estimatedProcessingTime ?? null,
        documentationRequired: data.documentationRequired ?? [],
        penaltyForNonCompliance: data.penaltyForNonCompliance ?? null,
        reminderSent30Days: data.reminderSent30Days ?? false,
        reminderSent14Days: data.reminderSent14Days ?? false,
        reminderSent3Days: data.reminderSent3Days ?? false,
        lastCheckedAt: new Date(),
        proofUrl: data.proofUrl ?? null,
      },
    });
    return NextResponse.json({ id: doc.id });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unauthorized" }, { status: 401 });
  }
}
