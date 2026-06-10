'use client'
import { useState } from 'react'
import { supabase } from '@/lib/supabase'

const C = { bg:'#F5F0E6',surface:'#EDE5D4',border:'#D4C9B0',borderLight:'#E8DFD0',text:'#1F1C18',textMid:'#4A4540',textMuted:'#9A8F82',accent:'#9A6B0C',positive:'#3B6D11' }

const STARTER_PACK = [
  { name:'BBC News', url:'http://feeds.bbci.co.uk/news/rss.xml', topic:'World News' },
  { name:'Reuters', url:'https://feeds.reuters.com/reuters/topNews', topic:'World News' },
  { name:'The Guardian', url:'https://www.theguardian.com/world/rss', topic:'World News' },
  { name:'Financial Times', url:'https://www.ft.com/rss/home', topic:'Finance' },
]

type Props = {
  user: any
  onComplete: (sources: any[]) => void
  onOpenLibrary: () => void
}

export default function Onboarding({ user, onComplete, onOpenLibrary }: Props) {
  const [adding, setAdding] = useState(false)
  const [topicQuery, setTopicQuery] = useState('')
  const b = `0.5px solid ${C.border}`
  const bl = `0.5px solid ${C.borderLight}`

  async function addStarterPack() {
    if (!user) return
    setAdding(true)
    const inserted: any[] = []
    for (const source of STARTER_PACK) {
      const { data, error } = await supabase.from('sources').insert({
        name: source.name, url: source.url, topic: source.topic,
        active: true, max_per_day: 5, user_id: user.id
      }).select().single()
      if (!error && data) inserted.push(data)
    }
    setAdding(false)
    if (inserted.length > 0) onComplete(inserted)
  }

  async function addTopic() {
    if (!topicQuery.trim() || !user) return
    const query = topicQuery.trim()
    const url = `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=en-GB&gl=GB&ceid=GB:en`
    const { data, error } = await supabase.from('sources').insert({
      name: query, url, topic: 'Topic Search',
      active: true, max_per_day: 5, user_id: user.id
    }).select().single()
    if (!error && data) onComplete([data])
  }

  return (
    <div style={{ flex:1, overflowY:'auto', padding:'32px 40px', maxWidth:560, margin:'0 auto' }}>
      <div style={{ fontFamily:'monospace', fontSize:9, letterSpacing:3, color:C.accent, marginBottom:12 }}>WELCOME TO THE SIGNET</div>
      <div style={{ fontSize:20, fontWeight:600, color:C.text, lineHeight:1.35, marginBottom:10 }}>
        Your personal information terminal.
      </div>
      <div style={{ fontSize:13, color:C.textMid, lineHeight:1.8, marginBottom:32 }}>
        No algorithm. No infinite scroll. You choose what you follow — The Signet builds your briefing every morning and delivers it to your inbox. Read it, close it, get on with your day.
      </div>

      <div style={{ fontFamily:'monospace', fontSize:9, letterSpacing:2, color:C.textMuted, marginBottom:12 }}>STEP 1 — ADD YOUR FIRST SOURCES</div>
      <div style={{ border:b, borderRadius:6, overflow:'hidden', marginBottom:16 }}>
        <div style={{ padding:'14px 16px', background:C.surface, borderBottom:bl }}>
          <div style={{ fontSize:13, fontWeight:500, color:C.text, marginBottom:4 }}>Starter Pack</div>
          <div style={{ fontSize:11, color:C.textMuted, lineHeight:1.6, marginBottom:12 }}>Four trusted global sources to get you started — BBC News, Reuters, The Guardian, and Financial Times.</div>
          <button onClick={addStarterPack} disabled={adding}
            style={{ fontFamily:'monospace', fontSize:10, letterSpacing:1, padding:'8px 20px', border:`0.5px solid ${C.accent}`, borderRadius:4, background:C.accent, color:'#FAFAF8', cursor:'pointer' }}>
            {adding ? 'ADDING…' : 'ADD STARTER PACK →'}
          </button>
        </div>
        <div style={{ padding:'14px 16px' }}>
          <div style={{ fontSize:12, color:C.textMuted, marginBottom:8 }}>Or add a specific topic</div>
          <div style={{ display:'flex', gap:8 }}>
            <input value={topicQuery} onChange={e => setTopicQuery(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addTopic()}
              placeholder="e.g. XRP, Liverpool FC, AI regulation..."
              style={{ flex:1, fontFamily:'monospace', fontSize:11, padding:'7px 10px', border:b, borderRadius:4, background:'#FAFAF8', color:C.text, outline:'none' }} />
            <button onClick={addTopic} disabled={!topicQuery.trim()}
              style={{ fontFamily:'monospace', fontSize:10, letterSpacing:1, padding:'7px 14px', border:`0.5px solid ${C.accent}`, borderRadius:4, background:'transparent', color:C.accent, cursor:'pointer', whiteSpace:'nowrap' as const }}>
              ADD ↗
            </button>
          </div>
        </div>
      </div>

      <button onClick={onOpenLibrary}
        style={{ fontFamily:'monospace', fontSize:10, letterSpacing:1, color:C.textMuted, background:'transparent', border:b, padding:'8px 16px', borderRadius:4, cursor:'pointer', marginBottom:40 }}>
        BROWSE ALL SOURCES →
      </button>

      <div style={{ borderTop:`0.5px solid ${C.borderLight}`, paddingTop:24 }}>
        <div style={{ fontFamily:'monospace', fontSize:9, letterSpacing:1, color:C.textMuted, lineHeight:1.9 }}>
          "The human brain isn't designed to process all of the world's breaking emergencies in real time."
        </div>
        <div style={{ fontFamily:'monospace', fontSize:9, color:C.accent, marginTop:4 }}>— Naval Ravikant</div>
      </div>
    </div>
  )
}