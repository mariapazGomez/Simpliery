/* ---------- Shared UI building blocks ---------- */

function Metric({ icon, label, value, sub, tone='primary', trend }){
  const toneBg = { primary:'var(--primary-tint)', terra:'var(--terra-tint)', warn:'var(--warn-tint)', danger:'var(--danger-tint)', info:'var(--info-tint)' }[tone];
  const toneFg = { primary:'var(--primary-700)', terra:'var(--terra-700)', warn:'oklch(0.50 0.10 70)', danger:'var(--danger)', info:'var(--info)' }[tone];
  return (
    <div className="card card-pad" style={{display:'flex', flexDirection:'column', gap:14}}>
      <div style={{display:'flex', alignItems:'center', justifyContent:'space-between'}}>
        <span style={{width:38, height:38, borderRadius:11, background:toneBg, color:toneFg, display:'grid', placeItems:'center'}}>
          <Icon name={icon} size={19}/>
        </span>
        {trend && (
          <span className="tnum" style={{display:'flex', alignItems:'center', gap:4, fontSize:12.5, fontWeight:800,
            color: trend.dir==='up'?'var(--primary-700)':'var(--danger)'}}>
            <Icon name={trend.dir==='up'?'trendUp':'trendDown'} size={14}/>{trend.value}
          </span>
        )}
      </div>
      <div>
        <div className="tnum" style={{fontSize:26, fontWeight:800, letterSpacing:'-0.025em', lineHeight:1.05}}>{value}</div>
        <div style={{fontSize:13, color:'var(--ink-2)', fontWeight:600, marginTop:3}}>{label}</div>
        {sub && <div style={{fontSize:12, color:'var(--ink-3)', fontWeight:600, marginTop:5}}>{sub}</div>}
      </div>
    </div>
  );
}

function PageHeader({ title, sub, children }){
  return (
    <div style={{display:'flex', alignItems:'flex-end', justifyContent:'space-between', gap:16, flexWrap:'wrap', marginBottom:22}}>
      <div>
        <h2 style={{margin:0, fontSize:23, fontWeight:800, letterSpacing:'-0.025em'}}>{title}</h2>
        {sub && <p style={{margin:'5px 0 0', color:'var(--ink-3)', fontSize:14, fontWeight:600}}>{sub}</p>}
      </div>
      {children && <div style={{display:'flex', gap:10, alignItems:'center', flexWrap:'wrap'}}>{children}</div>}
    </div>
  );
}

function Modal({ title, sub, onClose, children, width=540, footer }){
  useEffect(()=>{ const h=e=>{ if(e.key==='Escape') onClose(); }; window.addEventListener('keydown',h); return ()=>window.removeEventListener('keydown',h); },[onClose]);
  return ReactDOM.createPortal(
    <div className="overlay" onMouseDown={onClose}>
      <div className="modal scale-in" style={{maxWidth:width}} onMouseDown={e=>e.stopPropagation()}>
        <div className="card-head" style={{position:'sticky', top:0, background:'var(--surface)', borderRadius:'24px 24px 0 0', zIndex:2}}>
          <div style={{flex:1}}>
            <div className="card-title">{title}</div>
            {sub && <div className="card-sub" style={{marginTop:2}}>{sub}</div>}
          </div>
          <button className="btn btn-ghost btn-icon" onClick={onClose} aria-label="Cerrar"><Icon name="x" size={18}/></button>
        </div>
        <div style={{padding:'20px 22px'}}>{children}</div>
        {footer && <div style={{padding:'16px 22px', borderTop:'1px solid var(--line)', display:'flex', gap:10, justifyContent:'flex-end', position:'sticky', bottom:0, background:'var(--surface)'}}>{footer}</div>}
      </div>
    </div>,
    document.body
  );
}

function EmptyState({ icon='box', title, text, action }){
  return (
    <div style={{textAlign:'center', padding:'48px 24px', display:'flex', flexDirection:'column', alignItems:'center', gap:6}}>
      <div style={{width:60, height:60, borderRadius:16, background:'var(--surface-3)', border:'1px solid var(--line)', display:'grid', placeItems:'center', color:'var(--ink-3)', marginBottom:6}}>
        <Icon name={icon} size={26}/>
      </div>
      <div style={{fontWeight:800, fontSize:16}}>{title}</div>
      <div style={{color:'var(--ink-3)', fontSize:13.5, maxWidth:340, fontWeight:500}}>{text}</div>
      {action && <div style={{marginTop:12}}>{action}</div>}
    </div>
  );
}

function Field({ label, hint, children }){
  return (
    <label className="field">
      <span style={{fontSize:13, fontWeight:700, color:'var(--ink-2)'}}>{label}</span>
      {children}
      {hint && <span className="hint">{hint}</span>}
    </label>
  );
}

function MoneyInput({ value, onChange, placeholder='0' }){
  return (
    <div className="input-pre">
      <span className="pre">$</span>
      <input className="tnum" inputMode="numeric" value={value===''?'':fmtNum(value)} placeholder={placeholder}
        onChange={e=>{ const v=e.target.value.replace(/[^0-9]/g,''); onChange(v===''?'':parseInt(v)); }}/>
    </div>
  );
}

function SearchBox({ value, onChange, placeholder='Buscar…', width=240 }){
  return (
    <div className="search" style={{minWidth:width, background:'var(--surface)'}}>
      <Icon name="search" size={16}/>
      <input value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder}/>
      {value && <button className="btn-icon" style={{width:20,height:20,background:'none',border:'none',color:'var(--ink-3)'}} onClick={()=>onChange('')}><Icon name="x" size={14}/></button>}
    </div>
  );
}

function CatDot({ cat, size=9 }){
  return <span style={{display:'inline-block', width:size, height:size, borderRadius:3, background:catColor(cat), flexShrink:0}}></span>;
}

function MarginBadge({ pct, minMargin=25 }){
  const low = pct < minMargin;
  return (
    <span className="tnum chip" style={{ background: low?'var(--danger-tint)':'var(--surface-3)', color: low?'var(--danger)':'var(--ink-2)', border: low?'none':'1px solid var(--line)', fontWeight:700 }}>
      {low && <Icon name="alert" size={12}/>}{fmtPct(pct)}
    </span>
  );
}

Object.assign(window, { Metric, PageHeader, Modal, EmptyState, Field, MoneyInput, SearchBox, CatDot, MarginBadge });
