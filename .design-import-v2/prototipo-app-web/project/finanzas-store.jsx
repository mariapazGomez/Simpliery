/* ---------- Finanzas Store: data, seed, context, actions ---------- */

const FinCtx = React.createContext(null);
function useFinanzas(){ return React.useContext(FinCtx); }

/* ── Icon additions ─────────────────────────── */
if(!ICONS.wallet) Object.assign(ICONS, {
  wallet:   'M21 12V7H5a2 2 0 010-4h14v4M21 12v5H5a2 2 0 000 4h16v-5M21 12H5',
  piggy:    'M19 11V9a7 7 0 00-14 0v1a2 2 0 00-2 2v1a2 2 0 002 2v1a4 4 0 004 4h6a4 4 0 004-4v-1a2 2 0 002-2v-1a2 2 0 00-2-2zm-7 6h-2v-1h2v1zm3-4H9a1 1 0 010-2h6a1 1 0 010 2z',
  building: 'M3 21h18M6 21V7l6-4 6 4v14M9 9h2v2H9zm4 0h2v2h-2zm-4 4h2v2H9zm4 0h2v2h-2z',
  coins:    'M12 8c-2.2 0-4 .9-4 2s1.8 2 4 2 4-.9 4-2-1.8-2-4-2zM4 18c0 1.1 3.6 2 8 2s8-.9 8-2v-2c0 1.1-3.6 2-8 2s-8-.9-8-2v2zm0-5c0 1.1 3.6 2 8 2s8-.9 8-2v-2c0 1.1-3.6 2-8 2s-8-.9-8-2v2z',
  target:   'M12 22a10 10 0 100-20 10 10 0 000 20zM12 18a6 6 0 100-12 6 6 0 000 12zM12 14a2 2 0 100-4 2 2 0 000 4z',
  calculator:'M4 2h16a1 1 0 011 1v18a1 1 0 01-1 1H4a1 1 0 01-1-1V3a1 1 0 011-1zm2 4v2h8V6H6zm0 5h2v2H6v-2zm4 0h2v2h-2v-2zm4 0h2v6h-2v-6zm-8 4h2v2H6v-2zm4 0h2v2h-2v-2z',
  trending: 'M3 17l5-5 4 4 8-9M14 7h5v5',
  nomina:   'M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8zm13 3l-4 4-2-2',
  megaphone:'M18 8a2 2 0 000 4M2 8v6a2 2 0 002 2h1.5v4l4-4H12a2 2 0 002-2V8a2 2 0 00-2-2H4a2 2 0 00-2 2z',
  shield:   'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z',
  balance:  'M12 3v1m0 16v1M4.2 4.2l.7.7m13.9 13.9l.7.7M3 12h1m16 0h1M4.2 19.8l.7-.7M19.1 4.9l.7-.7M12 7a5 5 0 100 10A5 5 0 0012 7z',
});

/* ── Seed helpers ───────────────────────────── */
const GASTO_CATS = ['Arriendo','Sueldos','Marketing','Mercadería','Servicios','Transporte','Comisiones','Contabilidad','Mantención','Otros'];
const GASTO_ICONS = { Arriendo:'building', Sueldos:'nomina', Marketing:'megaphone', Mercadería:'box', Servicios:'zap', Transporte:'truck', Comisiones:'percent', Contabilidad:'receipt', Mantención:'config', Otros:'tag' };
const GASTO_COLORS = { Arriendo:'var(--terra)', Sueldos:'var(--info)', Marketing:'oklch(0.62 0.12 290)', Mercadería:'var(--primary)', Servicios:'oklch(0.66 0.10 80)', Transporte:'var(--warn)', Comisiones:'oklch(0.60 0.10 200)', Contabilidad:'var(--ink-3)', Mantención:'oklch(0.60 0.08 30)', Otros:'var(--ink-3)' };

