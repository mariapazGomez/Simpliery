/* ---------- Finanzas: main shell + Resumen + Flujo de caja ---------- */

/* ── Cuentas por cobrar card (crédito pendiente) ── */
function CuentasPorCobrarCard(){
  const m = useMetrics();
  const deuda = m.totalDeuda||0;
  const nDeudores = m.clientesDeudores||0;
  const tone = deuda>500000?'danger': deuda>0?'warn':'ok';
  const tones={ok:{bg:'var(--ok-tint)',fg:'var(--primary-700)'},warn:{bg:'var(--warn-tint)',fg:'oklch(0.50 0.10 70)'},danger:{bg:'var(--danger-tint)',fg:'var(--danger)'}};
  const t=tones[tone];
  return (
    <div className="card card-pad" style={{display:'flex',flexDirection:'column',gap:12,border: deuda>0?'1px solid var(--warn)20':'1px solid var(--line)'}}>
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
        <span style={{width:38,height:38,borderRadius:11,background:t.bg,color:t.fg,display:'grid',placeItems:'center'}}><Icon name="receipt" size={19}/></span>
        {deuda>0 && <span className="chip" style={{background:t.bg,color:t.fg,fontSize:11.5,fontWeight:800}}>{nDeudores} cliente{nDeudores!==1?'s':''}</span>}
      </div>
      <div>
        <div className="tnum" style={{fontSize:24,fontWeight:800,letterSpacing:'-0.025em',lineHeight:1.1,color:deuda>0?t.fg:'var(--ink)'}}>{deuda>0?fmtCLP(deuda):'$0'}</div>
        <div style={{fontSize:13,color:'var(--ink-2)',fontWeight:600,marginTop:3}}>Cuentas por cobrar</div>
        <div style={{fontSize:12,color:'var(--ink-3)',fontWeight:600,marginTop:5}}>{deuda>0?`${nDeudores} cliente${nDeudores!==1?'s':''} con cr\u00e9dito pendiente`:'Sin deudas pendientes \u2014 \u00a1al d\u00eda!'}</div>
      </div>
    </div>
  );
}

/* ── Small reusable fin components ──────────── */
function FinCard({ icon, label, value, sub, tone='primary', alert }){
  const tones={ primary:{bg:'var(--primary-tint)',fg:'var(--primary-700)'}, terra:{bg:'var(--terra-tint)',fg:'var(--terra-700)'}, warn:{bg:'var(--warn-tint)',fg:'oklch(0.50 0.10 70)'}, danger:{bg:'var(--danger-tint)',fg:'var(--danger)'}, info:{bg:'var(--info-tint)',fg:'var(--info)'}, ok:{bg:'var(--ok-tint)',fg:'var(--primary-700)'} };
  const t=tones[tone]||tones.primary;
  return (
    <div className="card card-pad" style={{display:'flex',flexDirection:'column',gap:12}}>
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
        <span style={{width:38,height:38,borderRadius:11,background:t.bg,color:t.fg,display:'grid',placeItems:'center'}}><Icon name={icon} size={19}/></span>
        {alert && <span className="chip chip-warn" style={{fontSize:11.5}}><Icon name="alert" size={12}/>{alert}</span>}
      </div>
      <div>
        <div className="tnum" style={{fontSize:24,fontWeight:800,letterSpacing:'-0.025em',lineHeight:1.1}}>{value}</div>
        <div style={{fontSize:13,color:'var(--ink-2)',fontWeight:600,marginTop:3}}>{label}</div>
        {sub && <div style={{fontSize:12,color:'var(--ink-3)',fontWeight:600,marginTop:5}}>{sub}</div>}
      </div>
    </div>
  );
}

