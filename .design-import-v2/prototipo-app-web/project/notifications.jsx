/* ---------- Notifications drawer ---------- */

function NotifDrawer({ open, onClose, go }){
  const { products, sales, clientes } = useStore();
  const { gastos } = useFinanzas();
  const m = useMetrics();
  const fm = useFinMetrics();

  // Build smart notifications from live data
  const notifs = React.useMemo(()=>{
    const list = [];
    // Stock alerts
    const sinStock = products.filter(p=>p.stock===0);
    const stockBajo = products.filter(p=>p.stock>0&&p.stock<=p.min);
    if(sinStock.length) list.push({ id:'n-sin', cat:'inventario', tone:'danger', icon:'x', title:`${sinStock.length} productos sin stock`, body: sinStock.slice(0,3).map(p=>p.name).join(', ')+(sinStock.length>3?` y ${sinStock.length-3} más`:''), action:{label:'Ver inventario', to:'inventario'}, ts: new Date(TODAY.getTime()-1800000) });
    if(stockBajo.length) list.push({ id:'n-bajo', cat:'inventario', tone:'warn', icon:'alert', title:`${stockBajo.length} productos con stock bajo`, body: stockBajo.slice(0,2).map(p=>`${p.name} (${p.stock} u.)`).join(', '), action:{label:'Reponer', to:'inventario'}, ts: new Date(TODAY.getTime()-3600000) });

    // Client alerts
    const proxClientes = clientes.map(c=>({...c,...clientMetrics(c)})).filter(c=>c.daysUntilNext!=null&&c.daysUntilNext>=0&&c.daysUntilNext<=3);
    if(proxClientes.length) list.push({ id:'n-prox', cat:'clientes', tone:'primary', icon:'clientes', title:`${proxClientes.length} clientes listos para recomprar`, body:`${proxClientes.slice(0,2).map(c=>c.nombre.split(' ')[0]).join(' y ')}${proxClientes.length>2?' y más':', entre otros'}. Buen momento para contactarlos.`, action:{label:'Ver segmentos', to:'segmentos'}, ts: new Date(TODAY.getTime()-7200000) });
    const enRiesgo = clientes.map(c=>({...c,...clientMetrics(c)})).filter(c=>c.daysSinceLast!=null&&c.daysSinceLast>45);
    if(enRiesgo.length) list.push({ id:'n-riesgo', cat:'clientes', tone:'warn', icon:'bell', title:`${enRiesgo.length} clientes llevan más de 45 días sin comprar`, body:`${enRiesgo.slice(0,2).map(c=>c.nombre.split(' ')[0]).join(', ')} podrían estar en riesgo de perderse.`, action:{label:'Ver clientes', to:'clientes'}, ts: new Date(TODAY.getTime()-10800000) });

    // Margin alerts
    const catsBajoMargen = m.cats.filter(c=>c.marginPct<25);
    if(catsBajoMargen.length) list.push({ id:'n-margen', cat:'productos', tone:'warn', icon:'percent', title:`Margen bajo en ${catsBajoMargen[0].cat}`, body:`El margen de ${catsBajoMargen[0].cat} está en ${fmtPct(catsBajoMargen[0].marginPct)}, bajo el 25% recomendado.`, action:{label:'Ver productos', to:'productos'}, ts: new Date(TODAY.getTime()-14400000) });

    // Finance alerts
    if(fm.cajaProyectada < 400000) list.push({ id:'n-caja', cat:'finanzas', tone:'danger', icon:'wallet', title:'Caja proyectada ajustada', body:`La caja estimada a fin de mes es ${fmtCLP(fm.cajaProyectada)}. Considera reducir gastos variables.`, action:{label:'Ver finanzas', to:'finanzas'}, ts: new Date(TODAY.getTime()-5400000) });
    const gastosPend = gastos.filter(g=>g.estado==='pendiente');
    if(gastosPend.length) list.push({ id:'n-gastos', cat:'finanzas', tone:'warn', icon:'tag', title:`${gastosPend.length} gastos pendientes de pago`, body:gastosPend.map(g=>g.desc).join(', ')+' · '+fmtCLP(gastosPend.reduce((a,g)=>a+g.monto,0)), action:{label:'Ver gastos', to:'finanzas'}, ts: new Date(TODAY.getTime()-9000000) });

    // Good news
    const todaySales=sales.filter(s=>s.date.toDateString()===TODAY.toDateString());
    if(todaySales.length>0) list.push({ id:'n-ventas', cat:'ventas', tone:'ok', icon:'trendUp', title:`${todaySales.length} ventas registradas hoy`, body:`Total del día: ${fmtCLP(todaySales.reduce((a,s)=>a+s.total,0))} · Ganancia: ${fmtCLP(todaySales.reduce((a,s)=>a+s.profit,0))}`, action:{label:'Ver ventas', to:'dashboard'}, ts: new Date() });

    return list.sort((a,b)=>b.ts-a.ts);
  },[products,sales,clientes,gastos,m,fm]);

  const TONE_CFG = {
    danger:  {bg:'var(--danger-tint)',  fg:'var(--danger)',           border:'oklch(0.90 0.04 35)'},
    warn:    {bg:'var(--warn-tint)',    fg:'oklch(0.50 0.10 70)',     border:'oklch(0.90 0.06 75)'},
    primary: {bg:'var(--primary-tint)', fg:'var(--primary-700)',      border:'var(--primary-tint2)'},
    ok:      {bg:'var(--ok-tint)',      fg:'var(--primary-700)',      border:'var(--primary-tint2)'},
    info:    {bg:'var(--info-tint)',    fg:'var(--info)',             border:'var(--info-tint)'},
  };

  function tsLabel(ts){
    const mins=Math.round((TODAY-ts)/60000);
    if(mins<2) return 'Ahora';
    if(mins<60) return `Hace ${mins} min`;
    const hrs=Math.round(mins/60);
    if(hrs<24) return `Hace ${hrs} h`;
    return ts.toLocaleDateString('es-CL',{day:'2-digit',month:'short'});
  }

  if(!open) return null;
  return (
    <>
      {/* Backdrop */}
      <div onClick={onClose} style={{position:'fixed',inset:0,background:'rgba(43,38,32,0.18)',zIndex:150,backdropFilter:'blur(1px)'}}/>
      {/* Drawer */}
      <div style={{position:'fixed',top:0,right:0,bottom:0,width:420,maxWidth:'95vw',background:'var(--surface)',zIndex:151,display:'flex',flexDirection:'column',boxShadow:'var(--sh-pop)',animation:'slideIn .22s cubic-bezier(.2,.8,.3,1)'}}>
        <style>{`@keyframes slideIn{from{transform:translateX(100%)}to{transform:none}}`}</style>
        {/* Header */}
        <div style={{display:'flex',alignItems:'center',gap:12,padding:'18px 20px',borderBottom:'1px solid var(--line)',flexShrink:0}}>
          <div style={{flex:1}}>
            <div style={{fontWeight:800,fontSize:17}}>Alertas y avisos</div>
            <div style={{fontSize:12.5,color:'var(--ink-3)',fontWeight:600,marginTop:2}}>{notifs.length} notificaciones activas</div>
          </div>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><Icon name="x" size={18}/></button>
        </div>
        {/* Notif list */}
        <div style={{flex:1,overflowY:'auto',padding:'12px 16px',display:'flex',flexDirection:'column',gap:10}}>
          {notifs.length===0 && (
            <div style={{textAlign:'center',padding:'48px 24px',color:'var(--ink-3)'}}>
              <Icon name="check" size={36} style={{marginBottom:12}}/>
              <div style={{fontWeight:700,fontSize:15}}>Todo en orden</div>
              <div style={{fontSize:13.5,marginTop:4}}>No hay alertas pendientes</div>
            </div>
          )}
          {notifs.map(n=>{
            const c=TONE_CFG[n.tone]||TONE_CFG.primary;
            return (
              <div key={n.id} style={{background:c.bg,border:`1px solid ${c.border}`,borderRadius:13,padding:'13px 15px',display:'flex',flexDirection:'column',gap:8}}>
                <div style={{display:'flex',alignItems:'flex-start',gap:10}}>
                  <span style={{width:32,height:32,borderRadius:9,background:'rgba(255,255,255,0.7)',color:c.fg,display:'grid',placeItems:'center',flexShrink:0}}>
                    <Icon name={n.icon} size={16}/>
                  </span>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontWeight:800,fontSize:14,lineHeight:1.3}}>{n.title}</div>
                    <div style={{fontSize:12.5,color:'var(--ink-2)',fontWeight:600,marginTop:3,lineHeight:1.4}}>{n.body}</div>
                  </div>
                  <span style={{fontSize:11.5,color:'var(--ink-3)',fontWeight:700,flexShrink:0,whiteSpace:'nowrap'}}>{tsLabel(n.ts)}</span>
                </div>
                {n.action && (
                  <button onClick={()=>{ go(n.action.to); onClose(); }} className="btn btn-ghost" style={{alignSelf:'flex-start',padding:'6px 12px',fontSize:12.5,fontWeight:700,background:'rgba(255,255,255,0.8)'}}>
                    {n.action.label} <Icon name="chevR" size={13}/>
                  </button>
                )}
              </div>
            );
          })}
        </div>
        {/* Footer hint */}
        <div style={{padding:'13px 20px',borderTop:'1px solid var(--line)',fontSize:12.5,color:'var(--ink-3)',fontWeight:600,textAlign:'center',flexShrink:0}}>
          Las alertas se actualizan en tiempo real según tus datos
        </div>
      </div>
    </>
  );
}
window.NotifDrawer = NotifDrawer;
