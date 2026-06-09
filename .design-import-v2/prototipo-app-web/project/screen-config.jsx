/* ---------- Configuración ---------- */
function Configuracion(){
  const { settings, setSettings, toast } = useStore();
  const [f,setF]=useState(settings);
  const set=(k,v)=>setF(s=>({...s,[k]:v}));
  const [newMethod,setNewMethod]=useState(''); const [newCat,setNewCat]=useState('');
  const dirty = JSON.stringify(f)!==JSON.stringify(settings);
  const save=()=>{ setSettings(f); toast('Configuración guardada'); };

  return (
    <div className="fade-in" style={{maxWidth:760}}>
      <PageHeader title="Configuración" sub="Ajusta tu negocio a tu gusto">
        <button className="btn btn-primary" disabled={!dirty} onClick={save}><Icon name="check" size={16}/>Guardar cambios</button>
      </PageHeader>

      <div className="grid" style={{gap:18}}>
        <section className="card">
          <div className="card-head"><span style={{width:32,height:32,borderRadius:9,background:'var(--primary-tint)',color:'var(--primary-700)',display:'grid',placeItems:'center'}}><Icon name="store" size={16}/></span><div className="card-title" style={{flex:1}}>Tu negocio</div></div>
          <div className="card-pad grid" style={{gridTemplateColumns:'1fr 1fr', gap:16}}>
            <Field label="Nombre del negocio"><input className="input" value={f.business} onChange={e=>set('business',e.target.value)}/></Field>
            <Field label="Moneda"><select className="select" value={f.currency} onChange={e=>set('currency',e.target.value)}><option>Peso chileno (CLP)</option><option>Peso argentino (ARS)</option><option>Sol peruano (PEN)</option></select></Field>
          </div>
        </section>

        <section className="card">
          <div className="card-head"><span style={{width:32,height:32,borderRadius:9,background:'var(--info-tint)',color:'var(--info)',display:'grid',placeItems:'center'}}><Icon name="cash" size={16}/></span><div style={{flex:1}}><div className="card-title">Métodos de pago</div><div className="card-sub">Cómo te pueden pagar tus clientes</div></div></div>
          <div className="card-pad">
            <div style={{display:'flex', gap:9, flexWrap:'wrap', marginBottom:14}}>
              {f.methods.map(mm=>(
                <span key={mm} className="chip chip-neutral" style={{padding:'7px 12px', fontSize:13.5}}>
                  <Icon name={mm==='Efectivo'?'cash':mm==='Tarjeta'?'card':'arrowUp'} size={14}/>{mm}
                  <button onClick={()=>set('methods',f.methods.filter(x=>x!==mm))} style={{background:'none',border:'none',color:'var(--ink-3)',cursor:'pointer',padding:0,marginLeft:2}}><Icon name="x" size={13}/></button>
                </span>
              ))}
            </div>
            <div style={{display:'flex', gap:8}}>
              <input className="input" style={{maxWidth:240}} value={newMethod} onChange={e=>setNewMethod(e.target.value)} placeholder="Agregar método (ej: Mercado Pago)" onKeyDown={e=>{ if(e.key==='Enter'&&newMethod.trim()){ set('methods',[...f.methods,newMethod.trim()]); setNewMethod(''); } }}/>
              <button className="btn btn-ghost" disabled={!newMethod.trim()} onClick={()=>{ set('methods',[...f.methods,newMethod.trim()]); setNewMethod(''); }}><Icon name="plus" size={16}/>Agregar</button>
            </div>
          </div>
        </section>

        <section className="card">
          <div className="card-head"><span style={{width:32,height:32,borderRadius:9,background:'var(--terra-tint)',color:'var(--terra-700)',display:'grid',placeItems:'center'}}><Icon name="tag" size={16}/></span><div style={{flex:1}}><div className="card-title">Categorías</div><div className="card-sub">Agrupa tus productos</div></div></div>
          <div className="card-pad">
            <div style={{display:'flex', gap:9, flexWrap:'wrap', marginBottom:14}}>
              {DATA.CATEGORIES.map(c=>(<span key={c} className="chip chip-neutral" style={{padding:'7px 12px', fontSize:13.5}}><CatDot cat={c}/>{c}</span>))}
            </div>
            <div style={{display:'flex', gap:8}}>
              <input className="input" style={{maxWidth:240}} value={newCat} onChange={e=>setNewCat(e.target.value)} placeholder="Agregar categoría"/>
              <button className="btn btn-ghost" disabled={!newCat.trim()} onClick={()=>{ toast('Categoría agregada'); setNewCat(''); }}><Icon name="plus" size={16}/>Agregar</button>
            </div>
          </div>
        </section>

        <section className="card">
          <div className="card-head"><span style={{width:32,height:32,borderRadius:9,background:'var(--warn-tint)',color:'oklch(0.50 0.10 70)',display:'grid',placeItems:'center'}}><Icon name="alert" size={16}/></span><div style={{flex:1}}><div className="card-title">Avisos y mínimos</div><div className="card-sub">Cuándo te avisamos</div></div></div>
          <div className="card-pad grid" style={{gridTemplateColumns:'1fr 1fr', gap:16}}>
            <Field label="Stock mínimo predeterminado" hint="Se usa al crear un producto nuevo">
              <input className="input tnum" inputMode="numeric" value={f.minStockDefault} onChange={e=>set('minStockDefault',+e.target.value.replace(/[^0-9]/g,'')||0)}/>
            </Field>
            <Field label="Margen mínimo recomendado" hint="Te avisamos si un producto baja de aquí">
              <div className="input-pre"><input className="tnum" inputMode="numeric" value={f.minMargin} onChange={e=>set('minMargin',+e.target.value.replace(/[^0-9]/g,'')||0)}/><span className="pre" style={{padding:'0 13px 0 4px'}}>%</span></div>
            </Field>
          </div>
        </section>

        <div style={{display:'flex', justifyContent:'flex-end', gap:10}}>
          <button className="btn btn-ghost" onClick={()=>setF(settings)} disabled={!dirty}>Descartar</button>
          <button className="btn btn-primary" disabled={!dirty} onClick={save}><Icon name="check" size={16}/>Guardar cambios</button>
        </div>
      </div>
    </div>
  );
}
window.Configuracion = Configuracion;

/* ---------- Clientes (placeholder / future) ---------- */
function Clientes(){
  return (
    <div className="fade-in">
      <PageHeader title="Clientes" sub="Próximamente"/>
      <div className="card"><EmptyState icon="clientes" title="Pronto podrás guardar tus clientes"
        text="Registra clientes frecuentes, lleva su historial de compras y envíales recordatorios por WhatsApp. Estamos trabajando en ello."
        action={<span className="chip chip-neutral"><Icon name="clock" size={13}/>Disponible en una próxima versión</span>}/></div>
    </div>
  );
}
window.Clientes = Clientes;
