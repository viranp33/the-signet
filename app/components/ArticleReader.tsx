'use client'

import { useState, useEffect } from 'react'
import { Sparkles, FileText, CheckCircle2, ArrowRight, ExternalLink } from 'lucide-react'

const C = { bg:'#F5F0E6',surface:'#EDE5D4',border:'#D4C9B0',borderLight:'#E8DFD0',text:'#1F1C18',textMid:'#4A4540',textMuted:'#9A8F82',accent:'#9A6B0C',positive:'#3B6D11' }

type Article = { id:number, source:string, title:string, summary:string, url:string, published_at:string, topic:string }

type Props = {
  article: Article
  onClose: () => void
  onReadInFull: () => void
  onMarkReadAndReturn: () => void
  onNextArticle: () => void
}

function estimateReadTime(text:string) {
  const words = text ? text.split(' ').length : 0
  return `${Math.max(1, Math.round(words / 200))} min read`
}

export default function ArticleReader({ article, onClose, onReadInFull, onMarkReadAndReturn, onNextArticle }:Props) {
  const b = `0.5px solid ${C.border}`
  const bl = `0.5px solid ${C.borderLight}`

  const [aiState, setAiState] = useState<'idle'|'loading'|'done'|'error'>('idle')
  const [aiText, setAiText] = useState('')
  const [loadingPhrase, setLoadingPhrase] = useState(0)

  const loadingPhrases = ['Reading the signals...', 'Gathering context...', 'Drafting the briefing...']

  useEffect(() => {
    if (aiState !== 'loading') return
    const interval = setInterval(() => {
      setLoadingPhrase(p => (p + 1) % loadingPhrases.length)
    }, 2200)
    return () => clearInterval(interval)
  }, [aiState])

  async function handleBriefMe() {
  setAiState('loading')
  setAiText('')
  try {
    const res = await fetch('/api/ai-brief', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },

      body: JSON.stringify({
        title: article.title,
        source: article.source,
        summary: article.summary
      })
    })
    const data = await res.json()
    setAiText(data.text)
    setAiState('done')
  } catch (e) {
    setAiState('error')
  }
}

  return (
    <div style={{ display:'flex', flexDirection:'column', flex:1 }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'8px 14px', borderBottom:bl, background:C.surface }}>
        <button onClick={onClose} style={{ fontFamily:'monospace', fontSize:10, letterSpacing:1, padding:'5px 12px', border:b, borderRadius:4, background:'transparent', color:C.textMuted, cursor:'pointer' }}>← BRIEFING</button>
        <button onClick={onReadInFull} style={{ display:'flex', alignItems:'center', gap:6, fontFamily:'monospace', fontSize:10, letterSpacing:1, padding:'5px 14px', border:`0.5px solid ${C.accent}`, borderRadius:4, background:'transparent', color:C.accent, cursor:'pointer' }}>READ IN FULL <ExternalLink size={11} /></button>
      </div>
      <div style={{ flex:1, overflowY:'auto', padding:'28px 32px' }}>
        <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:16 }}>
          <span style={{ fontFamily:'monospace', fontSize:9, letterSpacing:2, color:C.accent, padding:'3px 8px', border:`0.5px solid ${C.accent}`, borderRadius:2 }}>{article.source.toUpperCase()}</span>
          <span style={{ fontFamily:'monospace', fontSize:9, color:C.textMuted }}>{new Date(article.published_at).toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'})}</span>
          <span style={{ fontFamily:'monospace', fontSize:9, color:C.textMuted }}>◷ {estimateReadTime(article.summary)}</span>
        </div>
        <div style={{ fontFamily:'var(--font-lora)', fontSize:26, fontWeight:600, color:C.text, lineHeight:1.3, marginBottom:20, letterSpacing:-0.2 }}>{article.title}</div>
        <div style={{ fontFamily:'monospace', fontSize:9, letterSpacing:2, color:C.textMuted, marginBottom:10 }}>SUMMARY</div>
        <div style={{ fontSize:13, color:C.textMid, lineHeight:1.8, marginBottom:28 }}>{article.summary || 'No summary available — click Read in Full to view the article.'}</div>

        <div style={{ height:'0.5px', background:C.borderLight, marginBottom:20 }} />

        {/* ── ZONE 3: SIGNET AI PANEL ── */}
        <div style={{ padding:'16px 18px', border:`0.5px solid ${C.accent}`, borderRadius:5, background:C.surface, marginBottom:24 }}>
          <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom: aiState === 'idle' ? 10 : 14 }}>
            <Sparkles size={13} color={C.accent} />
            <span style={{ fontFamily:'monospace', fontSize:9, letterSpacing:2, color:C.accent }}>SIGNET AI</span>
            <span style={{ fontFamily:'monospace', fontSize:9, color:C.textMuted, letterSpacing:0 }}>· powered by Claude</span>
          </div>

          {aiState === 'idle' && (
            <>
              <div style={{ fontSize:12, color:C.textMid, lineHeight:1.7, marginBottom:14 }}>
                Want to know more? Signet AI will read the signals and brief you on this story — no tab switching required.
              </div>
              <button onClick={handleBriefMe} style={{ display:'flex', alignItems:'center', gap:6, fontFamily:'monospace', fontSize:10, letterSpacing:1, padding:'8px 18px', border:'none', borderRadius:4, background:C.accent, color:'#FFFFFF', cursor:'pointer' }}>
                BRIEF ME <ArrowRight size={12} />
              </button>
            </>
          )}

          {aiState === 'loading' && (
            <div style={{ display:'flex', alignItems:'center', gap:10 }}>
              <div style={{ display:'flex', gap:4 }}>
                <span style={{ width:5, height:5, borderRadius:'50%', background:C.accent, animation:'signetPulse 1.2s infinite ease-in-out', animationDelay:'0s' }} />
                <span style={{ width:5, height:5, borderRadius:'50%', background:C.accent, animation:'signetPulse 1.2s infinite ease-in-out', animationDelay:'0.2s' }} />
                <span style={{ width:5, height:5, borderRadius:'50%', background:C.accent, animation:'signetPulse 1.2s infinite ease-in-out', animationDelay:'0.4s' }} />
              </div>
              <div style={{ fontSize:12, color:C.textMuted, fontStyle:'italic', lineHeight:1.7 }}>
                {loadingPhrases[loadingPhrase]}
              </div>
              <style>{`
                @keyframes signetPulse {
                  0%, 80%, 100% { opacity: 0.25; transform: scale(0.85); }
                  40% { opacity: 1; transform: scale(1); }
                }
              `}</style>
            </div>
          )}

          {aiState === 'done' && (
            <div style={{ fontSize:13, color:C.textMid, lineHeight:1.85, whiteSpace:'pre-wrap' }}>
              {aiText}
            </div>
          )}

          {aiState === 'error' && (
            <div style={{ fontSize:12, color:'#8B2500', lineHeight:1.7 }}>
              Signet AI couldn't connect. Try again or read in full above.
            </div>
          )}
        </div>
        {/* ── END SIGNET AI PANEL ── */}

        <div style={{ padding:'14px 16px', border:b, borderRadius:5, background:C.surface, marginBottom:20 }}>
          <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:5 }}>
            <FileText size={11} color={C.textMuted} />
            <span style={{ fontFamily:'monospace', fontSize:9, letterSpacing:1, color:C.textMuted }}>ABOUT THIS SOURCE</span>
          </div>
          <div style={{ fontSize:12, color:C.textMid, lineHeight:1.6 }}>
            {article.source === 'BBC News' && "BBC News is the UK's national broadcaster. Editorially independent and publicly funded."}
            {article.source === 'The Guardian' && "The Guardian is a British national newspaper founded in 1821. Independently owned by the Scott Trust."}
            {article.source === 'Sky News' && "Sky News is a British 24-hour news channel with independent editorial operations."}
            {!['BBC News','The Guardian','Sky News'].includes(article.source) && `${article.source} — added to your briefing sources.`}
          </div>
        </div>
        <div style={{ display:'flex', gap:10, flexWrap:'wrap' as const }}>
          <button onClick={onMarkReadAndReturn} style={{ display:'flex', alignItems:'center', gap:7, fontFamily:'monospace', fontSize:11, letterSpacing:1, padding:'10px 20px', border:`0.5px solid ${C.positive}`, borderRadius:4, background:'transparent', color:C.positive, cursor:'pointer' }}><CheckCircle2 size={13} /> MARK READ & RETURN</button>
          <button onClick={onNextArticle} style={{ display:'flex', alignItems:'center', gap:7, fontFamily:'monospace', fontSize:11, letterSpacing:1, padding:'10px 20px', border:b, borderRadius:4, background:'transparent', color:C.textMuted, cursor:'pointer' }}>NEXT ARTICLE <ArrowRight size={13} /></button>
        </div>
        {article.topic && (
          <div style={{ marginTop:20 }}>
            <span style={{ fontFamily:'monospace', fontSize:9, padding:'3px 8px', border:b, borderRadius:2, color:C.textMuted }}>{article.topic}</span>
          </div>
        )}
      </div>
    </div>
  )
}