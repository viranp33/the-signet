import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import Parser from 'rss-parser'

const parser = new Parser()

const SOURCES = [
  { name: 'BBC News', url: 'https://feeds.bbci.co.uk/news/rss.xml', topic: 'UK News' },
  { name: 'BBC Business', url: 'https://feeds.bbci.co.uk/news/business/rss.xml', topic: 'Business' },
  { name: 'BBC Technology', url: 'https://feeds.bbci.co.uk/news/technology/rss.xml', topic: 'Technology' },
  { name: 'The Guardian', url: 'https://www.theguardian.com/uk/rss', topic: 'UK News' },
  { name: 'The Guardian', url: 'https://www.theguardian.com/world/rss', topic: 'World' },
  { name: 'Sky News', url: 'https://feeds.skynews.com/feeds/rss/uk.xml', topic: 'UK News' },
  { name: 'Al Jazeera', url: 'https://www.aljazeera.com/xml/rss/all.xml', topic: 'World' },
  { name: 'The Independent', url: 'https://www.independent.co.uk/news/rss', topic: 'UK News' },
]

export async function GET() {
  try {
    let totalAdded = 0
    let errors = []

    for (const source of SOURCES) {
      const feed = await parser.parseURL(source.url)

      for (const item of feed.items.slice(0, 5)) {
        const article = {
          source: source.name,
          title: item.title,
          summary: item.contentSnippet || item.content || '',
          url: item.link,
          published_at: item.pubDate ? new Date(item.pubDate).toISOString() : new Date().toISOString(),
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

          if (error) {
            errors.push({ title: item.title, error: error.message })
          } else {
            totalAdded++
          }
        }
      }
    }

    return NextResponse.json({ success: true, articlesAdded: totalAdded, errors })

  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}