/* ---------- Reportes ---------- */

/* ── Horizontal metric comparison bar ── */
function CanalBar({ labelA, labelB, valA, valB, colorA, colorB }){
  const total = valA + valB || 1;
  const pctA = Math.round(valA/total*100);
  const pctB = 100-pctA;
  return (
    <div style={{display:'flex', flexDirection:'column', gap:6}}>
      <div style={{display:'flex', justifyContent:'space-between', fontSize:12.5, fontWeight:700}}>
        <span style={{display:'flex', alignItems:'center', gap:6}}><span style={{width:9,height:9,borderRadius:3,background:colorA}}></span>{labelA} {pctA}%</span>
        <span style={{display:'flex', alignItems:'center', gap:6}}>{pctB}% {labelB}<span style={{width:9,height:9,borderRadius:3,background:colorB}}></span></span>
      </div>
      <div style={{height:12, borderRadius:6, overflow:'hidden', display:'flex', background:'var(--surface-3)'}}>
        <div style={{width:pctA+'%', background:colorA, transition:'width .6s cubic-bezier(.2,.8,.3,1)'}}></div>
        <div style={{width:pctB+'%', background:colorB, transition:'width .6s cubic-bezier(.2,.8,.3,1)'}}></div>
      </div>
      <div style={{display:'flex', justifyContent:'space-between', fontSize:12.5, fontWeight:600, color:'var(--ink-2)'}}>
        <span className="tnum">{fmtCLP(valA)}</span>
        <span className="tnum">{fmtCLP(valB)}</span>
      </div>
    </div>
  );
}

