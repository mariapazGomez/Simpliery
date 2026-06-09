/* ---------- Despachos: pedidos, rutas, repartidores ---------- */

/* ── Seed data ───────────────────────────────────────── */
function seedDespachos(sales, clientes){
  let s=55123; const rnd=()=>{ s=(s*1103515245+12345)&0x7fffffff; return s/0x7fffffff; };
  const repartidores=['Carlos Vega','Pedro Rojas','Ninguno asignado'];
  const estados=['pendiente','en_ruta','entregado','entregado','entregado','no_entregado'];
  return sales.filter((_,i)=>i<12).map((sale,i)=>{
    const cl=clientes[Math.floor(rnd()*clientes.length)];
    const estado=estados[Math.floor(rnd()*estados.length)];
    const rep=repartidores[Math.floor(rnd()*repartidores.length)];
    const dir=cl.ciudad+' — '+['Av. Las Flores 1234','Calle Los Álamos 456','Pasaje El Sol 89','Av. Central 2210','Los Cerezos 678'][Math.floor(rnd()*5)];
    return { id:'d'+i, saleId:sale.id, boleta:sale.boleta, fecha:sale.date,
      cliente:cl.nombre, telefono:cl.telefono, correo:cl.correo, direccion:dir, ciudad:cl.ciudad,
      nota:rnd()<0.3?'Dejar en conserjería':'', repartidor:estado==='pendiente'?'Ninguno asignado':rep,
      estado, items:sale.items, total:sale.total, method:sale.method };
  });
}

const ESTADO_CFG={
  pendiente:   {label:'Pendiente',    bg:'var(--warn-tint)',    fg:'oklch(0.50 0.10 70)', icon:'clock'},
  en_ruta:     {label:'En ruta',      bg:'var(--info-tint)',    fg:'var(--info)',          icon:'truck'},
  entregado:   {label:'Entregado',    bg:'var(--ok-tint)',      fg:'var(--primary-700)',   icon:'check'},
  no_entregado:{label:'No entregado', bg:'var(--danger-tint)',  fg:'var(--danger)',        icon:'x'},
};
function EstadoChip({ estado, size='sm' }){
  const c=ESTADO_CFG[estado]||ESTADO_CFG.pendiente;
  return <span className="chip" style={{background:c.bg, color:c.fg, padding:size==='lg'?'5px 13px':'3px 10px', fontSize:size==='lg'?14:12.5}}>
    <Icon name={c.icon} size={size==='lg'?15:12}/>{c.label}
  </span>;
}

