'use client'
import { useState } from 'react'
import { supabase } from '@/lib/supabase'

const C = { bg:'#F5F0E6',surface:'#EDE5D4',border:'#D4C9B0',borderLight:'#E8DFD0',text:'#1F1C18',textMid:'#4A4540',textMuted:'#9A8F82',accent:'#9A6B0C',positive:'#3B6D11' }
const POPULAR_CRYPTO = [
  {symbol:'bitcoin',display:'BTC',name:'Bitcoin'},{symbol:'ethereum',display:'ETH',name:'Ethereum'},
  {symbol:'ripple',display:'XRP',name:'XRP'},{symbol:'solana',display:'SOL',name:'Solana'},
  {symbol:'cardano',display:'ADA',name:'Cardano'},{symbol:'dogecoin',display:'DOGE',name:'Dogecoin'},
  {symbol:'chainlink',display:'LINK',name:'Chainlink'},{symbol:'litecoin',display:'LTC',name:'Litecoin'},
  {symbol:'stellar',display:'XLM',name:'Stellar'},{symbol:'avalanche-2',display:'AVAX',name:'Avalanche'},
  {symbol:'polkadot',display:'DOT',name:'Polkadot'},{symbol:'the-open-network',display:'TON',name:'Toncoin'},
]
const FX_PAIRS = [
  {symbol:'GBP',display:'GBP/USD',vs:'usd'},{symbol:'GBP',display:'GBP/EUR',vs:'eur'},
  {symbol:'GBP',display:'GBP/JPY',vs:'jpy'},{symbol:'GBP',display:'GBP/AUD',vs:'aud'},
  {symbol:'EUR',display:'EUR/USD',vs:'usd'},{symbol:'USD',display:'USD/JPY',vs:'jpy'},
]

type Props = { tickers:any[], user:any, onClose:()=>void, onTickersChange:(t:any[])=>void }

export default function TickerManager({ tickers, user, onClose, onTickersChange }:Props) {
  const [selected, setSelected] = useState('')
  const b = `0.5px solid ${C.border}`
  const bl = `0.5px solid ${C.borderLight}`

  async function addTicker(symbol:string, displayName:string, type:string, vs:string) {
    if (!user || tickers.length >= 6) return
    if (tickers.some(t => t.display_name === displayName)) return
    const { data, error } = await supabase.from('tickers').insert({
      user_id:user.id, symbol, display_name:displayName, type, vs_currency:vs, active:true
    }).select().single()
    if (!error && data) onTickersChange([...tickers, data])
  }

  async function removeTicker(id:string) {
    await supabase.from('tickers').delete().eq('id', id)
    onTickersChange(tickers.filter(t => t.id !== id))
  }

  return (
    <div style={{ display:'flex', flexDirection:'column', flex:1 }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'8px 14px', borderBottom:bl, background:C.surface }}>
        <button onClick={onClose} style={{ fontFamily:'monospace', fontSize:10, letterSpacing:1, padding:'5px 12px', border:b, borderRadius:4, background:'transparent', color:C.textMuted, cursor:'pointer' }}>← BRIEFING</button>
        <span style={{ fontFamily:'monospace', fontSize:10, letterSpacing:2, color:C.textMuted }}>MANAGE TICKERS</span>
      </div>
      <div style={{ padding:'8px 14px', borderBottom:bl, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <span style={{ fontFamily:'monospace', fontSize:9, color:C.textMuted }}>{tickers.length} of 6 active</span>
        <div style={{ display:'flex', gap:4 }}>
          {[...Array(6)].map((_,i) => <div key={i} style={{ width:7, height:7, borderRadius:'50%', background: i < tickers.length ? C.accent : C.borderLight }} />)}
        </div>
      </div>
      <div style={{ overflowY:'auto', flex:1, padding:'12px 14px' }}>
        <div style={{ fontFamily:'monospace', fontSize:9, letterSpacing:2, color:C.textMuted, marginBottom:8 }}>YOUR TICKERS</div>
        <div style={{ marginBottom:16 }}>
          {tickers.map(t => (
            <div key={t.id} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'8px 10px', border:b, borderRadius:4, marginBottom:6, background:C.surface }}>
              <div>
                <span style={{ fontFamily:'monospace', fontSize:12, fontWeight:700, color:C.text }}>{t.display_name}</span>
                <span style={{ fontFamily:'monospace', fontSize:9, color:C.textMuted, marginLeft:8 }}>{t.type}</span>
              </div>
              <button onClick={() => removeTicker(t.id)} style={{ fontFamily:'monospace', fontSize:9, padding:'2px 8px', border:b, borderRadius:3, background:'transparent', color:C.textMuted, cursor:'pointer' }}>REMOVE</button>
            </div>
          ))}
        </div>
        <div style={{ fontFamily:'monospace', fontSize:9, letterSpacing:2, color:C.textMuted, marginBottom:8 }}>ADD TICKER</div>
        <div style={{ display:'flex', gap:8, marginBottom:12 }}>
          <select value={selected} onChange={e => setSelected(e.target.value)}
            style={{ flex:1, fontFamily:'monospace', fontSize:11, padding:'8px 10px', border:b, borderRadius:4, background:'#FAFAF8', color:C.text }}>
            <option value=''>Select a ticker...</option>
            <option disabled>── CRYPTO ──</option>
            {POPULAR_CRYPTO.filter(c => !tickers.some(t => t.symbol === c.symbol)).map(c => (
              <option key={c.symbol} value={`${c.symbol}||crypto||usd||${c.display}`}>{c.display} — {c.name}</option>
            ))}
            <option disabled>── FX PAIRS ──</option>
            {FX_PAIRS.filter(f => !tickers.some(t => t.display_name === f.display)).map(f => (
              <option key={f.display} value={`${f.symbol}||fx||${f.vs}||${f.display}`}>{f.display}</option>
            ))}
          </select>
          <button onClick={() => {
            if (!selected || tickers.length >= 6) return
            const p = selected.split('||')
            addTicker(p[0], p[3], p[1], p[2])
            setSelected('')
          }} style={{ fontFamily:'monospace', fontSize:10, letterSpacing:1, padding:'8px 14px', border:`0.5px solid ${C.accent}`, borderRadius:4, background:'transparent', color:C.accent, cursor:'pointer', whiteSpace:'nowrap' as const }}>
            + ADD
          </button>
        </div>
        {tickers.length >= 6 && (
          <div style={{ padding:'8px 10px', border:b, borderRadius:4, fontFamily:'monospace', fontSize:9, color:C.textMuted, textAlign:'center' as const }}>
            6 ticker limit reached — remove one to add another
          </div>
        )}
      </div>
    </div>
  )
}