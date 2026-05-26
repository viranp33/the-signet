'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'

const C = {
  bg: '#F5F0E6', surface: '#EDE5D4', border: '#D4C9B0',
  text: '#1F1C18', textMid: '#4A4540', textMuted: '#9A8F82', accent: '#9A6B0C',
}

export default function SignIn() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function sendMagicLink() {
    if (!email) return
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` }
    })
    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      setSent(true)
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight:'100vh', background:C.bg, display:'flex', alignItems:'center', justifyContent:'center', padding:20, fontFamily:'-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>
      <div style={{ width:'100%', maxWidth:400 }}>

        <div style={{ textAlign:'center', marginBottom:40 }}>
          <div style={{ fontFamily:'monospace', fontSize:22, fontWeight:700, letterSpacing:5, color:C.text, marginBottom:8 }}>
            THE S<span style={{ color:C.accent }}>I</span>GNET
          </div>
          <div style={{ fontFamily:'monospace', fontSize:10, letterSpacing:3, color:C.textMuted }}>
            thesignet.app
          </div>
        </div>

        {!sent ? (
          <div style={{ background:C.surface, border:`0.5px solid ${C.border}`, borderRadius:8, padding:28 }}>
            <div style={{ fontSize:15, fontWeight:500, color:C.text, marginBottom:6 }}>Sign in to your briefing</div>
            <div style={{ fontSize:12, color:C.textMuted, marginBottom:20, lineHeight:1.6 }}>Enter your email and we'll send you a link. No password needed.</div>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && sendMagicLink()}
              placeholder="your@email.com"
              style={{ width:'100%', fontFamily:'monospace', fontSize:13, padding:'9px 12px', border:`0.5px solid ${C.border}`, borderRadius:4, background:'#FAFAF8', color:C.text, marginBottom:12, outline:'none' }}
            />
            {error && (
              <div style={{ fontFamily:'monospace', fontSize:10, color:'#A32D2D', marginBottom:10, padding:'7px 10px', border:'0.5px solid #A32D2D', borderRadius:4 }}>
                {error}
              </div>
            )}
            <button
              onClick={sendMagicLink}
              disabled={loading}
              style={{ width:'100%', fontFamily:'monospace', fontSize:11, letterSpacing:1, padding:'10px', border:`0.5px solid ${C.accent}`, borderRadius:4, background:'transparent', color:C.accent, cursor:'pointer' }}
            >
              {loading ? 'SENDING…' : 'SEND MAGIC LINK →'}
            </button>
          </div>
        ) : (
          <div style={{ background:C.surface, border:`0.5px solid ${C.border}`, borderRadius:8, padding:28, textAlign:'center' }}>
            <div style={{ fontFamily:'monospace', fontSize:11, letterSpacing:2, color:C.accent, marginBottom:12 }}>LINK SENT</div>
            <div style={{ fontSize:14, fontWeight:500, color:C.text, marginBottom:8 }}>Check your email</div>
            <div style={{ fontSize:12, color:C.textMuted, lineHeight:1.7 }}>We sent a sign-in link to <strong style={{ color:C.text }}>{email}</strong>. Click it to open your briefing.</div>
            <div style={{ marginTop:20, fontSize:11, color:C.textMuted, fontFamily:'monospace', letterSpacing:1 }}>No password. No fuss.</div>
          </div>
        )}

        <div style={{ marginTop:32, textAlign:'center', fontFamily:'monospace', fontSize:9, color:C.textMuted, letterSpacing:1, lineHeight:1.8 }}>
          "The human brain isn't designed to process<br/>all of the world's breaking emergencies in real time."<br/>
          <span style={{ color:C.accent }}>— Naval Ravikant</span>
        </div>

      </div>
    </div>
  )
}