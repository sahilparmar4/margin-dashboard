import { NextResponse } from "next/server";
import { ingestUpload, UploadRejected, type UploadFiles } from "@/lib/ingest/upload";

const MAX_BYTES = 15 * 1024 * 1024;
const FIELDS = ["timesheet", "salaries", "projects"] as const;

export async function POST(req: Request) {
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "Expected a multipart form upload." }, { status: 400 });
  }

  const files: UploadFiles = {};
  for (const field of FIELDS) {
    const f = form.get(field);
    if (!(f instanceof File) || f.size === 0) continue;
    if (f.size > MAX_BYTES) {
      return NextResponse.json({ error: `${field}: file is larger than 15 MB.` }, { status: 413 });
    }
    files[field] = { buffer: Buffer.from(await f.arrayBuffer()), fileName: f.name };
  }

  const yearRaw = Number(form.get("defaultYear"));
  const defaultYear = Number.isInteger(yearRaw) && yearRaw > 2000 ? yearRaw : undefined;

  try {
    const result = await ingestUpload(files, { defaultYear });
    return NextResponse.json(result);
  } catch (e) {
    if (e instanceof UploadRejected) {
      return NextResponse.json({ error: "A file was rejected. Nothing was saved.", problems: e.problems }, { status: 422 });
    }
    console.error(e);
    return NextResponse.json({ error: "Something went wrong while saving. Nothing was saved." }, { status: 500 });
  }
}