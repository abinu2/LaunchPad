import { NextRequest, NextResponse } from "next/server";
import { requireSessionUser } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { serializeBusiness } from "@/lib/serializers";

export async function GET(req: NextRequest) {
  let sessionUser;
  try {
    sessionUser = await requireSessionUser();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const userId = req.nextUrl.searchParams.get("userId") ?? sessionUser.sub;
    if (userId !== sessionUser.sub) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const biz = await prisma.business.findUnique({ where: { auth0Id: userId } });
    return NextResponse.json(biz ? serializeBusiness(biz) : null);
  } catch (err) {
    console.error("GET /api/data/businesses error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  let sessionUser;
  try {
    sessionUser = await requireSessionUser();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const data = await req.json();
    const auth0Id = data.userId ?? sessionUser.sub;

    if (auth0Id !== sessionUser.sub) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const biz = await prisma.business.upsert({
      where: { auth0Id },
      update: {
        businessName: data.businessName ?? "",
        businessType: data.businessType ?? "",
        naicsCode: data.naicsCode ?? "",
        entityType: data.entityType ?? "sole_prop",
        entityState: data.entityState ?? "",
        ein: data.ein ?? null,
        formationDate: data.formationDate ?? null,
        businessAddress: data.businessAddress ?? {},
        operatingJurisdictions: data.operatingJurisdictions ?? [],
        ownerName: data.ownerName ?? "",
        ownerEmail: data.ownerEmail ?? "",
        ownerPhone: data.ownerPhone ?? "",
        hasOtherJob: data.hasOtherJob ?? false,
        estimatedW2Income: data.estimatedW2Income ?? null,
        isFirstTimeBusiness: data.isFirstTimeBusiness ?? true,
        serviceTypes: data.serviceTypes ?? [],
        targetMarket: data.targetMarket ?? "residential",
        usesPersonalVehicle: data.usesPersonalVehicle ?? false,
        hasEmployees: data.hasEmployees ?? false,
        employeeCount: data.employeeCount ?? 0,
        hasContractors: data.hasContractors ?? false,
        contractorCount: data.contractorCount ?? 0,
        onboardingStage: data.onboardingStage ?? "idea",
        completedSteps: data.completedSteps ?? [],
        monthlyRevenueAvg: data.financials?.monthlyRevenueAvg ?? 0,
        monthlyExpenseAvg: data.financials?.monthlyExpenseAvg ?? 0,
        profitMargin: data.financials?.profitMargin ?? 0,
        totalRevenueYTD: data.financials?.totalRevenueYTD ?? 0,
        totalExpensesYTD: data.financials?.totalExpensesYTD ?? 0,
        currentCashBalance: data.financials?.currentCashBalance ?? null,
        financialsUpdatedAt: data.financials?.lastUpdated ? new Date(data.financials.lastUpdated) : undefined,
      },
      create: {
        auth0Id,
        businessName: data.businessName ?? "",
        businessType: data.businessType ?? "",
        naicsCode: data.naicsCode ?? "",
        entityType: data.entityType ?? "sole_prop",
        entityState: data.entityState ?? "",
        ein: data.ein ?? null,
        formationDate: data.formationDate ?? null,
        businessAddress: data.businessAddress ?? {},
        operatingJurisdictions: data.operatingJurisdictions ?? [],
        ownerName: data.ownerName ?? "",
        ownerEmail: data.ownerEmail ?? "",
        ownerPhone: data.ownerPhone ?? "",
        hasOtherJob: data.hasOtherJob ?? false,
        estimatedW2Income: data.estimatedW2Income ?? null,
        isFirstTimeBusiness: data.isFirstTimeBusiness ?? true,
        serviceTypes: data.serviceTypes ?? [],
        targetMarket: data.targetMarket ?? "residential",
        usesPersonalVehicle: data.usesPersonalVehicle ?? false,
        hasEmployees: data.hasEmployees ?? false,
        employeeCount: data.employeeCount ?? 0,
        hasContractors: data.hasContractors ?? false,
        contractorCount: data.contractorCount ?? 0,
        onboardingStage: data.onboardingStage ?? "idea",
        completedSteps: data.completedSteps ?? [],
        monthlyRevenueAvg: data.financials?.monthlyRevenueAvg ?? 0,
        monthlyExpenseAvg: data.financials?.monthlyExpenseAvg ?? 0,
        profitMargin: data.financials?.profitMargin ?? 0,
        totalRevenueYTD: data.financials?.totalRevenueYTD ?? 0,
        totalExpensesYTD: data.financials?.totalExpensesYTD ?? 0,
        currentCashBalance: data.financials?.currentCashBalance ?? null,
      },
    });
    return NextResponse.json({ id: biz.id });
  } catch (err) {
    console.error("POST /api/data/businesses error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
