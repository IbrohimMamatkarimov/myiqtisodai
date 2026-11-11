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
    (body?.language === "en" ? "Answer in English." : body?.language === "uz" ? "Answer in Uzbek." : "Answer in the language of the question.") + " Keep it under 100 words and use clear practical steps.",
    "Visitor question:",
    question,
  ].join("\n\n");

  let lastStatus = 503;
  for (const model of ["gemini-3.5-flash-lite", "gemini-3.1-flash-lite"]) {
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-goog-api-key": process.env.GEMINI_API_KEY! },
          body: JSON.stringify({
            contents: [{ role: "user", parts: [{ text: prompt }] }],
            generationConfig: { maxOutputTokens: 1024, temperature: 0.35, thinkingConfig: { thinkingLevel: "minimal" } },
          }),
          signal: AbortSignal.timeout(6_000),
        }
      );
      lastStatus = response.status;
      if (!response.ok) {
        console.warn("[companion] provider status", model, response.status);
        if (![404, 408, 429, 500, 502, 503, 504].includes(response.status)) break;
        continue;
      }
      const data = await response.json() as { candidates?: Array<{ content?: { parts?: Array<{ text?: string; thought?: boolean }> } }> };
      const answer = data.candidates?.[0]?.content?.parts?.filter(part => !part.thought).map(part => part.text || "").join("").trim();
      if (answer) return NextResponse.json({ answer });
      console.warn("[companion] empty provider response", model);
    } catch (error) {
      console.warn("[companion] attempt failed", model, error instanceof Error ? error.name : "UnknownError");
    }
  }
  const limited = lastStatus === 429;
  return NextResponse.json({ error: limited
    ? "AI xizmatining limiti vaqtincha to‘ldi. Birozdan keyin qayta urinib ko‘ring."
    : "Javob olinmadi. Iltimos, savolingizni qayta yuboring."
  }, { status: limited ? 429 : 503 });
}
