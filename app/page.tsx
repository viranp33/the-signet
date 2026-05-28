'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

type Article = {
  id: number
  source: string
  title: string
  summary: string
  url: string
  published_at: string
  topic: string
}

const C = {
  bg: '#F5F0E6', surface: '#EDE5D4', border: '#D4C9B0',
  borderLight: '#E8DFD0', text: '#1F1C18', textMid: '#4A4540',
  textMuted: '#9A8F82', accent: '#9A6B0C', positive: '#3B6D11',
}

const WX: Record<number, string> = {
  0:'Clear',1:'Mostly clear',2:'Partly cloudy',3:'Overcast',
  45:'Foggy',51:'Drizzle',61:'Light rain',63:'Rain',65:'Heavy rain',
  71:'Light snow',80:'Showers',95:'Thunderstorm',
}

export default function Home() {
  const [user, setUser] = useState<any>(null)
  const [articles, setArticles] = useState<Article[]>([])
  const [readIds, setReadIds] = useState<Set<number>>(new Set())
  const [secs, setSecs] = useState(0)
  const [rates, setRates] = useState<any>(null)
  const [locationName, setLocationName] = useState('YOUR LOCATION')
  const [btc, setBtc] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [clock, setClock] = useState('')
  const [weather, setWeather] = useState<any>(null)
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null)
  const [showSourceLibrary, setShowSourceLibrary] = useState(false)
  const [userSources, setUserSources] = useState<any[]>([])
  const [library, setLibrary] = useState<any[]>([])
  const [activeCategory, setActiveCategory] = useState('World News')
  const [addingSource, setAddingSource] = useState<string | null>(null)
  const [topicQuery, setTopicQuery] = useState('')
  
  useEffect(() => {
  async function loadSources() {
    const { data: sources } = await supabase.from('sources').select('*').eq('active', true)
    if (sources) setUserSources(sources)
    const { data: lib } = await supabase.from('source_library').select('*').order('name')
    if (lib) setLibrary(lib)
  }
  loadSources()
}, [])
 useEffect(() => {
  function fetchMarketData() {
    fetch('https://api.frankfurter.dev/v1/latest?from=GBP&to=USD,EUR')
      .then(r => r.json()).then(d => setRates(d.rates)).catch(() => {})
    fetch('https://api.coinbase.com/v2/prices/BTC-USD/spot')
      .then(r => r.json()).then(d => setBtc(parseFloat(d.data.amount))).catch(() => {})
  }
  fetchMarketData()
  const interval = setInterval(fetchMarketData, 60000)
  return () => clearInterval(interval)
}, [])

async function addTopicSearch() {
  if (!topicQuery.trim()) return
  const query = topicQuery.trim()
  const url = `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=en-GB&gl=GB&ceid=GB:en`
  const { error } = await supabase.from('sources').insert({
    name: query,
    url: url,
    topic: 'Topic Search',
    active: true,
    max_per_day: 5
  })
  if (!error) {
    setUserSources(prev => [...prev, { name: query, url, topic: 'Topic Search', active: true }])
    setTopicQuery('')
  }
}

useEffect(() => {
  async function loadArticles() {
    try {
      const { data, error } = await supabase
        .from('articles')
        .select('*')
        .order('published_at', { ascending: false })
        .limit(12)
      if (data) setArticles(data)
      if (error) console.error('Supabase error:', error.message)
    } catch (e) {
      console.error('Failed to load articles:', e)
    } finally {
      setLoading(false)
    }
  }
  loadArticles()
}, [])

useEffect(() => {
  supabase.auth.getUser().then(({ data }) => setUser(data.user))
  const t = setInterval(() => {
    setSecs(s => s + 1)
    const n = new Date()
    setClock(`${p(n.getHours())}:${p(n.getMinutes())}`)
  }, 1000)
  const n = new Date()
  setClock(`${p(n.getHours())}:${p(n.getMinutes())}`)
  return () => clearInterval(t)
}, [])

