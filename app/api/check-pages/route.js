import { createClient } from '@supabase/supabase-js'

export async function GET() {
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )

  const { data: pages, error } = await supabaseAdmin
    .from('watched_pages')
    .select('*')
    .eq('active', true)

  if (error) return Response.json({ success: false, error: error.message })

  const results = []

  for (const page of pages || []) {
    try {
      const res = await fetch(page.url, {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; TheSignet/1.0)' },
        signal: AbortSignal.timeout(10000)
      })

      if (!res.ok) {
        await supabaseAdmin.from('watched_pages').update({
          last_checked: new Date().toISOString(),
          last_status: `error_${res.status}`
        }).eq('id', page.id)
        results.push({ page: page.name, status: `error_${res.status}` })
        continue
      }

      const html = await res.text()
      const text = html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').toLowerCase()
      const keywords = page.keywords || []
      const matched = keywords.filter(kw => text.includes(kw.toLowerCase()))
      const hasMatch = matched.length > 0

      await supabaseAdmin.from('watched_pages').update({
        last_checked: new Date().toISOString(),
        last_status: hasMatch ? 'match' : 'no_match',
        ...(hasMatch && { last_match: new Date().toISOString() })
      }).eq('id', page.id)

      results.push({ page: page.name, status: hasMatch ? 'match' : 'no_match', matched })
    } catch (e) {
      await supabaseAdmin.from('watched_pages').update({
        last_checked: new Date().toISOString(),
        last_status: 'fetch_error'
      }).eq('id', page.id)
      results.push({ page: page.name, status: 'fetch_error', error: e.message })
    }
  }

  return Response.json({ success: true, checked: results.length, results })
}