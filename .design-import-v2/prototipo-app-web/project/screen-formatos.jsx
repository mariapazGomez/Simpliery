/* ---------- Format Manager Modal: producto madre + variantes ---------- */

function FormatManagerModal({ product, onClose }){
  const { getFormats, addFormat, updateFormat, deleteFormat, toggleFormats, productHasFormats } = useFormats();
  const { updateProduct } = useStore();
  const fmts = getFormats(product.id);
  const enabled = productHasFormats(product.id);

  // Base product state
  const unit = product.unit||'Unidad';
  const isWeight = ['kg','gramo','litro','mililitro'].includes(unit);
  const unitLabel = ({'kg':'kg','gramo':'gramos','litro':'litros','mililitro':'ml','Unidad':'unidades','caja':'cajas','paquete':'paquetes'})[unit]||unit;
  const unitAbbrev = ({'kg':'kg','gramo':'g','litro':'L','mililitro':'ml','Unidad':'u.','caja':'cajas','paquete':'paq.'})[unit]||unit;
  const unitStep = isWeight?'0.001':'1';
  const [stock, setStock] = useState(product.stock);
  const [kgPerUnit, setKgPerUnit] = useState(product.kgPerUnit||0);
  const [cost, setCost] = useState(product.cost);
  const hasKg = kgPerUnit > 0 && !isWeight;

  // New variant form
  const EMPTY = {name:'', qty:'', price:''};
  const [newFmt, setNewFmt] = useState(EMPTY);
  const [adding, setAdding] = useState(false);

  const totalKg = kgPerUnit>0 ? +(stock*kgPerUnit).toFixed(2) : 0;
  const totalCost = cost * stock;

  const saveBase=()=>{
    updateProduct(product.id, {stock:+stock||0, cost:+cost||0, kgPerUnit:+kgPerUnit||0});
    if(!enabled) toggleFormats(product.id, true);
  };

  const addVariant=()=>{
    if(!newFmt.name||!newFmt.qty||!newFmt.price) return;
    if(!enabled) toggleFormats(product.id, true);
    addFormat(product.id, {name:newFmt.name, qty:+newFmt.qty, price:+newFmt.price});
    setNewFmt(EMPTY); setAdding(false);
  };

  const variantCost=(qty)=> Math.round((+cost||0)*(+qty||0));
  const variantMargin=(price,qty)=> (+price||0)-variantCost(qty);
  const variantMarginPct=(price,qty)=> (+price||0)>0 ? Math.round(variantMargin(price,qty)/(+price)*100) : 0;
  const variantKg=(qty)=> kgPerUnit>0 ? +(kgPerUnit*(+qty||0)).toFixed(3) : null;
  const maxUnits=(qty)=> (+qty||0)>0 ? Math.floor((+stock||0)/(+qty)) : 0;

  return (
    <Modal title={`Formatos de venta`} sub={product.name+' · '+product.cat} onClose={onClose} width={780}
      footer={<>
        <button className="btn btn-ghost" onClick={onClose}>Cerrar</button>
        <button className="btn btn-primary" onClick={()=>{saveBase(); onClose();}}><Icon name="check" size={15}/>Guardar cambios</button>
      </>}>
      <div style={{display:'flex',flexDirection:'column',gap:22}}>

        {/* ── Producto madre ── */}
        <div>
          <div style={{display:'flex',alignItems:'center',gap:9,marginBottom:13}}>
            <span style={{width:32,height:32,borderRadius:9,background:'var(--primary-tint)',color:'var(--primary-700)',display:'grid',placeItems:'center'}}><Icon name="box" size={16}/></span>
            <div><div style={{fontWeight:800,fontSize:15}}>Producto madre</div><div style={{fontSize:12.5,color:'var(--ink-3)',fontWeight:600}}>El stock total desde donde descontarán todos los formatos</div></div>
          </div>
          <div style={{background:'var(--surface-3)',borderRadius:14,padding:'16px 18px',display:'grid',gridTemplateColumns:isWeight?'1fr 1fr':'1fr 1fr 1fr',gap:14}}>
            {/* Stock en unidad base */}
            <div>
              <div style={{fontSize:12,fontWeight:700,color:'var(--ink-2)',marginBottom:6}}>Stock total ({unitLabel})</div>
              <input className="input tnum" type="number" step={unitStep} value={stock} onChange={e=>setStock(e.target.value)}
                style={{fontSize:18,fontWeight:800,textAlign:'center'}} placeholder={isWeight?'10':'180'}/>
              <div style={{fontSize:11.5,color:'var(--ink-3)',fontWeight:600,marginTop:5,textAlign:'center'}}>
                Unidad base: <strong>{unit}</strong>
              </div>
            </div>
            {/* Peso por unidad — solo si unidad base NO es peso */}
            {!isWeight && (
            <div>
              <div style={{fontSize:12,fontWeight:700,color:'var(--ink-2)',marginBottom:6}}>
                Peso por {unit} (kg) <span style={{color:'var(--ink-3)',fontWeight:500}}>opcional</span>
              </div>
              <input className="input tnum" type="number" step="0.001" value={kgPerUnit||''} onChange={e=>setKgPerUnit(e.target.value)}
                style={{fontSize:15,fontWeight:700,textAlign:'center'}} placeholder="0.070"/>
              <div style={{fontSize:11.5,color:'var(--ink-3)',fontWeight:600,marginTop:5,textAlign:'center'}}>
                {kgPerUnit>0 ? `Total: ${totalKg} kg` : `Ej: 1 ${unit} = 0.07 kg`}
              </div>
            </div>
            )}
            {/* Costo por unidad */}
            <div>
              <div style={{fontSize:12,fontWeight:700,color:'var(--ink-2)',marginBottom:6}}>Costo por unidad base</div>
              <div className="input-pre" style={{background:'var(--surface)'}}>
                <span className="pre">$</span>
                <input className="tnum" type="number" value={cost} onChange={e=>setCost(e.target.value)}
                  style={{padding:'10px 13px 10px 4px',fontSize:15,fontWeight:700,textAlign:'right'}}/>
              </div>
              <div style={{fontSize:11.5,color:'var(--ink-3)',fontWeight:600,marginTop:5,textAlign:'center'}}>
                Costo total: {fmtCLP(totalCost)}
              </div>
            </div>
          </div>
          {/* Summary strip */}
          <div style={{display:'flex',gap:10,marginTop:10,flexWrap:'wrap'}}>
            {[
              {l:'Stock',v:stock+' '+unitLabel,c:'var(--primary-700)'},
              hasKg&&{l:'Peso total',v:totalKg+' kg',c:'var(--info)'},
              {l:'Costo por unidad',v:fmtCLP(cost),c:'var(--terra-700)'},
              {l:'Valor inventario',v:fmtCLP(totalCost),c:'var(--ink)'},
            ].filter(Boolean).map((x,i)=>(
              <div key={i} style={{flex:1,minWidth:130,padding:'9px 13px',background:'var(--surface)',border:'1px solid var(--line)',borderRadius:10,textAlign:'center'}}>
                <div className="tnum" style={{fontWeight:800,fontSize:15,color:x.c}}>{x.v}</div>
                <div style={{fontSize:11.5,color:'var(--ink-3)',fontWeight:700,marginTop:2}}>{x.l}</div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Variantes ── */}
        <div>
          <div style={{display:'flex',alignItems:'center',gap:9,marginBottom:13}}>
            <span style={{width:32,height:32,borderRadius:9,background:'var(--terra-tint)',color:'var(--terra-700)',display:'grid',placeItems:'center'}}><Icon name="tag" size={16}/></span>
            <div style={{flex:1}}>
              <div style={{fontWeight:800,fontSize:15}}>Variantes de venta</div>
              <div style={{fontSize:12.5,color:'var(--ink-3)',fontWeight:600}}>Cada variante tiene su precio y descuenta del stock madre</div>
            </div>
          </div>

          {fmts.length>0 ? (
            <div style={{overflowX:'auto'}}>
              <table className="tbl" style={{fontSize:13.5}}>
                <thead><tr>
                  <th>Nombre</th>
                  <th className="num">{unitLabel}</th>
                  {hasKg&&<th className="num">Kilos</th>}
                  <th className="num">Precio venta</th>
                  <th className="num">Costo</th>
                  <th className="num">Margen $</th>
                  <th className="num">Margen %</th>
                  <th className="num">Disponibles</th>
                  <th></th>
                </tr></thead>
                <tbody>
                  {fmts.map(f=>{
                    const costo=variantCost(f.qty);
                    const margen=variantMargin(f.price,f.qty);
                    const mpct=variantMarginPct(f.price,f.qty);
                    const kg=variantKg(f.qty);
                    const disp=maxUnits(f.qty);
                    return (
                      <tr key={f.id}>
                        <td>
                          <input style={{border:'none',background:'none',fontWeight:700,fontSize:14,width:'100%',outline:'none',padding:'4px 0'}}
                            value={f.name} onChange={e=>updateFormat(f.id,{name:e.target.value})}/>
                        </td>
                        <td className="num">
                          <input className="tnum" type="number" step={unitStep} style={{border:'none',background:'none',fontWeight:700,fontSize:14,width:70,textAlign:'right',outline:'none',padding:'4px 0'}}
                            value={f.qty} onChange={e=>updateFormat(f.id,{qty:+e.target.value||0})}/>
                          <span style={{fontSize:11,color:'var(--ink-3)',marginLeft:2}}>{unitAbbrev}</span>
                        </td>
                        {hasKg&&<td className="num tnum muted">{kg!=null?kg+' kg':'—'}</td>}
                        <td className="num">
                          <div className="input-pre" style={{maxWidth:110,marginLeft:'auto'}}>
                            <span className="pre" style={{padding:'0 2px 0 8px',fontSize:12}}>$</span>
                            <input className="tnum" type="number" value={f.price} style={{padding:'5px 8px 5px 2px',fontSize:13.5,textAlign:'right'}}
                              onChange={e=>updateFormat(f.id,{price:+e.target.value||0})}/>
                          </div>
                        </td>
                        <td className="num tnum muted">{fmtCLP(costo)}</td>
                        <td className="num tnum" style={{fontWeight:800,color:margen>0?'var(--primary-700)':'var(--danger)'}}>{fmtCLP(margen)}</td>
                        <td className="num">
                          <span className="chip tnum" style={{background:mpct>=25?'var(--ok-tint)':mpct>0?'var(--warn-tint)':'var(--danger-tint)',color:mpct>=25?'var(--primary-700)':mpct>0?'oklch(0.50 0.10 70)':'var(--danger)',fontSize:12,fontWeight:800}}>{mpct}%</span>
                        </td>
                        <td className="num">
                          <span className="chip tnum" style={{background:disp>0?'var(--ok-tint)':'var(--danger-tint)',color:disp>0?'var(--primary-700)':'var(--danger)',fontSize:12,fontWeight:800}}>{disp}</span>
                        </td>
                        <td>
                          <button className="btn btn-ghost btn-icon" style={{width:28,height:28}} onClick={()=>deleteFormat(f.id)}><Icon name="trash" size={13}/></button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div style={{textAlign:'center',padding:'28px',background:'var(--surface-3)',borderRadius:14,color:'var(--ink-3)'}}>
              <Icon name="tag" size={28} style={{marginBottom:8}}/>
              <div style={{fontWeight:700,fontSize:14}}>Aún no hay variantes</div>
              <div style={{fontSize:13,marginTop:4}}>Agrega la primera variante abajo</div>
            </div>
          )}

          {/* Add variant */}
          {adding ? (
            <div style={{marginTop:12,padding:'16px',background:'var(--surface-3)',borderRadius:13,border:'1px dashed var(--primary)'}}>
              <div style={{fontSize:13,fontWeight:800,color:'var(--primary-700)',marginBottom:12}}>Nueva variante</div>
              <div style={{display:'grid',gridTemplateColumns:'2fr 1fr 1fr',gap:10,marginBottom:10}}>
                <label className="field"><span style={{fontSize:11.5,fontWeight:700,color:'var(--ink-2)'}}>Nombre de la variante</span>
                  <input className="input" value={newFmt.name} onChange={e=>setNewFmt(f=>({...f,name:e.target.value}))} placeholder="Ej: Pack 6 unidades" autoFocus style={{fontSize:14}}/></label>
                <label className="field"><span style={{fontSize:11.5,fontWeight:700,color:'var(--ink-2)'}}>Cantidad ({unitAbbrev}) que descuenta</span>
                  <input className="input tnum" type="number" step={unitStep} value={newFmt.qty} onChange={e=>setNewFmt(f=>({...f,qty:e.target.value}))} placeholder={isWeight?'0.5':'6'} style={{fontSize:14}}/>
                  {newFmt.qty&&hasKg&&<span className="hint">= {+(kgPerUnit*+newFmt.qty).toFixed(3)} kg</span>}
                </label>
                <label className="field"><span style={{fontSize:11.5,fontWeight:700,color:'var(--ink-2)'}}>Precio de venta ($)</span>
                  <input className="input tnum" type="number" value={newFmt.price} onChange={e=>setNewFmt(f=>({...f,price:e.target.value}))} placeholder="2000" style={{fontSize:14}}/></label>
              </div>
              {/* Live preview */}
              {newFmt.qty&&newFmt.price&&(()=>{
                const c=variantCost(newFmt.qty), m=variantMargin(newFmt.price,newFmt.qty), mp=variantMarginPct(newFmt.price,newFmt.qty);
                return (
                  <div style={{display:'flex',gap:10,marginBottom:12,flexWrap:'wrap'}}>
                    {[{l:'Costo calculado',v:fmtCLP(c)},{l:'Ganancia',v:fmtCLP(m)},{l:'Margen',v:mp+'%',danger:mp<25},{l:'Disponibles',v:maxUnits(newFmt.qty)+' u.'}].map((x,i)=>(
                      <div key={i} style={{flex:1,minWidth:100,padding:'8px 11px',background:'var(--surface)',borderRadius:9,textAlign:'center',border:'1px solid var(--line)'}}>
                        <div className="tnum" style={{fontWeight:800,fontSize:14,color:x.danger?'var(--warn)':'var(--ink)'}}>{x.v}</div>
                        <div style={{fontSize:11,color:'var(--ink-3)',fontWeight:700,marginTop:2}}>{x.l}</div>
                      </div>
                    ))}
                  </div>
                );
              })()}
              <div style={{display:'flex',gap:8}}>
                <button className="btn btn-primary" disabled={!newFmt.name||!newFmt.qty||!newFmt.price} onClick={addVariant}><Icon name="check" size={15}/>Agregar variante</button>
                <button className="btn btn-ghost" onClick={()=>{setAdding(false);setNewFmt(EMPTY);}}>Cancelar</button>
              </div>
            </div>
          ) : (
            <button className="btn btn-soft" style={{marginTop:10,fontSize:14}} onClick={()=>setAdding(true)}>
              <Icon name="plus" size={16}/>Agregar variante
            </button>
          )}

          <div style={{marginTop:14,padding:'10px 14px',background:'var(--primary-tint)',borderRadius:10,fontSize:13,fontWeight:600,color:'var(--primary-700)',display:'flex',gap:9,alignItems:'center'}}>
            <Icon name="alert" size={14}/>Al registrar una venta, el sistema descuenta automáticamente las unidades del stock madre.
          </div>
        </div>
      </div>
    </Modal>
  );
}

/* ── Inline FormatPicker: for Ventas screen ───── */
function FormatPicker({ product, onPick, onCancel }){
  const { getFormats, canSellFormat, maxUnitsForFormat } = useFormats();
  const fmts = getFormats(product.id);
  const bu = getBaseUnit(product.cat);
  const [qty, setQty] = useState(1);
  const [selFmt, setSelFmt] = useState(fmts[0]?.id||null);

  const check = selFmt ? canSellFormat(product, selFmt, qty) : {ok:false};
  const maxQty = selFmt ? maxUnitsForFormat(product, selFmt) : 0;
  const fmt = fmts.find(f=>f.id===selFmt);
  const cost = fmt ? product.cost * fmt.qty * qty : 0;
  const price = fmt ? fmt.price * qty : 0;
  const kgTotal = fmt && product.kgPerUnit ? +(product.kgPerUnit*fmt.qty*qty).toFixed(3) : null;

  return (
    <div style={{background:'var(--surface)',border:'1px solid var(--primary)',borderRadius:16,padding:'18px',boxShadow:'var(--sh-2)',marginBottom:10}}>
      <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:14}}>
        <div style={{flex:1}}>
          <div style={{fontWeight:800,fontSize:15}}>{product.name}</div>
          <div style={{fontSize:12.5,color:'var(--ink-3)',fontWeight:600,marginTop:2}}>
            Stock: <strong>{product.stock} u.</strong>{product.kgPerUnit>0&&` · ${+(product.stock*product.kgPerUnit).toFixed(2)} kg`}
          </div>
        </div>
        <button className="btn btn-ghost btn-icon" onClick={onCancel}><Icon name="x" size={16}/></button>
      </div>

      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(130px,1fr))',gap:8,marginBottom:14}}>
        {fmts.map(f=>{
          const chk=canSellFormat(product,f.id,1); const active=selFmt===f.id;
          const costo=product.cost*f.qty; const mgn=Math.round((f.price-costo)/f.price*100);
          const kg=product.kgPerUnit>0?+(product.kgPerUnit*f.qty).toFixed(3):null;
          return (
            <button key={f.id} onClick={()=>{ if(chk.ok){setSelFmt(f.id);setQty(1);} }}
              disabled={!chk.ok}
              style={{padding:'11px 12px',textAlign:'left',borderRadius:12,
                border:`2px solid ${active?'var(--primary)':'var(--line)'}`,
                background:active?'var(--primary-tint)':chk.ok?'var(--surface)':'var(--surface-3)',
                opacity:chk.ok?1:0.5,cursor:chk.ok?'pointer':'not-allowed',transition:'.13s',fontFamily:'inherit'}}>
              <div style={{fontWeight:800,fontSize:13,marginBottom:3,color:active?'var(--primary-700)':'var(--ink)'}}>{f.name}</div>
              <div className="tnum" style={{fontWeight:700,fontSize:14.5,marginBottom:2}}>{fmtCLP(f.price)}</div>
              {kg!=null&&<div style={{fontSize:11,color:'var(--ink-3)',fontWeight:700}}>{kg} kg</div>}
              <div style={{fontSize:11,color:chk.ok?'var(--primary-700)':'var(--danger)',fontWeight:700,marginTop:2}}>
                {chk.ok?`Hasta ${Math.floor(product.stock/f.qty)} u.`:'Sin stock'}
              </div>
            </button>
          );
        })}
      </div>

      {selFmt&&!check.ok&&<div style={{padding:'10px 13px',background:'var(--danger-tint)',borderRadius:10,fontSize:13,fontWeight:600,color:'var(--danger)',marginBottom:12,display:'flex',gap:8,alignItems:'center'}}><Icon name="alert" size={14}/>Sin stock suficiente. Quedan {check.available} unidades.</div>}

      {selFmt&&fmt&&(
        <div style={{padding:'12px 14px',background:'var(--surface-3)',borderRadius:12,marginBottom:12}}>
          <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:10}}>
            <span style={{fontSize:13.5,fontWeight:700,color:'var(--ink-2)',flex:1}}>¿Cuántos formatos?</span>
            <div style={{display:'flex',alignItems:'center',gap:8}}>
              <button className="btn btn-ghost btn-icon" style={{width:30,height:30}} onClick={()=>setQty(q=>Math.max(1,q-1))}><Icon name="minus" size={14}/></button>
              <span className="tnum" style={{width:28,textAlign:'center',fontWeight:800,fontSize:16}}>{qty}</span>
              <button className="btn btn-ghost btn-icon" style={{width:30,height:30}} onClick={()=>setQty(q=>Math.min(maxQty,q+1))} disabled={qty>=maxQty}><Icon name="plus" size={14}/></button>
            </div>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:8}}>
            {[
              {l:'Descuenta',v:(fmt.qty*qty)+' u.'+(kgTotal!=null?' / '+kgTotal+' kg':'')},
              {l:'Total venta',v:fmtCLP(price)},
              {l:'Ganancia',v:fmtCLP(price-cost)}
            ].map((x,i)=>(
              <div key={i} style={{textAlign:'center',padding:'7px',background:'var(--surface)',borderRadius:9}}>
                <div className="tnum" style={{fontWeight:800,fontSize:13.5}}>{x.v}</div>
                <div style={{fontSize:11,color:'var(--ink-3)',fontWeight:700,marginTop:2}}>{x.l}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      <button className="btn btn-primary" style={{width:'100%'}} disabled={!selFmt||!check.ok}
        onClick={()=>{ if(fmt&&check.ok) onPick(product,fmt,qty); }}>
        <Icon name="plus" size={16}/>Agregar al carrito · {selFmt&&fmt?fmtCLP(fmt.price*qty):'—'}
      </button>
    </div>
  );
}

/* ── FormatBreakdown: inventory view ─────── */
function FormatBreakdown({ product }){
  const { getFormats, maxUnitsForFormat } = useFormats();
  const fmts = getFormats(product.id);
  const [open, setOpen] = useState(false);
  if(!fmts.length) return null;
  return (
    <div style={{marginTop:8}}>
      <button onClick={()=>setOpen(v=>!v)} className="btn btn-ghost" style={{padding:'6px 11px',fontSize:12.5,gap:6}}>
        <Icon name="tag" size={13}/>{open?'Ocultar':'Ver'} variantes ({fmts.length})
        <Icon name={open?'chevD':'chevR'} size={13}/>
      </button>
      {open&&(
        <div style={{marginTop:8,padding:'12px 14px',background:'var(--surface-3)',borderRadius:12,display:'flex',flexDirection:'column',gap:6}}>
          <div style={{fontSize:12,fontWeight:700,color:'var(--ink-3)',marginBottom:3}}>
            Stock base: {product.stock} u.{product.kgPerUnit>0?` · ${+(product.stock*product.kgPerUnit).toFixed(2)} kg`:''}
          </div>
          {fmts.map(f=>{
            const max=maxUnitsForFormat(product,f.id); const ok=max>0;
            const kg=product.kgPerUnit>0?+(product.kgPerUnit*f.qty).toFixed(3):null;
            return (
              <div key={f.id} style={{display:'flex',alignItems:'center',gap:10,padding:'7px 10px',background:ok?'var(--surface)':'var(--danger-tint)',borderRadius:9,border:`1px solid ${ok?'var(--line)':'var(--danger-tint)'}`}}>
                <span style={{flex:1,fontWeight:700,fontSize:13}}>{f.name}</span>
                <span style={{fontSize:12,color:'var(--ink-3)',fontWeight:600}}>{f.qty} u.{kg!=null?` / ${kg} kg`:''}</span>
                <span className="chip" style={{background:ok?'var(--ok-tint)':'var(--danger-tint)',color:ok?'var(--primary-700)':'var(--danger)',fontSize:12,fontWeight:800,minWidth:54,textAlign:'center'}}>
                  {ok?`Hasta ${max}`:'Sin stock'}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

Object.assign(window, { FormatManagerModal, FormatPicker, FormatBreakdown });
