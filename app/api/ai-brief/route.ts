import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  const { title, source, summary } = await req.json()

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY!,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1000,
      system: `You are Signet AI — a concise, intelligent briefing assistant built into a personal news terminal. Your job is to expand on a news story given its headline and one-line summary. Write in a calm, authoritative tone — like a well-informed editor briefing a busy professional. No fluff, no filler. 3 to 4 short paragraphs. Do not use bullet points. Do not use headers. Just clean flowing prose that gives the reader genuine context and insight.`,
      messages: [{
        role: 'user',
        content: `Headline: ${title}\nSource: ${source}\nSummary: ${summary || 'No summary provided.'}\n\nBrief me on this story.`
      }]
    })
  })

  const data = await response.json()
  const text = data.content?.find((b: any) => b.type === 'text')?.text || 'No response received.'
  return NextResponse.json({ text })
}