function AlertaBanner({ tone='warn', icon='alert', children, action }){
  const c={warn:{bg:'var(--warn-tint)',fg:'oklch(0.50 0.10 70)',border:'oklch(0.90 0.06 75)'}, danger:{bg:'var(--danger-tint)',fg:'var(--danger)',border:'var(--danger-tint)'}, primary:{bg:'var(--primary-tint)',fg:'var(--primary-700)',border:'var(--primary-tint2)'}, ok:{bg:'var(--ok-tint)',fg:'var(--primary-700)',border:'var(--primary-tint2)'}}[tone]||{};
  return (
    <div style={{display:'flex',alignItems:'center',gap:12,padding:'12px 16px',background:c.bg,borderRadius:12,border:`1px solid ${c.border}`}}>
      <Icon name={icon} size={17} style={{color:c.fg,flexShrink:0}}/>
      <div style={{flex:1,fontSize:13.5,fontWeight:600,color:'var(--ink)'}}>{children}</div>
      {action && <button className="btn btn-ghost" style={{fontSize:12.5,padding:'5px 11px',flexShrink:0}} onClick={action.fn}>{action.label}</button>}
    </div>
  );
}

function SectionHeader({ label }){
  return <div style={{fontSize:11,fontWeight:800,letterSpacing:'0.08em',textTransform:'uppercase',color:'var(--ink-3)',margin:'22px 0 10px'}}>{label}</div>;
}

