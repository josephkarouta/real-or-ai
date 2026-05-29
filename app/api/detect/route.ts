import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const image = formData.get("image") as File;

    if (!image) {
      return NextResponse.json(
        { error: "No image uploaded" },
        { status: 400 }
      );
    }

    const sightengineForm = new FormData();

    sightengineForm.append("media", image);
    sightengineForm.append("models", "genai");
    sightengineForm.append(
      "api_user",
      process.env.SIGHTENGINE_API_USER || ""
    );
    sightengineForm.append(
      "api_secret",
      process.env.SIGHTENGINE_API_SECRET || ""
    );

    const response = await fetch(
      "https://api.sightengine.com/1.0/check.json",
      {
        method: "POST",
        body: sightengineForm,
      }
    );

    const data = await response.json();

    const aiScore = data.type?.ai_generated;

    let result = "Likely Real";
    let confidence = 100;

    if (aiScore > 0.5) {
      result = "Likely AI Generated";
      confidence = Math.round(aiScore * 100);
    } else {
      confidence = Math.round((1 - aiScore) * 100);
    }

    return NextResponse.json({
      result,
      confidence,
      raw: data,
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    );
  }
}