useEffect(() => {
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude: lat, longitude: lon } = pos.coords
        fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code&timezone=auto`)
          .then(r => r.json()).then(d => setWeather(d.current)).catch(() => {})
        fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`)
          .then(r => r.json()).then(d => setLocationName(d.address?.city || d.address?.town || d.address?.village || 'YOUR LOCATION')).catch(() => {})
      },
      () => {
        fetch('https://api.open-meteo.com/v1/forecast?latitude=51.51&longitude=-0.13&current=temperature_2m,weather_code&timezone=auto')
          .then(r => r.json()).then(d => setWeather(d.current)).catch(() => {})
        setLocationName('LONDON')
      }
    )
  } else {
    fetch('https://api.open-meteo.com/v1/forecast?latitude=51.51&longitude=-0.13&current=temperature_2m,weather_code&timezone=auto')
      .then(r => r.json()).then(d => setWeather(d.current)).catch(() => {})
  }
}, [])
function estimateReadTime(text: string) {
  const words = text ? text.split(' ').length : 0
  return `${Math.max(1, Math.round(words / 200))} min read`
}

function openArticle(article: Article) {
  setSelectedArticle(article)
}

function closeReader() {
  setSelectedArticle(null)
}

function readInFull() {
  if (!selectedArticle) return
  markRead(selectedArticle.id)
  window.open(selectedArticle.url, '_blank')
  const currentIndex = articles.findIndex(a => a.id === selectedArticle.id)
  const next = articles[currentIndex + 1]
  if (next) setSelectedArticle(next)
  else setSelectedArticle(null)
}

function markReadAndReturn() {
  if (!selectedArticle) return
  markRead(selectedArticle.id)
  setSelectedArticle(null)
}

function nextArticle() {
  if (!selectedArticle) return
  markRead(selectedArticle.id)
  const currentIndex = articles.findIndex(a => a.id === selectedArticle.id)
  const next = articles[currentIndex + 1]
  if (next) setSelectedArticle(next)
  else setSelectedArticle(null)
}
async function addSource(source: any) {
  setAddingSource(source.url)
  const alreadyAdded = userSources.some(s => s.url === source.url)
  if (!alreadyAdded) {
    const { error } = await supabase.from('sources').insert({
      name: source.name, url: source.url, topic: source.topic,
      active: true, max_per_day: 5
    })
    if (!error) setUserSources(prev => [...prev, source])
  }
  setAddingSource(null)
}

async function removeSource(url: string) {
  await supabase.from('sources').delete().eq('url', url)
  setUserSources(prev => prev.filter(s => s.url !== url))
}
  function p(n: number) { return String(n).padStart(2, '0') }
  function timer() { return `${p(Math.floor(secs/60))}:${p(secs%60)}` }
  function markRead(id: number) { setReadIds(prev => new Set([...prev, id])) }

  const readCount = readIds.size
  const total = articles.length
  const progress = total > 0 ? Math.round((readCount / total) * 100) : 0
  const complete = total > 0 && readCount === total
  const today = new Date().toLocaleDateString('en-GB', { weekday:'short', day:'numeric', month:'long', year:'numeric' })
  const b = `0.5px solid ${C.border}`
  const bl = `0.5px solid ${C.borderLight}`

  return (
    <div style={{ fontFamily:'-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif', background:C.bg, minHeight:'100vh', padding:16 }}>
      <div style={{ maxWidth: '100%', margin:'0 auto', border:b, borderRadius:8, overflow:'hidden', boxShadow:'0 2px 20px rgba(0,0,0,0.07)', background:'#FAFAF8' }}>

        {/* HEADER */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'10px 18px', borderBottom:b, background:C.surface }}>
          <div>
            <div style={{ fontFamily:'monospace', fontSize:15, fontWeight:700, letterSpacing:4, color:C.text }}>
              THE S<span style={{ color:C.accent }}>I</span>GNET
            </div>
            <div style={{ fontFamily:'monospace', fontSize:9, letterSpacing:2, color:C.textMuted, marginTop:1 }}>thesignet.app</div>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:16 }}>
            <div style={{ textAlign:'right' }}>
              <div style={{ fontFamily:'monospace', fontSize:9, letterSpacing:1, color:C.textMuted }}>SESSION</div>
              <div style={{ fontFamily:'monospace', fontSize:15, fontWeight:700, color:C.accent }}>{timer()}</div>
            </div>
            <div style={{ fontFamily:'monospace', fontSize:13, color:C.text }}>{clock}</div>
            {user && (
  <span style={{ fontFamily:'monospace', fontSize:9, color:C.textMuted, marginRight:8 }}>{user.email}</span>
)}
<button
  onClick={() => supabase.auth.signOut().then(() => window.location.href = '/signin')}
  style={{ fontFamily:'monospace', fontSize:10, letterSpacing:1, padding:'5px 12px', border:`0.5px solid ${C.border}`, borderRadius:4, background:'transparent', color:C.textMuted, cursor:'pointer', marginRight:8 }}
