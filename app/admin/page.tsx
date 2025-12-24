'use client'
import { useState } from 'react';

export default function AdminTest() {
  const [state, setState] = useState("");
  async function handleSync() {
    setState("Aktarılıyor...");
    const resp = await fetch('/api/sync-rg', { method: 'POST' });
    const data = await resp.text();
    setState(data);
  }
  return (
    <div style={{padding:32}}>
      <button style={{padding:16, fontWeight:'bold', fontSize:18, borderRadius:8, background:'#F7CA18', color:'#222', border:'none', marginBottom:10, cursor:'pointer'}} onClick={handleSync}>
        Bugünkü Resmi Gazete başlıklarını çek ve veritabanına kaydet
      </button>
      <div style={{marginTop:14, color:'#0af', fontWeight:600}}>{state}</div>
    </div>
  );
}

