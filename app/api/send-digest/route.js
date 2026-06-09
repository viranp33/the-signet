import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'

export async function GET() {
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )
  const resend = new Resend(process.env.RESEND_API_KEY)

  const { data: { users } } = await supabaseAdmin.auth.admin.listUsers()
  const results = []

  for (const user of users || []) {
    try {
      const { data: sources } = await supabaseAdmin
        .from('sources').select('*')
        .eq('user_id', user.id).eq('active', true)

      if (!sources?.length) continue

      const sourceNames = sources.map(s => s.name)
      const { data: allArticles } = await supabaseAdmin
        .from('articles').select('*')
        .in('source', sourceNames)
        .order('published_at', { ascending: false })
        .limit(100)

      const articles = sources.flatMap(src =>
        (allArticles || []).filter(a => a.source === src.name).slice(0, src.max_per_day || 5)
      ).sort((a, b) => new Date(b.published_at).getTime() - new Date(a.published_at).getTime())

      if (!articles.length) continue

      const { data: watchedPages } = await supabaseAdmin
        .from('watched_pages').select('*')
        .eq('user_id', user.id).eq('last_status', 'match')

      const { data: tickers } = await supabaseAdmin
        .from('tickers').select('*')
        .eq('user_id', user.id).eq('active', true)

      const html = buildEmail(articles, watchedPages || [], tickers || [])
      const date = new Date().toLocaleDateString('en-GB', { weekday:'long', day:'numeric', month:'long' })

      const { error } = await resend.emails.send({
        from: 'The Signet <briefing@thesignet.app>',
        to: user.email,
        subject: `Your Signet Briefing — ${date}`,
        html
      })

      if (error) {
  results.push({ user: user.email, status: 'error', detail: error.message })
} else {
  results.push({ user: user.email, status: 'sent' })
}
    } catch (e) {
      results.push({ user: user.email, status: 'error', error: e.message })
    }
  }

  return Response.json({ success: true, results })
}

function buildEmail(articles, watchedPages, tickers) {
  const accent = '#9A6B0C'
  const bg = '#F5F0E6'
  const surface = '#EDE5D4'
  const border = '#D4C9B0'
  const text = '#1F1C18'
  const muted = '#9A8F82'
  const positive = '#3B6D11'

  const articleRows = articles.map(a => `
    <tr>
      <td style="padding:14px 0;border-bottom:0.5px solid ${border};">
        <div style="font-family:monospace;font-size:10px;letter-spacing:1px;color:${accent};margin-bottom:4px;">${a.source.toUpperCase()} &nbsp;·&nbsp; ${new Date(a.published_at).toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'})}</div>
        <a href="${a.url}" style="font-family:-apple-system,sans-serif;font-size:14px;font-weight:600;color:${text};text-decoration:none;line-height:1.4;">${a.title}</a>
        ${a.summary ? `<div style="font-family:-apple-system,sans-serif;font-size:12px;color:#4A4540;line-height:1.6;margin-top:6px;">${a.summary.slice(0,180)}${a.summary.length > 180 ? '…' : ''}</div>` : ''}
      </td>
    </tr>
  `).join('')

  const tickerRows = tickers.length ? `
    <tr>
      <td style="padding:16px 0 8px;">
        <div style="font-family:monospace;font-size:9px;letter-spacing:2px;color:${muted};margin-bottom:10px;">MARKETS</div>
        <div style="font-family:monospace;font-size:11px;color:${muted};">Live prices available at <a href="https://thesignet.app" style="color:${accent};">thesignet.app</a></div>
      </td>
    </tr>
  ` : ''

  const alertRows = watchedPages.length ? `
    <tr>
      <td style="padding:16px;background:${surface};border-radius:6px;margin-bottom:16px;">
        <div style="font-family:monospace;font-size:9px;letter-spacing:2px;color:${positive};margin-bottom:8px;">⬤ WATCHED PAGE ALERT</div>
        ${watchedPages.map(p => `
          <div style="margin-bottom:6px;">
            <a href="${p.url}" style="font-family:-apple-system,sans-serif;font-size:13px;font-weight:500;color:${text};text-decoration:none;">${p.name}</a>
            <div style="font-family:monospace;font-size:10px;color:${muted};margin-top:2px;">Keywords matched: ${(p.keywords||[]).join(', ')}</div>
          </div>
        `).join('')}
      </td>
    </tr>
  ` : ''

  return `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
    <body style="margin:0;padding:0;background:${bg};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background:${bg};padding:32px 16px;">
        <tr><td align="center">
          <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#FAFAF8;border:0.5px solid ${border};border-radius:8px;overflow:hidden;">
            
            <tr>
              <td style="background:${surface};padding:20px 28px;border-bottom:0.5px solid ${border};">
                <div style="font-family:monospace;font-size:18px;font-weight:700;letter-spacing:4px;color:${text};">THE S<span style="color:${accent};">I</span>GNET</div>
                <div style="font-family:monospace;font-size:9px;letter-spacing:2px;color:${muted};margin-top:2px;">${new Date().toLocaleDateString('en-GB',{weekday:'long',day:'numeric',month:'long',year:'numeric'})}</div>
              </td>
            </tr>

            <tr>
              <td style="padding:0 28px;">
                <table width="100%" cellpadding="0" cellspacing="0">
                  <tr><td style="padding:20px 0 4px;"><div style="font-family:monospace;font-size:9px;letter-spacing:2px;color:${muted};">TODAY'S BRIEFING — ${articles.length} ARTICLES</div></td></tr>
                  ${alertRows}
                  ${articleRows}
                  ${tickerRows}
                </table>
              </td>
            </tr>

            <tr>
              <td style="padding:20px 28px;border-top:0.5px solid ${border};background:${surface};">
                <table width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td><div style="font-family:monospace;font-size:9px;color:${muted};">Read. Leave. Live.</div></td>
                    <td align="right"><a href="https://thesignet.app" style="font-family:monospace;font-size:9px;letter-spacing:1px;color:${accent};text-decoration:none;">OPEN THE SIGNET →</a></td>
                  </tr>
                </table>
              </td>
            </tr>

          </table>
          <div style="margin-top:24px;font-family:monospace;font-size:9px;color:${muted};text-align:center;line-height:1.8;">
            "The human brain isn't designed to process all of the world's breaking emergencies in real time."<br>
            <span style="color:${accent};">— Naval Ravikant</span>
          </div>
        </td></tr>
      </table>
    </body>
    </html>
  `
}