>
  SIGN OUT
</button>
<button style={{ fontFamily:'monospace', fontSize:10, letterSpacing:1, padding:'5px 14px', border:b, borderRadius:4, background:'transparent', color:C.textMuted, cursor:'pointer' }}>
  END BRIEFING
</button>
          </div>
        </div>

        {/* BODY */}
        <div style={{ display:'grid', gridTemplateColumns:'178px 1fr 208px' }}>

          {/* LEFT */}
          <div style={{ borderRight:b }}>
            <div style={{ padding:'7px 12px', borderBottom:b, fontFamily:'monospace', fontSize:9, letterSpacing:2, color:C.textMuted, background:C.surface }}>MARKETS</div>
            {[
              { label:'GBP / USD', val: rates ? rates.USD.toFixed(4) : '—', sub:'live rate' },
              { label:'EUR / GBP', val: rates ? (1/rates.EUR).toFixed(4) : '—', sub:'live rate' },
              { label:'BTC / USD', val: btc ? `$${Math.round(btc).toLocaleString()}` : '—', sub:'live price' },
            ].map(row => (
              <div key={row.label} style={{ padding:'7px 12px', borderBottom:bl }}>
                <div style={{ fontFamily:'monospace', fontSize:9, color:C.textMuted }}>{row.label}</div>
                <div style={{ fontFamily:'monospace', fontSize:14, fontWeight:700, color:C.text }}>{row.val}</div>
                <div style={{ fontFamily:'monospace', fontSize:10, color:C.textMuted }}>{row.sub}</div>
              </div>
            ))}
            <div style={{ padding:'7px 12px', borderBottom:b, fontFamily:'monospace', fontSize:9, letterSpacing:2, color:C.textMuted, background:C.surface, marginTop:2 }}>WEATHER</div>
            <div style={{ padding:'7px 12px', borderBottom:bl }}>
              <div style={{ fontFamily:'monospace', fontSize:9, color:C.textMuted }}>{locationName.toUpperCase()}</div>
              <div style={{ fontFamily:'monospace', fontSize:14, fontWeight:700, color:C.text }}>{weather ? `${Math.round(weather.temperature_2m)}°C` : '—'}</div>
              <div style={{ fontFamily:'monospace', fontSize:10, color:C.textMuted }}>{weather ? (WX[weather.weather_code] || 'Variable') : '...'}</div>
            </div>
            <div style={{ padding:'7px 12px', borderBottom:b, fontFamily:'monospace', fontSize:9, letterSpacing:2, color:C.textMuted, background:C.surface, marginTop:2 }}>SOURCES</div>
            {userSources.map(s => (
  <div key={s.url} style={{ display:'flex', alignItems:'center', gap:6, padding:'4px 12px', fontSize:11, color:C.textMid, justifyContent:'space-between' }}>
    <div style={{ display:'flex', alignItems:'center', gap:6 }}>
      <span style={{ width:5, height:5, borderRadius:'50%', background:C.positive, display:'inline-block', flexShrink:0 }} />
      {s.name}
    </div>
    <span onClick={() => removeSource(s.url)} style={{ fontFamily:'monospace', fontSize:8, color:C.textMuted, cursor:'pointer', letterSpacing:1 }}>✕</span>
  </div>
))}
<div style={{ padding:'6px 12px' }}>
  <button
    onClick={() => { setShowSourceLibrary(true); setSelectedArticle(null) }}
    style={{ fontFamily:'monospace', fontSize:9, letterSpacing:1, color:C.accent, background:'transparent', border:`0.5px solid ${C.accent}`, padding:'3px 8px', borderRadius:3, cursor:'pointer', width:'100%' }}
  >+ ADD SOURCE</button>
