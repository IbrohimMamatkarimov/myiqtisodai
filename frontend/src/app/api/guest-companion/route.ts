import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

const MAX_QUESTION_CHARS = 1200;
function offlineFinanceHelp(question: string) {
  const q = question.toLowerCase();
  if (/(budget|byudjet|xarajat|oylik)/.test(q)) return "Boshlash uchun sodda usul:\n\n1. Bir oyga kiradigan barcha pulni yozing.\n2. Zarur xarajatlarni alohida yozing.\n3. Qolgan xarajatlar uchun kichik limit belgilang.\n4. Hech bo‘lmasa oz miqdorni jamg‘armaga ajrating.\n\nShaxsiy tahlil va kuzatish ro‘yxatdan keyin ochiladi.";
  return "Men hozir ham umumiy moliyaviy savollarda yordam bera olaman. Maqsadingizni ayting: xarajatlarni nazorat qilish, jamg‘arish yoki byudjet tuzish. Shaxsiy hisob-kitoblar uchun tizimga kirishingiz mumkin.";
}


export async function POST(request: NextRequest) {
  if (!process.env.GEMINI_API_KEY) {
    return NextResponse.json({ error: "The companion is being prepared. Please try again shortly." }, { status: 503 });
  }

  const body = await request.json().catch(() => null) as { question?: unknown } | null;
  const question = typeof body?.question === "string" ? body.question.trim() : "";
  if (!question || question.length > MAX_QUESTION_CHARS) {
    return NextResponse.json({ error: "Please keep your question under 1,200 characters." }, { status: 400 });
  }

  const prompt = [
    "You are IqtisodAI's welcoming financial learning companion for visitors in Uzbekistan.",
    "Give general financial-literacy guidance only. Do not request personal information, account details, passwords, or card numbers.",
    "Do not claim to know the visitor's finances. Explain that personal budgeting analysis becomes available after sign-in.",
    "Answer in the same language as the question. Keep it under 180 words and use clear practical steps.",
    "Visitor question:",
    question,
  ].join("\n\n");

  try {
    const model = process.env.GEMINI_MODEL || "gemini-flash-latest";
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": process.env.GEMINI_API_KEY },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig: { maxOutputTokens: 500, temperature: 0.35 },
        }),
        signal: AbortSignal.timeout(3_000),
      }
    );
    if (!response.ok) return NextResponse.json({ answer: offlineFinanceHelp(question), fallback: true });
    const data = await response.json() as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };
    const answer = data.candidates?.[0]?.content?.parts?.map((part) => part.text || "").join("").trim();
    if (!answer) return NextResponse.json({ answer: offlineFinanceHelp(question), fallback: true });
    return NextResponse.json({ answer });
  } catch {
    return NextResponse.json({ answer: offlineFinanceHelp(question), fallback: true });
  }
}
