/* ---------- Ventas: registro rápido tipo carrito ---------- */
function ProductPicker({ onPick, onPickFormat }){
  const { products } = useStore();
  const { productHasFormats } = useFormats();
  const [cat, setCat] = useState('Todas');
  const [q, setQ] = useState('');
  const [activeFmt, setActiveFmt] = useState(null); // product showing FormatPicker
  const cats = ['Todas', ...DATA.CATEGORIES];
  const list = useMemo(()=> products.filter(p=>
    (cat==='Todas'||p.cat===cat) && p.name.toLowerCase().includes(q.toLowerCase())
  ).slice(0,40), [products,cat,q]);
  return (
    <div style={{display:'flex', flexDirection:'column', gap:14, minHeight:0}}>
      <SearchBox value={q} onChange={setQ} placeholder="Buscar producto…" width={'100%'}/>
      <div style={{display:'flex', gap:7, overflowX:'auto', paddingBottom:4}}>
        {cats.map(c=>(
          <button key={c} onClick={()=>setCat(c)} className="chip" style={{
            border:'1px solid var(--line)', whiteSpace:'nowrap', cursor:'pointer',
            background: cat===c?'var(--primary)':'var(--surface)', color: cat===c?'#fff':'var(--ink-2)',
            padding:'6px 13px', fontSize:13 }}>
            {c!=='Todas' && <CatDot cat={c}/>}{c}
          </button>
        ))}
      </div>
      {/* Inline FormatPicker — shown when format product is tapped */}
      {activeFmt && (
        <FormatPicker product={activeFmt}
          onPick={(product, fmt, qty)=>{ onPickFormat(product, fmt, qty); setActiveFmt(null); }}
          onCancel={()=>setActiveFmt(null)}/>
      )}
      <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(158px,1fr))', gap:10, overflowY:'auto', alignContent:'start', paddingRight:2, maxHeight:440}}>
        {list.map(p=>{
          const st=stockState(p);
          const hasFmt=productHasFormats(p.id);
          return (
            <button key={p.id} onClick={()=>{ if(st==='sin') return; if(hasFmt){ setActiveFmt(activeFmt?.id===p.id?null:p); } else { onPick(p); } }}
              disabled={st==='sin'} className="card" style={{
              padding:'0', textAlign:'left', display:'flex', flexDirection:'column',
              cursor: st==='sin'?'not-allowed':'pointer', opacity: st==='sin'?0.55:1, transition:'.14s', overflow:'hidden',
              border:`1px solid ${activeFmt?.id===p.id?'var(--primary)':'var(--line)'}`,
              background: activeFmt?.id===p.id?'var(--primary-tint)':'var(--surface)' }}
              onMouseEnter={e=>{ if(st!=='sin'&&activeFmt?.id!==p.id){ e.currentTarget.style.borderColor='var(--primary)'; e.currentTarget.style.boxShadow='var(--sh-2)'; }}}
              onMouseLeave={e=>{ if(activeFmt?.id!==p.id){ e.currentTarget.style.borderColor='var(--line)'; e.currentTarget.style.boxShadow='none'; }}}>
              {/* Product photo */}
              {p.photo
                ? <img src={p.photo} alt="" style={{width:'100%', height:88, objectFit:'cover', display:'block', flexShrink:0}}/>
                : <div style={{width:'100%', height:52, background:`${catColor(p.cat)}18`, display:'grid', placeItems:'center', flexShrink:0}}>
                    <CatDot cat={p.cat} size={14}/>
                  </div>
              }
              <div style={{padding:'9px 11px', display:'flex', flexDirection:'column', gap:5, flex:1}}>
              <div style={{display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:6}}>
                <div style={{display:'flex', gap:5, alignItems:'center'}}>
                  {hasFmt && <span style={{fontSize:9.5, fontWeight:800, background:'var(--primary)', color:'#fff', padding:'1px 5px', borderRadius:4}}>FORMATOS</span>}
                </div>
                <span className="tnum" style={{fontSize:11, color: st==='ok'?'var(--ink-3)':st==='bajo'?'oklch(0.50 0.10 70)':'var(--danger)', fontWeight:700}}>
                  {st==='sin'?'Sin stock':`${p.stock} u.`}
                </span>
              </div>
              <div style={{fontWeight:700, fontSize:13.5, lineHeight:1.25, flex:1}}>{p.name}</div>
              <div className="tnum" style={{fontWeight:800, fontSize:15.5, color:'var(--ink)'}}>{hasFmt?'Varios precios':fmtCLP(p.price)}</div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

const emptyCliente = { nombre:'', numero:'', correo:'', direccion:'', depto:'', ciudad:'' };

/* ── Client autocomplete selector ─────────────────────── */
function ClienteSelector({ tipo, cliente, setCliente }){
  const { clientes } = useStore();
  const m = useMetrics();
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState(null);
  const set = (k,v)=> setCliente(s=>({...s,[k]:v}));

  const suggestions = useMemo(()=>{
    if(!q.trim()) return [];
    const ql = q.toLowerCase();
    return clientes.filter(c=>
      c.nombre.toLowerCase().includes(ql) ||
      (c.telefono||'').replace(/\s/g,'').includes(q.replace(/\s/g,'')) ||
      (c.correo||'').toLowerCase().includes(ql) ||
      (c.ciudad||'').toLowerCase().includes(ql) ||
      (c.direccion||'').toLowerCase().includes(ql) ||
      (c.comuna||'').toLowerCase().includes(ql)
    ).slice(0,8);
  },[clientes, q]);

  const pickCliente = (c)=>{
    setSelected(c);
    setCliente({ nombre:c.nombre, numero:c.telefono||'', correo:c.correo||'',
      direccion:c.direccion||'', depto:c.depto||'', ciudad:c.ciudad||'' });
    setQ(c.nombre); setOpen(false);
  };
  const clear = ()=>{ setSelected(null); setCliente(emptyCliente); setQ(''); };

  // debt for this client
  const clientDeuda = selected ? (m.deudaPorCliente||{})[selected.nombre]?.total||0 : 0;

  return (
    <div style={{marginTop:14}}>
      <div style={{fontSize:12.5, fontWeight:700, color:'var(--ink-3)', marginBottom:6, display:'flex', alignItems:'center', gap:6}}>
        <Icon name="clientes" size={13}/>
        {tipo==='local'?<>Cliente <span style={{fontWeight:500, color:'var(--ink-3)'}}>(opcional)</span></>:<span style={{color:'var(--terra-700)', fontWeight:800}}>Datos de despacho <span style={{fontWeight:600}}>*</span></span>}
      </div>

      {/* Autocomplete field */}
      {!selected ? (
        <div style={{position:'relative'}}>
          <div className="input-pre" style={{alignItems:'center'}}>
            <span style={{padding:'0 6px 0 12px', color:'var(--ink-3)'}}><Icon name="search" size={14}/></span>
            <input style={{padding:'11px 13px 11px 2px', fontSize:14.5, width:'100%', border:'none', outline:'none', background:'none'}}
              value={q} placeholder="Buscar por nombre, teléfono o dirección…"
              onChange={e=>{ setQ(e.target.value); setCliente(s=>({...s,nombre:e.target.value})); setOpen(true); }}
              onFocus={()=>setOpen(true)} onBlur={()=>setTimeout(()=>setOpen(false),180)}/>
          </div>
          {open && suggestions.length>0 && (
            <div style={{position:'absolute', top:'calc(100% + 4px)', left:0, right:0, background:'var(--surface)',
              border:'1px solid var(--line-2)', borderRadius:12, boxShadow:'var(--sh-3)', zIndex:60, overflow:'hidden'}}>
              {suggestions.map(c=>{
                const met = clientMetrics(c);
                return (
                  <button key={c.id} onMouseDown={()=>pickCliente(c)} style={{ display:'block', width:'100%', textAlign:'left',
                    padding:'10px 14px', background:'none', border:'none', borderBottom:'1px solid var(--line)', cursor:'pointer', fontFamily:'inherit' }}
                    onMouseEnter={e=>e.currentTarget.style.background='var(--surface-3)'}
                    onMouseLeave={e=>e.currentTarget.style.background='none'}>
                    <div style={{display:'flex', alignItems:'center', justifyContent:'space-between'}}>
                      <span style={{fontWeight:700, fontSize:14}}>{c.nombre}</span>
                      <span className="chip chip-neutral" style={{fontSize:11}}>{c.ciudad||c.comuna||'Sin ciudad'}</span>
                    </div>
                    <div style={{fontSize:12, color:'var(--ink-3)', fontWeight:600, marginTop:2, display:'flex', gap:10, flexWrap:'wrap'}}>
                      {c.telefono && <span><Icon name="phone" size={11} style={{verticalAlign:'-1px', marginRight:3}}/>{c.telefono}</span>}
                      {c.direccion && <span><Icon name="store" size={11} style={{verticalAlign:'-1px', marginRight:3}}/>{c.direccion}{c.depto?' '+c.depto:''}</span>}
                      {met.ticketMedio>0 && <span style={{marginLeft:'auto'}}>Ticket prom. {fmtCLP(met.ticketMedio)}</span>}
                    </div>
                  </button>
                );
              })}
              <button onMouseDown={()=>{ const n=q.trim(); if(n){setCliente(s=>({...s,nombre:n}));setQ(n);} setOpen(false); }}
                style={{display:'block',width:'100%',textAlign:'left',padding:'10px 14px',background:'none',border:'none',cursor:'pointer',fontFamily:'inherit',color:'var(--primary-700)',fontWeight:700,fontSize:13.5}}
                onMouseEnter={e=>e.currentTarget.style.background='var(--surface-3)'}
                onMouseLeave={e=>e.currentTarget.style.background='none'}>
                <Icon name="plus" size={14} style={{verticalAlign:'-2px', marginRight:6}}/>Continuar con "{q}" como cliente nuevo
              </button>
            </div>
          )}
        </div>
      ) : (
        <div style={{padding:'11px 14px', background:'var(--primary-tint)', borderRadius:11, border:'1px solid var(--primary-tint2)'}}>
          <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', gap:10}}>
            <div>
              <div style={{fontWeight:800, fontSize:14, color:'var(--primary-700)'}}>{selected.nombre}</div>
              <div style={{fontSize:12.5, color:'var(--ink-2)', fontWeight:600, marginTop:2}}>
                {[selected.telefono, selected.ciudad].filter(Boolean).join(' · ')}
              </div>
              {clientDeuda>0 && <div style={{fontSize:12, color:'var(--danger)', fontWeight:800, marginTop:3}}>
                ⚠️ Deuda pendiente: {fmtCLP(clientDeuda)}
              </div>}
            </div>
            <button className="btn btn-ghost btn-icon" style={{width:28,height:28}} onClick={clear}><Icon name="x" size={14}/></button>
          </div>
        </div>
      )}

      {/* Despacho extra fields */}
      {tipo==='despacho' && (
        <div style={{marginTop:10, display:'grid', gap:8}}>
          <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:8}}>
            <label className="field"><span style={{fontSize:12,fontWeight:700,color:'var(--ink-2)'}}>Teléfono</span>
              <input className="input" style={{fontSize:14}} value={cliente.numero} onChange={e=>set('numero',e.target.value)} placeholder="+56 9 XXXX XXXX"/></label>
            <label className="field"><span style={{fontSize:12,fontWeight:700,color:'var(--ink-2)'}}>Correo</span>
              <input className="input" style={{fontSize:14}} type="email" value={cliente.correo} onChange={e=>set('correo',e.target.value)} placeholder="correo@ejemplo.com"/></label>
          </div>
          <label className="field"><span style={{fontSize:12,fontWeight:700,color:'var(--ink-2)'}}>Dirección</span>
            <input className="input" style={{fontSize:14}} value={cliente.direccion} onChange={e=>set('direccion',e.target.value)} placeholder="Calle, número"/></label>
          <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:8}}>
            <label className="field"><span style={{fontSize:12,fontWeight:700,color:'var(--ink-2)'}}>Depto/Piso</span>
              <input className="input" style={{fontSize:14}} value={cliente.depto} onChange={e=>set('depto',e.target.value)} placeholder="Dpto 403"/></label>
            <label className="field"><span style={{fontSize:12,fontWeight:700,color:'var(--ink-2)'}}>Ciudad</span>
              <input className="input" style={{fontSize:14}} value={cliente.ciudad} onChange={e=>set('ciudad',e.target.value)} placeholder="Santiago"/></label>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── CartItem with inline price editing ─────────────── */
function InlinePriceEdit({ value, onChange, label }){
  const [editing,setEditing]=useState(false);
  const [v,setV]=useState(value);
  useEffect(()=>setV(value),[value]);
  if(editing) return (
    <div className="input-pre" style={{width:100,marginLeft:'auto'}}>
      <span className="pre" style={{padding:'0 2px 0 8px',fontSize:12}}>$</span>
      <input className="tnum" autoFocus inputMode="numeric"
        style={{padding:'5px 6px 5px 2px',fontSize:13,textAlign:'right',width:'100%'}}
        value={fmtNum(v)}
        onChange={e=>setV(parseInt(e.target.value.replace(/[^0-9]/g,''))||0)}
        onBlur={()=>{ setEditing(false); onChange(v); }}
        onKeyDown={e=>{ if(e.key==='Enter'){ setEditing(false); onChange(v); } if(e.key==='Escape') setEditing(false); }}/>
    </div>
  );
  return (
    <button onClick={()=>setEditing(true)}
      title={label||'Editar precio'}
      style={{background:'none',border:'1px dashed transparent',borderRadius:7,padding:'3px 6px',fontWeight:800,fontSize:13,color:'var(--ink)',cursor:'pointer',transition:'.12s',marginLeft:'auto',display:'flex',alignItems:'center',gap:4}}
      onMouseEnter={e=>{e.currentTarget.style.borderColor='var(--primary)';e.currentTarget.style.color='var(--primary-700)';}}
      onMouseLeave={e=>{e.currentTarget.style.borderColor='transparent';e.currentTarget.style.color='var(--ink)';}}>
      <span className="tnum">{fmtCLP(value)}</span>
      <Icon name="edit" size={11} style={{opacity:.5}}/>
    </button>
  );
}

function CartItem({ i, setQty, setQtySimple, remove, setItemPrice }){
  const isKg = /kg|kilo|gram|gr|g\b/i.test(i.unit||'');
  const priceChanged = i.price !== i.originalPrice;
  const gain = (i.price - i.cost) * i.qty;
  const gainPct = i.price ? (i.price-i.cost)/i.price*100 : 0;
  return (
    <div style={{padding:'11px 18px',borderBottom:'1px solid var(--line)'}}>
      {/* Top row: name + qty + total */}
      <div style={{display:'flex',alignItems:'center',gap:10}}>
        <div style={{flex:1,minWidth:0}}>
          <div style={{fontWeight:700,fontSize:13.5,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>
            {i.name}
            {i.baseUnitsPerItem && <span style={{fontSize:11,color:'var(--primary-700)',fontWeight:700,marginLeft:6}}>−{i.baseUnitsPerItem*i.qty} u. base</span>}
          </div>
        </div>
        <div style={{display:'flex',alignItems:'center',gap:5}}>
          <button className="btn btn-ghost btn-icon" style={{width:27,height:27}} onClick={()=>i.formatId?setQty(i.productId,i.formatId,-1):setQtySimple(i.productId,-1)}><Icon name="minus" size={13}/></button>
          <span className="tnum" style={{width:20,textAlign:'center',fontWeight:800,fontSize:14}}>{i.qty}</span>
          <button className="btn btn-ghost btn-icon" style={{width:27,height:27}} onClick={()=>i.formatId?setQty(i.productId,i.formatId,1):setQtySimple(i.productId,1)}><Icon name="plus" size={13}/></button>
        </div>
        <div className="tnum" style={{width:72,textAlign:'right',fontWeight:800,fontSize:14}}>{fmtCLP(i.price*i.qty)}</div>
        <button className="btn btn-ghost btn-icon" style={{width:24,height:24,color:'var(--ink-3)'}} onClick={()=>remove(i.productId)} title="Quitar"><Icon name="x" size={13}/></button>
      </div>
      {/* Price row: always editable */}
      <div style={{display:'flex',alignItems:'center',gap:8,marginTop:6,flexWrap:'wrap'}}>
        <div style={{display:'flex',alignItems:'center',gap:6,flex:1,minWidth:0}}>
          <span style={{fontSize:11.5,color:'var(--ink-3)',fontWeight:600}}>Precio{isKg?' por kg':' c/u'}:</span>
          <InlinePriceEdit value={i.price} label={isKg?'Editar precio por kg':'Editar precio unitario'}
            onChange={v=>setItemPrice(i.productId,i.formatId,v)}/>
          {priceChanged && <span style={{fontSize:11,color:'var(--warn)',fontWeight:700,display:'flex',alignItems:'center',gap:3}}><Icon name="edit" size={11}/>Modificado</span>}
        </div>
        <div style={{display:'flex',gap:10,alignItems:'center'}}>
          <span className="tnum" style={{fontSize:12,color:gain<0?'var(--danger)':gain>0?'var(--primary-700)':'var(--ink-3)',fontWeight:700}}>
            Gan. {fmtCLP(gain)}
          </span>
          <span className="tnum" style={{fontSize:11.5,color:'var(--ink-3)',fontWeight:600}}>{fmtPct(gainPct)}</span>
          {gainPct<0 && <span className="chip chip-danger" style={{fontSize:11,padding:'2px 7px'}}>Pérdida</span>}
          {gainPct>0&&gainPct<15 && <span className="chip chip-warn" style={{fontSize:11,padding:'2px 7px'}}>Margen bajo</span>}
        </div>
      </div>
    </div>
  );
}

function Ventas({ go }){
  const { registrarVenta, settings } = useStore();
  const [cart, setCart] = useState([]);
  const [method, setMethod] = useState('Efectivo');
  const [tipo, setTipo] = useState('local'); // 'local' | 'despacho'
  const [cliente, setCliente] = useState(emptyCliente);
  const [confirmed, setConfirmed] = useState(null);
  const [mixedPay, setMixedPay] = useState(null); // {secondary, amount}
  const draftKey = 'cl_draft_cart';
  const [hasDraft] = useState(()=>!!localStorage.getItem(draftKey));
  const saveDraft = ()=>{ localStorage.setItem(draftKey, JSON.stringify({cart,method,tipo})); toast('Borrador guardado'); };
  const loadDraft = ()=>{ try{ const d=JSON.parse(localStorage.getItem(draftKey)); if(d){ setCart((d.cart||[]).map(i=>({...i}))); setMethod(d.method||'Efectivo'); setTipo(d.tipo||'local'); localStorage.removeItem(draftKey); toast('Borrador cargado'); } }catch(e){} };

  const add = (p)=> setCart(c=>{ const e=c.find(i=>i.productId===p.id&&!i.formatId);
    if(e) return c.map(i=>i.productId===p.id&&!i.formatId?{...i,qty:i.qty+1}:i);
    return [...c, {productId:p.id, name:p.name, cat:p.cat, price:p.price, cost:p.cost, qty:1}]; });
  const addFormat = (p, fmt, qty)=> setCart(c=>{
    const cartName = `${p.name} — ${fmt.name}`;
    const e=c.find(i=>i.productId===p.id&&i.formatId===fmt.id);
    const itemCost = p.cost * fmt.qty;
    if(e) return c.map(i=>i.productId===p.id&&i.formatId===fmt.id?{...i,qty:i.qty+qty}:i);
    return [...c, {productId:p.id, name:cartName, baseName:p.name, displayFormat:fmt.name,
      cat:p.cat, price:fmt.price, originalPrice:fmt.price, cost:itemCost, qty, formatId:fmt.id, baseUnitsPerItem:fmt.qty, unit:p.unit}]; });
  const setQty = (id,fmt,d)=> setCart(c=> c.map(i=>i.productId===id&&i.formatId===fmt?{...i,qty:Math.max(1,i.qty+d)}:i));
  const setQtySimple = (id,d)=> setCart(c=> c.map(i=>i.productId===id&&!i.formatId?{...i,qty:Math.max(1,i.qty+d)}:i));
  const setItemPrice = (id,fid,newPrice)=> setCart(c=>c.map(i=>(i.productId===id&&(i.formatId||null)===(fid||null))?{...i,price:Math.max(0,+newPrice||0)}:i));

  const subtotal = cart.reduce((a,i)=>a+i.price*i.qty,0);
  const costTotal = cart.reduce((a,i)=>a+i.cost*i.qty,0);
  const [discount, setDiscount] = useState({ type:'pct', value:'' });
  const discAmt = discount.value ? (discount.type==='pct' ? subtotal*Math.min(100,+discount.value)/100 : Math.min(subtotal,+discount.value)) : 0;
  const finalTotal = subtotal - discAmt;
  const finalProfit = finalTotal - costTotal;
  const finalMargin = finalTotal ? finalProfit/finalTotal*100 : 0;
  const marginWarn = cart.length>0 && finalTotal>0 && finalMargin < (settings.minMargin||25);
  const profit = finalProfit;
  const margin = finalMargin;

  const canConfirm = cart.length>0 && (tipo==='local' || cliente.nombre.trim().length>0) && (method!=='Crédito' || cliente.nombre.trim().length>0);

  const confirm = ()=>{
    if(!canConfirm) return;
    const sale = registrarVenta(cart, method, { tipo, cliente, descuento: discAmt>0?{type:discount.type,value:+discount.value,amount:discAmt}:null });
    setConfirmed(sale); setCart([]); setCliente(emptyCliente); setDiscount({type:'pct',value:''});
  };

  return (
    <div className="fade-in">
      <PageHeader title="Registrar venta" sub="Agrega productos y confirma. Los totales se calculan solos.">
        <div className="chip chip-neutral"><Icon name="clock" size={13}/>{TODAY.toLocaleDateString('es-CL',{day:'2-digit', month:'long', year:'numeric'})}</div>
      </PageHeader>

      <div className="grid ventas-grid" style={{gridTemplateColumns:'1.55fr 1fr', alignItems:'start'}}>
        {/* Product picker */}
        <div className="card">
          <div className="card-head"><div style={{flex:1}}><div className="card-title">Elige los productos</div><div className="card-sub">Toca un producto para sumarlo al carrito</div></div></div>
          <div className="card-pad"><ProductPicker onPick={add}/></div>
        </div>

        {/* Cart */}
        <div className="card" style={{position:'sticky', top:84}}>
          {/* Tipo de venta */}
          <div style={{padding:'14px 16px 0', display:'grid', gridTemplateColumns:'1fr 1fr', gap:8}}>
            {[{k:'local',label:'Venta en local',icon:'store'},{k:'despacho',label:'Despacho',icon:'truck'}].map(t=>(
              <button key={t.k} onClick={()=>{ setTipo(t.k); setCliente(emptyCliente); }} style={{
                display:'flex', alignItems:'center', justifyContent:'center', gap:8, padding:'10px 8px',
                border:'2px solid '+(tipo===t.k?'var(--primary)':'var(--line)'),
                borderRadius:11, background: tipo===t.k?'var(--primary-tint)':'var(--surface)',
                color: tipo===t.k?'var(--primary-700)':'var(--ink-2)',
                fontWeight:700, fontSize:13.5, cursor:'pointer', transition:'.14s', fontFamily:'inherit' }}>
                <Icon name={t.icon} size={16}/>{t.label}
              </button>
            ))}
          </div>

          {/* Cart head */}
          <div className="card-head" style={{border:'none', paddingTop:10, paddingBottom:10}}>
            <span style={{width:34,height:34,borderRadius:10,background:'var(--primary-tint)',color:'var(--primary-700)',display:'grid',placeItems:'center'}}><Icon name="ventas" size={17}/></span>
            <div style={{flex:1}}><div className="card-title">Carrito</div><div className="card-sub">{cart.reduce((a,i)=>a+i.qty,0)} artículos</div></div>
            {cart.length>0 && <button className="btn btn-ghost btn-icon" onClick={()=>setCart([])} title="Vaciar"><Icon name="trash" size={16}/></button>}
          </div>

          {/* Items */}
          <div style={{maxHeight:240, overflowY:'auto', borderTop:'1px solid var(--line)'}}>
            {cart.length===0 ? (
              <EmptyState icon="ventas" title="Carrito vacío" text="Elige productos de la izquierda para empezar."/>
            ) : cart.map(i=>(
              <CartItem key={i.productId+(i.formatId||'')} i={i} setQty={setQty} setQtySimple={setQtySimple} remove={remove} setItemPrice={setItemPrice}/>
            ))}
          </div>

          {/* Totals + cliente + pago */}
          <div style={{padding:'14px 18px', borderTop:'1px solid var(--line)', background:'var(--surface-3)', maxHeight:440, overflowY:'auto'}}>
            <Row label="Subtotal" value={fmtCLP(subtotal)}/>
            {discAmt>0 && <Row label={`Descuento ${discount.type==='pct'?fmtPct(+discount.value):fmtCLP(discAmt)}`} value={'−'+fmtCLP(discAmt)} muted/>}
            {discAmt>0 && <Row label="Total con descuento" value={fmtCLP(finalTotal)} strong/>}
            <Row label="Costo total" value={fmtCLP(costTotal)} muted/>
            <Row label="Ganancia estimada" value={fmtCLP(finalProfit)} strong tone="primary"/>
            <Row label="Margen de la venta" value={fmtPct(finalMargin)} muted/>
            {marginWarn && (
              <div style={{padding:'8px 10px',background:'var(--warn-tint)',borderRadius:9,fontSize:12,color:'oklch(0.45 0.10 70)',fontWeight:700,display:'flex',gap:6,alignItems:'center',marginTop:2}}>
                <Icon name="alert" size={12}/>El descuento deja el margen bajo el {settings.minMargin||25}%
              </div>
            )}

            {/* Discount section */}
            <div style={{margin:'10px 0 2px'}}>
              <div style={{fontSize:12,fontWeight:700,color:'var(--ink-3)',marginBottom:6,display:'flex',alignItems:'center',gap:5}}>
                <Icon name="tag" size={12}/>Descuento <span style={{fontWeight:500}}>(opcional)</span>
              </div>
              <div style={{display:'flex',gap:6}}>
                <div className="seg" style={{flexShrink:0,padding:'2px'}}>
                  <button className={discount.type==='pct'?'on':''} onClick={()=>setDiscount(d=>({...d,type:'pct'}))} style={{padding:'5px 10px',fontSize:12}}>%</button>
                  <button className={discount.type==='fixed'?'on':''} onClick={()=>setDiscount(d=>({...d,type:'fixed'}))} style={{padding:'5px 10px',fontSize:12}}>$</button>
                </div>
                <div className="input-pre" style={{flex:1}}>
                  {discount.type==='fixed'&&<span className="pre" style={{paddingLeft:10,paddingRight:3,fontSize:13}}>$</span>}
                  <input className="tnum" inputMode="numeric" placeholder="0" value={discount.value}
                    onChange={e=>setDiscount(d=>({...d,value:e.target.value.replace(/[^0-9.]/g,'')}) )}
                    style={{padding:'7px 8px 7px '+(discount.type==='fixed'?'2':'10')+'px',fontSize:14,border:'none',outline:'none',background:'none',width:'100%'}}/>
                  {discount.type==='pct'&&<span style={{padding:'0 8px 0 0',color:'var(--ink-3)',fontWeight:700,fontSize:13}}>%</span>}
                </div>
                {!!discount.value&&<button className="btn btn-ghost btn-icon" style={{width:32,height:32,flexShrink:0}} onClick={()=>setDiscount({type:'pct',value:''})}><Icon name="x" size={13}/></button>}
              </div>
            </div>

            {/* Cliente selector */}
            <ClienteSelector tipo={tipo} cliente={cliente} setCliente={setCliente}/>

            <div style={{margin:'14px 0 6px', fontSize:13, fontWeight:700, color:'var(--ink-2)', display:'flex', alignItems:'center', justifyContent:'space-between'}}>
              <span>Método de pago</span>
              <button className="btn btn-ghost" style={{fontSize:11.5,padding:'3px 9px'}} onClick={()=>setMixedPay(v=>v?null:{secondary:'Tarjeta',amount:''})}>
                <Icon name="plus" size={12}/>{mixedPay?'Pago simple':'Dividir pago'}
              </button>
            </div>
            <div style={{display:'grid', gridTemplateColumns:'repeat(2,1fr)', gap:7}}>
              {[...settings.methods, 'Crédito'].map(mm=>{
                const isCredito = mm==='Crédito';
                const active = method===mm;
                return (
                  <button key={mm} onClick={()=>setMethod(mm)} className="btn" style={{
                    padding:'9px 6px', fontSize:12, flexDirection:'column', gap:3, height:50,
                    border:'1px solid '+(active?(isCredito?'var(--warn)':'var(--primary)'):'var(--line-2)'),
                    background: active?(isCredito?'var(--warn-tint)':'var(--primary-tint)'):'var(--surface)',
                    color: active?(isCredito?'oklch(0.50 0.10 70)':'var(--primary-700)'):'var(--ink-2)' }}>
                    <Icon name={mm==='Efectivo'?'cash':mm==='Tarjeta'?'card':isCredito?'receipt':'arrowUp'} size={16}/>{mm}
                  </button>
                );
              })}
            </div>
            {method==='Crédito' && (
              <div style={{marginTop:10, padding:'10px 12px', background:'var(--warn-tint)', borderRadius:10, display:'flex', gap:8, alignItems:'flex-start'}}>
                <Icon name="alert" size={14} style={{color:'oklch(0.50 0.10 70)', flexShrink:0, marginTop:2}}/>
                <div style={{fontSize:12.5, fontWeight:700, color:'oklch(0.45 0.10 70)', lineHeight:1.4}}>
                  La venta quedará pendiente de pago. El cliente aparecerá en la sección <strong>Deudas</strong>. Debes ingresar su nombre.
                </div>
              </div>
            )}

            {(tipo==='despacho' && !cliente.nombre.trim() && cart.length>0) && (
              <div style={{fontSize:12, color:'var(--danger)', fontWeight:600, display:'flex', alignItems:'center', gap:6, marginTop:10}}>
                <Icon name="alert" size={13}/>Ingresa el nombre del destinatario para confirmar
              </div>
            )}
            {(method==='Crédito' && !cliente.nombre.trim() && cart.length>0) && (
              <div style={{fontSize:12, color:'var(--danger)', fontWeight:600, display:'flex', alignItems:'center', gap:6, marginTop:10}}>
                <Icon name="alert" size={13}/>Para vender a crédito debes ingresar el nombre del cliente
              </div>
            )}

            {mixedPay && (
              <div style={{padding:'11px 13px',background:'var(--surface-3)',borderRadius:11,margin:'0 0 8px'}}>
                <div style={{fontSize:12.5,fontWeight:700,color:'var(--ink-2)',marginBottom:8}}>Segundo método</div>
                <div style={{display:'flex',gap:8,alignItems:'center'}}>
                  <select className="select" style={{flex:1,fontSize:13}} value={mixedPay.secondary}
                    onChange={e=>setMixedPay(v=>({...v,secondary:e.target.value}))}>
                    {settings.methods.filter(m=>m!==method).map(m=><option key={m}>{m}</option>)}
                  </select>
                  <div className="input-pre" style={{flex:1}}>
                    <span className="pre" style={{padding:'0 2px 0 10px',fontSize:13}}>$</span>
                    <input className="tnum" inputMode="numeric" value={mixedPay.amount} placeholder="0"
                      style={{padding:'9px 8px',fontSize:13}}
                      onChange={e=>setMixedPay(v=>({...v,amount:e.target.value.replace(/[^0-9]/g,'')}))}/>
                  </div>
                </div>
                {mixedPay.amount>0 && <div style={{fontSize:12,color:'var(--ink-3)',fontWeight:600,marginTop:5}}>
                  {method}: {fmtCLP(finalTotal-(+mixedPay.amount))} · {mixedPay.secondary}: {fmtCLP(+mixedPay.amount)}
                </div>}
              </div>
            )}

            <button className="btn btn-lg" style={{width:'100%', marginTop:12,
              background: method==='Crédito'?'var(--warn)':'var(--primary)', color:'#fff'}} disabled={!canConfirm} onClick={confirm}>
              <Icon name={method==='Crédito'?'receipt':tipo==='despacho'?'truck':'check'} size={18}/>
              {method==='Crédito'?'Registrar a crédito':tipo==='despacho'?'Confirmar despacho':'Confirmar venta'} · {fmtCLP(finalTotal)}
            </button>
            <div style={{textAlign:'center', fontSize:11.5, color:'var(--ink-3)', marginTop:9, fontWeight:600}}>
              <Icon name="zap" size={12} style={{verticalAlign:'-2px'}}/> Se descuenta del stock automáticamente
            </div>
            <div style={{display:'flex',gap:8,marginTop:8}}>
              {cart.length>0 && <button className="btn btn-ghost" style={{flex:1,fontSize:12.5}} onClick={saveDraft}><Icon name="download" size={13}/>Guardar borrador</button>}
              {hasDraft && <button className="btn btn-soft" style={{flex:1,fontSize:12.5}} onClick={loadDraft}><Icon name="history" size={13}/>Cargar borrador</button>}
            </div>
          </div>
        </div>
      </div>

      {/* Comprobante modal */}
      {confirmed && <ComprobanteModal sale={confirmed} onClose={()=>setConfirmed(null)}/>}
    </div>
  );
}

function ClientRow({ label, value }){
  return (
    <div style={{display:'flex', gap:8, fontSize:13.5}}>
      <span style={{color:'var(--ink-3)', fontWeight:700, minWidth:72}}>{label}</span>
      <span style={{fontWeight:600}}>{value}</span>
    </div>
  );
}

function Row({ label, value, muted, strong, tone }){
  return (
    <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', padding:'4px 0'}}>
      <span style={{fontSize:13.5, color: muted?'var(--ink-3)':'var(--ink-2)', fontWeight: strong?800:600}}>{label}</span>
      <span className="tnum" style={{fontSize: strong?16:14, fontWeight: strong?800:700, color: tone==='primary'?'var(--primary-700)':'var(--ink)'}}>{value}</span>
    </div>
  );
}
window.Ventas = Ventas;