</div>
          </div>

          {/* CENTRE */}
          <div style={{ display:'flex', flexDirection:'column', borderRight:b }}>
            <div style={{ display:'flex', borderBottom:b, background:C.surface }}>
              {["TODAY'S BRIEFING",'SEARCH','WATCHED PAGES','SETTINGS'].map((tab,i) => (
                <div key={tab} style={{ fontFamily:'monospace', fontSize:9, letterSpacing:1, padding:'7px 11px', color:i===0?C.accent:C.textMuted, borderBottom:i===0?`2px solid ${C.accent}`:'2px solid transparent', cursor:'pointer', whiteSpace:'nowrap' }}>{tab}</div>
              ))}
            </div>
            <div style={{ height:2, background:C.borderLight }}>
              <div style={{ height:'100%', width:`${progress}%`, background:C.accent, transition:'width 0.4s' }} />
            </div>
            <div style={{ display:'flex', justifyContent:'space-between', padding:'5px 14px', borderBottom:bl }}>
              <span style={{ fontFamily:'monospace', fontSize:10, color:C.textMuted }}>{loading ? 'Loading briefing…' : `${readCount} of ${total} articles read`}</span>
              <span style={{ fontFamily:'monospace', fontSize:10, color:C.textMuted }}>{today}</span>
            </div>

           {showSourceLibrary ? (
  <div style={{ display:'flex', flexDirection:'column', flex:1 }}>
    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'8px 14px', borderBottom:bl, background:C.surface }}>
      <button onClick={() => setShowSourceLibrary(false)} style={{ fontFamily:'monospace', fontSize:10, letterSpacing:1, padding:'5px 12px', border:b, borderRadius:4, background:'transparent', color:C.textMuted, cursor:'pointer' }}>← BRIEFING</button>
      <span style={{ fontFamily:'monospace', fontSize:10, letterSpacing:2, color:C.textMuted }}>SOURCE LIBRARY</span>
    
    </div>
    <div style={{ padding:'12px 14px', borderBottom:bl, background:C.bg }}>
  <div style={{ fontFamily:'monospace', fontSize:9, letterSpacing:2, color:C.textMuted, marginBottom:8 }}>SEARCH BY TOPIC</div>
  <div style={{ fontSize:11, color:C.textMuted, marginBottom:10, lineHeight:1.6 }}>Type any topic and The Signet will find news from across the web — crypto, markets, companies, people, anything.</div>
  <div style={{ display:'flex', gap:8 }}>
    <input
      value={topicQuery}
      onChange={e => setTopicQuery(e.target.value)}
      onKeyDown={e => e.key === 'Enter' && addTopicSearch()}
      placeholder="e.g. XRP, BTC, TSLA, crypto, UK housing, Nvidia..."
      style={{ flex:1, fontFamily:'monospace', fontSize:12, padding:'8px 10px', border:`0.5px solid ${C.border}`, borderRadius:4, background:'#FAFAF8', color:C.text, outline:'none' }}
    />
    <button
      onClick={addTopicSearch}
      style={{ fontFamily:'monospace', fontSize:10, letterSpacing:1, padding:'8px 16px', border:`0.5px solid ${C.accent}`, borderRadius:4, background:'transparent', color:C.accent, cursor:'pointer', whiteSpace:'nowrap' }}
    >
      ADD TOPIC ↗
    </button>
  </div>

