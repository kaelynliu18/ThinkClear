import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function DELETE(
  req: Request,
  { params }: { params: { person: string } }
) {
  const person = params.person;
  const dataPath = path.join(process.cwd(), "public/faces-data", "faces.json");

  let data: any = {};
  try {
    data = JSON.parse(fs.readFileSync(dataPath, "utf8"));
  } catch {
    return NextResponse.json(
      { error: "Could not read faces.json" },
      { status: 500 }
    );
  }

  if (!data[person]) {
    return NextResponse.json({ error: "Face not found" }, { status: 404 });
  }

  // Optionally delete image files
  if (Array.isArray(data[person].images)) {
    for (const img of data[person].images) {
      const imgPath = path.join(process.cwd(), "public/faces-data", img);
      if (fs.existsSync(imgPath)) fs.unlinkSync(imgPath);
    }
  }

  delete data[person];
  fs.writeFileSync(dataPath, JSON.stringify(data, null, 2));

  return NextResponse.json({ success: true });
}
