/* ---------- Finanzas: CxC · CxP · IVA · Documentos · Exportar ---------- */

/* ──────────────────────────────────────────────
   Cuentas por Cobrar
────────────────────────────────────────────── */
function FinCxC(){
  const { sales, clientes, saldarDeuda, toast } = useStore();
  const m = useMetrics();
  // Build CxC rows from credit sales
  const rows = React.useMemo(()=>{
    const creditSales = sales.filter(s=>s.method==='Crédito' && (s.balance||0)>0);
    return creditSales.map(s=>{
      const c = clientes.find(x=>x.id===s.clienteId)||{nombre:s.clienteNombre||'Sin nombre',telefono:''};
      const due = new Date(s.date); due.setDate(due.getDate()+30);
      const daysLate = Math.max(0, Math.round((TODAY-due)/(1000*60*60*24)));
      const estado = s.balance<=0?'pagada': daysLate>0?'vencida': (due-TODAY)<7*86400000?'por_vencer':'al_dia';
      return { id:s.id, cliente:c.nombre, telefono:c.telefono, clienteId:s.clienteId||null, venta:'#'+s.boleta, fecha:s.date, monto:s.total, pagado:(s.total-(s.balance||s.total)), saldo:s.balance||s.total, due, daysLate, estado };
    });
  },[sales, clientes]);

  const [selected,setSelected]=useState(null);
  const [pagoModal,setPagoModal]=useState(null);
  const totalPorCobrar = rows.reduce((a,r)=>a+r.saldo,0);
  const totalVencido = rows.filter(r=>r.estado==='vencida').reduce((a,r)=>a+r.saldo,0);
  const totalPorVencer = rows.filter(r=>r.estado==='por_vencer').reduce((a,r)=>a+r.saldo,0);

  const estadoChip = (e)=>({
    al_dia:    <span className="chip chip-ok"     style={{fontSize:12}}>Al día</span>,
    por_vencer:<span className="chip chip-warn"   style={{fontSize:12}}>Por vencer</span>,
    vencida:   <span className="chip chip-danger" style={{fontSize:12}}>Vencida</span>,
    pagada:    <span className="chip chip-ok"     style={{fontSize:12}}>Pagada</span>,
  }[e]||null);

  if(rows.length===0) return (
    <div>
      <div className="grid" style={{gridTemplateColumns:'repeat(3,1fr)',marginBottom:18}}>
        <FinCard icon="receipt" label="Total por cobrar" value="$0" tone="ok" sub="Sin deudas pendientes"/>
        <FinCard icon="alert"   label="Vencido"          value="$0" tone="primary"/>
        <FinCard icon="clock"   label="Por vencer"       value="$0" tone="primary"/>
      </div>
      <div className="card"><EmptyState icon="receipt" title="Sin cuentas por cobrar" text="Las ventas a crédito aparecerán aquí para que puedas hacer seguimiento de cobros."/></div>
      <div style={{marginTop:14,padding:'12px 16px',background:'var(--primary-tint)',borderRadius:12,fontSize:13.5,fontWeight:600,color:'var(--primary-700)'}}>
        <Icon name="alert" size={15} style={{verticalAlign:'-3px',marginRight:7}}/>Para probar, registra una venta con método de pago <strong>Crédito</strong>.
      </div>
    </div>
  );

  return (
    <div className="fade-in">
      <div className="grid" style={{gridTemplateColumns:'repeat(auto-fit,minmax(160px,1fr))',marginBottom:18}}>
        <FinCard icon="receipt" label="Total por cobrar"   value={fmtCLP(totalPorCobrar)} tone={totalPorCobrar>0?'warn':'ok'} sub="Este dinero aún no está en caja"/>
        <FinCard icon="alert"   label="Vencido"            value={fmtCLP(totalVencido)}   tone={totalVencido>0?'danger':'ok'}  sub={rows.filter(r=>r.estado==='vencida').length+' clientes'}/>
        <FinCard icon="clock"   label="Por vencer (7d)"   value={fmtCLP(totalPorVencer)} tone="warn" sub="Cobrar a tiempo mejora tu flujo"/>
        <FinCard icon="clientes" label="Clientes deudores" value={rows.length}            tone="info" sub="Con saldo pendiente"/>
      </div>

      {totalVencido>0 && <div style={{marginBottom:14}}><AlertaBanner tone="danger" icon="alert">Hay {fmtCLP(totalVencido)} en deudas vencidas. Contáctalos para cobrar.</AlertaBanner></div>}

      <div className="card">
        <div className="card-head">
          <span style={{width:32,height:32,borderRadius:9,background:'var(--warn-tint)',color:'oklch(0.50 0.10 70)',display:'grid',placeItems:'center'}}><Icon name="receipt" size={16}/></span>
          <div style={{flex:1}}><div className="card-title">Deudas pendientes</div><div className="card-sub">{rows.length} ventas a crédito · "Este dinero aún no está en caja"</div></div>
        </div>
        <div style={{overflowX:'auto'}}>
          <table className="tbl">
            <thead><tr><th>Cliente</th><th>Venta</th><th>Fecha</th><th className="num">Monto</th><th className="num">Pagado</th><th className="num">Saldo</th><th>Vencimiento</th><th>Estado</th><th></th></tr></thead>
            <tbody>
              {rows.map(r=>(
                <tr key={r.id}>
                  <td style={{fontWeight:700}}>{r.cliente}<br/><span style={{fontSize:12,color:'var(--ink-3)',fontWeight:600}}>{r.telefono}</span></td>
                  <td className="tnum muted">{r.venta}</td>
                  <td style={{fontSize:13,color:'var(--ink-3)',fontWeight:600}}>{r.fecha.toLocaleDateString('es-CL',{day:'2-digit',month:'short'})}</td>
                  <td className="num tnum">{fmtCLP(r.monto)}</td>
                  <td className="num tnum muted">{fmtCLP(r.pagado)}</td>
                  <td className="num tnum" style={{fontWeight:800,color:r.estado==='vencida'?'var(--danger)':r.estado==='por_vencer'?'oklch(0.50 0.10 70)':'var(--ink)'}}>{fmtCLP(r.saldo)}</td>
                  <td style={{fontSize:12.5,fontWeight:600,color:r.daysLate>0?'var(--danger)':'var(--ink-3)'}}>
                    {r.due.toLocaleDateString('es-CL',{day:'2-digit',month:'short'})}
                    {r.daysLate>0 && <span style={{display:'block',color:'var(--danger)',fontSize:11.5,fontWeight:800}}>{r.daysLate} días atraso</span>}
                  </td>
                  <td>{estadoChip(r.estado)}</td>
                  <td className="num">
                    <div style={{display:'flex',gap:5,justifyContent:'flex-end'}}>
                      {r.telefono && <a href={`https://wa.me/56${r.telefono.replace(/\D/g,'')}?text=${encodeURIComponent('Hola '+r.cliente.split(' ')[0]+', te recuerdo que tienes un saldo pendiente de '+fmtCLP(r.saldo)+'. ¡Gracias!')}`} target="_blank" rel="noopener noreferrer"><button className="btn btn-ghost" style={{padding:'6px 10px',fontSize:12}}><Icon name="phone" size={14}/>WA</button></a>}
                      <button className="btn btn-primary" style={{padding:'6px 10px',fontSize:12}} onClick={()=>setPagoModal(r)}><Icon name="check" size={13}/>Saldar</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {pagoModal && (
        <Modal title="Registrar pago" sub={pagoModal.cliente+' · '+pagoModal.venta} onClose={()=>setPagoModal(null)} width={400}
          footer={<><button className="btn btn-ghost" onClick={()=>setPagoModal(null)}>Cancelar</button>
            <button className="btn btn-primary" onClick={()=>{ if(pagoModal.clienteId) saldarDeuda(pagoModal.clienteId, pagoModal.saldo); toast('Pago registrado · '+fmtCLP(pagoModal.saldo)); setPagoModal(null); }}><Icon name="check" size={16}/>Confirmar pago</button></>}>
          <div style={{textAlign:'center',padding:'8px 0 16px'}}>
            <div className="tnum" style={{fontSize:32,fontWeight:800,color:'var(--primary-700)'}}>{fmtCLP(pagoModal.saldo)}</div>
            <div style={{color:'var(--ink-3)',fontWeight:600,marginTop:4}}>Saldo pendiente de {pagoModal.cliente}</div>
            <div style={{marginTop:14,padding:'11px 14px',background:'var(--surface-3)',borderRadius:11,fontSize:13.5,fontWeight:600,color:'var(--ink)',lineHeight:1.5}}>
              Una vez confirmado, el saldo quedará en <strong>$0</strong> y el dinero se sumará a tu caja disponible.
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

/* ──────────────────────────────────────────────
   Cuentas por Pagar
────────────────────────────────────────────── */
function FinCxP(){
  const { gastos, updateGasto, toast } = useFinanzas();
  const pending = gastos.filter(g=>g.estado==='pendiente');
  const totalPagar = pending.reduce((a,g)=>a+g.monto,0);
  const venceSemana = pending.filter(g=>{ const d=(g.fecha-TODAY)/(86400000); return d<=7; }).reduce((a,g)=>a+g.monto,0);
  const [paying,setPaying]=useState(null);

  const urgencia = (g)=>{
    const d=(g.fecha-TODAY)/86400000;
    if(d<0) return 'vencido';
    if(d<=3) return 'por_vencer';
    return 'pendiente';
  };
  const urgChip = (u)=>({
    vencido:    <span className="chip chip-danger" style={{fontSize:12}}>Vencido</span>,
    por_vencer: <span className="chip chip-warn"   style={{fontSize:12}}>Esta semana</span>,
    pendiente:  <span className="chip chip-neutral" style={{fontSize:12}}>Pendiente</span>,
  }[u]);

  return (
    <div className="fade-in">
      <div className="grid" style={{gridTemplateColumns:'repeat(auto-fit,minmax(170px,1fr))',marginBottom:18}}>
        <FinCard icon="coins"    label="Total por pagar"     value={fmtCLP(totalPagar)}   tone={totalPagar>500000?'danger':'warn'}   sub={pending.length+' pagos pendientes'}/>
        <FinCard icon="alert"    label="Vence esta semana"   value={fmtCLP(venceSemana)}  tone={venceSemana>200000?'danger':'warn'}  sub="Priorizar estos pagos"/>
        <FinCard icon="check"    label="Pagados este mes"    value={fmtCLP(gastos.filter(g=>g.estado==='pagado').reduce((a,g)=>a+g.monto,0))} tone="ok" sub="Gastos saldados"/>
      </div>

      {totalPagar>0 && <div style={{padding:'12px 16px',background:'var(--warn-tint)',borderRadius:12,marginBottom:16,fontSize:13.5,fontWeight:600,color:'oklch(0.50 0.10 70)',display:'flex',gap:10,alignItems:'center'}}>
        <Icon name="alert" size={17} style={{flexShrink:0}}/>Tienes {fmtCLP(totalPagar)} por pagar. Prioriza los que vencen antes.
      </div>}

      <div className="card">
        <div className="card-head">
          <span style={{width:32,height:32,borderRadius:9,background:'var(--terra-tint)',color:'var(--terra-700)',display:'grid',placeItems:'center'}}><Icon name="coins" size={16}/></span>
          <div style={{flex:1}}><div className="card-title">Pagos pendientes</div><div className="card-sub">Gastos aún no pagados</div></div>
        </div>
        {pending.length===0 ? <EmptyState icon="check" title="Todo al día" text="No tienes gastos pendientes de pago este mes."/> : (
          <div style={{overflowX:'auto'}}>
            <table className="tbl">
              <thead><tr><th>Proveedor / Descripción</th><th>Categoría</th><th className="num">Monto</th><th>Método</th><th>Urgencia</th><th></th></tr></thead>
              <tbody>
                {pending.sort((a,b)=>a.fecha-b.fecha).map(g=>(
                  <tr key={g.id}>
                    <td>
                      <div style={{fontWeight:700}}>{g.desc}</div>
                      <div style={{fontSize:12,color:'var(--ink-3)',fontWeight:600}}>{g.proveedor}</div>
                    </td>
                    <td><span style={{display:'flex',alignItems:'center',gap:7,color:'var(--ink-2)',fontWeight:600,fontSize:13}}>
                      <span style={{width:8,height:8,borderRadius:2,background:GASTO_COLORS[g.cat]||'var(--ink-3)'}}></span>{g.cat}
                    </span></td>
                    <td className="num tnum" style={{fontWeight:800}}>{fmtCLP(g.monto)}</td>
                    <td style={{fontSize:13,color:'var(--ink-3)',fontWeight:600}}>{g.method}</td>
                    <td>{urgChip(urgencia(g))}</td>
                    <td className="num"><button className="btn btn-primary" style={{padding:'6px 12px',fontSize:12.5}} onClick={()=>{ updateGasto(g.id,{estado:'pagado'}); toast('Pago registrado · '+g.desc); }}><Icon name="check" size={13}/>Marcar pagado</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {/* Gastos pagados (collapsed) */}
        <details style={{borderTop:'1px solid var(--line)'}}>
          <summary style={{padding:'12px 22px',cursor:'pointer',fontSize:13,fontWeight:700,color:'var(--ink-3)',userSelect:'none',listStyle:'none',display:'flex',alignItems:'center',gap:8}}>
            <Icon name="check" size={15}/> Ver gastos pagados ({gastos.filter(g=>g.estado==='pagado').length})
          </summary>
          <table className="tbl">
            <thead><tr><th>Descripción</th><th>Categoría</th><th className="num">Monto</th><th>Fecha</th></tr></thead>
            <tbody>
              {gastos.filter(g=>g.estado==='pagado').slice(0,10).map(g=>(
                <tr key={g.id}><td style={{fontWeight:600}}>{g.desc}</td><td style={{color:'var(--ink-3)',fontSize:13}}>{g.cat}</td><td className="num tnum">{fmtCLP(g.monto)}</td><td style={{fontSize:12.5,color:'var(--ink-3)'}}>{g.fecha.toLocaleDateString('es-CL',{day:'2-digit',month:'short'})}</td></tr>
              ))}
            </tbody>
          </table>
        </details>
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────
   IVA e Impuestos
────────────────────────────────────────────── */
function FinIVA(){
  const m = useFinMetrics();
  const IVA_RATE = 0.19;
  const ventasAfectas = m.ingresosMes;
  const ivaDebito  = Math.round(ventasAfectas * IVA_RATE / (1+IVA_RATE));
  const gastoConRespaldo = Math.round(m.totalGastosMes * 0.72);
  const ivaCredito = Math.round(gastoConRespaldo * IVA_RATE / (1+IVA_RATE));
  const ivaPagar   = Math.max(0, ivaDebito - ivaCredito);
  const [gastosTipo, setGastosTipo] = useState('con');

  return (
    <div className="fade-in">
      {/* Disclaimer */}
      <div style={{padding:'13px 16px',background:'oklch(0.94 0.04 90)',borderRadius:13,marginBottom:18,fontSize:13.5,fontWeight:600,color:'oklch(0.42 0.10 70)',lineHeight:1.55,display:'flex',gap:10,alignItems:'flex-start'}}>
        <Icon name="alert" size={18} style={{flexShrink:0,marginTop:2}}/>
        <div>
          <strong>Cálculo estimado.</strong> Esta sección ayuda a ordenar tu información tributaria. No reemplaza al SII ni a tu contador. <br/>Revisa con tu contador antes de declarar.
        </div>
      </div>

      <div className="grid" style={{gridTemplateColumns:'repeat(auto-fit,minmax(170px,1fr))',marginBottom:18}}>
        <FinCard icon="receipt"  label="Ventas afectas IVA"  value={fmtCLP(ventasAfectas)}  tone="primary" sub="Ventas del mes"/>
        <FinCard icon="trendUp"  label="IVA débito (19%)"    value={fmtCLP(ivaDebito)}      tone="terra"   sub="Lo que debes al SII"/>
        <FinCard icon="tag"      label="IVA crédito"         value={fmtCLP(ivaCredito)}     tone="info"    sub="De gastos con respaldo"/>
        <FinCard icon="calculator" label="IVA estimado a pagar" value={fmtCLP(ivaPagar)}   tone={ivaPagar>200000?'danger':'warn'} sub="Débito menos crédito"/>
      </div>

      {/* IVA breakdown */}
      <div className="grid" style={{gridTemplateColumns:'1fr 1fr',gap:18,marginBottom:18}}>
        <div className="card">
          <div className="card-head"><div className="card-title" style={{flex:1}}>Desglose IVA</div></div>
          <div style={{padding:'16px 22px',display:'flex',flexDirection:'column',gap:10}}>
            {[
              { label:'Ventas brutas',       v:ventasAfectas, muted:false },
              { label:'IVA incluido (19%)',  v:ivaDebito,     muted:true, neg:true },
              { label:'Neto ventas',         v:ventasAfectas-ivaDebito, bold:true },
              { divider:true },
              { label:'Gastos con respaldo', v:gastoConRespaldo, muted:false },
              { label:'IVA crédito',         v:ivaCredito,    muted:true, pos:true },
              { divider:true },
              { label:'IVA estimado a pagar', v:ivaPagar, bold:true, big:true, tone:ivaPagar>200000?'danger':'warn' },
            ].map((r,i)=> r.divider ? <div key={i} className="divider"/> : (
              <div key={i} style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                <span style={{fontSize:13.5,fontWeight:r.bold?800:600,color:r.muted?'var(--ink-3)':'var(--ink)'}}>{r.label}</span>
                <span className="tnum" style={{fontSize:r.big?17:14,fontWeight:r.bold?800:700,color:r.tone==='danger'?'var(--danger)':r.tone==='warn'?'oklch(0.50 0.10 70)':r.pos?'var(--primary-700)':r.neg?'var(--ink-2)':'var(--ink)'}}>{r.neg?'-':r.pos?'+':''}{fmtCLP(r.v)}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="card">
          <div className="card-head"><div className="card-title" style={{flex:1}}>Gastos y respaldo</div></div>
          <div style={{padding:'16px 22px'}}>
            <div style={{display:'flex',gap:7,marginBottom:14}}>
              {[['con','Con respaldo'],['sin','Sin respaldo']].map(([k,l])=>(
                <button key={k} className="btn" style={{flex:1,justifyContent:'center',border:'1px solid '+(gastosTipo===k?'var(--primary)':'var(--line)'),background:gastosTipo===k?'var(--primary-tint)':'var(--surface)',color:gastosTipo===k?'var(--primary-700)':'var(--ink-2)',padding:'8px',fontSize:13,fontWeight:700}} onClick={()=>setGastosTipo(k)}>{l}</button>
              ))}
            </div>
            <div style={{display:'flex',flexDirection:'column',gap:8}}>
              {gastosTipo==='con' ? (
                <>
                  <div style={{padding:'11px 14px',background:'var(--ok-tint)',borderRadius:11,display:'flex',justifyContent:'space-between'}}>
                    <span style={{fontWeight:700,fontSize:14}}>Total con respaldo</span>
                    <span className="tnum" style={{fontWeight:800,fontSize:15,color:'var(--primary-700)'}}>{fmtCLP(gastoConRespaldo)}</span>
                  </div>
                  <div style={{fontSize:13,color:'var(--ink-3)',fontWeight:600,lineHeight:1.5}}>Gastos con boleta, factura o comprobante. Estos pueden dar derecho a IVA crédito.</div>
                  <div style={{padding:'10px 14px',background:'var(--primary-tint)',borderRadius:10,fontSize:13,fontWeight:600,color:'var(--primary-700)'}}>
                    <Icon name="shield" size={14} style={{verticalAlign:'-3px',marginRight:6}}/>IVA crédito estimado: <strong>{fmtCLP(ivaCredito)}</strong>
                  </div>
                </>
              ) : (
                <>
                  <div style={{padding:'11px 14px',background:'var(--danger-tint)',borderRadius:11,display:'flex',justifyContent:'space-between'}}>
                    <span style={{fontWeight:700,fontSize:14}}>Sin respaldo</span>
                    <span className="tnum" style={{fontWeight:800,fontSize:15,color:'var(--danger)'}}>{fmtCLP(m.totalGastosMes-gastoConRespaldo)}</span>
                  </div>
                  <div style={{fontSize:13,color:'var(--ink-3)',fontWeight:600,lineHeight:1.5}}>Gastos sin boleta o comprobante. No pueden usarse como IVA crédito.</div>
                  <div style={{padding:'10px 14px',background:'var(--warn-tint)',borderRadius:10,fontSize:13,fontWeight:600,color:'oklch(0.50 0.10 70)'}}>
                    <Icon name="alert" size={14} style={{verticalAlign:'-3px',marginRight:6}}/>Solicita siempre comprobante a tus proveedores.
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────
   Documentos
────────────────────────────────────────────── */
const SEED_DOCS = [
  { id:'d1', tipo:'Comprobante de venta', ref:'Venta #46210', fecha:new Date(2026,5,6), estado:'emitido',   cliente:'Sofía Reyes',    monto:28500 },
  { id:'d2', tipo:'Factura pendiente',    ref:'Venta #46208', fecha:new Date(2026,5,5), estado:'pendiente', cliente:'Comercial López', monto:142000 },
  { id:'d3', tipo:'Gasto con respaldo',   ref:'Arriendo jun', fecha:new Date(2026,5,1), estado:'revisado',  cliente:'Inmob. Castro',   monto:480000 },
  { id:'d4', tipo:'Gasto sin respaldo',   ref:'Mantención',   fecha:new Date(2026,5,2), estado:'sin_resp',  cliente:'Técnico Gómez',   monto:75000  },
  { id:'d5', tipo:'Comprobante de venta', ref:'Venta #46205', fecha:new Date(2026,5,4), estado:'emitido',   cliente:'Rodrigo Pérez',   monto:67300  },
  { id:'d6', tipo:'Factura pendiente',    ref:'Venta #46201', fecha:new Date(2026,5,3), estado:'pendiente', cliente:'Distribuidora X', monto:215000 },
  { id:'d7', tipo:'Gasto con respaldo',   ref:'Meta Ads',     fecha:new Date(2026,5,1), estado:'revisado',  cliente:'Meta',            monto:85000  },
  { id:'d8', tipo:'Gasto sin respaldo',   ref:'Combustible',  fecha:new Date(2026,5,2), estado:'sin_resp',  cliente:'COPEC',           monto:48000  },
];
function FinDocumentos(){
  const [docs, setDocs] = useState(SEED_DOCS);
  const [tipo, setTipo] = useState('Todos');
  const [est, setEst] = useState('Todos');
  const tipos = ['Todos','Comprobante de venta','Factura pendiente','Gasto con respaldo','Gasto sin respaldo'];
  const estados = ['Todos','pendiente','emitido','revisado','sin_resp'];
  const estadoLabel = { pendiente:'Pendiente', emitido:'Emitido', revisado:'Revisado', sin_resp:'Sin respaldo' };
  const estadoChip = { pendiente:'chip-warn', emitido:'chip-ok', revisado:'chip-neutral', sin_resp:'chip-danger' };

  const list = docs.filter(d=>(tipo==='Todos'||d.tipo===tipo)&&(est==='Todos'||d.estado===est));
  const pendientes = docs.filter(d=>d.estado==='pendiente').length;
  const sinResp = docs.filter(d=>d.estado==='sin_resp').length;

  return (
    <div className="fade-in">
      <div className="grid" style={{gridTemplateColumns:'repeat(auto-fit,minmax(170px,1fr))',marginBottom:18}}>
        <FinCard icon="receipt"   label="Documentos del mes"     value={docs.length}     tone="primary"/>
        <FinCard icon="alert"     label="Facturas pendientes"     value={pendientes}      tone={pendientes>0?'warn':'ok'}   sub={pendientes>0?'Por emitir':undefined}/>
        <FinCard icon="tag"       label="Gastos sin respaldo"     value={sinResp}         tone={sinResp>0?'danger':'ok'}    sub={sinResp>0?'Solicita comprobante':undefined}/>
        <FinCard icon="check"     label="Listos para contador"    value={docs.filter(d=>d.estado==='revisado').length} tone="ok"/>
      </div>

      <div style={{display:'flex',gap:8,marginBottom:14,flexWrap:'wrap'}}>
        <div className="seg" style={{flexShrink:0}}>{estados.slice(0,4).map(e=><button key={e} className={est===e?'on':''} onClick={()=>setEst(e)}>{e==='Todos'?'Todos':estadoLabel[e]}</button>)}</div>
        <select className="select" style={{maxWidth:230,height:40,fontSize:13.5}} value={tipo} onChange={e=>setTipo(e.target.value)}>
          {tipos.map(t=><option key={t}>{t}</option>)}
        </select>
      </div>

      <div className="card">
        <div style={{overflowX:'auto'}}>
          <table className="tbl">
            <thead><tr><th>Tipo</th><th>Referencia</th><th>Empresa / Cliente</th><th className="num">Monto</th><th>Fecha</th><th>Estado</th><th></th></tr></thead>
            <tbody>
              {list.map(d=>(
                <tr key={d.id}>
                  <td style={{fontWeight:700,fontSize:13.5}}>{d.tipo}</td>
                  <td className="muted tnum">{d.ref}</td>
                  <td style={{fontWeight:600}}>{d.cliente}</td>
                  <td className="num tnum" style={{fontWeight:700}}>{fmtCLP(d.monto)}</td>
                  <td style={{fontSize:13,color:'var(--ink-3)',fontWeight:600}}>{d.fecha.toLocaleDateString('es-CL',{day:'2-digit',month:'short'})}</td>
                  <td><span className={'chip '+estadoChip[d.estado]} style={{fontSize:12}}>{estadoLabel[d.estado]}</span></td>
                  <td className="num">
                    <button className="btn btn-ghost" style={{padding:'5px 10px',fontSize:12}} onClick={()=>{ setDocs(ds=>ds.map(x=>x.id===d.id?{...x,estado:'revisado'}:x)); }}>
                      {d.estado==='revisado'?<Icon name="check" size={13}/>:'Revisar'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {list.length===0 && <EmptyState icon="receipt" title="Sin documentos" text="No hay documentos para el filtro seleccionado."/>}
        </div>
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────
   Exportar para Contador
────────────────────────────────────────────── */
function FinExportar(){
  const m = useFinMetrics();
  const { gastos, nomina, marketing } = useFinanzas();
  const { toast } = useStore();
  const [period,setPeriod]=useState('mes');
  const [selected,setSelected]=useState(new Set(['ventas','gastos','resultados','cxc','iva']));
  const toggle=(k)=>setSelected(s=>{ const n=new Set(s); n.has(k)?n.delete(k):n.add(k); return n; });

  const exportItems = [
    { id:'ventas',      icon:'cash',       label:'Ventas del mes',            desc:'Todas las ventas con método de pago y totales', monto:m.ingresosMes },
    { id:'gastos',      icon:'tag',        label:'Gastos del mes',            desc:'Gastos por categoría y estado de pago', monto:m.totalGastosMes },
    { id:'resultados',  icon:'receipt',    label:'Estado de resultados',      desc:'Ingresos, costos, gastos y utilidad estimada', monto:null },
    { id:'cxc',         icon:'coins',      label:'Cuentas por cobrar',        desc:'Ventas a crédito y saldos pendientes', monto:null },
    { id:'iva',         icon:'calculator', label:'IVA estimado',              desc:'Débito, crédito y estimación a pagar', monto:null },
    { id:'nomina',      icon:'nomina',     label:'Nómina interna',            desc:'Pagos al personal del mes', monto:nomina.reduce((a,n)=>a+n.monto,0) },
    { id:'inventario',  icon:'box',        label:'Inventario valorizado',     desc:'Stock actual × costo por producto', monto:m.valInventario },
    { id:'marketing',   icon:'megaphone',  label:'Inversión en marketing',    desc:'Campañas, montos y resultados', monto:marketing.reduce((a,mk)=>a+mk.monto,0) },
  ];

  const mockExport = (fmt)=>{
    const items = exportItems.filter(e=>selected.has(e.id)).map(e=>e.label).join(', ');
    toast(`Generando ${fmt}: ${items}`);
  };

  return (
    <div className="fade-in" style={{maxWidth:800}}>
      <div style={{padding:'14px 18px',background:'var(--primary-tint)',borderRadius:14,marginBottom:22,fontSize:14,fontWeight:600,color:'var(--primary-700)',lineHeight:1.55}}>
        <Icon name="download" size={16} style={{verticalAlign:'-3px',marginRight:8}}/>
        <strong>Genera un resumen ordenado para enviar a tu contador.</strong> Evita mandar pantallazos sueltos, boletas perdidas o planillas incompletas.
      </div>

      <div style={{display:'flex',gap:12,marginBottom:20,alignItems:'center',flexWrap:'wrap'}}>
        <span style={{fontWeight:700,fontSize:14}}>Periodo:</span>
        <div className="seg">{[['mes','Este mes'],['anterior','Mes anterior'],['trimestre','Trimestre']].map(([k,l])=><button key={k} className={period===k?'on':''} onClick={()=>setPeriod(k)}>{l}</button>)}</div>
      </div>

      <div style={{fontWeight:800,fontSize:15,marginBottom:12}}>Selecciona qué incluir</div>
      <div className="grid" style={{gridTemplateColumns:'repeat(auto-fill,minmax(260px,1fr))',gap:12,marginBottom:24}}>
        {exportItems.map(e=>{
          const on=selected.has(e.id);
          return (
            <button key={e.id} onClick={()=>toggle(e.id)} style={{display:'flex',alignItems:'center',gap:13,padding:'13px 16px',borderRadius:13,border:`2px solid ${on?'var(--primary)':'var(--line)'}`,background:on?'var(--primary-tint)':'var(--surface)',cursor:'pointer',textAlign:'left',fontFamily:'inherit',transition:'.14s'}}>
              <span style={{width:38,height:38,borderRadius:11,background:on?'var(--primary)':'var(--surface-3)',color:on?'#fff':'var(--ink-3)',display:'grid',placeItems:'center',flexShrink:0,transition:'.14s'}}>
                <Icon name={e.icon} size={18}/>
              </span>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontWeight:800,fontSize:13.5,color:on?'var(--primary-700)':'var(--ink)'}}>{e.label}</div>
                <div style={{fontSize:12,color:'var(--ink-3)',fontWeight:600,marginTop:2}}>{e.desc}</div>
                {e.monto!=null && <div className="tnum" style={{fontSize:12.5,fontWeight:800,color:on?'var(--primary-700)':'var(--ink-2)',marginTop:3}}>{fmtCLP(e.monto)}</div>}
              </div>
              <div style={{width:20,height:20,borderRadius:6,border:`2px solid ${on?'var(--primary)':'var(--line-2)'}`,background:on?'var(--primary)':'var(--surface)',display:'grid',placeItems:'center',flexShrink:0}}>
                {on && <Icon name="check" size={12} style={{color:'#fff'}}/>}
              </div>
            </button>
          );
        })}
      </div>

      <div style={{display:'flex',gap:10,flexWrap:'wrap'}}>
        <button className="btn btn-primary btn-lg" onClick={()=>mockExport('Excel (.xlsx)')}><Icon name="download" size={18}/>Descargar Excel</button>
        <button className="btn btn-ghost btn-lg" onClick={()=>mockExport('CSV')}><Icon name="download" size={16}/>Descargar CSV</button>
        <button className="btn btn-ghost btn-lg" onClick={()=>mockExport('PDF resumen')}><Icon name="receipt" size={16}/>PDF resumen</button>
      </div>
      <div style={{marginTop:12,fontSize:12.5,color:'var(--ink-3)',fontWeight:600,display:'flex',gap:6,alignItems:'center'}}>
        <Icon name="shield" size={13}/>Esta sección es una ayuda de orden interno. No reemplaza a tu contador.
      </div>
    </div>
  );
}

Object.assign(window, { FinCxC, FinCxP, FinIVA, FinDocumentos, FinExportar });