</div>
    <div style={{ display:'flex', gap:6, padding:'10px 14px', borderBottom:bl, flexWrap:'wrap' }}>
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
            <div key={source.url} style={{ border:`0.5px solid ${C.border}`, borderRadius:5, padding:'10px 12px', opacity:isAdded?0.6:1 }}>
              <div style={{ fontSize:12, fontWeight:500, color:C.text, marginBottom:4 }}>{source.name}</div>
              <div style={{ fontSize:11, color:C.textMuted, lineHeight:1.5, marginBottom:8 }}>{source.description}</div>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                <span style={{ fontFamily:'monospace', fontSize:9, padding:'2px 6px', background:C.surface, borderRadius:2, color:C.textMuted }}>{source.topic}</span>
                <button
                  onClick={() => isAdded ? removeSource(source.url) : addSource(source)}
                  disabled={addingSource === source.url}
                  style={{ fontFamily:'monospace', fontSize:9, letterSpacing:1, padding:'3px 10px', border:`0.5px solid ${isAdded ? C.border : C.accent}`, borderRadius:3, background:'transparent', color:isAdded ? C.textMuted : C.accent, cursor:'pointer' }}
                >
                  {addingSource===source.url ? '…' : isAdded ? 'REMOVE' : '+ ADD'}
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  </div>
) : selectedArticle ? (
  <div style={{ display:'flex', flexDirection:'column', flex:1 }}>
    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'8px 14px', borderBottom:bl, background:C.surface }}>
      <button onClick={closeReader} style={{ fontFamily:'monospace', fontSize:10, letterSpacing:1, padding:'5px 12px', border:b, borderRadius:4, background:'transparent', color:C.textMuted, cursor:'pointer' }}>← BRIEFING</button>
      <div style={{ display:'flex', gap:8 }}>
        
