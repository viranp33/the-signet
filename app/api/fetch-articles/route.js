import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import Parser from 'rss-parser'

const parser = new Parser()

export async function GET() {
  try {
    const { data: sources, error: sourcesError } = await supabase
      .from('sources')
      .select('*')
      .eq('active', true)

    if (sourcesError) throw new Error(sourcesError.message)
    if (!sources || sources.length === 0) {
      return NextResponse.json({ success: false, error: 'No active sources found' })
    }

    let totalAdded = 0
    let errors = []

    for (const source of sources) {
      try {
        const feed = await parser.parseURL(source.url)
        const limit = source.max_per_day || 5

        for (const item of feed.items.slice(0, limit)) {
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

          const { data: existing } = await supabase
            .from('articles')
            .select('id')
            .eq('url', article.url)
            .single()

          if (!existing) {
            const { error } = await supabase
              .from('articles')
              .insert(article)
            if (error) errors.push({ title: item.title, error: error.message })
            else totalAdded++
          }
        }
      } catch (e) {
        errors.push({ source: source.name, error: e.message })
      }
    }

    return NextResponse.json({ success: true, articlesAdded: totalAdded, errors })

  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}