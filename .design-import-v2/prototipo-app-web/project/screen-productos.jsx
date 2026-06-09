/* ---------- Productos ---------- */

const UNIT_OPTIONS = ['Unidad','kg','gramo','litro','mililitro','caja','paquete'];
const UNIT_IS_WEIGHT = u=> ['kg','gramo','litro','mililitro'].includes(u);
const UNIT_STEP      = u=> UNIT_IS_WEIGHT(u)?'0.001':'1';
const UNIT_LABEL     = u=> ({'kg':'kg','gramo':'gramos','litro':'litros','mililitro':'ml','Unidad':'unidades','caja':'cajas','paquete':'paquetes'}[u]||u);
const UNIT_ABBREV    = u=> ({'kg':'kg','gramo':'g','litro':'L','mililitro':'ml','Unidad':'u.','caja':'cajas','paquete':'paq.'}[u]||u);

/* Inline variant builder — used when creating or editing a product */
function VariantsInlineBuilder({ cost, stock, unit='Unidad', onVariantsChange }){
  const [variants, setVariants] = useState([]);
  const [adding, setAdding] = useState(false);
  const [nf, setNf] = useState({name:'',qty:'',price:''});
  useEffect(()=>{ onVariantsChange(variants); },[variants]);

  const cpbu = +cost||0;
  const vCost  = (qty)=> Math.round(cpbu*(+qty||0));
  const vMargin= (p,q)=> (+p||0) - vCost(q);
  const vMpct  = (p,q)=> (+p||0)>0 ? Math.round(vMargin(p,q)/(+p)*100) : 0;
  const isW = UNIT_IS_WEIGHT(unit);
  const vDisp  = (qty)=> (+qty||0)>0 ? Math.floor((+stock||0)/(+qty)) : 0;
  const addV   = ()=>{
    if(!nf.name||!nf.qty||!nf.price) return;
    setVariants(vs=>[...vs,{id:'nv'+Date.now(),name:nf.name,qty:+nf.qty,price:+nf.price}]);
    setNf({name:'',qty:'',price:''}); setAdding(false);
  };

  return (
    <div style={{marginTop:4}}>
      {variants.length>0 && (
        <div style={{overflowX:'auto',marginBottom:10}}>
          <table className="tbl" style={{fontSize:13}}>
            <thead><tr>
              <th>Variante</th><th className="num">{UNIT_LABEL(unit)}</th>
              <th className="num">Precio</th><th className="num">Costo calc.</th>
              <th className="num">Margen</th><th className="num">Disponibles</th><th></th>
            </tr></thead>
            <tbody>{variants.map(v=>(
              <tr key={v.id}>
                <td style={{fontWeight:700}}>{v.name}</td>
                <td className="num tnum">{v.qty} {UNIT_ABBREV(unit)}</td>
                <td className="num tnum">{fmtCLP(v.price)}</td>
                <td className="num tnum muted">{fmtCLP(vCost(v.qty))}</td>
                <td className="num">
                  <span className="chip tnum" style={{
                    background:vMpct(v.price,v.qty)>=25?'var(--ok-tint)':'var(--warn-tint)',
                    color:vMpct(v.price,v.qty)>=25?'var(--primary-700)':'oklch(0.50 0.10 70)',
                    fontSize:11,fontWeight:800}}>
                    {vMpct(v.price,v.qty)}%
                  </span>
                </td>
                <td className="num tnum muted">{vDisp(v.qty)}</td>
                <td>
                  <button className="btn btn-ghost btn-icon" style={{width:26,height:26}}
                    onClick={()=>setVariants(vs=>vs.filter(x=>x.id!==v.id))}>
                    <Icon name="trash" size={12}/>
                  </button>
                </td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}

      {adding ? (
        <div style={{padding:'13px',background:'var(--surface-3)',borderRadius:12,border:'1px dashed var(--primary)'}}>
          <div style={{fontSize:13,fontWeight:800,color:'var(--primary-700)',marginBottom:10}}>Nueva variante</div>
          <div style={{display:'grid',gridTemplateColumns:'2fr 1fr 1fr',gap:9,marginBottom:9}}>
            <label className="field"><span style={{fontSize:11,fontWeight:700,color:'var(--ink-2)'}}>Nombre</span>
              <input className="input" value={nf.name} onChange={e=>setNf(f=>({...f,name:e.target.value}))}
                placeholder="Pack 6 unidades" autoFocus style={{fontSize:13.5}}/></label>
            <label className="field"><span style={{fontSize:11,fontWeight:700,color:'var(--ink-2)'}}>Cantidad ({UNIT_ABBREV(unit)})</span>
              <input className="input tnum" type="number" step={UNIT_STEP(unit)} value={nf.qty} onChange={e=>setNf(f=>({...f,qty:e.target.value}))}
                placeholder={isW?'0.5':'6'} style={{fontSize:13.5}}/></label>
            <label className="field"><span style={{fontSize:11,fontWeight:700,color:'var(--ink-2)'}}>Precio ($)</span>
              <input className="input tnum" type="number" value={nf.price} onChange={e=>setNf(f=>({...f,price:e.target.value}))}
                placeholder="2000" style={{fontSize:13.5}}/></label>
          </div>
          {nf.qty && nf.price && (
            <div style={{display:'flex',gap:8,marginBottom:10,flexWrap:'wrap'}}>
              {[
                {l:'Costo calculado', v:fmtCLP(vCost(nf.qty))},
                {l:'Ganancia', v:fmtCLP(vMargin(nf.price,nf.qty))},
                {l:'Margen', v:vMpct(nf.price,nf.qty)+'%'},
                {l:'Disponibles', v:vDisp(nf.qty)+' '+UNIT_ABBREV(unit)+'(s)'},
              ].map((x,i)=>(
                <div key={i} style={{flex:1,minWidth:80,padding:'7px 9px',background:'var(--surface)',borderRadius:9,textAlign:'center',border:'1px solid var(--line)'}}>
                  <div className="tnum" style={{fontWeight:800,fontSize:13}}>{x.v}</div>
                  <div style={{fontSize:10.5,color:'var(--ink-3)',fontWeight:700,marginTop:1}}>{x.l}</div>
                </div>
              ))}
            </div>
          )}
          <div style={{display:'flex',gap:7}}>
            <button className="btn btn-primary" style={{padding:'8px 14px',fontSize:13}}
              disabled={!nf.name||!nf.qty||!nf.price} onClick={addV}>
              <Icon name="check" size={14}/>Agregar variante
            </button>
            <button className="btn btn-ghost" style={{padding:'8px 12px',fontSize:13}}
              onClick={()=>{setAdding(false);setNf({name:'',qty:'',price:''});}}>Cancelar</button>
          </div>
        </div>
      ) : (
        <button className="btn btn-soft" style={{fontSize:13}} onClick={()=>setAdding(true)}>
          <Icon name="plus" size={14}/>Agregar variante
        </button>
      )}
    </div>
  );
}

/* ---------- ProductForm modal ---------- */
function ProductForm({ initial, onSave, onClose }){
  const { settings } = useStore();
  const [f, setF] = useState(initial || {
    name:'', cat:DATA.CATEGORIES[0], unit:'Unidad', cost:'', price:'', stock:'', min:settings.minStockDefault
  });
  const [pendingVariants, setPendingVariants] = useState([]);
  const [showVariants, setShowVariants] = useState(!!(initial?.hasFormats));
  const set = (k,v)=> setF(s=>({...s,[k]:v}));
  const cost=+f.cost||0, price=+f.price||0;
  const margin=price-cost, marginPct=price?margin/price*100:0;
  const valid = f.name.trim() && price>0;
  const low = marginPct<settings.minMargin;

  const handleSave=()=>{
    onSave({ name:f.name.trim(), cat:f.cat, unit:f.unit, cost, price, stock:+f.stock||0, min:+f.min||0 }, pendingVariants);
    onClose();
  };

  return (
    <Modal title={initial?'Editar producto':'Agregar producto'} sub="El margen se calcula automáticamente"
      onClose={onClose} width={580}
      footer={<>
        <button className="btn btn-ghost" onClick={onClose}>Cancelar</button>
        <button className="btn btn-primary" disabled={!valid} onClick={handleSave}>
          <Icon name="check" size={16}/>Guardar{pendingVariants.length>0?` + ${pendingVariants.length} variantes`:''}
        </button>
      </>}>
      <div style={{display:'grid', gap:14}}>
        <Field label="Nombre del producto">
          <input className="input" value={f.name} onChange={e=>set('name',e.target.value)}
            placeholder="Ej: Huevo Extra 180u, Almendras 250g" autoFocus/>
        </Field>
        {/* ── Photo upload ── */}
        <Field label="Foto del producto" hint="Aparece en el selector de ventas para identificarlo rápido (opcional)">
          <div style={{display:'flex', gap:12, alignItems:'flex-start'}}>
            {f.photo ? (
              <div style={{position:'relative', flexShrink:0}}>
                <img src={f.photo} alt="" style={{width:80, height:80, borderRadius:12, objectFit:'cover', border:'2px solid var(--line)'}}/>
                <button onClick={()=>set('photo','')} style={{position:'absolute', top:-6, right:-6, width:22, height:22, borderRadius:50, background:'var(--danger)', color:'#fff', border:'none', cursor:'pointer', display:'grid', placeItems:'center'}}>
                  <Icon name="x" size={12}/>
                </button>
              </div>
            ) : null}
            <label style={{flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
              padding:'18px 12px', border:'2px dashed var(--line-2)', borderRadius:12, cursor:'pointer',
              background:'var(--surface-3)', gap:6, minHeight:80, transition:'.14s'}}
              onMouseEnter={e=>{e.currentTarget.style.borderColor='var(--primary)'; e.currentTarget.style.background='var(--primary-tint)';}}
              onMouseLeave={e=>{e.currentTarget.style.borderColor='var(--line-2)'; e.currentTarget.style.background='var(--surface-3)';}}
            >
              <input type="file" accept="image/*" style={{display:'none'}} onChange={e=>{
                const file=e.target.files[0]; if(!file) return;
                const reader=new FileReader(); reader.onload=ev=>set('photo',ev.target.result); reader.readAsDataURL(file);
              }}/>
              <Icon name="download" size={18} style={{color:'var(--ink-3)'}}/>
              <span style={{fontSize:13, fontWeight:700, color:'var(--ink-3)'}}>{f.photo?'Cambiar foto':'Subir foto'}</span>
              <span style={{fontSize:11.5, color:'var(--ink-3)', fontWeight:500}}>JPG, PNG · máx 5 MB</span>
            </label>
          </div>
        </Field>

        <div className="grid" style={{gridTemplateColumns:'1fr 1fr'}}>
          <Field label="Categoría">
            <div style={{display:'flex', gap:7, alignItems:'center'}}>
              <select className="select" value={f.cat} onChange={e=>set('cat',e.target.value)}>
                {(f._extraCats||DATA.CATEGORIES).map(c=><option key={c}>{c}</option>)}
              </select>
              <button type="button" className="btn btn-ghost" style={{padding:'10px 11px', flexShrink:0, fontSize:13}}
                onClick={()=>{
                  const n=window.prompt('Nombre de la nueva categoría:');
                  if(!n?.trim()) return;
                  const cats=[...(f._extraCats||DATA.CATEGORIES), n.trim()];
                  set('_extraCats', cats); set('cat', n.trim());
                }} title="Nueva categoría">
                <Icon name="plus" size={14}/>Nueva
              </button>
            </div>
          </Field>
          <Field label="Unidad base" hint="La unidad con la que controlas el stock">
            <select className="select" value={f.unit} onChange={e=>set('unit',e.target.value)}>
              {UNIT_OPTIONS.map(u=><option key={u}>{u}</option>)}
            </select>
          </Field>
        </div>
        <div className="grid" style={{gridTemplateColumns:'1fr 1fr'}}>
          <Field label="Costo por unidad base"><MoneyInput value={f.cost} onChange={v=>set('cost',v)}/></Field>
          <Field label="Precio de venta (unidad base)"><MoneyInput value={f.price} onChange={v=>set('price',v)}/></Field>
        </div>

        {/* Margin preview */}
        <div className="card" style={{background:low?'var(--danger-tint)':'var(--primary-tint)', border:'none', padding:'14px 16px', display:'flex', alignItems:'center', justifyContent:'space-between'}}>
          <div>
            <div style={{fontSize:12.5,fontWeight:700,color:low?'var(--danger)':'var(--primary-700)'}}>Margen de ganancia</div>
            <div className="tnum" style={{fontSize:13,color:'var(--ink-2)',fontWeight:600,marginTop:2}}>
              {price>0?`Ganas ${fmtCLP(margin)} por ${f.unit||'unidad'}`:'Ingresa costo y precio'}
            </div>
          </div>
          <div className="tnum" style={{fontSize:26,fontWeight:800,color:low?'var(--danger)':'var(--primary-700)'}}>
            {price>0?fmtPct(marginPct):'—'}
          </div>
        </div>
        {low && price>0 && (
          <div style={{fontSize:12.5,color:'var(--danger)',fontWeight:600,display:'flex',gap:6,alignItems:'center'}}>
            <Icon name="alert" size={14}/>Bajo el mínimo recomendado ({settings.minMargin}%)
          </div>
        )}

        <div className="grid" style={{gridTemplateColumns:'1fr 1fr'}}>
          <Field label={`Stock inicial (${f.unit||'unidades'})`}>
            <input className="input tnum" inputMode="numeric" value={f.stock}
              onChange={e=>set('stock',e.target.value.replace(/[^0-9]/g,''))} placeholder="180"/>
          </Field>
          <Field label="Stock mínimo" hint="Te avisamos al bajar de aquí">
            <input className="input tnum" inputMode="numeric" value={f.min}
              onChange={e=>set('min',e.target.value.replace(/[^0-9]/g,''))}/>
          </Field>
        </div>

        {/* ── Variantes ── */}
        <div style={{borderTop:'2px dashed var(--line-2)', paddingTop:14}}>
          <div style={{display:'flex', alignItems:'center', gap:12, marginBottom: showVariants?12:0}}>
            <div style={{flex:1}}>
              <div style={{fontWeight:800,fontSize:14,display:'flex',alignItems:'center',gap:7}}>
                <Icon name="tag" size={15} style={{color:'var(--terra-700)'}}/>
                Variantes de venta
              </div>
              <div style={{fontSize:12.5,color:'var(--ink-3)',fontWeight:600,marginTop:2}}>
                Pack 6, Docena 12, Caja 30, Bolsa 250g… Todos descuentan del mismo stock.
              </div>
            </div>
            <div onClick={()=>setShowVariants(v=>!v)} style={{
              width:42, height:22, borderRadius:11, cursor:'pointer', transition:'.2s', position:'relative', flexShrink:0,
              background: showVariants?'var(--primary)':'var(--line-2)'}}>
              <div style={{position:'absolute', top:2, left: showVariants?20:2, width:18, height:18,
                borderRadius:9, background:'#fff', transition:'left .2s', boxShadow:'0 1px 3px rgba(0,0,0,.2)'}}></div>
            </div>
          </div>
          {showVariants && (
            valid
              ? <VariantsInlineBuilder cost={cost} stock={+f.stock||0} unit={f.unit} onVariantsChange={setPendingVariants}/>
              : <div style={{fontSize:13,color:'var(--ink-3)',fontWeight:600,padding:'6px 0'}}>
                  Completa nombre, costo y precio para ver los cálculos.
                </div>
          )}
        </div>
      </div>
    </Modal>
  );
}

/* ---------- EditableCell ---------- */
function EditableCell({ value, onSave }){
  const [editing,setEditing]=useState(false); const [v,setV]=useState(value);
  useEffect(()=>setV(value),[value]);
  if(editing) return (
    <div className="input-pre" style={{padding:0, width:96, marginLeft:'auto'}}>
      <span className="pre" style={{padding:'0 2px 0 8px', fontSize:13}}>$</span>
      <input className="tnum" autoFocus inputMode="numeric" value={fmtNum(v)} style={{padding:'6px 6px 6px 2px', fontSize:13.5, textAlign:'right'}}
        onChange={e=>setV(parseInt(e.target.value.replace(/[^0-9]/g,''))||0)}
        onBlur={()=>{ setEditing(false); onSave(v); }}
        onKeyDown={e=>{ if(e.key==='Enter'){ setEditing(false); onSave(v); }}}/>
    </div>
  );
  return (
    <button onClick={()=>setEditing(true)} className="tnum" title="Editar" style={{
      background:'none', border:'1px dashed transparent', borderRadius:7, padding:'4px 8px',
      fontWeight:700, color:'var(--ink)', fontSize:14, marginLeft:'auto', display:'block'}}
      onMouseEnter={e=>e.currentTarget.style.borderColor='var(--line-2)'}
      onMouseLeave={e=>e.currentTarget.style.borderColor='transparent'}>
      {fmtCLP(value)}
    </button>
  );
}

/* ---------- Productos screen ---------- */
function Productos(){
  const { products, addProduct, updateProduct, settings } = useStore();
  const { getFormats, productHasFormats, addFormat, toggleFormats } = useFormats();
  const [q,setQ]=useState(''); const [cat,setCat]=useState('Todas');
  const [form,setForm]=useState(false); const [edit,setEdit]=useState(null);
  const [fmtModal,setFmtModal]=useState(null);
  const [sort,setSort]=useState({k:'name',dir:1});
  const cats=['Todas',...DATA.CATEGORIES];

  let list = products.filter(p=> (cat==='Todas'||p.cat===cat) && p.name.toLowerCase().includes(q.toLowerCase()));
  list = [...list].sort((a,b)=>{ const k=sort.k; const av=a[k],bv=b[k]; return (typeof av==='string'?av.localeCompare(bv):av-bv)*sort.dir; });
  const setS=(k)=> setSort(s=> s.k===k?{k,dir:-s.dir}:{k,dir:1});
  const Th=({k,children,num})=> <th className={num?'num':''} style={{cursor:'pointer',userSelect:'none'}} onClick={()=>setS(k)}>
    {children}{sort.k===k&&<span style={{color:'var(--primary)'}}> {sort.dir>0?'↑':'↓'}</span>}
  </th>;

  /* Handle add: also apply pending variants */
  const handleAdd=(data, variants=[])=>{
    const newId = Math.max(...products.map(x=>x.id), 0)+1;
    addProduct(data);
    if(variants.length>0){
      setTimeout(()=>{
        toggleFormats(newId, true);
        variants.forEach(v=> addFormat(newId, {name:v.name, qty:v.qty, price:v.price}));
      }, 50);
    }
  };

  return (
    <div className="fade-in">
      <PageHeader title="Productos" sub={`${products.length} productos en tu catálogo`}>
        <SearchBox value={q} onChange={setQ} placeholder="Buscar producto…"/>
        <button className="btn btn-primary" onClick={()=>setForm(true)}><Icon name="plus" size={16}/>Agregar producto</button>
      </PageHeader>

      {/* Variants callout */}
      <div style={{marginBottom:16, padding:'12px 16px', background:'var(--primary-tint)', borderRadius:12, display:'flex', alignItems:'center', gap:12}}>
        <span style={{width:34,height:34,borderRadius:10,background:'var(--primary)',color:'#fff',display:'grid',placeItems:'center',flexShrink:0}}>
          <Icon name="tag" size={17}/>
        </span>
        <div style={{flex:1}}>
          <div style={{fontWeight:800,fontSize:13.5,color:'var(--primary-700)'}}>Variantes activas</div>
          <div style={{fontSize:12.5,color:'var(--primary-700)',fontWeight:600,marginTop:1}}>
            Configura pack 6, docena, caja 30, bolsa 250g… Todos descuentan del mismo stock madre.
          </div>
        </div>
        <span style={{fontSize:12,color:'var(--primary-700)',fontWeight:700,whiteSpace:'nowrap'}}>Botón "Variantes" →</span>
      </div>

      {/* Category filters */}
      <div style={{display:'flex', gap:7, marginBottom:16, overflowX:'auto', paddingBottom:2}}>
        {cats.map(c=>(
          <button key={c} onClick={()=>setCat(c)} className="chip" style={{
            border:'1px solid var(--line)', whiteSpace:'nowrap', cursor:'pointer',
            background: cat===c?'var(--primary)':'var(--surface)', color: cat===c?'#fff':'var(--ink-2)',
            padding:'7px 14px', fontSize:13}}>
            {c!=='Todas' && <CatDot cat={c}/>}{c}
          </button>
        ))}
        <button onClick={()=>{
          const n=window.prompt('Nombre de la nueva categoría:');
          if(!n?.trim()) return;
          if(!cats.includes(n.trim())){ DATA.CATEGORIES.push(n.trim()); setCat(n.trim()); }
        }} className="chip" style={{
          border:'1px dashed var(--primary)', whiteSpace:'nowrap', cursor:'pointer',
          background:'var(--primary-tint)', color:'var(--primary-700)', padding:'7px 14px', fontSize:13, flexShrink:0 }}>
          <Icon name="plus" size={13}/>Nueva categoría
        </button>
      </div>

      <div className="card">
        <div style={{overflowX:'auto'}}>
          <table className="tbl">
            <thead><tr>
              <th style={{width:52}}></th>
              <Th k="name">Producto</Th>
              <Th k="cat">Categoría</Th>
              <th>Unidad</th>
              <Th k="cost" num>Costo</Th>
              <Th k="price" num>Precio base</Th>
              <Th k="margin" num>Margen $</Th>
              <Th k="marginPct" num>Margen %</Th>
              <th className="num">Variantes</th>
              <th></th>
            </tr></thead>
            <tbody>
              {list.map(p=>{
                const hasFmt = productHasFormats(p.id);
                const fmtCount = hasFmt ? getFormats(p.id).length : 0;
                const photoEl = p.photo
                  ? <img src={p.photo} alt="" style={{width:44,height:44,borderRadius:9,objectFit:'cover',border:'1px solid var(--line)',display:'block'}}/>
                  : <div style={{width:44,height:44,borderRadius:9,background:'var(--bg-2)',border:'1px solid var(--line)',display:'grid',placeItems:'center',color:'var(--ink-3)'}}><Icon name="box" size={18}/></div>;
                return (
                  <tr key={p.id}>
                    <td style={{width:52, paddingRight:0}}>{photoEl}</td>
                    <td>
                      <div style={{fontWeight:700}}>{p.name}</div>
                      {hasFmt && (
                        <div style={{fontSize:12,color:'var(--primary-700)',fontWeight:700,marginTop:2,display:'flex',alignItems:'center',gap:4}}>
                          <Icon name="tag" size={11}/>{fmtCount} formato{fmtCount!==1?'s':''} de venta
                        </div>
                      )}
                    </td>
                    <td><span style={{display:'flex',alignItems:'center',gap:7,color:'var(--ink-2)',fontWeight:600}}><CatDot cat={p.cat}/>{p.cat}</span></td>
                    <td className="tnum muted">{p.unit}</td>
                    <td className="num"><EditableCell value={p.cost} onSave={v=>updateProduct(p.id,{cost:v})}/></td>
                    <td className="num"><EditableCell value={p.price} onSave={v=>updateProduct(p.id,{price:v})}/></td>
                    <td className="num tnum" style={{fontWeight:700}}>{fmtCLP(p.margin)}</td>
                    <td className="num"><MarginBadge pct={p.marginPct} minMargin={settings.minMargin}/></td>
                    <td className="num">
                      <button onClick={()=>setFmtModal(p)} className="btn" style={{
                        padding:'6px 12px', fontSize:12.5, gap:6, borderRadius:9,
                        background: hasFmt?'var(--primary)':'var(--surface-3)',
                        color: hasFmt?'#fff':'var(--ink-2)',
                        border: hasFmt?'none':'1px solid var(--line-2)'}}>
                        <Icon name="tag" size={13}/>
                        {hasFmt ? `${fmtCount} var.` : 'Agregar'}
                      </button>
                    </td>
                    <td>
                      <button className="btn btn-ghost btn-icon" onClick={()=>setEdit(p)} title="Editar">
                        <Icon name="edit" size={15}/>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {list.length===0 && <EmptyState icon="search" title="Sin resultados" text="No encontramos productos con ese nombre o categoría."/>}
        </div>
      </div>
      <div style={{fontSize:12.5,color:'var(--ink-3)',marginTop:12,fontWeight:600,display:'flex',gap:16,flexWrap:'wrap'}}>
        <span style={{display:'flex',alignItems:'center',gap:6}}><Icon name="edit" size={13}/>Toca un costo o precio para editarlo al instante.</span>
        <span style={{display:'flex',alignItems:'center',gap:6}}><Icon name="tag" size={13}/>Clic en "Variantes" para configurar pack 6, docena, caja 30, etc.</span>
      </div>

      {form && <ProductForm onSave={handleAdd} onClose={()=>setForm(false)}/>}
      {edit && <ProductForm initial={edit} onSave={(patch)=>updateProduct(edit.id,patch)} onClose={()=>setEdit(null)}/>}
      {fmtModal && <FormatManagerModal product={fmtModal} onClose={()=>setFmtModal(null)}/>}
    </div>
  );
}
window.Productos = Productos;
