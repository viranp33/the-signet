'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'

const C = {
  bg: '#F5F0E6', surface: '#EDE5D4', border: '#D4C9B0',
  text: '#1F1C18', textMuted: '#9A8F82', accent: '#9A6B0C',
}

export default function SignIn() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function signIn() {
    if (!email || !password) return
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      window.location.href = '/'
    }
  }

  return (
    <div style={{ minHeight:'100vh', background:C.bg, display:'flex', alignItems:'center', justifyContent:'center', padding:20, fontFamily:'-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>
      <div style={{ width:'100%', maxWidth:400 }}>

        <div style={{ textAlign:'center', marginBottom:40 }}>
          <div style={{ fontFamily:'monospace', fontSize:22, fontWeight:700, letterSpacing:5, color:C.text, marginBottom:8 }}>
            THE S<span style={{ color:C.accent }}>I</span>GNET
          </div>
          <div style={{ fontFamily:'monospace', fontSize:10, letterSpacing:3, color:C.textMuted }}>thesignet.app</div>
        </div>

        <div style={{ background:C.surface, border:`0.5px solid ${C.border}`, borderRadius:8, padding:28 }}>
          <div style={{ fontSize:15, fontWeight:500, color:C.text, marginBottom:6 }}>Sign in to your briefing</div>
          <div style={{ fontSize:12, color:C.textMuted, marginBottom:20, lineHeight:1.6 }}>Enter your email and password to access The Signet.</div>

          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="your@email.com"
            style={{ width:'100%', fontFamily:'monospace', fontSize:13, padding:'9px 12px', border:`0.5px solid ${C.border}`, borderRadius:4, background:'#FAFAF8', color:C.text, marginBottom:10, outline:'none', boxSizing:'border-box' as const }}
          />
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && signIn()}
            placeholder="password"
            style={{ width:'100%', fontFamily:'monospace', fontSize:13, padding:'9px 12px', border:`0.5px solid ${C.border}`, borderRadius:4, background:'#FAFAF8', color:C.text, marginBottom:12, outline:'none', boxSizing:'border-box' as const }}
          />

          {error && (
            <div style={{ fontFamily:'monospace', fontSize:10, color:'#A32D2D', marginBottom:10, padding:'7px 10px', border:'0.5px solid #A32D2D', borderRadius:4 }}>
              {error}
            </div>
          )}

          <button
            onClick={signIn}
            disabled={loading}
            style={{ width:'100%', fontFamily:'monospace', fontSize:11, letterSpacing:1, padding:'10px', border:`0.5px solid ${C.accent}`, borderRadius:4, background:'transparent', color:C.accent, cursor:'pointer' }}
          >
            {loading ? 'SIGNING IN…' : 'SIGN IN →'}
          </button>
        </div>

        <div style={{ marginTop:32, textAlign:'center', fontFamily:'monospace', fontSize:9, color:C.textMuted, letterSpacing:1, lineHeight:1.8 }}>
          "The human brain isn't designed to process<br/>all of the world's breaking emergencies in real time."<br/>
          <span style={{ color:C.accent }}>— Naval Ravikant</span>
        </div>

      </div>
    </div>
  )
}