/* ── Resumen tab ─────────────────────────────── */
function FinResumen({ setTab }){
  const m = useFinMetrics();
  const { metas, creditos } = useFinanzas();
  const mbi = useMetrics();
  const meta = metas[0];
  const metaAvance = meta ? Math.min(meta.saldoActual/meta.monto*100,100) : 0;
  const pctNomina = m.ingresosMes ? (m.nominaMes/m.ingresosMes*100) : 0;

  // Balance data
  const totalDeudaExt = (creditos||[]).filter(c=>c.estado!=='pagado').reduce((a,c)=>a+c.saldo,0);
  const cuotasMes = (creditos||[]).filter(c=>c.estado!=='pagado').reduce((a,c)=>a+c.cuotaMensual,0);
  const caja = Math.max(0, m.utilidadEstimada + 200000);
  const totalActivos = caja + m.valInventario + (mbi.totalDeuda||0);
  const totalPasivos = totalDeudaExt + m.gastosPendientes;
  const patrimonio = totalActivos - totalPasivos;
  const ratioDeuda = totalActivos>0 ? totalPasivos/totalActivos*100 : 0;
  const cuotasVsGanancia = m.gananciaMes>0 ? cuotasMes/m.gananciaMes*100 : 0;
  const cobertura = cuotasMes>0 ? m.gananciaMes/cuotasMes : 99;

  // Semáforo: 5 health indicators
  const indicadores = [
    { label:'Margen bruto',         val:fmtPct(m.margenProm),     tone:m.margenProm>25?'ok':m.margenProm>15?'warn':'danger', desc:m.margenProm>25?'Saludable':'Revisar precios o costos' },
    { label:'Caja fin de mes',      val:fmtCLP(m.cajaProyectada), tone:m.cajaProyectada>500000?'ok':m.cajaProyectada>200000?'warn':'danger', desc:m.cajaProyectada>300000?'Nivel cómodo':'Cuidado con gastos' },
    { label:'Gastos / ventas',      val:fmtPct(m.totalGastosMes/Math.max(m.ingresosMes,1)*100), tone:(m.totalGastosMes/Math.max(m.ingresosMes,1))<0.5?'ok':(m.totalGastosMes/Math.max(m.ingresosMes,1))<0.7?'warn':'danger', desc:'% de ventas que se va en gastos' },
    { label:'Cuotas / ganancia',    val:fmtPct(cuotasVsGanancia), tone:cuotasVsGanancia<30?'ok':cuotasVsGanancia<50?'warn':'danger', desc:cuotasVsGanancia<30?'Nivel sano':'Deuda alta vs ganancias' },
    { label:'Cobertura deuda',      val:cuotasMes>0?cobertura.toFixed(1)+'x':'—',        tone:cobertura>=2?'ok':cobertura>=1?'warn':'danger', desc:cobertura>=2?'Tu ganancia cubre bien las cuotas':'Riesgo de flujo ajustado' },
  ];
  const toneColor = { ok:'var(--ok)', warn:'var(--warn)', danger:'var(--danger)' };
  const toneBg    = { ok:'var(--ok-tint)', warn:'var(--warn-tint)', danger:'var(--danger-tint)' };
  const toneFg    = { ok:'var(--primary-700)', warn:'oklch(0.50 0.10 70)', danger:'var(--danger)' };

  const decisiones = [
    m.cajaProyectada < 300000 && { tone:'danger', icon:'alert', text:'Cuidado: tu caja proyectada es ajustada. Revisa gastos antes de hacer compras.', action:{label:'Ver flujo',fn:()=>setTab('flujo')} },
    cuotasVsGanancia > 50 && { tone:'danger', icon:'building', text:`Tus cuotas de deuda consumen el ${Math.round(cuotasVsGanancia)}% de tu ganancia. Considera renegociar plazos.`, action:{label:'Ver deudas',fn:()=>setTab('deudas')} },
    m.gastosPendientes > 100000 && { tone:'warn', icon:'coins', text:`Tienes ${fmtCLP(m.gastosPendientes)} en gastos pendientes de pago.`, action:{label:'Ver gastos',fn:()=>setTab('cxp')} },
    pctNomina > 30 && { tone:'warn', icon:'nomina', text:`Tu nómina representa el ${Math.round(pctNomina)}% de tus ventas. Está sobre lo recomendado.` },
    m.proximos7 > 0 && { tone:'primary', icon:'clientes', text:`${m.proximos7} clientes próximos a recomprar. Buen momento para activarlos.` },
    m.prodBajaRotacion > 5 && { tone:'warn', icon:'box', text:`${m.prodBajaRotacion} productos con baja rotación inmovilizan ${fmtCLP(m.valInventario*0.3)} en caja.` },
    { tone:'ok', icon:'trendUp', text:`Margen promedio ${fmtPct(m.margenProm)} — cada ${fmtCLP(1000)} en ventas genera ${fmtCLP(Math.round(m.margenProm*10))} de ganancia.` },
  ].filter(Boolean);

  return (
    <div>
      {/* ── Semáforo financiero ── */}
      <SectionHeader label="Salud financiera del negocio"/>
      <div className="card" style={{marginBottom:18,overflow:'hidden'}}>
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(150px,1fr))'}}>
          {indicadores.map((ind,i)=>(
            <div key={i} style={{padding:'16px 18px',borderRight:'1px solid var(--line)',borderBottom:'1px solid var(--line)'}}>
              <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:8}}>
                <span style={{width:10,height:10,borderRadius:'50%',background:toneColor[ind.tone],flexShrink:0}}></span>
                <span style={{fontSize:12,fontWeight:700,color:'var(--ink-3)',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{ind.label}</span>
              </div>
              <div className="tnum" style={{fontSize:19,fontWeight:800,color:toneFg[ind.tone]}}>{ind.val}</div>
              <div style={{fontSize:11.5,color:'var(--ink-3)',fontWeight:600,marginTop:3,lineHeight:1.3}}>{ind.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── KPI Cards ── */}
      <SectionHeader label="Este mes"/>
      <div className="grid" style={{gridTemplateColumns:'repeat(auto-fit,minmax(170px,1fr))',marginBottom:18}}>
        <FinCard icon="cash"    label="Ventas del mes"       value={fmtCLP(m.ingresosMes)}      tone="primary" sub={`${fmtCLP(m.ventasPorDia)} / día prom.`}/>
        <FinCard icon="trendUp" label="Ganancia estimada"    value={fmtCLP(m.gananciaMes)}      tone="terra"   sub={`Margen ${fmtPct(m.margenProm)}`}/>
        <FinCard icon="tag"     label="Gastos del mes"       value={fmtCLP(m.totalGastosMes)}   tone="warn"    sub={`Fijos ${fmtCLP(m.gastosFijos)}`}/>
        <FinCard icon="wallet"  label="Utilidad estimada"    value={fmtCLP(m.utilidadEstimada)} tone={m.utilidadEstimada>0?'ok':'danger'} sub="Ganancia menos gastos"/>
        <FinCard icon="coins"   label="Caja fin de mes"      value={fmtCLP(m.cajaProyectada)}   tone={m.cajaProyectada>500000?'primary':'danger'} alert={m.cajaProyectada<300000?'Ajustada':undefined}/>
        <CuentasPorCobrarCard/>
      </div>

      {/* ── Balance snapshot + ratios ── */}
      <SectionHeader label="Tu posición financiera"/>
      <div className="grid" style={{gridTemplateColumns:'1fr 1fr',gap:18,marginBottom:18}}>
        {/* Balance donut */}
        <div className="card">
          <div className="card-head"><span style={{width:32,height:32,borderRadius:9,background:'var(--primary-tint)',color:'var(--primary-700)',display:'grid',placeItems:'center'}}><Icon name="balance" size={16}/></span><div style={{flex:1}}><div className="card-title">Balance simplificado</div><div className="card-sub">Activos vs Pasivos vs Patrimonio</div></div><button className="btn btn-ghost" style={{fontSize:12,padding:'5px 10px'}} onClick={()=>setTab('balance')}>Ver detalle</button></div>
          <div className="card-pad" style={{display:'flex',alignItems:'center',gap:20}}>
            <Donut size={140} thickness={22}
              data={[
                {value:Math.max(totalActivos,1), color:'var(--primary)'},
                {value:Math.max(totalPasivos,1), color:'var(--danger)'},
              ]}
              centerValue={fmtCLP(patrimonio)} centerLabel="Patrimonio"/>
            <div style={{flex:1,display:'flex',flexDirection:'column',gap:10}}>
              {[
                {label:'Activos',  v:totalActivos,  color:'var(--primary)'},
                {label:'Pasivos',  v:totalPasivos,  color:'var(--danger)'},
                {label:'Patrimonio',v:patrimonio,   color: patrimonio>=0?'var(--primary-700)':'var(--danger)'},
              ].map((r,i)=>(
                <div key={i}>
                  <div style={{display:'flex',justifyContent:'space-between',fontSize:13,fontWeight:700}}>
                    <span style={{display:'flex',alignItems:'center',gap:7}}><span style={{width:9,height:9,borderRadius:3,background:r.color}}></span>{r.label}</span>
                    <span className="tnum" style={{color:r.color}}>{fmtCLP(Math.abs(r.v))}</span>
                  </div>
                </div>
              ))}
              <div style={{marginTop:4,padding:'8px 10px',background:ratioDeuda>70?'var(--danger-tint)':ratioDeuda>45?'var(--warn-tint)':'var(--ok-tint)',borderRadius:9,fontSize:12,fontWeight:700,color:ratioDeuda>70?'var(--danger)':ratioDeuda>45?'oklch(0.50 0.10 70)':'var(--primary-700)'}}>
                Ratio deuda: {Math.round(ratioDeuda)}% {ratioDeuda<45?'✓ Saludable':ratioDeuda<70?'⚠ Revisar':'⚠ Alto'}
              </div>
            </div>
          </div>
        </div>

        {/* Ratios clave */}
        <div className="card">
          <div className="card-head"><span style={{width:32,height:32,borderRadius:9,background:'var(--terra-tint)',color:'var(--terra-700)',display:'grid',placeItems:'center'}}><Icon name="calculator" size={16}/></span><div style={{flex:1}}><div className="card-title">Indicadores clave</div><div className="card-sub">Métricas para tomar decisiones</div></div></div>
          <div style={{padding:'10px 0'}}>
            {[
              { label:'Margen bruto',         val:fmtPct(m.margenProm),                    tone:m.margenProm>25?'ok':m.margenProm>15?'warn':'danger', help:'% que queda después de costos' },
              { label:'Gastos / ventas',       val:fmtPct(m.totalGastosMes/Math.max(m.ingresosMes,1)*100), tone:m.totalGastosMes/Math.max(m.ingresosMes,1)<0.5?'ok':'warn', help:'% de ventas que se va en gastos' },
              { label:'Cuotas / ganancia',     val:fmtPct(cuotasVsGanancia),               tone:cuotasVsGanancia<30?'ok':cuotasVsGanancia<50?'warn':'danger', help:'Cuánto de tu ganancia va a deudas' },
              { label:'Deudas / activos',      val:fmtPct(ratioDeuda),                     tone:ratioDeuda<45?'ok':ratioDeuda<70?'warn':'danger', help:'Nivel de apalancamiento' },
              { label:'Cobertura deuda',       val:cuotasMes>0?cobertura.toFixed(1)+'x':'—', tone:cobertura>=2?'ok':cobertura>=1?'warn':'danger', help:'Veces que ganancia cubre cuotas' },
            ].map((r,i)=>(
              <div key={i} style={{display:'flex',alignItems:'center',gap:12,padding:'11px 22px',borderBottom:'1px solid var(--line)'}}>
                <span style={{width:8,height:8,borderRadius:'50%',background:toneColor[r.tone],flexShrink:0}}></span>
                <div style={{flex:1}}>
                  <div style={{fontSize:13.5,fontWeight:700}}>{r.label}</div>
                  <div style={{fontSize:11.5,color:'var(--ink-3)',fontWeight:600}}>{r.help}</div>
                </div>
                <span className="tnum" style={{fontWeight:800,fontSize:15,color:toneFg[r.tone]}}>{r.val}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Meta ── */}
      {meta && (
        <>
          <SectionHeader label="Meta financiera"/>
          <div className="card card-pad" style={{marginBottom:18}}>
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:12,marginBottom:14}}>
              <div><div style={{fontWeight:800,fontSize:16}}>{meta.nombre}</div><div style={{fontSize:13,color:'var(--ink-3)',fontWeight:600,marginTop:2}}>Meta: {fmtCLP(meta.monto)} · Objetivo: {meta.fechaObj.toLocaleDateString('es-CL',{day:'2-digit',month:'long'})}</div></div>
              <div style={{textAlign:'right'}}><div className="tnum" style={{fontWeight:800,fontSize:22,color:'var(--primary-700)'}}>{Math.round(metaAvance)}%</div><div style={{fontSize:12,color:'var(--ink-3)',fontWeight:600}}>completado</div></div>
            </div>
            <div style={{height:14,background:'var(--bg-2)',borderRadius:20,overflow:'hidden',marginBottom:12}}>
              <div style={{height:'100%',width:metaAvance+'%',background:'var(--primary)',borderRadius:20,transition:'width .8s cubic-bezier(.2,.8,.3,1)'}}></div>
            </div>
            <div className="grid" style={{gridTemplateColumns:'repeat(3,1fr)',gap:10}}>
              <div style={{textAlign:'center',padding:'10px 8px',background:'var(--surface-3)',borderRadius:11}}><div className="tnum" style={{fontWeight:800,fontSize:16}}>{fmtCLP(meta.saldoActual)}</div><div style={{fontSize:11.5,color:'var(--ink-3)',fontWeight:700,marginTop:2}}>Ahorrado</div></div>
              <div style={{textAlign:'center',padding:'10px 8px',background:'var(--terra-tint)',borderRadius:11}}><div className="tnum" style={{fontWeight:800,fontSize:16,color:'var(--terra-700)'}}>{fmtCLP(meta.monto-meta.saldoActual)}</div><div style={{fontSize:11.5,color:'var(--ink-3)',fontWeight:700,marginTop:2}}>Faltante</div></div>
              <div style={{textAlign:'center',padding:'10px 8px',background:'var(--surface-3)',borderRadius:11}}><div className="tnum" style={{fontWeight:800,fontSize:16}}>{fmtCLP(meta.aporteEsperado)}</div><div style={{fontSize:11.5,color:'var(--ink-3)',fontWeight:700,marginTop:2}}>Aporte/mes</div></div>
            </div>
            <div style={{marginTop:14,padding:'11px 14px',background:'var(--primary-tint)',borderRadius:11,fontSize:13.5,fontWeight:600,color:'var(--primary-700)',lineHeight:1.5}}>
              <Icon name="target" size={15} style={{verticalAlign:'-3px',marginRight:6}}/>Con tu margen de {fmtPct(m.margenProm)}, necesitas vender aprox. {fmtCLP(m.ventasNecesarias)} adicionales para completar tu meta.
            </div>
            <button className="btn btn-soft" style={{marginTop:10}} onClick={()=>setTab('metas')}><Icon name="target" size={15}/>Ver detalle de metas</button>
          </div>
        </>
      )}

      {/* ── Recomendaciones ── */}
      <SectionHeader label="Recomendaciones para hoy"/>
      <div style={{display:'flex',flexDirection:'column',gap:9,marginBottom:18}}>
        {decisiones.map((d,i)=>(
          <div key={i} style={{display:'flex',alignItems:'center',gap:12,padding:'12px 16px',background:toneBg[d.tone],borderRadius:12,border:`1px solid ${toneColor[d.tone]}33`}}>
            <Icon name={d.icon} size={16} style={{color:toneFg[d.tone],flexShrink:0}}/>
            <div style={{flex:1,fontSize:13.5,fontWeight:600,color:'var(--ink)'}}>{d.text}</div>
            {d.action && <button className="btn btn-ghost" style={{fontSize:12.5,padding:'5px 11px',flexShrink:0}} onClick={d.action.fn}>{d.action.label}</button>}
          </div>
        ))}
      </div>
    </div>
  );
}
/* ── Flujo de caja tab ───────────────────────── */
function FinFlujo(){
  const m = useFinMetrics();
  const { gastos } = useFinanzas();
  const { sales } = useStore();
  const mesInicio = new Date(TODAY.getFullYear(), TODAY.getMonth(), 1);
  const ingMes = sales.filter(s=>s.date>=mesInicio);
  const pagos = { Efectivo:0, Tarjeta:0, Transferencia:0 };
  for(const s of ingMes) pagos[s.method]=(pagos[s.method]||0)+s.total;
  const gastosMes = gastos.filter(g=>g.fecha>=mesInicio);
  const byCat={};
  for(const g of gastosMes) byCat[g.cat]=(byCat[g.cat]||0)+g.monto;
  const catRows=Object.entries(byCat).sort((a,b)=>b[1]-a[1]);
  const maxWeek=Math.max(...m.weeklyFlow.map(w=>w.ingresos||1));
  return (
    <div>
      <div className="grid" style={{gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))',marginBottom:18}}>
        <FinCard icon="trendUp"  label="Dinero que entró"  value={fmtCLP(m.ingresosMes)}    tone="primary"/>
        <FinCard icon="trendDown" label="Dinero que salió" value={fmtCLP(m.totalGastosMes+m.costosMes)} tone="warn"/>
        <FinCard icon="wallet"   label="Saldo estimado"    value={fmtCLP(m.utilidadEstimada)} tone={m.utilidadEstimada>=0?'ok':'danger'}/>
        <FinCard icon="coins"    label="Caja fin de mes"   value={fmtCLP(m.cajaProyectada)}  tone={m.cajaProyectada<300000?'danger':'primary'} alert={m.cajaProyectada<300000?'Riesgo':undefined}/>
      </div>

      {m.cajaProyectada < 300000 && (
        <AlertaBanner tone="danger" icon="alert" style={{marginBottom:14}}>
          Cuidado: tu caja proyectada a fin de mes baja de $300.000. Considera reducir gastos variables o activar más clientes.
        </AlertaBanner>
      )}

      <div className="grid" style={{gridTemplateColumns:'1.4fr 1fr',gap:18,marginBottom:18}}>
        {/* Weekly chart */}
        <div className="card">
          <div className="card-head"><div style={{flex:1}}><div className="card-title">Flujo semanal del mes</div><div className="card-sub">Ingresos vs gastos por semana</div></div></div>
          <div className="card-pad">
            <ColumnChart height={170}
              groups={m.weeklyFlow.map(w=>({label:w.label.replace('Semana ','S'), ingresos:w.ingresos, costos:w.costos+w.gastos, saldo:Math.max(0,w.saldo)}))}
              series={[{key:'ingresos',label:'Ingresos',color:'var(--primary)'},{key:'costos',label:'Costos+Gastos',color:'var(--terra)'},{key:'saldo',label:'Saldo',color:'var(--info)'}]}/>
            <div style={{marginTop:12,fontSize:12,color:'var(--ink-3)',fontWeight:600,textAlign:'center'}}>
              Las semanas futuras son proyecciones basadas en tu ritmo actual
            </div>
          </div>
        </div>
        {/* Métodos de pago */}
        <div className="card">
          <div className="card-head"><div style={{flex:1}}><div className="card-title">Entradas por método</div><div className="card-sub">Cómo te pagaron este mes</div></div></div>
          <div className="card-pad">
            <Donut size={140} thickness={22}
              data={Object.entries(pagos).filter(([,v])=>v>0).map(([k,v])=>({value:v,color:k==='Efectivo'?'var(--primary)':k==='Tarjeta'?'var(--terra)':'var(--info)'})) }
              centerValue={fmtCLP(m.ingresosMes)} centerLabel="Total"/>
            <div style={{marginTop:14,display:'flex',flexDirection:'column',gap:8}}>
              {Object.entries(pagos).filter(([,v])=>v>0).map(([k,v])=>(
                <div key={k} style={{display:'flex',justifyContent:'space-between',fontSize:13.5,fontWeight:700}}>
                  <span style={{display:'flex',alignItems:'center',gap:7}}>
                    <span style={{width:9,height:9,borderRadius:3,background:k==='Efectivo'?'var(--primary)':k==='Tarjeta'?'var(--terra)':'var(--info)'}}></span>{k}
                  </span>
                  <span className="tnum">{fmtCLP(v)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Gastos por categoría */}
      <div className="card">
        <div className="card-head"><div style={{flex:1}}><div className="card-title">Salidas por categoría</div><div className="card-sub">Gastos registrados este mes</div></div></div>
        <div className="card-pad">
          <BarList rows={catRows.map(([cat,v])=>({label:cat,value:v,color:GASTO_COLORS[cat]||'var(--ink-3)'}))}/>
        </div>
      </div>

      {/* Tabla movimientos */}
      <div className="card" style={{marginTop:18}}>
        <div className="card-head"><div style={{flex:1}}><div className="card-title">Movimientos del mes</div><div className="card-sub">Ingresos y gastos registrados</div></div></div>
        <div style={{overflowX:'auto'}}>
          <table className="tbl">
            <thead><tr><th>Fecha</th><th>Descripción</th><th>Tipo</th><th className="num">Monto</th><th>Estado</th></tr></thead>
            <tbody>
              {[...ingMes.slice(0,6).map(s=>({fecha:s.date,desc:`Venta boleta #${s.boleta}`,tipo:'Ingreso',monto:s.total,estado:'completado'})),
                ...gastosMes.map(g=>({fecha:g.fecha,desc:g.desc,tipo:'Gasto',monto:-g.monto,estado:g.estado}))
              ].sort((a,b)=>b.fecha-a.fecha).slice(0,16).map((mv,i)=>(
                <tr key={i}>
                  <td className="tnum" style={{color:'var(--ink-3)',fontWeight:600,fontSize:13}}>{mv.fecha.toLocaleDateString('es-CL',{day:'2-digit',month:'short'})}</td>
                  <td style={{fontWeight:600}}>{mv.desc}</td>
                  <td><span className="chip" style={{background:mv.tipo==='Ingreso'?'var(--ok-tint)':'var(--danger-tint)',color:mv.tipo==='Ingreso'?'var(--primary-700)':'var(--danger)',fontSize:12}}>{mv.tipo}</span></td>
                  <td className="num tnum" style={{fontWeight:800,color:mv.monto>0?'var(--primary-700)':'var(--danger)'}}>{mv.monto>0?'+':''}{fmtCLP(Math.abs(mv.monto))}</td>
                  <td><span className="chip" style={{background:mv.estado==='completado'||mv.estado==='pagado'?'var(--ok-tint)':'var(--warn-tint)',color:mv.estado==='completado'||mv.estado==='pagado'?'var(--primary-700)':'oklch(0.50 0.10 70)',fontSize:12}}>{mv.estado}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

window.FinResumen=FinResumen; window.FinFlujo=FinFlujo; window.FinCard=FinCard; window.AlertaBanner=AlertaBanner; window.SectionHeader=SectionHeader;
