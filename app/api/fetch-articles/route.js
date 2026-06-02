import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import Parser from 'rss-parser'

const parser = new Parser()

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export async function GET() {
  try {
    const { data: sources, error: sourcesError } = await supabaseAdmin
      .from('sources')
      .select('*')
      .eq('active', true)

    if (sourcesError) throw new Error(sourcesError.message)
    if (!sources || sources.length === 0) {
      return NextResponse.json({ success: false, error: 'No active sources found' })
    }

    let totalAdded = 0
    const errors = []

    for (const source of sources) {
      try {
        const feed = await parser.parseURL(source.url)
        const limit = source.max_per_day || 5

        const keywords = source.keywords
          ? source.keywords.split(',').map(k => k.trim().toLowerCase()).filter(Boolean)
          : []

        let addedFromSource = 0

        for (const item of feed.items.slice(0, 20)) {
          if (addedFromSource >= limit) break

          const title = (item.title || '').toLowerCase()
          const summary = (item.contentSnippet || item.content || '').toLowerCase()

          if (keywords.length > 0) {
            const matches = keywords.some(kw =>
              title.includes(kw) || summary.includes(kw)
            )
            if (!matches) continue
          }

          const article = {
            source: source.name,
            title: item.title,
            summary: item.contentSnippet || item.content || '',
            url: item.link,
            published_at: item.pubDate
              ? new Date(item.pubDate).toISOString()
              : new Date().toISOString(),
            read: false,
            topic: source.topic
          }

          const { data: existing } = await supabaseAdmin
            .from('articles')
            .select('id')
            .eq('url', article.url)
            .single()

          if (!existing) {
            const { error } = await supabaseAdmin
              .from('articles')
              .insert(article)
            if (error) errors.push({ title: item.title, error: error.message })
            else { totalAdded++; addedFromSource++ }
          } else {
            addedFromSource++
          }
        }
      } catch (e) {
        errors.push({ source: source.name, error: String(e) })
      }
    }

    return NextResponse.json({ success: true, articlesAdded: totalAdded, errors })

  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 })
  }
}