function seedGastos(){
  const d=(daysAgo,dia=1)=>{ const x=new Date(TODAY); x.setDate(x.getDate()-daysAgo+dia); return x; };
  return [
    { id:'g1',  fecha:d(5),  cat:'Arriendo',    desc:'Arriendo junio 2026',        monto:480000, method:'Transferencia', recurrente:true,  proveedor:'Inmobiliaria Castro', estado:'pagado' },
    { id:'g2',  fecha:d(3),  cat:'Sueldos',     desc:'Sueldo Carlos - cajero',     monto:450000, method:'Transferencia', recurrente:true,  proveedor:'Carlos Muñoz',       estado:'pagado' },
    { id:'g3',  fecha:d(8),  cat:'Sueldos',     desc:'Sueldo Valentina - despacho',monto:380000, method:'Transferencia', recurrente:true,  proveedor:'Valentina Rojas',    estado:'pagado' },
    { id:'g4',  fecha:d(10), cat:'Marketing',   desc:'Meta Ads - campaña junio',   monto:85000,  method:'Tarjeta',       recurrente:false, proveedor:'Meta',               estado:'pagado' },
    { id:'g5',  fecha:d(12), cat:'Marketing',   desc:'Instagram - influencer',     monto:60000,  method:'Transferencia', recurrente:false, proveedor:'@emporiochile',      estado:'pagado' },
    { id:'g6',  fecha:d(2),  cat:'Servicios',   desc:'Luz y agua',                 monto:62000,  method:'Transferencia', recurrente:true,  proveedor:'CGE',                estado:'pagado' },
    { id:'g7',  fecha:d(1),  cat:'Servicios',   desc:'Internet fibra óptica',      monto:29900,  method:'Débito',        recurrente:true,  proveedor:'Entel',              estado:'pagado' },
    { id:'g8',  fecha:d(0),  cat:'Transporte',  desc:'Combustible camioneta',      monto:48000,  method:'Efectivo',      recurrente:false, proveedor:'COPEC',              estado:'pagado' },
    { id:'g9',  fecha:d(0),  cat:'Mercadería',  desc:'Reposición quesos artesanales',monto:190000,method:'Transferencia',recurrente:false, proveedor:'Quesos del Sur',     estado:'pagado' },
    { id:'g10', fecha:d(15), cat:'Contabilidad',desc:'Honorarios contador',        monto:90000,  method:'Transferencia', recurrente:true,  proveedor:'Felipe CPA',         estado:'pagado' },
    { id:'g11', fecha:d(25), cat:'Arriendo',    desc:'Arriendo mayo 2026',         monto:480000, method:'Transferencia', recurrente:true,  proveedor:'Inmobiliaria Castro', estado:'pagado' },
    { id:'g12', fecha:d(20), cat:'Mantención',  desc:'Reparación refrigerador',    monto:75000,  method:'Efectivo',      recurrente:false, proveedor:'Técnico Gómez',      estado:'pagado' },
    { id:'g13', fecha:d(0),  cat:'Comisiones',  desc:'Comisión Transbank',         monto:18500,  method:'Automático',    recurrente:true,  proveedor:'Transbank',          estado:'pendiente' },
    { id:'g14', fecha:d(0),  cat:'Sueldos',     desc:'Gratificación junio',        monto:82000,  method:'Transferencia', recurrente:false, proveedor:'Carlos Muñoz',       estado:'pendiente' },
  ];
}

function seedNomina(){
  return [
    { id:'n1', nombre:'Carlos Muñoz',     cargo:'Cajero',        tipo:'Fijo', monto:450000, dia:5,  estado:'pagado',   horas:160, bono:0 },
    { id:'n2', nombre:'Valentina Rojas',  cargo:'Despacho',      tipo:'Fijo', monto:380000, dia:5,  estado:'pagado',   horas:140, bono:0 },
    { id:'n3', nombre:'Pedro Arriagada',  cargo:'Reposición',    tipo:'Variable', monto:180000, dia:15, estado:'pendiente', horas:80, bono:15000 },
  ];
}

function seedMarketing(){
  return [
    { id:'mk1', campaign:'Quesos artesanales junio', canal:'Meta Ads',           fecha:new Date(2026,5,1), monto:85000,  ventasGeneradas:320000, clientesNuevos:8,  obs:'Buen alcance, bajo CPC' },
    { id:'mk2', campaign:'Frutos secos verano',       canal:'Instagram orgánico', fecha:new Date(2026,5,3), monto:0,      ventasGeneradas:85000,  clientesNuevos:3,  obs:'Post viral' },
    { id:'mk3', campaign:'Influencer @emporiochile',  canal:'Influencer',         fecha:new Date(2026,4,28),monto:60000,  ventasGeneradas:210000, clientesNuevos:14, obs:'Buen ROAS' },
    { id:'mk4', campaign:'Volantes barrio',           canal:'Volantes',           fecha:new Date(2026,4,15),monto:15000,  ventasGeneradas:60000,  clientesNuevos:2,  obs:'Difícil medir' },
  ];
}

