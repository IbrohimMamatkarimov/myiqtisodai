import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

const MAX_QUESTION_CHARS = 1200;



export async function POST(request: NextRequest) {
  if (!process.env.GEMINI_API_KEY) {
    return NextResponse.json({ error: "The companion is being prepared. Please try again shortly." }, { status: 503 });
  }

  const body = await request.json().catch(() => null) as { language?: unknown; question?: unknown } | null;
  const question = typeof body?.question === "string" ? body.question.trim() : "";
  if (!question || question.length > MAX_QUESTION_CHARS) {
    return NextResponse.json({ error: "Please keep your question under 1,200 characters." }, { status: 400 });
  }

  const prompt = [
    "Speak warmly, patiently and respectfully. Use encouraging natural language. Never scold, shame, pressure or talk down to the user. Keep advice calm and practical.",
    "You are IqtisodAI's welcoming financial learning companion for visitors in Uzbekistan.",
    "Give general financial-literacy guidance only. Do not request personal information, account details, passwords, or card numbers.",
    "Do not claim to know the visitor's finances. Explain that personal budgeting analysis becomes available after sign-in.",
    (body?.language === "en" ? "Answer in English." : body?.language === "uz" ? "Answer in Uzbek." : "Answer in the language of the question.") + " Keep it under 180 words and use clear practical steps.",
    "Visitor question:",
    question,
  ].join("\n\n");

  try {
    const model = "gemini-flash-lite-latest";
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": process.env.GEMINI_API_KEY },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig: { maxOutputTokens: 500, temperature: 0.35 },
        }),
        signal: AbortSignal.timeout(18_000),
      }
    );
    if (!response.ok) return NextResponse.json({ error: "Javob olinmadi. Iltimos, qayta urinib ko‘ring." }, { status: 503 });
    const data = await response.json() as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };
    const answer = data.candidates?.[0]?.content?.parts?.map((part) => part.text || "").join("").trim();
    if (!answer) return NextResponse.json({ error: "Javob olinmadi. Iltimos, qayta urinib ko‘ring." }, { status: 503 });
    return NextResponse.json({ answer });
  } catch {
    return NextResponse.json({ error: "Javob olinmadi. Iltimos, qayta urinib ko‘ring." }, { status: 503 });
  }
}