<button onClick={readInFull} style={{ fontFamily:'monospace', fontSize:10, letterSpacing:1, padding:'5px 14px', border:`0.5px solid ${C.accent}`, borderRadius:4, background:'transparent', color:C.accent, cursor:'pointer' }}>READ IN FULL ↗</button>
      </div>
    </div>

    <div style={{ flex:1, overflowY:'auto', padding:'28px 32px' }}>
      <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:16 }}>
        <span style={{ fontFamily:'monospace', fontSize:9, letterSpacing:2, color:C.accent, padding:'3px 8px', border:`0.5px solid ${C.accent}`, borderRadius:2 }}>{selectedArticle.source.toUpperCase()}</span>
        <span style={{ fontFamily:'monospace', fontSize:9, color:C.textMuted }}>{new Date(selectedArticle.published_at).toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'})}</span>
        <span style={{ fontFamily:'monospace', fontSize:9, color:C.textMuted }}>◷ {estimateReadTime(selectedArticle.summary)}</span>
      </div>

      <div style={{ fontSize:20, fontWeight:600, color:C.text, lineHeight:1.35, marginBottom:20, letterSpacing:-0.3 }}>{selectedArticle.title}</div>

      <div style={{ fontFamily:'monospace', fontSize:9, letterSpacing:2, color:C.textMuted, marginBottom:10 }}>SUMMARY</div>
      <div style={{ fontSize:13, color:C.textMid, lineHeight:1.8, marginBottom:28 }}>{selectedArticle.summary || 'No summary available — click Read in Full to view the article.'}</div>

      <div style={{ height:`0.5px`, background:C.borderLight, marginBottom:20 }} />

      <div style={{ padding:'14px 16px', border:b, borderRadius:5, background:C.surface, marginBottom:20 }}>
        <div style={{ fontFamily:'monospace', fontSize:9, letterSpacing:1, color:C.textMuted, marginBottom:5 }}>ABOUT THIS SOURCE</div>
        <div style={{ fontSize:12, color:C.textMid, lineHeight:1.6 }}>
          {selectedArticle.source === 'BBC News' && 'BBC News is the UK\'s national broadcaster. Editorially independent and publicly funded. All reporting subject to BBC editorial guidelines.'}
          {selectedArticle.source === 'The Guardian' && 'The Guardian is a British national newspaper founded in 1821. Independently owned by the Scott Trust. No shareholders, no proprietor.'}
          {selectedArticle.source === 'Sky News' && 'Sky News is a British 24-hour news channel. Separate editorial independence from Sky\'s entertainment operations.'}
          {!['BBC News','The Guardian','Sky News'].includes(selectedArticle.source) && `${selectedArticle.source} — added to your briefing sources.`}
        </div>
      </div>

      <div style={{ display:'flex', gap:10, flexWrap:'wrap' }}>
        <button onClick={markReadAndReturn} style={{ fontFamily:'monospace', fontSize:11, letterSpacing:1, padding:'10px 20px', border:`0.5px solid ${C.positive}`, borderRadius:4, background:'transparent', color:C.positive, cursor:'pointer' }}>MARK READ & RETURN</button>
<button onClick={nextArticle} style={{ fontFamily:'monospace', fontSize:11, letterSpacing:1, padding:'10px 20px', border:b, borderRadius:4, background:'transparent', color:C.textMuted, cursor:'pointer' }}>NEXT ARTICLE →</button>
      </div>

      {selectedArticle.topic && (
        <div style={{ marginTop:20, display:'flex', gap:6 }}>
          <span style={{ fontFamily:'monospace', fontSize:9, padding:'3px 8px', border:b, borderRadius:2, color:C.textMuted }}>{selectedArticle.topic}</span>
        </div>
      )}
    </div>
  </div>
) : !complete ? (
  <div style={{ overflowY:'auto', maxHeight:440 }}>
    {loading ? (
      <div style={{ padding:30, textAlign:'center', fontFamily:'monospace', fontSize:10, color:C.textMuted, letterSpacing:2 }}>LOADING BRIEFING…</div>
    ) : articles.map(article => (
      <div key={article.id}
        onClick={() => openArticle(article)}
        style={{ padding:'10px 14px', borderBottom:bl, cursor:'pointer', opacity:readIds.has(article.id)?0.38:1, display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:10 }}
        onMouseEnter={e => (e.currentTarget.style.background=C.surface)}
        onMouseLeave={e => (e.currentTarget.style.background='transparent')}
      >
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ fontFamily:'monospace', fontSize:9, letterSpacing:1, color:C.accent }}>{article.source.toUpperCase()}</div>
          <div style={{ fontSize:12, fontWeight:500, color:C.text, margin:'4px 0 3px', lineHeight:1.45 }}>{article.title}</div>
          <div style={{ display:'flex', gap:10, fontFamily:'monospace', fontSize:9, color:C.textMuted }}>
            <span>{new Date(article.published_at).toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'})}</span>
            <span>{article.topic}</span>
          </div>
        </div>
        <div style={{ width:14, height:14, border:`0.5px solid ${readIds.has(article.id)?C.positive:C.border}`, borderRadius:2, display:'flex', alignItems:'center', justifyContent:'center', fontSize:9, flexShrink:0, marginTop:2, background:readIds.has(article.id)?C.positive:'transparent', color:'white' }}>
          {readIds.has(article.id)?'✓':''}
        </div>
      </div>
    ))}
  </div>
) : (
  <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'50px 20px', textAlign:'center', flex:1 }}>
    <div style={{ fontFamily:'monospace', fontSize:9, letterSpacing:3, color:C.textMuted, marginBottom:10 }}>BRIEFING COMPLETE</div>
    <div style={{ fontSize:18, fontWeight:500, color:C.text, marginBottom:8 }}>{"You're fully informed."}</div>
    <div style={{ fontSize:12, color:C.textMuted, maxWidth:220, lineHeight:1.7 }}>{"That's everything for today. Close the terminal and get on with your day."}</div>
  </div>
)}
{secs >= 900 && (
  <div style={{ padding:'6px 14px', borderTop:b, background:C.surface, fontFamily:'monospace', fontSize:9, letterSpacing:1, color:C.textMuted, textAlign:'center' }}>
    15 MINUTES — CONSIDER CLOSING THE TERMINAL
  </div>
)}
          </div>

          {/* RIGHT */}
          <div style={{ display:'flex', flexDirection:'column' }}>
            <div style={{ padding:'7px 12px', borderBottom:b, fontFamily:'monospace', fontSize:9, letterSpacing:2, color:C.textMuted, background:C.surface }}>FOLLOWED ACCOUNTS — X</div>
            <div style={{ overflowY:'auto', flex:1 }}>
              {[
                { name:'Martin Wolf', handle:'@martinwolf_', time:'09:11', body:'The divergence between US and EU productivity growth since 2010 is now too large to ignore.' },
                { name:'BBC Breaking', handle:'@BBCBreaking', time:'08:47', body:'Bank of England holds rates at 4.5%. Future decisions remain data-dependent.' },
                { name:'Rory Stewart', handle:'@RoryStewartUK', time:'08:22', body:'Just back from Nairobi. The pace of infrastructure development makes British planning debates look comic.' },
                { name:'Tim Harford', handle:'@TimHarford', time:'07:14', body:'Fascinating that vibes-based economic pessimism persists even when the data looks reasonable.' },
                { name:'ONS UK', handle:'@ONS', time:'06:30', body:'New release: UK Labour Market Overview. Unemployment holds at 4.2%.' },
              ].map(post => (
                <div key={post.handle} style={{ padding:'9px 12px', borderBottom:bl }}>
                  <div style={{ display:'flex', justifyContent:'space-between' }}>
                    <span style={{ fontSize:11, fontWeight:500, color:C.text }}>{post.name}</span>
                    <span style={{ fontFamily:'monospace', fontSize:9, color:C.textMuted }}>{post.time}</span>
                  </div>
                  <div style={{ fontFamily:'monospace', fontSize:9, color:C.textMuted, marginBottom:4 }}>{post.handle}</div>
                  <div style={{ fontSize:11, color:C.textMid, lineHeight:1.55 }}>{post.body}</div>
                </div>
              ))}
            </div>
            <button style={{ margin:'8px 12px', fontFamily:'monospace', fontSize:9, letterSpacing:1, padding:'4px 8px', border:b, borderRadius:3, background:'transparent', color:C.textMuted, cursor:'pointer' }}>CONNECT X ACCOUNT</button>
          </div>
        </div>

        {/* FOOTER */}
        <div style={{ display:'flex', alignItems:'center', gap:14, padding:'6px 16px', borderTop:b, background:C.surface }}>
          <div style={{ display:'flex', alignItems:'center', gap:5, fontFamily:'monospace', fontSize:9, color:C.textMuted }}>
            <span style={{ width:5, height:5, borderRadius:'50%', background:C.positive, display:'inline-block' }} />3 sources live
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:5, fontFamily:'monospace', fontSize:9, color:C.textMuted }}>
            <span style={{ width:5, height:5, borderRadius:'50%', background:C.accent, display:'inline-block' }} />{total} articles today
          </div>
          {secs >= 900 && (
            <div style={{ marginLeft:'auto', fontFamily:'monospace', fontSize:9, color:C.textMuted }}>15 min reached — consider closing the terminal</div>
          )}
        </div>

      </div>
    </div>
  )
}