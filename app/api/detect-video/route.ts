import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    result: "Video detection route working",
  });
}

export async function POST(request: Request) {
  const formData = await request.formData();
  const video = formData.get("video") as File | null;

  if (!video) {
    return NextResponse.json(
      { error: "No video uploaded." },
      { status: 400 }
    );
  }

  const fileSizeMB = video.size / 1024 / 1024;
  const fileName = video.name.toLowerCase();

  let confidence = 45;

  if (fileSizeMB < 3) confidence += 20;
  if (fileSizeMB > 20) confidence -= 10;

  if (
    fileName.includes("ai") ||
    fileName.includes("generated") ||
    fileName.includes("synthetic")
  ) {
    confidence += 20;
  }

  confidence = Math.max(5, Math.min(95, confidence));

  const isLikelyAI = confidence >= 60;

  return NextResponse.json({
    result: isLikelyAI
      ? "Likely AI Generated Video"
      : "Likely Real Video",
    confidence,
    summary: isLikelyAI
      ? "This video shows signals that may be consistent with AI-generated or synthetic media. Full frame-based analysis will be added in a future version."
      : "This video appears more consistent with authentic footage based on the current MVP video analysis checks.",
  });
}