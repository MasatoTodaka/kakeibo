import type { IncomingMessage, ServerResponse } from 'http';
import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY ?? '' });

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');

  if (req.method !== 'POST') {
    res.statusCode = 405;
    res.end(JSON.stringify({ error: 'Method not allowed' }));
    return;
  }

  try {
    const body = await new Promise<string>((resolve, reject) => {
      let data = '';
      req.on('data', (chunk) => (data += chunk));
      req.on('end', () => resolve(data));
      req.on('error', reject);
    });

    const { summary } = JSON.parse(body);

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
      model: 'gemini-1.5-flash',
      contents: prompt,
    });

    res.statusCode = 200;
    res.end(JSON.stringify({ advice: response.text ?? '' }));
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    res.statusCode = 500;
    res.end(JSON.stringify({ error: message }));
  }
}