/* ── Detalle pedido modal ─────────────────────────────── */
function PedidoModal({ pedido, onClose, onUpdate }){
  const [estado, setEstado]=useState(pedido.estado);
  const [obs, setObs]=useState(pedido.nota||'');
  const [rep, setRep]=useState(pedido.repartidor);
  const repartidores=['Carlos Vega','Pedro Rojas','Sin asignar'];
  const waUrl=`https://wa.me/${(pedido.telefono||'').replace(/\D/g,'')}?text=${encodeURIComponent(`Hola ${pedido.cliente.split(' ')[0]}, te escribimos de Control Local para coordinar tu entrega de hoy. ¿Sigues disponible en ${pedido.direccion}?`)}`;
  const mapsUrl=`https://maps.google.com/?q=${encodeURIComponent(pedido.direccion)}`;
  return (
    <Modal title={'Pedido #'+pedido.boleta} sub={pedido.cliente+' · '+pedido.ciudad} onClose={onClose} width={560}
      footer={<><button className="btn btn-ghost" onClick={onClose}>Cerrar</button>
        <button className="btn btn-primary" onClick={()=>{ onUpdate(pedido.id,{estado,nota:obs,repartidor:rep}); onClose(); }}><Icon name="check" size={15}/>Guardar cambios</button></>}>
      <div style={{display:'grid', gap:14}}>
        <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:10}}>
          <Mini label="Total" value={fmtCLP(pedido.total)}/>
          <Mini label="Método" value={pedido.method}/>
        </div>
        {/* Estado */}
        <label className="field"><span style={{fontSize:13, fontWeight:700, color:'var(--ink-2)'}}>Estado del pedido</span>
          <div style={{display:'grid', gridTemplateColumns:'repeat(2,1fr)', gap:8}}>
            {Object.entries(ESTADO_CFG).map(([k,c])=>(
              <button key={k} onClick={()=>setEstado(k)} style={{
                display:'flex', alignItems:'center', gap:8, padding:'9px 12px', borderRadius:11,
                border:`2px solid ${estado===k?c.fg:'var(--line)'}`,
                background:estado===k?c.bg:'var(--surface)', cursor:'pointer', fontFamily:'inherit', fontWeight:700, fontSize:13.5,
                color:estado===k?c.fg:'var(--ink-2)', transition:'.12s'}}>
                <Icon name={c.icon} size={16}/>{c.label}
              </button>
            ))}
          </div>
        </label>
        {/* Repartidor */}
        <label className="field"><span style={{fontSize:13, fontWeight:700, color:'var(--ink-2)'}}>Repartidor</span>
          <select className="select" value={rep} onChange={e=>setRep(e.target.value)}>{repartidores.map(r=><option key={r}>{r}</option>)}</select>
        </label>
        {/* Dirección */}
        <div style={{padding:'12px 14px', background:'var(--surface-3)', borderRadius:11}}>
          <div style={{fontSize:12.5, fontWeight:700, color:'var(--ink-3)', marginBottom:4}}>Dirección de entrega</div>
          <div style={{fontWeight:700, fontSize:14}}>{pedido.direccion}</div>
          <div style={{display:'flex', gap:8, marginTop:10}}>
            <a href={mapsUrl} target="_blank" rel="noopener noreferrer" style={{textDecoration:'none'}}><button className="btn btn-ghost" style={{fontSize:13}}><Icon name="truck" size={15}/>Abrir en Maps</button></a>
            <a href={waUrl} target="_blank" rel="noopener noreferrer" style={{textDecoration:'none'}}><button className="btn btn-soft" style={{fontSize:13}}><Icon name="phone" size={15}/>WhatsApp</button></a>
          </div>
        </div>
        {/* Productos */}
        <div>
          <div style={{fontSize:12.5, fontWeight:700, color:'var(--ink-3)', marginBottom:7}}>Productos del pedido</div>
          {pedido.items.map((it,i)=>(
            <div key={i} style={{display:'flex', justifyContent:'space-between', padding:'7px 0', borderBottom:'1px solid var(--line)', fontSize:14}}>
              <span style={{fontWeight:600}}>{it.name} <span className="tnum" style={{color:'var(--ink-3)'}}>×{it.qty}</span></span>
              <span className="tnum" style={{fontWeight:800}}>{fmtCLP(it.price*it.qty)}</span>
            </div>
          ))}
        </div>
        {/* Observación */}
        <label className="field"><span style={{fontSize:13, fontWeight:700, color:'var(--ink-2)'}}>Observación del repartidor</span>
          <textarea className="input" rows={2} value={obs} onChange={e=>setObs(e.target.value)} placeholder="Ej: cliente no estaba, dejar en conserjería…" style={{resize:'vertical'}}/>
        </label>
      </div>
    </Modal>
  );
}

