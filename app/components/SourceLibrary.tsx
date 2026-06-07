'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

const C = { bg:'#F5F0E6',surface:'#EDE5D4',border:'#D4C9B0',borderLight:'#E8DFD0',text:'#1F1C18',textMid:'#4A4540',textMuted:'#9A8F82',accent:'#9A6B0C',positive:'#3B6D11' }

type Props = { userSources:any[], user:any, onClose:()=>void, onSourcesChange:(s:any[])=>void }

export default function SourceLibrary({ userSources, user, onClose, onSourcesChange }:Props) {
  const [library, setLibrary] = useState<any[]>([])
  const [activeCategory, setActiveCategory] = useState('World News')
  const [topicQuery, setTopicQuery] = useState('')
  const [topicLimit, setTopicLimit] = useState(5)
  const [addingSource, setAddingSource] = useState<string|null>(null)
  const b = `0.5px solid ${C.border}`
  const bl = `0.5px solid ${C.borderLight}`

  useEffect(() => {
    supabase.from('source_library').select('*').order('name')
      .then(({ data }) => { if (data) setLibrary(data) })
  }, [])

  async function addSource(source:any) {
    setAddingSource(source.url)
    const already = userSources.some(s => s.url === source.url)
    if (!already && user) {
      const { error } = await supabase.from('sources').insert({
        name:source.name, url:source.url, topic:source.topic,
        active:true, max_per_day:5, user_id:user.id
      })
      if (!error) onSourcesChange([...userSources, source])
    }
    setAddingSource(null)
  }

  async function removeSource(url:string) {
    if (!user) return
    await supabase.from('sources').delete().eq('url', url).eq('user_id', user.id)
    onSourcesChange(userSources.filter(s => s.url !== url))
  }

  async function addTopicSearch() {
    if (!topicQuery.trim() || !user) return
    const query = topicQuery.trim()
    const url = `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=en-GB&gl=GB&ceid=GB:en`
    const { error } = await supabase.from('sources').insert({
      name:query, url, topic:'Topic Search', active:true, max_per_day:topicLimit, user_id:user.id
    })
    if (!error) {
      onSourcesChange([...userSources, { name:query, url, topic:'Topic Search', active:true }])
      setTopicQuery('')
    }
  }

  return (
    <div style={{ display:'flex', flexDirection:'column', flex:1 }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'8px 14px', borderBottom:bl, background:C.surface }}>
        <button onClick={onClose} style={{ fontFamily:'monospace', fontSize:10, letterSpacing:1, padding:'5px 12px', border:b, borderRadius:4, background:'transparent', color:C.textMuted, cursor:'pointer' }}>← BRIEFING</button>
        <span style={{ fontFamily:'monospace', fontSize:10, letterSpacing:2, color:C.textMuted }}>SOURCE LIBRARY</span>
      </div>
      <div style={{ padding:'12px 14px', borderBottom:bl, background:C.bg }}>
        <div style={{ fontFamily:'monospace', fontSize:9, letterSpacing:2, color:C.textMuted, marginBottom:8 }}>SEARCH BY TOPIC</div>
        <div style={{ fontSize:11, color:C.textMuted, marginBottom:10, lineHeight:1.6 }}>Type any topic and The Signet will find news from across the web.</div>
        <div style={{ display:'flex', gap:8 }}>
          <input value={topicQuery} onChange={e => setTopicQuery(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addTopicSearch()}
            placeholder="e.g. XRP, BTC, TSLA, UK housing..."
            style={{ flex:1, fontFamily:'monospace', fontSize:12, padding:'8px 10px', border:`0.5px solid ${C.border}`, borderRadius:4, background:'#FAFAF8', color:C.text, outline:'none' }} />
          <select value={topicLimit} onChange={e => setTopicLimit(Number(e.target.value))}
            style={{ fontFamily:'monospace', fontSize:10, padding:'8px', border:`0.5px solid ${C.border}`, borderRadius:4, background:'#FAFAF8', color:C.text }}>
            <option value={3}>3/day</option>
            <option value={5}>5/day</option>
            <option value={10}>10/day</option>
            <option value={15}>15/day</option>
          </select>
          <button onClick={addTopicSearch}
            style={{ fontFamily:'monospace', fontSize:10, letterSpacing:1, padding:'8px 16px', border:`0.5px solid ${C.accent}`, borderRadius:4, background:'transparent', color:C.accent, cursor:'pointer', whiteSpace:'nowrap' as const }}>
            ADD TOPIC ↗
          </button>
        </div>
      </div>
      <div style={{ display:'flex', gap:6, padding:'10px 14px', borderBottom:bl, flexWrap:'wrap' as const }}>
        {[...new Set(library.map(s => s.category))].map(cat => (
          <button key={cat} onClick={() => setActiveCategory(cat)}
            style={{ fontFamily:'monospace', fontSize:9, letterSpacing:1, padding:'4px 10px', borderRadius:3, border:`0.5px solid ${activeCategory===cat ? C.accent : C.border}`, background:activeCategory===cat ? '#FAEEDA' : 'transparent', color:activeCategory===cat ? C.accent : C.textMuted, cursor:'pointer' }}>
            {cat}
          </button>
        ))}
      </div>
      <div style={{ overflowY:'auto', flex:1, padding:'10px 14px' }}>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
          {library.filter(s => s.category === activeCategory).map(source => {
            const isAdded = userSources.some(u => u.url === source.url)
            return (
              <div key={source.url} style={{ border:b, borderRadius:5, padding:'10px 12px', opacity:isAdded?0.6:1 }}>
                <div style={{ fontSize:12, fontWeight:500, color:C.text, marginBottom:4 }}>{source.name}</div>
                <div style={{ fontSize:11, color:C.textMuted, lineHeight:1.5, marginBottom:8 }}>{source.description}</div>
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                  <span style={{ fontFamily:'monospace', fontSize:9, padding:'2px 6px', background:C.surface, borderRadius:2, color:C.textMuted }}>{source.topic}</span>
                  <button onClick={() => isAdded ? removeSource(source.url) : addSource(source)}
                    disabled={addingSource === source.url}
                    style={{ fontFamily:'monospace', fontSize:9, letterSpacing:1, padding:'3px 10px', border:`0.5px solid ${isAdded ? C.border : C.accent}`, borderRadius:3, background:'transparent', color:isAdded ? C.textMuted : C.accent, cursor:'pointer' }}>
                    {addingSource===source.url ? '…' : isAdded ? 'REMOVE' : '+ ADD'}
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}