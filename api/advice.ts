import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY ?? '' });

export default async function handler(req: Request) {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    const { summary } = await req.json();

    const prompt = `あなたは日本の家計管理と資産形成の専門家です。
以下の家計データを分析し、日本語で具体的なアドバイスをしてください。

【分析の観点】
- 収支バランスの評価（固定費率、貯蓄率など）
- 支出の改善ポイント
- 投資・資産形成の提案
- 具体的な行動提案（優先度順に3つ）

数値を使って具体的に、わかりやすく回答してください。

---
${summary}`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: prompt,
    });

    return new Response(
      JSON.stringify({ advice: response.text ?? '' }),
      { headers: { 'Content-Type': 'application/json' } }
    );
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