/* ── Ruta del día view — drag-to-reorder + maps embed ── */
function VistaRuta({ pedidos, onBack }){
  const initList = pedidos.filter(p=>p.estado==='pendiente'||p.estado==='en_ruta');
  const [orden, setOrden] = useState(initList);
  const [expandedMap, setExpandedMap] = useState({});
  const dragIdx = useRef(null);
  const dragOverIdx = useRef(null);

  // sync if pedidos prop changes (e.g. after marking delivered)
  useEffect(()=>{
    const newPend = pedidos.filter(p=>p.estado==='pendiente'||p.estado==='en_ruta');
    setOrden(prev=>{
      const ids = new Set(newPend.map(p=>p.id));
      const kept = prev.filter(p=>ids.has(p.id));
      const added = newPend.filter(p=>!prev.find(x=>x.id===p.id));
      return [...kept, ...added];
    });
  },[pedidos]);

  const handleDragStart=(i)=>{ dragIdx.current=i; };
  const handleDragOver=(e,i)=>{ e.preventDefault(); dragOverIdx.current=i; };
  const handleDrop=()=>{
    if(dragIdx.current===null||dragOverIdx.current===null||dragIdx.current===dragOverIdx.current) return;
    setOrden(list=>{
      const arr=[...list];
      const [moved]=arr.splice(dragIdx.current,1);
      arr.splice(dragOverIdx.current,0,moved);
      dragIdx.current=null; dragOverIdx.current=null;
      return arr;
    });
  };

  const toggleMap=(id)=>setExpandedMap(m=>({...m,[id]:!m[id]}));

  return (
    <div className="fade-in">
      <PageHeader title="Vista del repartidor" sub={`${orden.length} entregas · arrástralas para reordenar la ruta`}>
        <button className="btn btn-ghost" onClick={onBack}><Icon name="chevR" size={16} style={{transform:'rotate(180deg)'}}/>Volver</button>
      </PageHeader>

      {orden.length===0 ? (
        <div className="card"><EmptyState icon="check" title="¡Todas las entregas completadas!" text="No quedan pedidos pendientes para hoy."/></div>
      ) : (
        <div style={{display:'flex', flexDirection:'column', gap:13}}>
          {/* Drag hint */}
          <div style={{display:'flex', alignItems:'center', gap:8, padding:'9px 14px', background:'var(--primary-tint)', borderRadius:11, fontSize:13, fontWeight:600, color:'var(--primary-700)'}}>
            <Icon name="filter" size={14}/>Arrastra las tarjetas para cambiar el orden de entrega
          </div>

          {orden.map((p,i)=>{
            const waUrl=`https://wa.me/${(p.telefono||'').replace(/\D/g,'')}?text=${encodeURIComponent(`Hola ${p.cliente.split(' ')[0]}, voy en camino con tu pedido. ¿Sigues en ${p.direccion}?`)}`;
            const mapsOpenUrl=`https://maps.google.com/?q=${encodeURIComponent(p.direccion)}`;
            const mapsEmbedUrl=`https://maps.google.com/maps?q=${encodeURIComponent(p.direccion)}&output=embed&iwloc=near&z=15`;
            const mapOpen = expandedMap[p.id];

            return (
              <div key={p.id} draggable
                onDragStart={()=>handleDragStart(i)}
                onDragOver={e=>handleDragOver(e,i)}
                onDrop={handleDrop}
                className="card"
                style={{border:'1px solid var(--line)', cursor:'grab', transition:'box-shadow .15s',
                  boxShadow: dragOverIdx.current===i?'0 0 0 2px var(--primary), var(--sh-2)':'var(--sh-1)'}}>

                {/* Header row */}
                <div style={{padding:'15px 18px', display:'flex', alignItems:'flex-start', gap:12}}>
                  {/* Drag handle */}
                  <div style={{display:'flex', flexDirection:'column', justifyContent:'center', gap:3, padding:'6px 4px', color:'var(--ink-3)', cursor:'grab', flexShrink:0}}>
                    {[0,1,2].map(k=><div key={k} style={{display:'flex', gap:3}}>{[0,1].map(j=><div key={j} style={{width:4, height:4, borderRadius:2, background:'var(--line-2)'}}></div>)}</div>)}
                  </div>
                  {/* Stop number */}
                  <div style={{width:36, height:36, borderRadius:11, background:'var(--primary)', color:'#fff', display:'grid', placeItems:'center', fontWeight:800, fontSize:15, flexShrink:0}}>{i+1}</div>
                  <div style={{flex:1, minWidth:0}}>
                    <div style={{fontWeight:800, fontSize:15.5}}>{p.cliente}</div>
                    <div style={{color:'var(--ink-2)', fontWeight:600, marginTop:1, fontSize:13.5}}>{p.direccion}</div>
                    {p.nota && <div style={{fontSize:12.5, color:'oklch(0.50 0.10 70)', fontWeight:700, marginTop:4, display:'flex', alignItems:'center', gap:5}}><Icon name="alert" size={13}/>Nota: {p.nota}</div>}
                    <div className="tnum" style={{fontSize:12.5, fontWeight:700, color:'var(--ink-3)', marginTop:3}}>{p.items.length} productos · {fmtCLP(p.total)} · {p.method}</div>
                  </div>
                  <div style={{display:'flex', flexDirection:'column', alignItems:'flex-end', gap:6}}>
                    <EstadoChip estado={p.estado}/>
                    {/* Toggle map */}
                    <button onClick={()=>toggleMap(p.id)} className="btn btn-ghost" style={{padding:'5px 10px', fontSize:12, gap:5}}>
                      <Icon name="truck" size={13}/>{mapOpen?'Ocultar mapa':'Ver mapa'}
                    </button>
                  </div>
                </div>

                {/* Google Maps embed — togglable */}
                {mapOpen && (
                  <div style={{padding:'0 18px 14px'}}>
                    <div style={{borderRadius:12, overflow:'hidden', border:'1px solid var(--line)', position:'relative'}}>
                      <iframe
                        src={mapsEmbedUrl}
                        width="100%" height="220"
                        style={{border:'none', display:'block'}}
                        loading="lazy"
                        referrerPolicy="no-referrer-when-downgrade"
                        title={`Mapa ${p.direccion}`}
                      />
                      <a href={mapsOpenUrl} target="_blank" rel="noopener noreferrer"
                        style={{position:'absolute', bottom:10, right:10, background:'var(--surface)', border:'1px solid var(--line-2)', borderRadius:9, padding:'6px 12px', fontSize:12.5, fontWeight:800, display:'flex', alignItems:'center', gap:6, color:'var(--ink)', textDecoration:'none', boxShadow:'var(--sh-2)'}}>
                        <Icon name="truck" size={13}/>Abrir Google Maps
                      </a>
                    </div>
                  </div>
                )}

                {/* Action buttons */}
                <div style={{padding:'10px 18px 14px', borderTop:'1px solid var(--line)', display:'flex', gap:8, flexWrap:'wrap'}}>
                  <a href={mapsOpenUrl} target="_blank" rel="noopener noreferrer" style={{textDecoration:'none', flex:1}}>
                    <button className="btn btn-ghost" style={{width:'100%', fontSize:13}}><Icon name="truck" size={15}/>Maps</button>
                  </a>
                  <a href={waUrl} target="_blank" rel="noopener noreferrer" style={{textDecoration:'none', flex:1}}>
                    <button className="btn btn-soft" style={{width:'100%', fontSize:13}}><Icon name="phone" size={15}/>WhatsApp</button>
                  </a>
                  <button className="btn btn-primary" style={{flex:2, fontSize:13}} onClick={()=>p._onEntregado&&p._onEntregado(p.id)}>
                    <Icon name="check" size={15}/>Marcar entregado
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ── Main Despachos screen ───────────────────────────── */
function Despachos(){
  const { sales, clientes } = useStore();
  const [pedidos, setPedidos] = useState(()=> seedDespachos(sales, clientes));
  const [filtroEstado, setFiltroEstado] = useState('todos');
  const [filtroCiudad, setFiltroCiudad] = useState('Todas');
  const [filtroRep, setFiltroRep] = useState('Todos');
  const [selected, setSelected] = useState(null);
  const [vistaRuta, setVistaRuta] = useState(false);
  const { toast } = useStore();

  const updatePedido=(id, patch)=> setPedidos(ps=>ps.map(p=>p.id===id?{...p,...patch}:p));

  const cities=['Todas',...[...new Set(pedidos.map(p=>p.ciudad))].sort()];
  const reps=['Todos',...[...new Set(pedidos.map(p=>p.repartidor).filter(r=>r!=='Ninguno asignado'&&r!=='Sin asignar'))]];

  let list=pedidos;
  if(filtroEstado!=='todos') list=list.filter(p=>p.estado===filtroEstado);
  if(filtroCiudad!=='Todas') list=list.filter(p=>p.ciudad===filtroCiudad);
  if(filtroRep!=='Todos') list=list.filter(p=>p.repartidor===filtroRep);

  const counts={ todos:pedidos.length, pendiente:pedidos.filter(p=>p.estado==='pendiente').length, en_ruta:pedidos.filter(p=>p.estado==='en_ruta').length, entregado:pedidos.filter(p=>p.estado==='entregado').length, no_entregado:pedidos.filter(p=>p.estado==='no_entregado').length };

  const pedidosParaRuta=pedidos.filter(p=>p.estado==='pendiente'||p.estado==='en_ruta').map(p=>({...p,_onEntregado:(id)=>{ updatePedido(id,{estado:'entregado'}); toast('¡Entregado! '+p.cliente); }}));

  if(vistaRuta) return <VistaRuta pedidos={pedidosParaRuta} onBack={()=>setVistaRuta(false)}/>;

  return (
    <div className="fade-in">
      <PageHeader title="Despachos" sub="Organiza y controla tus entregas del día">
        <button className="btn btn-ghost" onClick={()=>setVistaRuta(true)}><Icon name="truck" size={16}/>Vista repartidor</button>
        <button className="btn btn-primary"><Icon name="plus" size={16}/>Nuevo despacho</button>
      </PageHeader>

      {/* Metric cards */}
      <div className="grid" style={{gridTemplateColumns:'repeat(auto-fit,minmax(170px,1fr))', marginBottom:18}}>
        <Metric icon="receipt" label="Total pedidos" value={counts.todos} tone="primary" sub="Del historial"/>
        <Metric icon="clock" label="Pendientes" value={counts.pendiente} tone="warn" sub="Por salir a ruta"/>
        <Metric icon="truck" label="En ruta" value={counts.en_ruta} tone="info" sub="En camino ahora"/>
        <Metric icon="check" label="Entregados" value={counts.entregado} tone="primary" sub="Completados"/>
        <Metric icon="x" label="No entregados" value={counts.no_entregado} tone="danger" sub="Requieren reintento"/>
      </div>

      {/* Alerta rutas pendientes */}
      {counts.pendiente>0 && (
        <button className="card card-pad" onClick={()=>setVistaRuta(true)} style={{display:'flex', alignItems:'center', gap:13, marginBottom:18, cursor:'pointer', textAlign:'left', width:'100%', border:'1px solid var(--primary-tint2)'}}>
          <span style={{width:40,height:40,borderRadius:12,background:'var(--primary)',color:'#fff',display:'grid',placeItems:'center',flexShrink:0}}><Icon name="truck" size={20}/></span>
          <div style={{flex:1}}>
            <div style={{fontWeight:800, fontSize:15}}>{counts.pendiente} pedidos pendientes de entrega</div>
            <div style={{fontSize:13, color:'var(--ink-3)', fontWeight:600, marginTop:2}}>Toca aquí para abrir la vista del repartidor con las entregas organizadas</div>
          </div>
          <Icon name="chevR" size={18} style={{color:'var(--ink-3)'}}/>
        </button>
      )}

      {/* Filters */}
      <div style={{display:'flex', gap:10, marginBottom:16, flexWrap:'wrap', alignItems:'center'}}>
        <div className="seg">
          {[['todos','Todos'],['pendiente','Pendientes'],['en_ruta','En ruta'],['entregado','Entregados'],['no_entregado','Fallidos']].map(([k,l])=>(
            <button key={k} className={filtroEstado===k?'on':''} onClick={()=>setFiltroEstado(k)}>{l}{counts[k]>0&&k!=='todos'?<span style={{marginLeft:5, fontWeight:800}}>({counts[k]})</span>:null}</button>
          ))}
        </div>
        <select className="select" style={{width:'auto', fontSize:13.5}} value={filtroCiudad} onChange={e=>setFiltroCiudad(e.target.value)}>
          {cities.map(c=><option key={c}>{c}</option>)}
        </select>
        <select className="select" style={{width:'auto', fontSize:13.5}} value={filtroRep} onChange={e=>setFiltroRep(e.target.value)}>
          {reps.map(r=><option key={r}>{r}</option>)}
        </select>
      </div>

      {/* Pedidos table */}
      <div className="card">
        {list.length===0 ? (
          <EmptyState icon="truck" title="Sin despachos" text="No hay pedidos que coincidan con los filtros. Los despachos se generan al registrar una venta con tipo 'Despacho'."/>
        ) : (
          <div style={{overflowX:'auto'}}>
            <table className="tbl">
              <thead><tr>
                <th>Pedido</th><th>Cliente</th><th>Dirección</th><th>Ciudad</th>
                <th>Repartidor</th><th className="num">Total</th><th>Estado</th><th></th>
              </tr></thead>
              <tbody>
                {list.map(p=>(
                  <tr key={p.id} style={{cursor:'pointer'}} onClick={()=>setSelected(p)}
                    onMouseEnter={e=>e.currentTarget.style.background='var(--surface-3)'}
                    onMouseLeave={e=>e.currentTarget.style.background=''}>
                    <td className="tnum" style={{fontWeight:700, color:'var(--ink-2)'}}># {p.boleta}</td>
                    <td>
                      <div style={{fontWeight:700}}>{p.cliente}</div>
                      <div style={{fontSize:12, color:'var(--ink-3)', fontWeight:600}}>{p.telefono}</div>
                    </td>
                    <td style={{color:'var(--ink-2)', fontWeight:600, maxWidth:200}}><div style={{whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis'}}>{p.direccion}</div></td>
                    <td style={{color:'var(--ink-2)', fontWeight:600}}>{p.ciudad}</td>
                    <td style={{fontWeight:600, fontSize:13.5, color: p.repartidor==='Ninguno asignado'||p.repartidor==='Sin asignar'?'var(--ink-3)':'var(--ink)'}}>{p.repartidor}</td>
                    <td className="num tnum" style={{fontWeight:800}}>{fmtCLP(p.total)}</td>
                    <td><EstadoChip estado={p.estado}/></td>
                    <td><Icon name="chevR" size={16} style={{color:'var(--ink-3)'}}/></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Reporte rápido */}
      {pedidos.length>0 && (
        <div className="grid" style={{gridTemplateColumns:'1fr 1fr 1fr', marginTop:18}}>
          <div className="card card-pad">
            <div style={{fontSize:12.5, fontWeight:700, color:'var(--ink-3)', marginBottom:8}}>Por ciudad</div>
            {cities.filter(c=>c!=='Todas').map(c=>{ const n=pedidos.filter(p=>p.ciudad===c).length; return (
              <div key={c} style={{display:'flex', justifyContent:'space-between', fontSize:13.5, padding:'4px 0', borderBottom:'1px solid var(--line)'}}>
                <span style={{fontWeight:600}}>{c}</span><span className="tnum" style={{fontWeight:800}}>{n}</span>
              </div>); })}
          </div>
          <div className="card card-pad">
            <div style={{fontSize:12.5, fontWeight:700, color:'var(--ink-3)', marginBottom:8}}>Por repartidor</div>
            {reps.filter(r=>r!=='Todos').map(r=>{ const n=pedidos.filter(p=>p.repartidor===r).length; return (
              <div key={r} style={{display:'flex', justifyContent:'space-between', fontSize:13.5, padding:'4px 0', borderBottom:'1px solid var(--line)'}}>
                <span style={{fontWeight:600}}>{r}</span><span className="tnum" style={{fontWeight:800}}>{n}</span>
              </div>); })}
          </div>
          <div className="card card-pad">
            <div style={{fontSize:12.5, fontWeight:700, color:'var(--ink-3)', marginBottom:8}}>Tasa de éxito</div>
            {[['entregado','Entregados'],['no_entregado','Fallidos'],['en_ruta','En ruta']].map(([k,l])=>{
              const n=pedidos.filter(p=>p.estado===k).length; const pct=pedidos.length?Math.round(n/pedidos.length*100):0;
              return <div key={k} style={{marginBottom:9}}>
                <div style={{display:'flex', justifyContent:'space-between', fontSize:13, marginBottom:3}}><span style={{fontWeight:600}}>{l}</span><span className="tnum" style={{fontWeight:800}}>{pct}%</span></div>
                <div style={{height:6, background:'var(--bg-2)', borderRadius:4}}><div style={{height:'100%', width:pct+'%', background:k==='entregado'?'var(--primary)':k==='no_entregado'?'var(--danger)':'var(--info)', borderRadius:4}}></div></div>
              </div>;
            })}
          </div>
        </div>
      )}

      {selected && <PedidoModal pedido={selected} onClose={()=>setSelected(null)} onUpdate={updatePedido}/>}
    </div>
  );
}
window.Despachos = Despachos;