function seedCreditos(){
  return [
    { id:'cr1', acreedor:'Banco Estado', tipo:'Préstamo bancario', montoOriginal:8000000, saldo:5200000, tasaAnual:14.5, cuotaMensual:280000, proximaCuota:new Date(2026,5,20), estado:'vigente', notas:'Crédito 36 meses, dic 2027', pagos:[
      {monto:280000,fecha:new Date(2026,4,20),nota:'Cuota mayo',interes:62833,amortizacion:217167,saldoAntes:5417167,saldoDespues:5200000},
    ]},
    { id:'cr2', acreedor:'Proveedor Quesos del Sur', tipo:'Deuda proveedor', montoOriginal:350000, saldo:190000, tasaAnual:0, cuotaMensual:95000, proximaCuota:new Date(2026,5,15), estado:'vigente', notas:'Pago en 2 cuotas acordadas', pagos:[] },
    { id:'cr3', acreedor:'Leasing refrigerador', tipo:'Leasing', montoOriginal:1200000, saldo:780000, tasaAnual:9.8, cuotaMensual:38000, proximaCuota:new Date(2026,5,30), estado:'al_dia', notas:'24 cuotas, vence ago 2027', pagos:[] },
    { id:'cr4', acreedor:'Banco BBCI', tipo:'Línea de crédito', montoOriginal:2000000, saldo:0, tasaAnual:18, cuotaMensual:0, proximaCuota:new Date(2026,6,1), estado:'pagado', notas:'Línea disponible, saldo pagado', pagos:[] },
  ];
}

function seedMetas(){
  return [
    { id:'mt1', nombre:'Reposición mercadería', monto:5000000, fechaObj:new Date(2026,8,30), saldoActual:1200000, aporteEsperado:295000, prioridad:'Alta', color:'var(--primary)' },
    { id:'mt2', nombre:'Comprar refrigerador nuevo', monto:1200000, fechaObj:new Date(2026,7,31), saldoActual:400000, aporteEsperado:200000, prioridad:'Media', color:'var(--info)' },
  ];
}

/* ── Provider ───────────────────────────────── */
function FinanzasProvider({ children }){
  const [gastos, setGastos] = usePersisted('cl_gastos', seedGastos);
  const [nomina, setNomina] = usePersisted('cl_nomina', seedNomina);
  const [marketing, setMarketing] = usePersisted('cl_marketing', seedMarketing);
  const [metas, setMetas] = usePersisted('cl_metas', seedMetas);
  const [creditos, setCreditos] = usePersisted('cl_creditos', seedCreditos);

  const addGasto = React.useCallback((g)=> setGastos(gs=>[...gs,{...g,id:'g'+Date.now()}]),[]);
  const updateGasto = React.useCallback((id,p)=> setGastos(gs=>gs.map(g=>g.id===id?{...g,...p}:g)),[]);
  const deleteGasto = React.useCallback((id)=> setGastos(gs=>gs.filter(g=>g.id!==id)),[]);
  const payNomina = React.useCallback((id)=> setNomina(ns=>ns.map(n=>n.id===id?{...n,estado:'pagado'}:n)),[]);
  const addMeta = React.useCallback((m)=> setMetas(ms=>[...ms,{...m,id:'mt'+Date.now()}]),[]);
  const updateMeta = React.useCallback((id,p)=> setMetas(ms=>ms.map(m=>m.id===id?{...m,...p}:m)),[]);

  const addCredito = React.useCallback((c)=> setCreditos(cs=>[...cs,c]),[]);
  const updateCredito = React.useCallback((id,p)=> setCreditos(cs=>cs.map(c=>c.id===id?{...c,...p}:c)),[]);
  const pagarCredito = React.useCallback((id,pago)=> setCreditos(cs=>cs.map(c=>{
    if(c.id!==id) return c;
    const nuevoSaldo=Math.max(0,c.saldo-pago.amortizacion);
    const nuevoEstado=nuevoSaldo<=0?'pagado':c.estado;
    return {...c, saldo:nuevoSaldo, estado:nuevoEstado, pagos:[...(c.pagos||[]),pago]};
  })),[]);

  return <FinCtx.Provider value={{gastos,nomina,marketing,metas,creditos,addGasto,updateGasto,deleteGasto,payNomina,addMeta,updateMeta,addCredito,updateCredito,pagarCredito}}>
    {children}
  </FinCtx.Provider>;
}

