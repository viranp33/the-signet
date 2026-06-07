'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

const C = { bg:'#F5F0E6',surface:'#EDE5D4',border:'#D4C9B0',borderLight:'#E8DFD0',text:'#1F1C18',textMid:'#4A4540',textMuted:'#9A8F82',accent:'#9A6B0C',positive:'#3B6D11' }

type Props = { user: any }

export default function WatchedPages({ user }: Props) {
  const [pages, setPages] = useState<any[]>([])
  const [url, setUrl] = useState('')
  const [name, setName] = useState('')
  const [keywords, setKeywords] = useState('')
  const [adding, setAdding] = useState(false)
  const b = `0.5px solid ${C.border}`
  const bl = `0.5px solid ${C.borderLight}`

  useEffect(() => {
    if (!user) return
    supabase.from('watched_pages').select('*')
      .eq('user_id', user.id).eq('active', true)
      .order('created_at', { ascending: false })
      .then(({ data }) => { if (data) setPages(data) })
  }, [user])

  async function addPage() {
    if (!url.trim() || !name.trim() || !user) return
    setAdding(true)
    const kwArray = keywords.split(',').map(k => k.trim()).filter(Boolean)
    const { data, error } = await supabase.from('watched_pages').insert({
      user_id: user.id,
      url: url.trim(),
      name: name.trim(),
      keywords: kwArray,
      active: true,
      last_status: 'pending'
    }).select().single()
    if (!error && data) {
      setPages(prev => [data, ...prev])
      setUrl('')
      setName('')
      setKeywords('')
    }
    setAdding(false)
  }

  async function removePage(id: string) {
    await supabase.from('watched_pages').delete().eq('id', id)
    setPages(prev => prev.filter(p => p.id !== id))
  }

  function statusDot(status: string) {
    if (status === 'match') return C.positive
    if (status === 'no_match') return C.accent
    if (status?.startsWith('error') || status === 'fetch_error') return '#A32D2D'
    return C.border
  }

  function statusLabel(status: string) {
    if (status === 'match') return 'KEYWORD MATCHED'
    if (status === 'no_match') return 'NO MATCH'
    if (status === 'fetch_error') return 'FETCH ERROR'
    if (status?.startsWith('error_')) return `HTTP ${status.replace('error_','')}`
    return 'PENDING'
  }

  function timeAgo(ts: string) {
    if (!ts) return 'never'
    const diff = Date.now() - new Date(ts).getTime()
    const hrs = Math.floor(diff / 3600000)
    if (hrs < 1) return 'just now'
    if (hrs < 24) return `${hrs}h ago`
    return `${Math.floor(hrs/24)}d ago`
  }

  return (
    <div style={{ display:'flex', flexDirection:'column', flex:1, minHeight:0 }}>
      <div style={{ padding:'14px 16px', borderBottom:bl, background:C.bg }}>
        <div style={{ fontFamily:'monospace', fontSize:9, letterSpacing:2, color:C.textMuted, marginBottom:10 }}>ADD WATCHED PAGE</div>
        <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
          <input value={name} onChange={e => setName(e.target.value)}
            placeholder="Name — e.g. FCA Regulatory Updates"
            style={{ fontFamily:'monospace', fontSize:11, padding:'7px 10px', border:b, borderRadius:4, background:'#FAFAF8', color:C.text, outline:'none' }} />
          <input value={url} onChange={e => setUrl(e.target.value)}
            placeholder="URL — e.g. https://www.fca.org.uk/news"
            style={{ fontFamily:'monospace', fontSize:11, padding:'7px 10px', border:b, borderRadius:4, background:'#FAFAF8', color:C.text, outline:'none' }} />
          <input value={keywords} onChange={e => setKeywords(e.target.value)}
            placeholder="Keywords — comma separated e.g. crypto, XRP, stablecoin"
            style={{ fontFamily:'monospace', fontSize:11, padding:'7px 10px', border:b, borderRadius:4, background:'#FAFAF8', color:C.text, outline:'none' }} />
          <button onClick={addPage} disabled={adding || !url.trim() || !name.trim()}
            style={{ fontFamily:'monospace', fontSize:10, letterSpacing:1, padding:'8px 16px', border:`0.5px solid ${C.accent}`, borderRadius:4, background:'transparent', color:C.accent, cursor:'pointer', alignSelf:'flex-start' as const }}>
            {adding ? 'ADDING...' : '+ ADD PAGE'}
          </button>
        </div>
      </div>

      <div style={{ overflowY:'auto', flex:1 }}>
        {pages.length === 0 ? (
          <div style={{ padding:30, textAlign:'center', fontFamily:'monospace', fontSize:10, color:C.textMuted, letterSpacing:2 }}>
            NO PAGES WATCHED YET
          </div>
        ) : pages.map(page => (
          <div key={page.id} style={{ padding:'12px 16px', borderBottom:bl }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:6 }}>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontSize:12, fontWeight:500, color:C.text, marginBottom:3 }}>{page.name}</div>
                <div style={{ fontFamily:'monospace', fontSize:9, color:C.textMuted, marginBottom:4, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' as const }}>{page.url}</div>
              </div>
              <button onClick={() => removePage(page.id)}
                style={{ fontFamily:'monospace', fontSize:8, color:C.textMuted, background:'transparent', border:'none', cursor:'pointer', marginLeft:8, flexShrink:0 }}>✕</button>
            </div>
            <div style={{ display:'flex', alignItems:'center', gap:10, flexWrap:'wrap' as const }}>
              <div style={{ display:'flex', alignItems:'center', gap:5 }}>
                <span style={{ width:6, height:6, borderRadius:'50%', background:statusDot(page.last_status), display:'inline-block' }} />
                <span style={{ fontFamily:'monospace', fontSize:8, color:C.textMuted }}>{statusLabel(page.last_status)}</span>
              </div>
              <span style={{ fontFamily:'monospace', fontSize:8, color:C.borderLight }}>|</span>
              <span style={{ fontFamily:'monospace', fontSize:8, color:C.textMuted }}>checked {timeAgo(page.last_checked)}</span>
              {page.last_match && (
                <>
                  <span style={{ fontFamily:'monospace', fontSize:8, color:C.borderLight }}>|</span>
                  <span style={{ fontFamily:'monospace', fontSize:8, color:C.positive }}>matched {timeAgo(page.last_match)}</span>
                </>
              )}
            </div>
            {page.keywords?.length > 0 && (
              <div style={{ display:'flex', gap:4, flexWrap:'wrap' as const, marginTop:6 }}>
                {page.keywords.map((kw: string) => (
                  <span key={kw} style={{ fontFamily:'monospace', fontSize:8, padding:'2px 6px', border:b, borderRadius:2, color:C.textMuted }}>{kw}</span>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}