'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import TickerManager from '@/app/components/TickerManager'
import SourceLibrary from '@/app/components/SourceLibrary'
import ArticleReader from '@/app/components/ArticleReader'
import WatchedPages from '@/app/components/WatchedPages'
import Onboarding from '@/app/components/Onboarding'

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
  const [tickers, setTickers] = useState<any[]>([])
  const [tickerPrices, setTickerPrices] = useState<Record<string, any>>({})
  const [showTickerManager, setShowTickerManager] = useState(false)
  const [activeTab, setActiveTab] = useState("TODAY'S BRIEFING")
const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
  async function init() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    setUser(user)

    const { data: sources } = await supabase
      .from('sources').select('*')
      .eq('active', true).eq('user_id', user.id)
    if (sources) setUserSources(sources)

    const { data: userTickers } = await supabase
      .from('tickers').select('*')
      .eq('active', true).eq('user_id', user.id)
    if (userTickers) {
      setTickers(userTickers)
      fetchTickerPrices(userTickers)
    }

    try {
      const sourceNames = sources?.map(s => s.name) || []
      const { data: allArticles } = await supabase
        .from('articles').select('*')
        .in('source', sourceNames.length > 0 ? sourceNames : [''])
        .order('published_at', { ascending: false })
        .limit(100)

      if (allArticles && sources) {
        const balanced = (sources as any[]).flatMap(src =>
          allArticles.filter(a => a.source === src.name).slice(0, src.max_per_day || 5)
        ).sort((a, b) => new Date(b.published_at).getTime() - new Date(a.published_at).getTime())
        setArticles(balanced)
      }
    } catch (e) {
      console.error('Failed to load articles:', e)
    } finally {
      setLoading(false)
    }
  }
  init()
}, [])

useEffect(() => {
  const interval = setInterval(() => {
    if (tickers.length > 0) fetchTickerPrices(tickers)
  }, 60000)
  return () => clearInterval(interval)
}, [tickers])

async function removeSource(url: string) {
  if (!user) return
  await supabase.from('sources').delete().eq('url', url).eq('user_id', user.id)
  setUserSources(prev => prev.filter(s => s.url !== url))
}