/* ── Derived finanzas metrics ─────────────────── */
function useFinMetrics(){
  const { gastos, nomina, metas } = useFinanzas();
  const { sales, products, clientes } = useStore();
  return React.useMemo(()=>{
    // Revenue from sales (current month)
    const now = TODAY; const mesInicio = new Date(now.getFullYear(), now.getMonth(), 1);
    const ventasMes = sales.filter(s=>s.date>=mesInicio);
    const ingresosMes = ventasMes.reduce((a,s)=>a+s.total,0);
    const costosMes = ventasMes.reduce((a,s)=>a+s.cost,0);
    const gananciaMes = ingresosMes - costosMes;
    const margenProm = ingresosMes ? gananciaMes/ingresosMes*100 : 0;
    const ventasPorDia = ingresosMes / (now.getDate()||1);
    const ventasPorSemana = ventasPorDia * 7;
    // Expenses
    const gastosMes = gastos.filter(g=>g.fecha>=mesInicio);
    const totalGastosMes = gastosMes.reduce((a,g)=>a+g.monto,0);
    const gastosFijos = gastos.filter(g=>g.recurrente).reduce((a,g)=>a+g.monto,0);
    const gastosVariables = totalGastosMes - gastos.filter(g=>g.recurrente&&g.fecha>=mesInicio).reduce((a,g)=>a+g.monto,0);
    const gastosPendientes = gastos.filter(g=>g.estado==='pendiente').reduce((a,g)=>a+g.monto,0);
    const utilidadEstimada = gananciaMes - totalGastosMes;
    // Projected cash: extrapolate to end of month
    const daysLeft = new Date(now.getFullYear(),now.getMonth()+1,0).getDate() - now.getDate();
    const cajaProyectada = utilidadEstimada + (ventasPorDia * daysLeft * (margenProm/100)) - gastosPendientes;
    // Inventory value
    const valInventario = products.reduce((a,p)=>a+p.stock*p.cost,0);
    const prodBajaRotacion = products.filter(p=>p.sold<3).length;
    // Clients
    const enriched = clientes.map(c=>clientMetrics(c));
    const clientesActivos = enriched.filter(c=>c.daysSinceLast!=null&&c.daysSinceLast<=30).length;
    const proximos7 = enriched.filter(c=>c.daysUntilNext!=null&&c.daysUntilNext>=0&&c.daysUntilNext<=7).length;
    const ticketProm = sales.length ? sales.reduce((a,s)=>a+s.total,0)/sales.length : 0;
    const frecProm = enriched.filter(c=>c.frecuencia!=null).reduce((a,c)=>a+c.frecuencia,0) / (enriched.filter(c=>c.frecuencia!=null).length||1);
    // Payroll
    const nominaMes = nomina.reduce((a,n)=>a+n.monto+(n.bono||0),0);
    // Weekly flow (4 weeks of this month)
    const diaHoy = now.getDate();
    const weeklyFlow = [1,2,3,4].map(w=>{
      const wStart=new Date(now.getFullYear(),now.getMonth(),(w-1)*7+1);
      const wEnd=new Date(now.getFullYear(),now.getMonth(),w*7);
      const wSales=sales.filter(s=>s.date>=wStart&&s.date<=wEnd);
      const wIng=wSales.reduce((a,s)=>a+s.total,0);
      const wCost=wSales.reduce((a,s)=>a+s.cost,0);
      const wGastos=gastos.filter(g=>{ const d=g.fecha.getDate(); return d>=(w-1)*7+1&&d<=w*7&&g.fecha.getMonth()===now.getMonth(); }).reduce((a,g)=>a+g.monto,0);
      const isFuture=wStart.getDate()>diaHoy;
      return { label:`Semana ${w}`, ingresos:isFuture?ventasPorSemana*0.9:wIng, costos:isFuture?ventasPorSemana*0.6:wCost, gastos:isFuture?wGastos||gastosFijos/4:wGastos, saldo:isFuture?(wIng||ventasPorSemana)-(wCost||ventasPorSemana*0.6)-(wGastos||gastosFijos/4):wIng-wCost-wGastos, isFuture };
    });
    // Meta principal
    const metaPrincipal = metas[0];
    const ventasNecesarias = metaPrincipal && margenProm>0 ? (metaPrincipal.monto-metaPrincipal.saldoActual)/(margenProm/100) : 0;
    // Deuda (credit sales)
    const totalDeuda = sales.filter(s=>s.method==='Crédito'&&(s.balance||0)>0).reduce((a,s)=>a+(s.balance||0),0);
    const clientesDeudoresN = new Set(sales.filter(s=>s.method==='Crédito'&&(s.balance||0)>0).map(s=>s.clienteId||s.id)).size;
    return { ingresosMes, costosMes, gananciaMes, margenProm, ventasPorDia, ventasPorSemana, totalGastosMes, gastosFijos, gastosVariables, gastosPendientes, utilidadEstimada, cajaProyectada, valInventario, prodBajaRotacion, clientesActivos, proximos7, ticketProm, frecProm, nominaMes, weeklyFlow, metaPrincipal, ventasNecesarias, totalDeuda, clientesDeudoresN };
  },[sales,products,clientes,gastos,nomina,metas]);
}

Object.assign(window, { FinanzasProvider, useFinanzas, useFinMetrics, GASTO_CATS, GASTO_ICONS, GASTO_COLORS });
