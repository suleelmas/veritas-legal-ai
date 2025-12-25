'use client'
import { useState } from 'react';

export default function AdminTest() {
  const [rgState, setRgState] = useState("");
  const [courtState, setCourtState] = useState("");

  async function handleSyncRG() {
    setRgState("Aktarılıyor...");
    const resp = await fetch('/api/sync-rg', { method: 'POST' });
    const data = await resp.json();
    setRgState(data.message || JSON.stringify(data));
  }

  async function handleSyncCourt() {
    setCourtState("Aktarılıyor...");
    const resp = await fetch('/api/sync-court-decisions', { method: 'POST' });
    const data = await resp.json();
    setCourtState(data.message || JSON.stringify(data));
  }

  return (
    <div style={{padding:32}}>
      <h1 style={{marginBottom:20, fontSize:24, fontWeight:'bold'}}>Admin Panel</h1>
      
      <div style={{marginBottom:30}}>
        <h2 style={{marginBottom:10, fontSize:18, fontWeight:'bold'}}>Resmi Gazete</h2>
        <button style={{padding:16, fontWeight:'bold', fontSize:18, borderRadius:8, background:'#F7CA18', color:'#222', border:'none', marginBottom:10, cursor:'pointer'}} onClick={handleSyncRG}>
          Bugünkü Resmi Gazete başlıklarını çek ve veritabanına kaydet
        </button>
        <div style={{marginTop:14, color:'#0af', fontWeight:600}}>{rgState}</div>
      </div>

      <div>
        <h2 style={{marginBottom:10, fontSize:18, fontWeight:'bold'}}>Yargıtay ve Danıştay Kararları</h2>
        <button style={{padding:16, fontWeight:'bold', fontSize:18, borderRadius:8, background:'#F7CA18', color:'#222', border:'none', marginBottom:10, cursor:'pointer'}} onClick={handleSyncCourt}>
          Yargıtay ve Danıştay kararlarını çek ve veritabanına kaydet
        </button>
        <div style={{marginTop:14, color:'#0af', fontWeight:600}}>{courtState}</div>
      </div>
    </div>
  );
}