useEffect(() => {
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

async function fetchTickerPrices(userTickers: any[]) {
  if (!userTickers?.length) return
  const prices: Record<string, any> = {}

  const cryptos = userTickers.filter(t => t.type === 'crypto')
  if (cryptos.length > 0) {
    try {
      const ids = [...new Set(cryptos.map(t => t.symbol))].join(',')
      const res = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd,gbp&include_24hr_change=true`)
      const data = await res.json()
      cryptos.forEach(t => {
        prices[t.id] = {
          price: data[t.symbol]?.[t.vs_currency],
          change: data[t.symbol]?.[`${t.vs_currency}_24h_change`]
        }
      })
    } catch (e) {}
  }

  const fxList = userTickers.filter(t => t.type === 'fx')
  if (fxList.length > 0) {
    try {
      const res = await fetch('https://api.frankfurter.dev/v1/latest?from=GBP&to=USD,EUR,JPY,AUD,CAD,CHF')
      const data = await res.json()
      fxList.forEach(t => {
        const key = t.vs_currency.toUpperCase()
        const rate = data.rates?.[key]
        prices[t.id] = {
          price: t.symbol === 'GBP' ? rate : (rate ? 1 / rate : null),
          change: null
        }
      })
    } catch (e) {}
  }

  setTickerPrices(prices)
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
    <div style={{ fontFamily:'-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif', background:C.bg, height:'100vh', overflow:'hidden', padding:16 }}>
      <div style={{ maxWidth: '100%', margin:'0 auto', border:b, borderRadius:8, overflow:'hidden', boxShadow:'0 2px 20px rgba(0,0,0,0.07)', background:'#FAFAF8', height: 'calc(100vh - 32px)', display: 'flex', flexDirection: 'column', }}>

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
        <div style={{ display:'grid', gridTemplateColumns:'178px 1fr', flex: 1, overflow:'hidden' }}>

          {/* LEFT */}
          <div style={{ borderRight:b }}>
            <div style={{ padding:'7px 12px', borderBottom:b, fontFamily:'monospace', fontSize:9, letterSpacing:2, color:C.textMuted, background:C.surface }}>MARKETS</div>
            {tickers.map(ticker => {
  const data = tickerPrices[ticker.id]
  const price = data?.price
  const change = data?.change
  const formatted = price == null ? '—'
    : ticker.type === 'crypto' && price > 100
      ? `$${Math.round(price).toLocaleString()}`
      : ticker.type === 'crypto'
        ? `$${price.toFixed(4)}`
        : price.toFixed(4)
  return (
    <div key={ticker.id} style={{ padding:'7px 12px', borderBottom:bl }}>
      <div style={{ fontFamily:'monospace', fontSize:9, color:C.textMuted }}>{ticker.display_name}</div>
      <div style={{ fontFamily:'monospace', fontSize:14, fontWeight:700, color:C.text }}>{formatted}</div>
      <div style={{ display:'flex', justifyContent:'space-between' }}>
        <div style={{ fontFamily:'monospace', fontSize:10, color:C.textMuted }}>live</div>
        {change != null && (
          <div style={{ fontFamily:'monospace', fontSize:10, color: change >= 0 ? C.positive : '#A32D2D' }}>
            {change >= 0 ? '+' : ''}{change.toFixed(2)}%
          </div>
        )}
      </div>
    </div>
  )
})}
<div style={{ padding:'4px 12px 6px' }}>
  <button
    onClick={() => setShowTickerManager(true)}
    style={{ fontFamily:'monospace', fontSize:9, letterSpacing:1, color:C.textMuted, background:'transparent', border:`0.5px solid ${C.border}`, padding:'3px 8px', borderRadius:3, cursor:'pointer', width:'100%' }}
  >MANAGE TICKERS</button>
</div>

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
          <div style={{ display:'flex', flexDirection:'column', borderRight:b, minHeight:0 }}>
            <div style={{ display:'flex', borderBottom:b, background:C.surface }}>
  {["TODAY'S BRIEFING",'SEARCH','WATCHED PAGES','SETTINGS'].map(tab => (
    <div key={tab}
      onClick={() => setActiveTab(tab)}
      style={{ fontFamily:'monospace', fontSize:9, letterSpacing:1, padding:'7px 11px', color:activeTab===tab?C.accent:C.textMuted, borderBottom:activeTab===tab?`2px solid ${C.accent}`:'2px solid transparent', cursor:'pointer', whiteSpace:'nowrap' }}>
      {tab}
    </div>
  ))}
</div>
            <div style={{ height:2, background:C.borderLight }}>
              <div style={{ height:'100%', width:`${progress}%`, background:C.accent, transition:'width 0.4s' }} />
            </div>
            <div style={{ display:'flex', justifyContent:'space-between', padding:'5px 14px', borderBottom:bl }}>
              <span style={{ fontFamily:'monospace', fontSize:10, color:C.textMuted }}>{loading ? 'Loading briefing…' : `${readCount} of ${total} articles read`}</span>
              <span style={{ fontFamily:'monospace', fontSize:10, color:C.textMuted }}>{today}</span>
            </div>
{activeTab === 'SETTINGS' ? (
  <div style={{ flex:1, overflowY:'auto', padding:'24px 28px' }}>
    <div style={{ fontFamily:'monospace', fontSize:9, letterSpacing:2, color:C.textMuted, marginBottom:16 }}>ACCOUNT</div>
    <div style={{ padding:'14px 16px', border:b, borderRadius:5, background:C.surface, marginBottom:20 }}>
      <div style={{ fontSize:12, color:C.textMuted, marginBottom:4 }}>Signed in as</div>
      <div style={{ fontSize:13, fontWeight:500, color:C.text }}>{user?.email}</div>
    </div>

    <div style={{ fontFamily:'monospace', fontSize:9, letterSpacing:2, color:C.textMuted, marginBottom:16 }}>SESSION</div>
    <div style={{ padding:'14px 16px', border:b, borderRadius:5, background:C.surface, marginBottom:20 }}>
      <div style={{ fontSize:12, color:C.textMuted, marginBottom:8 }}>Mindful nudge — remind me after</div>
      <div style={{ display:'flex', gap:8 }}>
        {[10,15,20,30,45].map(mins => (
          <button key={mins}
            onClick={() => setSecs(0)}
            style={{ fontFamily:'monospace', fontSize:10, padding:'5px 12px', border:`0.5px solid ${C.border}`, borderRadius:4, background: mins === 15 ? C.accent : 'transparent', color: mins === 15 ? 'white' : C.textMuted, cursor:'pointer' }}>
            {mins}m
          </button>
        ))}
      </div>
    </div>

    <div style={{ fontFamily:'monospace', fontSize:9, letterSpacing:2, color:C.textMuted, marginBottom:16 }}>BRIEFING</div>
    <div style={{ padding:'14px 16px', border:b, borderRadius:5, background:C.surface, marginBottom:20 }}>
      <div style={{ fontSize:12, color:C.textMuted, marginBottom:4 }}>Daily article limit per source</div>
      <div style={{ fontSize:11, color:C.textMuted, lineHeight:1.6 }}>Adjust per source using the × controls in your sources panel. Default is 5 per source.</div>
    </div>

    <button
      onClick={() => supabase.auth.signOut().then(() => window.location.href = '/signin')}
      style={{ fontFamily:'monospace', fontSize:10, letterSpacing:1, padding:'9px 18px', border:`0.5px solid #A32D2D`, borderRadius:4, background:'transparent', color:'#A32D2D', cursor:'pointer' }}>
      SIGN OUT
    </button>
  </div>
) : activeTab === 'SEARCH' ? (
  <div style={{ display:'flex', flexDirection:'column', flex:1, minHeight:0 }}>
    <div style={{ padding:'12px 14px', borderBottom:bl }}>
      <input
        value={searchQuery}
        onChange={e => setSearchQuery(e.target.value)}
        placeholder="Search your briefing..."
        autoFocus
        style={{ width:'100%', fontFamily:'monospace', fontSize:13, padding:'9px 12px', border:`0.5px solid ${C.border}`, borderRadius:4, background:'#FAFAF8', color:C.text, outline:'none', boxSizing:'border-box' as const }}
      />
    </div>
    <div style={{ overflowY:'auto', flex:1 }}>
      {articles
        .filter(a => searchQuery.length > 1 &&
          (a.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
           a.summary?.toLowerCase().includes(searchQuery.toLowerCase()) ||
           a.source.toLowerCase().includes(searchQuery.toLowerCase())))
        .map(article => (
          <div key={article.id}
            onClick={() => { openArticle(article); setActiveTab("TODAY'S BRIEFING") }}
            style={{ padding:'10px 14px', borderBottom:bl, cursor:'pointer', display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:10 }}
            onMouseEnter={e => (e.currentTarget.style.background=C.surface)}
            onMouseLeave={e => (e.currentTarget.style.background='transparent')}
          >
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontFamily:'monospace', fontSize:9, letterSpacing:1, color:C.accent }}>{article.source.toUpperCase()}</div>
              <div style={{ fontSize:12, fontWeight:500, color:C.text, margin:'4px 0 3px', lineHeight:1.45 }}>{article.title}</div>
              <div style={{ fontFamily:'monospace', fontSize:9, color:C.textMuted }}>{article.topic}</div>
            </div>
          </div>
        ))}
      {searchQuery.length > 1 && articles.filter(a =>
        a.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        a.summary?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        a.source.toLowerCase().includes(searchQuery.toLowerCase())
      ).length === 0 && (
        <div style={{ padding:30, textAlign:'center', fontFamily:'monospace', fontSize:10, color:C.textMuted, letterSpacing:2 }}>
          NO RESULTS FOR "{searchQuery.toUpperCase()}"
        </div>
      )}
      {searchQuery.length <= 1 && (
        <div style={{ padding:30, textAlign:'center', fontFamily:'monospace', fontSize:10, color:C.textMuted, letterSpacing:2 }}>
          TYPE TO SEARCH YOUR BRIEFING
        </div>
      )}
    </div>
  </div>
) : activeTab === 'WATCHED PAGES' ? (
  <WatchedPages user={user} />
) : showTickerManager ? (

  <TickerManager tickers={tickers} user={user} onClose={() => setShowTickerManager(false)} onTickersChange={setTickers} />

) : showSourceLibrary ? (<SourceLibrary userSources={userSources} user={user} onClose={() => setShowSourceLibrary(false)} onSourcesChange={setUserSources} />

) : selectedArticle ? (<ArticleReader article={selectedArticle!} onClose={closeReader} onReadInFull={readInFull} onMarkReadAndReturn={markReadAndReturn} onNextArticle={nextArticle} />

  ) : userSources.length === 0 && !loading ? (
  <Onboarding
    user={user}
    onComplete={(sources) => {
      setUserSources(sources)
      setShowSourceLibrary(false)
    }}
    onOpenLibrary={() => setShowSourceLibrary(true)}
  />
) : !complete ? (
  <div style={{ overflowY:'auto', flex:1 }}>
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