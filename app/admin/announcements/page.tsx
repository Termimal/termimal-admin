'use client'
export const dynamic = 'force-dynamic'
import { useEffect, useState } from 'react'
import { Plus, Bell, Send, X, Trash2 } from 'lucide-react'
type Ann = { id?:string; title:string; content:string; type:string; target:string; status?:string; created_at?:string }
const empty=():Ann=>({title:'',content:'',type:'announcement',target:'all'})
const TYPE_CLS: Record<string,string> = { announcement:'badge-acc', email:'badge-blue', alert:'badge-red' }
export default function AnnouncementsPage() {
  const [items,setItems]=useState<Ann[]>([])
  const [loading,setLoading]=useState(true)
  const [editing,setEditing]=useState<Ann|null>(null)
  const [saving,setSaving]=useState(false)
  const [err,setErr]=useState('')
  const load=async()=>{setLoading(true);const r=await fetch('/api/admin/announcements');const j=await r.json();if(j.error)setErr(j.error);else setItems(j.announcements||[]);setLoading(false)}
  useEffect(()=>{load()},[])
  const save=async()=>{if(!editing)return;setSaving(true);const r=await fetch('/api/admin/announcements',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(editing)});const j=await r.json();if(!j.error){await load();setEditing(null)};setSaving(false)}
  const del=async(id:string)=>{if(!confirm('Delete?'))return;await fetch('/api/admin/announcements',{method:'DELETE',headers:{'Content-Type':'application/json'},body:JSON.stringify({id})});await load()}
  return (
    <div style={{display:'flex',flexDirection:'column',gap:20,maxWidth:820}}>
      <div className="page-header">
        <div><div className="page-title">Announcements</div><div className="page-sub">Broadcast messages to users</div></div>
        <div className="page-actions"><button className="btn btn-primary btn-sm" onClick={()=>setEditing(empty())}><Plus size={13}/>New</button></div>
      </div>
      {err && <div className="alert alert-err">{err}</div>}
      {editing && (
        <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&setEditing(null)}>
          <div className="modal-box">
            <div className="modal-header"><span className="modal-title">New Announcement</span><button className="btn btn-ghost btn-xs" onClick={()=>setEditing(null)}><X size={14}/></button></div>
            <div className="form-group"><label className="label">Title</label><input className="input" value={editing.title} onChange={e=>setEditing({...editing,title:e.target.value})} placeholder="Title"/></div>
            <div className="form-group"><label className="label">Content</label><textarea className="input textarea" rows={5} value={editing.content} onChange={e=>setEditing({...editing,content:e.target.value})} placeholder="Message…"/></div>
            <div className="grid-2">
              <div className="form-group"><label className="label">Type</label><select className="select" value={editing.type} onChange={e=>setEditing({...editing,type:e.target.value})}><option value="announcement">Announcement</option><option value="email">Email</option><option value="alert">Alert</option></select></div>
              <div className="form-group"><label className="label">Audience</label><select className="select" value={editing.target} onChange={e=>setEditing({...editing,target:e.target.value})}><option value="all">All Users</option><option value="free">Free</option><option value="paid">Paid</option><option value="pro">Pro</option><option value="premium">Premium</option></select></div>
            </div>
            <div style={{display:'flex',gap:8}}>
              <button className="btn btn-secondary btn-sm" style={{flex:1}} onClick={()=>setEditing(null)}>Cancel</button>
              <button className="btn btn-primary btn-sm" style={{flex:1}} disabled={!editing.title||saving} onClick={save}>{saving?'Saving…':<><Send size={12}/>Save Draft</>}</button>
            </div>
          </div>
        </div>
      )}
      {loading ? Array.from({length:3}).map((_,i)=><div key={i} className="skeleton" style={{height:72,borderRadius:14,marginBottom:8}}/>) :
        items.length===0 ? (<div className="card"><div className="empty-state"><div className="empty-icon"><Bell size={22}/></div><div className="empty-title">No announcements</div><div className="empty-desc">Create announcements to communicate with users</div><button className="btn btn-primary btn-sm" onClick={()=>setEditing(empty())}><Plus size={13}/>Create First</button></div></div>) :
        items.map((a,i)=>(
          <div key={i} className="card card-p" style={{display:'flex',gap:12,alignItems:'flex-start'}}>
            <div style={{width:34,height:34,borderRadius:10,background:a.type==='alert'?'var(--red-bg)':a.type==='email'?'var(--blue-bg)':'var(--acc-bg)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
              {a.type==='email'?<Send size={14} style={{color:'var(--blue)'}}/>:<Bell size={14} style={{color:a.type==='alert'?'var(--red)':'var(--acc)'}}/>}
            </div>
            <div style={{flex:1,minWidth:0}}>
              <div style={{display:'flex',gap:7,alignItems:'center',marginBottom:4,flexWrap:'wrap'}}>
                <span style={{fontSize:13,fontWeight:700}}>{a.title}</span>
                <span className={`badge badge-sm ${TYPE_CLS[a.type]||'badge-muted'}`}>{a.type}</span>
                <span className={`badge badge-sm ${a.status==='sent'?'badge-green':'badge-muted'}`}>{a.status||'draft'}</span>
                <span style={{fontSize:11,color:'var(--t4)'}}>→ {a.target}</span>
              </div>
              <div style={{fontSize:12,color:'var(--t3)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{a.content?.slice(0,100)}{(a.content?.length||0)>100?'…':''}</div>
            </div>
            <div style={{display:'flex',gap:6,alignItems:'center',flexShrink:0}}>
              <span style={{fontSize:11,color:'var(--t4)'}}>{a.created_at?new Date(a.created_at).toLocaleDateString('en-US',{month:'short',day:'numeric'}):''}</span>
              {a.id && <button className="btn btn-danger btn-xs" onClick={()=>del(a.id!)}><Trash2 size={11}/></button>}
            </div>
          </div>
        ))
      }
    </div>
  )
}
