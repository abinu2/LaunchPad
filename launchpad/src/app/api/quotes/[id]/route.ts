/**
 * GET/PATCH /api/quotes/[id]
 * Retrieve or update a specific quote
 */
import { NextRequest, NextResponse } from "next/server";
import { requireBusinessAccess } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const quote = await prisma.quote.findUnique({
      where: { id: params.id },
    });

    if (!quote) {
      return NextResponse.json({ error: "Quote not found" }, { status: 404 });
    }

    await requireBusinessAccess(quote.businessId);

    return NextResponse.json(quote);
  } catch (err) {
    console.error("quote GET error:", err);
    return NextResponse.json({ error: "Failed to fetch quote" }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const quote = await prisma.quote.findUnique({
      where: { id: params.id },
    });

    if (!quote) {
      return NextResponse.json({ error: "Quote not found" }, { status: 404 });
    }

    await requireBusinessAccess(quote.businessId);

    const data = await req.json();
    const updated = await prisma.quote.update({
      where: { id: params.id },
      data,
    });

    return NextResponse.json(updated);
  } catch (err) {
    console.error("quote PATCH error:", err);
    return NextResponse.json({ error: "Failed to update quote" }, { status: 500 });
  }
}
