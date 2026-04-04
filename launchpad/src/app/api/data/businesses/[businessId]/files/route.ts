/**
 * GET  /api/data/businesses/[businessId]/files  — list all uploaded files
 * POST /api/data/businesses/[businessId]/files  — register a new uploaded file
 */
import { NextRequest, NextResponse } from "next/server";
import { requireBusinessAccess } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ businessId: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const { businessId } = await params;
    await requireBusinessAccess(businessId);

    const files = await prisma.uploadedFile.findMany({
      where: { businessId },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(files);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unauthorized" },
      { status: 401 }
    );
  }
}

export async function POST(req: NextRequest, { params }: Params) {
  try {
    const { businessId } = await params;
    await requireBusinessAccess(businessId);

    const data = await req.json() as {
      blobUrl: string;
      blobPath: string;
      fileName: string;
      fileSize: number;
      mimeType: string;
      folder: string;
      linkedType?: string;
      linkedId?: string;
    };

    const file = await prisma.uploadedFile.create({
      data: {
        businessId,
        blobUrl: data.blobUrl,
        blobPath: data.blobPath ?? "",
        fileName: data.fileName,
        fileSize: data.fileSize ?? 0,
        mimeType: data.mimeType,
        folder: data.folder ?? "other",
        linkedType: data.linkedType ?? null,
        linkedId: data.linkedId ?? null,
        analysisStatus: "pending",
      },
    });

    return NextResponse.json({ id: file.id });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to register file" },
      { status: 500 }
    );
  }
}