/* ── Canal card ── */
function CanalCard({ tipo, data, color, icon }){
  return (
    <div className="card" style={{border:`2px solid ${color}20`, overflow:'hidden'}}>
      <div className="card-head" style={{background:`${color}12`}}>
        <span style={{width:36,height:36,borderRadius:10,background:color,color:'#fff',display:'grid',placeItems:'center',flexShrink:0}}>
          <Icon name={icon} size={18}/>
        </span>
        <div style={{flex:1}}>
          <div className="card-title">{tipo==='local'?'Venta presencial':'Despacho'}</div>
          <div className="card-sub">{data.count} {data.count===1?'boleta':'boletas'} · ticket {fmtCLP(data.ticket)}</div>
        </div>
        <span className="chip" style={{background:`${color}18`,color,fontSize:12,fontWeight:800}}>{tipo==='local'?'Local':'Delivery'}</span>
      </div>
      <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:1, background:'var(--line)'}}>
        {[
          {l:'Ingresos',v:fmtCLP(data.total),big:true},
          {l:'Ganancia',v:fmtCLP(data.profit),big:true,accent:color},
          {l:'Costos',v:fmtCLP(data.cost)},
          {l:'Margen',v:fmtPct(data.margin)},
        ].map((x,i)=>(
          <div key={i} style={{padding:'14px 16px', background:'var(--surface)'}}>
            <div className="tnum" style={{fontSize:x.big?20:15,fontWeight:800,color:x.accent||'var(--ink)'}}>{x.v}</div>
            <div style={{fontSize:12,color:'var(--ink-3)',fontWeight:700,marginTop:3}}>{x.l}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Reportes(){
  const m = useMetrics();
  const { settings, sales, products } = useStore();
  const [range,setRange]=useState('mes');
  const [canal,setCanal]=useState('todos'); // 'todos' | 'local' | 'despacho'
  const [customFrom,setCustomFrom]=useState('');
  const [customTo,setCustomTo]=useState('');
  const ranges=[['hoy','Hoy'],['semana','Esta semana'],['mes','Este mes'],['custom','Personalizado']];
  const factor = range==='hoy'?0.04: range==='semana'?0.25: range==='custom'?1.4:1;

  // Canal-filtered metrics
  const cData = range==='hoy' ? m.canalHoy : m.canalMes;
  const local = cData.local;
  const despacho = cData.despacho;
  const totalUnificado = {
    total:(local.total+despacho.total)*factor,
    cost:(local.cost+despacho.cost)*factor,
    profit:(local.profit+despacho.profit)*factor,
    count:local.count+despacho.count,
    margin: (local.total+despacho.total)>0?(local.profit+despacho.profit)/(local.total+despacho.total)*100:0,
    ticket:(local.count+despacho.count)>0?(local.total+despacho.total)/(local.count+despacho.count):0,
  };
  const localF = {total:local.total*factor,cost:local.cost*factor,profit:local.profit*factor,count:local.count,margin:local.margin,ticket:local.ticket};
  const despF = {total:despacho.total*factor,cost:despacho.cost*factor,profit:despacho.profit*factor,count:despacho.count,margin:despacho.margin,ticket:despacho.ticket};

  // Active view data
  const activeLocal = canal==='despacho'?{total:0,cost:0,profit:0}:localF;
  const activeDesp  = canal==='local'?{total:0,cost:0,profit:0}:despF;
  const rev = (activeLocal.total+activeDesp.total);
  const cost= (activeLocal.cost+activeDesp.cost);
  const profit=(activeLocal.profit+activeDesp.profit);
  const payColors={'Efectivo':'var(--primary)','Tarjeta':'var(--terra)','Transferencia':'var(--info)'};
  const payTotal=Object.values(m.pay).reduce((a,b)=>a+b,0)||1;

  return (
    <div className="fade-in">
      <PageHeader title="Reportes" sub="Entiende cómo va tu negocio en simple">
        <button className="btn btn-ghost" onClick={()=>exportVentasCSV(sales,'reporte_ventas')}><Icon name="download" size={16}/>Exportar ventas CSV</button>
        <button className="btn btn-ghost" onClick={()=>exportProductosCSV(products)}><Icon name="download" size={16}/>Productos CSV</button>
      </PageHeader>

      {/* Period filter */}
      <div style={{display:'flex', alignItems:'center', gap:12, marginBottom:18, flexWrap:'wrap'}}>
        <div style={{display:'flex', alignItems:'center', gap:8, flexWrap:'wrap'}}>
          <div className="seg">
            {ranges.map(([k,l])=><button key={k} className={range===k?'on':''} onClick={()=>setRange(k)}>{l}</button>)}
          </div>
          {range==='custom' && (
            <div style={{display:'flex', alignItems:'center', gap:8, background:'var(--surface)', border:'1px solid var(--line-2)', borderRadius:11, padding:'6px 12px'}}>
              <Icon name="clock" size={14} style={{color:'var(--ink-3)'}}/>
              <input type="date" value={customFrom} onChange={e=>setCustomFrom(e.target.value)}
                style={{border:'none', outline:'none', background:'none', fontSize:13.5, fontWeight:700, color:'var(--ink)', fontFamily:'inherit', cursor:'pointer'}}/>
              <span style={{color:'var(--ink-3)', fontWeight:700, fontSize:13}}>→</span>
              <input type="date" value={customTo} onChange={e=>setCustomTo(e.target.value)}
                style={{border:'none', outline:'none', background:'none', fontSize:13.5, fontWeight:700, color:'var(--ink)', fontFamily:'inherit', cursor:'pointer'}}/>
              {customFrom && customTo && (
                <span className="chip chip-ok" style={{fontSize:11.5, padding:'2px 8px', marginLeft:4}}>
                  {Math.max(1,Math.round((new Date(customTo)-new Date(customFrom))/(1000*60*60*24)))+' días'}
                </span>
              )}
            </div>
          )}
        </div>
        <div className="seg">
          <button className={canal==='todos'?'on':''} onClick={()=>setCanal('todos')}>Todos los canales</button>
          <button className={canal==='local'?'on':''} onClick={()=>setCanal('local')}>Local</button>
          <button className={canal==='despacho'?'on':''} onClick={()=>setCanal('despacho')}>Despacho</button>
        </div>
      </div>

      {/* ── CANALES DE VENTA — sección principal ── */}
      {canal==='todos' && (
        <div className="card" style={{marginBottom:18}}>
          <div className="card-head">
            <span style={{width:34,height:34,borderRadius:10,background:'var(--primary)',color:'#fff',display:'grid',placeItems:'center'}}>
              <Icon name="store" size={17}/>
            </span>
            <div style={{flex:1}}>
              <div className="card-title">Canales de venta — comparación</div>
              <div className="card-sub">Venta presencial vs. despacho como unidades de negocio separadas</div>
            </div>
          </div>
          <div className="card-pad" style={{display:'flex', flexDirection:'column', gap:20}}>
            {/* Side by side canal cards */}
            <div className="grid" style={{gridTemplateColumns:'1fr 1fr', gap:14}}>
              <CanalCard tipo="local" data={localF} color="var(--primary)" icon="store"/>
              <CanalCard tipo="despacho" data={despF} color="var(--terra)" icon="truck"/>
            </div>
            {/* Comparison bars */}
            <div style={{display:'flex', flexDirection:'column', gap:14, padding:'16px 18px', background:'var(--surface-3)', borderRadius:13}}>
              <div style={{fontWeight:800, fontSize:14, marginBottom:2}}>Distribución por canal</div>
              {[
                {l:'Ingresos', a:localF.total, b:despF.total},
                {l:'Ganancia', a:localF.profit, b:despF.profit},
                {l:'Costos',   a:localF.cost,   b:despF.cost},
              ].map((row,i)=>(
                <div key={i}>
                  <div style={{fontSize:12,fontWeight:700,color:'var(--ink-3)',marginBottom:6}}>{row.l}</div>
                  <CanalBar labelA="Local" labelB="Despacho" valA={row.a} valB={row.b} colorA="var(--primary)" colorB="var(--terra)"/>
                </div>
              ))}
            </div>
            {/* KPI comparison table */}
            <div style={{overflowX:'auto'}}>
              <table className="tbl">
                <thead><tr>
                  <th>Indicador</th>
                  <th className="num">🏪 Local</th>
                  <th className="num">🚚 Despacho</th>
                  <th className="num">Total unificado</th>
                </tr></thead>
                <tbody>
                  {[
                    {k:'Ingresos', local:fmtCLP(localF.total), desp:fmtCLP(despF.total), tot:fmtCLP(totalUnificado.total)},
                    {k:'Ganancia', local:fmtCLP(localF.profit), desp:fmtCLP(despF.profit), tot:fmtCLP(totalUnificado.profit)},
                    {k:'Costos', local:fmtCLP(localF.cost), desp:fmtCLP(despF.cost), tot:fmtCLP(totalUnificado.cost)},
                    {k:'Margen %', local:fmtPct(localF.margin), desp:fmtPct(despF.margin), tot:fmtPct(totalUnificado.margin)},
                    {k:'Boletas', local:localF.count+'', desp:despF.count+'', tot:totalUnificado.count+''},
                    {k:'Ticket promedio', local:fmtCLP(localF.ticket), desp:fmtCLP(despF.ticket), tot:fmtCLP(totalUnificado.ticket)},
                  ].map((row,i)=>(
                    <tr key={i}>
                      <td style={{fontWeight:700}}>{row.k}</td>
                      <td className="num tnum" style={{color:'var(--primary-700)',fontWeight:700}}>{row.local}</td>
                      <td className="num tnum" style={{color:'var(--terra-700)',fontWeight:700}}>{row.desp}</td>
                      <td className="num tnum" style={{fontWeight:800}}>{row.tot}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Canal individual header when filtered */}
      {canal!=='todos' && (
        <div className="card" style={{marginBottom:18, border:`2px solid ${canal==='local'?'var(--primary)':'var(--terra)'}20`}}>
          <div className="card-pad" style={{display:'flex', alignItems:'center', gap:16}}>
            <span style={{width:44,height:44,borderRadius:13,background:canal==='local'?'var(--primary)':'var(--terra)',color:'#fff',display:'grid',placeItems:'center',flexShrink:0}}>
              <Icon name={canal==='local'?'store':'truck'} size={22}/>
            </span>
            <div style={{flex:1}}>
              <div style={{fontWeight:800,fontSize:16}}>{canal==='local'?'Venta presencial':'Despacho'}</div>
              <div style={{fontSize:13,color:'var(--ink-3)',fontWeight:600}}>Mostrando solo {canal==='local'?'ventas del local':'ventas con despacho'}</div>
            </div>
            <button className="btn btn-ghost" onClick={()=>setCanal('todos')}>Ver todos los canales</button>
          </div>
        </div>
      )}

      {/* Headline numbers */}
      <div className="grid" style={{gridTemplateColumns:'repeat(auto-fit,minmax(190px,1fr))', marginBottom:18}}>
        <Metric icon="cash" label="Cuánto vendiste" value={fmtCLP(rev)} tone="primary"/>
        <Metric icon="tag" label="Cuánto te costó" value={fmtCLP(cost)} tone="info"/>
        <Metric icon="trendUp" label="Cuánto ganaste" value={fmtCLP(profit)} tone="terra"/>
        <Metric icon="percent" label="Margen general" value={fmtPct(rev?profit/rev*100:0)} tone="primary"/>
      </div>

      <div className="grid" style={{gridTemplateColumns:'1fr 1fr', alignItems:'start'}}>
        {/* Ventas por categoría */}
        <div className="card">
          <div className="card-head"><div style={{flex:1}}><div className="card-title">Ventas y ganancia por categoría</div><div className="card-sub">Qué categoría conviene potenciar</div></div></div>
          <div style={{overflowX:'auto'}}>
            <table className="tbl">
              <thead><tr><th>Categoría</th><th className="num">Vendido</th><th className="num">Ganancia</th><th className="num">Margen</th><th className="num">Participación</th></tr></thead>
              <tbody>
                {m.cats.map(c=>(
                  <tr key={c.cat}>
                    <td style={{fontWeight:700}}><span style={{display:'flex',alignItems:'center',gap:8}}><CatDot cat={c.cat}/>{c.cat}</span></td>
                    <td className="num tnum">{fmtCLP(c.revenue*factor)}</td>
                    <td className="num tnum" style={{fontWeight:700,color:'var(--primary-700)'}}>{fmtCLP(c.profit*factor)}</td>
                    <td className="num"><MarginBadge pct={c.marginPct} minMargin={settings.minMargin}/></td>
                    <td className="num tnum muted">{fmtPct(c.share)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Ingresos vs costos */}
        <div className="card">
          <div className="card-head"><div style={{flex:1}}><div className="card-title">Ingresos vs. costos</div><div className="card-sub">Comparación por categoría</div></div></div>
          <div className="card-pad">
            <ColumnChart height={190}
              groups={m.cats.slice(0,5).map(c=>({label:c.cat.split(' ')[0].slice(0,5), revenue:c.revenue*factor, cost:c.cost*factor}))}
              series={[ {key:'revenue', label:'Ingresos', color:'var(--primary)'}, {key:'cost', label:'Costos', color:'var(--terra)'} ]}/>
          </div>
        </div>
      </div>

      <div className="grid" style={{gridTemplateColumns:'1fr 1fr', marginTop:18, alignItems:'start'}}>
        <div className="card">
          <div className="card-head"><span style={{width:32,height:32,borderRadius:9,background:'var(--primary-tint)',color:'var(--primary-700)',display:'grid',placeItems:'center'}}><Icon name="star" size={16}/></span><div style={{flex:1}}><div className="card-title">Mejor margen</div><div className="card-sub">Los que más te dejan por venta</div></div></div>
          <div style={{padding:'6px 0'}}>
            {m.bestMargin.map((p,i)=>(
              <div key={p.id} style={{display:'flex',alignItems:'center',gap:12,padding:'10px 22px'}}>
                <span className="tnum" style={{fontWeight:800,color:'var(--ink-3)',width:18}}>{i+1}</span>
                <div style={{flex:1}}><div style={{fontWeight:700,fontSize:13.5}}>{p.name}</div><div className="tnum" style={{fontSize:12,color:'var(--ink-3)',fontWeight:600}}>Ganas {fmtCLP(p.margin)} por venta</div></div>
                <span className="chip chip-ok tnum">{fmtPct(p.marginPct)}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="card">
          <div className="card-head"><span style={{width:32,height:32,borderRadius:9,background:'var(--danger-tint)',color:'var(--danger)',display:'grid',placeItems:'center'}}><Icon name="trendDown" size={16}/></span><div style={{flex:1}}><div className="card-title">Menor margen</div><div className="card-sub">Revisa precios o costos aquí</div></div></div>
          <div style={{padding:'6px 0'}}>
            {m.worstMargin.map((p,i)=>(
              <div key={p.id} style={{display:'flex',alignItems:'center',gap:12,padding:'10px 22px'}}>
                <span className="tnum" style={{fontWeight:800,color:'var(--ink-3)',width:18}}>{i+1}</span>
                <div style={{flex:1}}><div style={{fontWeight:700,fontSize:13.5}}>{p.name}</div><div className="tnum" style={{fontSize:12,color:'var(--ink-3)',fontWeight:600}}>Ganas {fmtCLP(p.margin)} por venta</div></div>
                <MarginBadge pct={p.marginPct} minMargin={settings.minMargin}/>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid" style={{gridTemplateColumns:'1.4fr 1fr', marginTop:18, alignItems:'start'}}>
        <div className="card">
          <div className="card-head"><div style={{flex:1}}><div className="card-title">Productos más vendidos</div><div className="card-sub">Lo que más sale del local</div></div></div>
          <div className="card-pad"><BarList fmt={fmtNum} rows={m.topProducts.map(p=>({label:p.name, value:p.sold, color:catColor(p.cat)}))}/></div>
        </div>
        <div className="card">
          <div className="card-head"><div style={{flex:1}}><div className="card-title">Métodos de pago</div><div className="card-sub">Cómo te pagan</div></div></div>
          <div className="card-pad" style={{display:'flex',alignItems:'center',gap:18}}>
            <Donut size={130} thickness={20} data={Object.entries(m.pay).map(([k,v])=>({value:v,color:payColors[k]}))} centerValue={Object.keys(m.pay).length+''} centerLabel="medios"/>
            <div style={{flex:1,display:'flex',flexDirection:'column',gap:10}}>
              {Object.entries(m.pay).sort((a,b)=>b[1]-a[1]).map(([k,v])=>(
                <div key={k} style={{display:'flex',justifyContent:'space-between',fontSize:13.5,fontWeight:700}}>
                  <span style={{display:'flex',alignItems:'center',gap:7}}><span style={{width:9,height:9,borderRadius:3,background:payColors[k]}}></span>{k}</span>
                  <span className="tnum">{Math.round(v/payTotal*100)}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
window.Reportes = Reportes;
