/* ---------- Global store: products, sales, inventory actions ---------- */
const { useState, useEffect, useMemo, useCallback, useRef, createContext, useContext } = React;

const TODAY = new Date(2026,5,6); // 6 jun 2026
function fmtDate(d){ return d.toLocaleDateString('es-CL',{day:'2-digit',month:'short'}); }

/* ---------- Client seeding ---------- */
function seedClientes(products){
  let s=77321; const rnd=()=>{ s=(s*1103515245+12345)&0x7fffffff; return s/0x7fffffff; };
  const names=[['María','González Rojas'],['Carlos','Pérez Fuentes'],['Ana','Martínez Silva'],
    ['Pedro','López Araya'],['Sofía','Hernández Vega'],['Luis','Torres Molina'],
    ['Valentina','Ramos Castro'],['Diego','Flores Muñoz'],['Camila','Díaz Soto'],
    ['Rodrigo','Vargas Pinto'],['Javiera','Morales Rojas'],['Felipe','Jiménez Lagos'],
    ['Isidora','Castro Núñez'],['Matías','Álvarez Cerda'],['Paula','Reyes Tapia'],['Tomás','Sánchez Vera']];
  const cities=['Santiago','Providencia','Ñuñoa','Las Condes','Maipú','Viña del Mar','La Florida','San Bernardo'];
  const methods=['Efectivo','Efectivo','Tarjeta','Tarjeta','Transferencia'];
  const domains=['gmail.com','hotmail.com','yahoo.es','outlook.com'];
  let bol=45800;
  return names.map(([fn,ln],i)=>{
    const nComp=1+Math.floor(rnd()*13);
    const city=cities[Math.floor(rnd()*cities.length)];
    const compras=[]; let daysAgo=Math.floor(rnd()*8)+1;
    for(let j=0;j<nComp;j++){
      const nIt=1+Math.floor(rnd()*3); const items=[];
      for(let k=0;k<nIt;k++){
        const p=products[Math.floor(rnd()*products.length)]; const qty=1+Math.floor(rnd()*2);
        items.push({productId:p.id,name:p.name,cat:p.cat,qty,price:p.price,cost:p.cost});
      }
      const total=items.reduce((a,it)=>a+it.price*it.qty,0);
      const cost=items.reduce((a,it)=>a+it.cost*it.qty,0);
      const d=new Date(TODAY); d.setDate(d.getDate()-daysAgo);
      compras.push({id:'cv'+bol,boleta:bol++,date:d,items,method:methods[Math.floor(rnd()*methods.length)],total,cost,profit:total-cost});
      daysAgo+=Math.floor(rnd()*14)+3;
    }
    compras.sort((a,b)=>b.date-a.date);
    const slug=fn.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
    const slug2=ln.split(' ')[0].toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
    return {id:'c'+(i+1),nombre:fn+' '+ln,telefono:'+56 9 '+Math.floor(rnd()*9000+1000)+' '+Math.floor(rnd()*9000+1000),
      correo:slug+'.'+slug2+'@'+domains[Math.floor(rnd()*domains.length)],ciudad:city,
      createdAt:compras[compras.length-1].date,nota:'',compras};
  });
}

/* ---------- Client derived analytics ---------- */
function clientMetrics(c){
  if(!c.compras.length) return {totalGastado:0,ticketMedio:0,lastCompra:null,daysSinceLast:null,frecuencia:null,nextExpected:null,daysUntilNext:null,categoria:'Nuevo',topProductos:[],topCats:[]};
  const totalGastado=c.compras.reduce((a,v)=>a+v.total,0);
  const ticketMedio=totalGastado/c.compras.length;
  const sorted=[...c.compras].sort((a,b)=>a.date-b.date);
  const lastCompra=sorted[sorted.length-1].date;
  const daysSinceLast=Math.round((TODAY-lastCompra)/86400000);
  let frecuencia=null,nextExpected=null,daysUntilNext=null;
  if(sorted.length>1){
    const gaps=[];
    for(let i=1;i<sorted.length;i++) gaps.push((sorted[i].date-sorted[i-1].date)/86400000);
    frecuencia=Math.round(gaps.reduce((a,b)=>a+b,0)/gaps.length);
    nextExpected=new Date(lastCompra); nextExpected.setDate(nextExpected.getDate()+frecuencia);
    daysUntilNext=Math.round((nextExpected-TODAY)/86400000);
  }
  let categoria;
  if(totalGastado>=200000&&c.compras.length>=6) categoria='VIP';
  else if(c.compras.length>=5&&daysSinceLast<=45) categoria='Frecuente';
  else if(daysSinceLast>45) categoria='En riesgo';
  else if(c.compras.length<=2) categoria='Nuevo';
  else categoria='Regular';
  const prodMap={};
  for(const v of c.compras) for(const it of v.items){
    if(!prodMap[it.name]) prodMap[it.name]={name:it.name,cat:it.cat,qty:0,total:0};
    prodMap[it.name].qty+=it.qty; prodMap[it.name].total+=it.price*it.qty;
  }
  const catMap={};
  for(const v of c.compras) for(const it of v.items) catMap[it.cat]=(catMap[it.cat]||0)+it.price*it.qty;
  return {totalGastado,ticketMedio,lastCompra,daysSinceLast,frecuencia,nextExpected,daysUntilNext,categoria,
    topProductos:Object.values(prodMap).sort((a,b)=>b.total-a.total).slice(0,5),
    topCats:Object.entries(catMap).sort((a,b)=>b[1]-a[1]).slice(0,4)};
}

/* ---------- CSV export utility ---------- */
function exportCSV(filename, rows){
  const csv=rows.map(r=>r.map(c=>`"${String(c==null?'':c).replace(/"/g,'""')}"`).join(',')).join('\r\n');
  const blob=new Blob(['\uFEFF'+csv],{type:'text/csv;charset=utf-8'});
  const url=URL.createObjectURL(blob); const a=document.createElement('a');
  a.href=url; a.download=filename; document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
}

function buildSalesCSV(sales, label){
  const headers=['Boleta','Fecha','Hora','Categoría','Producto','Cantidad','Precio Unitario','Total Item','Costo Item','Ganancia Item','Método Pago','Tipo Venta','Cliente','Ciudad','Teléfono','Correo'];
  const rows=[headers];
  for(const s of sales){
    const fecha=s.date.toLocaleDateString('es-CL'); const hora=s.date.toLocaleTimeString('es-CL',{hour:'2-digit',minute:'2-digit'});
    const tipo=s.tipo||'local'; const cl=s.cliente||{};
    for(const it of s.items){
      rows.push([s.boleta,fecha,hora,it.cat,it.name,it.qty,it.price,it.price*it.qty,it.cost,it.price*it.qty-(it.cost*it.qty),s.method,tipo,cl.nombre||'',cl.ciudad||'',cl.numero||'',cl.correo||'']);
    }
  }
  exportCSV(`ventas_${label}_${new Date().toLocaleDateString('es-CL').replace(/\//g,'-')}.csv`, rows);
}

// Seed a believable set of "today" boletas from the catalog
function seedSales(products){
  let s=987654; const rnd=()=>{ s=(s*1103515245+12345)&0x7fffffff; return s/0x7fffffff; };
  const methods=['Efectivo','Efectivo','Efectivo','Tarjeta','Tarjeta','Transferencia'];
  const sales=[]; let bol=46210;
  const hours=[9,10,10,11,11,12,12,13,14,16,17,17,18,19];
  const despachoClientes = [
    {nombre:'María González',ciudad:'Santiago',telefono:'+56912345678'},
    {nombre:'Pedro Soto',ciudad:'Providencia',telefono:'+56923456789'},
    {nombre:'Ana Martínez',ciudad:'Las Condes',telefono:'+56934567890'},
    {nombre:'Luis Rojas',ciudad:'Ñuñoa',telefono:'+56945678901'},
    {nombre:'Carmen López',ciudad:'Maipú',telefono:'+56956789012'},
  ];
  for(let i=0;i<14;i++){
    const nItems=1+Math.floor(rnd()*3);
    const items=[];
    for(let k=0;k<nItems;k++){
      const p=products[Math.floor(rnd()*products.length)];
      const qty=1+Math.floor(rnd()*2);
      items.push({productId:p.id, name:p.name, cat:p.cat, qty, price:p.price, cost:p.cost});
    }
    const total=items.reduce((a,it)=>a+it.price*it.qty,0);
    const cost=items.reduce((a,it)=>a+it.cost*it.qty,0);
    const h=hours[i];
    // ~40% of sales are despacho
    const isDespacho = rnd() < 0.38;
    const cliente = isDespacho ? despachoClientes[Math.floor(rnd()*despachoClientes.length)] : null;
    const isCredito = !isDespacho && rnd() < 0.15;
    const creditoCliente = isCredito ? despachoClientes[Math.floor(rnd()*despachoClientes.length)] : null;
    const metodoPago = isCredito ? 'Crédito' : methods[Math.floor(rnd()*methods.length)];
    sales.push({ id:'b'+bol, boleta:bol++, date:new Date(2026,5,6,h,Math.floor(rnd()*60)),
      items, method:metodoPago, total, cost, profit:total-cost,
      tipo: isDespacho?'despacho':'local', cliente: isDespacho?cliente:(isCredito?creditoCliente:null),
      credito: isCredito, pagado: !isCredito, montoPendiente: isCredito?total:0, pagos:[] });
  }
  return sales;
}

const Store = createContext(null);
function useStore(){ return useContext(Store); }

function StoreProvider({ children }){
  const [products, setProducts] = usePersisted('cl_products', ()=> DATA.PRODUCTS.map(p=>({...p})));
  const [sales, setSales] = usePersisted('cl_sales', ()=> seedSales(DATA.PRODUCTS));
  const [clientes, setClientes] = usePersisted('cl_clientes', ()=> seedClientes(DATA.PRODUCTS));
  const [movements, setMovements] = usePersisted('cl_movements', ()=> ([
    { id:'m1', date:new Date(2026,5,5,18,20), product:'Huevo Extra 30u', type:'Reposición', qty:+24, note:'Compra proveedor' },
    { id:'m2', date:new Date(2026,5,5,12,5), product:'Almendras 250g', type:'Venta', qty:-3, note:'Boleta 46180' },
    { id:'m3', date:new Date(2026,5,4,16,40), product:'Queso Runca 500g', type:'Ajuste', qty:-1, note:'Merma' },
    { id:'m4', date:new Date(2026,5,4,10,15), product:'Mantequilla Lanalhue', type:'Reposición', qty:+12, note:'Compra proveedor' },
  ]));
  const [settings, setSettings] = usePersisted('cl_settings', {
    business:'Emporio Doña Marta', currency:'Peso chileno (CLP)',
    methods:['Efectivo','Tarjeta','Transferencia'],
    minStockDefault:5, minMargin:25,
  });
  const [toasts, setToasts] = useState([]);
  const toast = useCallback((msg, icon='check')=>{
    const id=Math.random().toString(36).slice(2);
    setToasts(t=>[...t,{id,msg,icon}]);
    setTimeout(()=> setToasts(t=>t.filter(x=>x.id!==id)), 2600);
  },[]);

  /* ── Credit / debt actions ── */
  const saldarDeuda = useCallback((saleId, montoPagado)=>{
    setSales(ss=> ss.map(s=>{
      if(s.id!==saleId) return s;
      const pagos = [...(s.pagos||[]), {fecha:new Date(), monto:montoPagado}];
      const totalPagado = pagos.reduce((a,p)=>a+p.monto,0);
      return {...s, pagos, pagado: totalPagado >= s.total, montoPendiente: Math.max(0, s.total - totalPagado)};
    }));
    toast('Pago registrado · '+fmtCLP(montoPagado));
  },[toast]);

  const registrarVenta = useCallback((items, method, extra={})=>{
    const total=items.reduce((a,it)=>a+it.price*it.qty,0);
    const cost=items.reduce((a,it)=>a+it.cost*it.qty,0);
    const boleta = Math.max(...sales.map(s=>s.boleta),46209)+1;
    const esCredito = method==='Crédito';
    const sale={ id:'b'+boleta, boleta, date:new Date(), items, method, total, cost, profit:total-cost,
      tipo: extra.tipo||'local', cliente: extra.cliente||null,
      credito: esCredito, pagado: !esCredito, montoPendiente: esCredito ? total : 0, pagos:[] };
    setSales(s=>[sale,...s]);
    setProducts(ps=> ps.map(p=>{
      // Find all cart items for this product (both format and non-format)
      const simpleIt = items.find(i=>i.productId===p.id&&!i.formatId);
      const fmtItems = items.filter(i=>i.productId===p.id&&i.formatId);
      if(!simpleIt && !fmtItems.length) return p;
      // Deduct: simple items deduct qty, format items deduct qty*baseUnitsPerItem
      const simpleDeduct = simpleIt ? simpleIt.qty : 0;
      const fmtDeduct = fmtItems.reduce((a,i)=>a+(i.qty*(i.baseUnitsPerItem||1)),0);
      const totalDeduct = simpleDeduct + fmtDeduct;
      const totalSold = simpleDeduct + fmtItems.reduce((a,i)=>a+i.qty,0);
      return {...p, stock:Math.max(0,p.stock-totalDeduct), sold:p.sold+totalSold};
    }));
    setMovements(m=>[{ id:'mv'+boleta, date:new Date(), product:items.length>1?`${items.length} productos`:items[0].name, type:'Venta', qty:-items.reduce((a,i)=>a+i.qty,0), note:'Boleta '+boleta }, ...m]);
    toast('Venta registrada · '+fmtCLP(total));
    return sale;
  },[sales, toast]);

  const addProduct = useCallback((p)=>{
    setProducts(ps=>{ const id=Math.max(...ps.map(x=>x.id))+1;
      return [...ps, {...p, id, margin:p.price-p.cost, marginPct:Math.round((p.price-p.cost)/p.price*1000)/10, sold:0}];
    });
    toast('Producto agregado');
  },[toast]);

  const updateProduct = useCallback((id, patch)=>{
    setProducts(ps=> ps.map(p=> p.id===id ? (()=>{ const n={...p,...patch}; n.margin=n.price-n.cost; n.marginPct=n.price?Math.round((n.price-n.cost)/n.price*1000)/10:0; return n; })() : p));
  },[]);

  const reponer = useCallback((id, qty)=>{
    setProducts(ps=> ps.map(p=> p.id===id? {...p, stock:p.stock+qty} : p));
    const p=products.find(x=>x.id===id);
    setMovements(m=>[{ id:'mv'+Date.now(), date:new Date(), product:p?.name, type:'Reposición', qty:+qty, note:'Reposición manual' }, ...m]);
    toast('Stock repuesto · +'+qty+' u.');
  },[products, toast]);

  const ajustarStock = useCallback((id, nuevo, note)=>{
    const p=products.find(x=>x.id===id); const diff=nuevo-(p?.stock||0);
    setProducts(ps=> ps.map(x=> x.id===id? {...x, stock:nuevo} : x));
    setMovements(m=>[{ id:'mv'+Date.now(), date:new Date(), product:p?.name, type:'Ajuste', qty:diff, note:note||'Ajuste manual' }, ...m]);
    toast('Stock ajustado');
  },[products, toast]);

  const addClientes = useCallback((arr)=>{
    setClientes(cs=>{ const ids=new Set(cs.map(c=>c.correo.toLowerCase())); const nuevos=arr.filter(c=>!ids.has((c.correo||'').toLowerCase())); return [...cs,...nuevos]; });
    toast('Importación completada');
  },[toast]);

  const updateCliente = useCallback((id,patch)=>{ setClientes(cs=>cs.map(c=>c.id===id?{...c,...patch}:c)); },[]);

  const value={ products, sales, movements, settings, setSettings, toast, clientes,
    registrarVenta, addProduct, updateProduct, reponer, ajustarStock, addClientes, updateCliente, saldarDeuda };
  return (
    <Store.Provider value={value}>
      {children}
      <div className="toast-wrap">
        {toasts.map(t=>(
          <div key={t.id} className="toast">
            <span style={{display:'grid',placeItems:'center',width:20,height:20,borderRadius:6,background:'var(--primary)'}}>
              <Icon name={t.icon} size={13}/>
            </span>{t.msg}
          </div>
        ))}
      </div>
    </Store.Provider>
  );
}

/* ---------- Derived metrics ---------- */
function useMetrics(){
  const { products, sales } = useStore();
  return useMemo(()=>{
    const todaySales = sales.filter(s=> s.date.toDateString()===TODAY.toDateString());
    const todayTotal = todaySales.reduce((a,s)=>a+s.total,0);
    const todayProfit = todaySales.reduce((a,s)=>a+s.profit,0);
    const todayCost = todaySales.reduce((a,s)=>a+s.cost,0);
    const boletas = todaySales.length;
    const avgMargin = todayTotal? todayProfit/todayTotal*100 : 0;

    // Monthly by category (from cumulative product.sold)
    const byCat={};
    for(const p of products){
      const c=byCat[p.cat] || (byCat[p.cat]={cat:p.cat, units:0, revenue:0, cost:0, profit:0});
      c.units+=p.sold; c.revenue+=p.sold*p.price; c.cost+=p.sold*p.cost; c.profit+=p.sold*(p.price-p.cost);
    }
    const cats=Object.values(byCat).map(c=>({...c, marginPct:c.revenue?c.profit/c.revenue*100:0, color:catColor(c.cat)}))
      .sort((a,b)=>b.revenue-a.revenue);
    const totRevenue=cats.reduce((a,c)=>a+c.revenue,0);
    const totCost=cats.reduce((a,c)=>a+c.cost,0);
    const totProfit=cats.reduce((a,c)=>a+c.profit,0);
    cats.forEach(c=> c.share = totRevenue? c.revenue/totRevenue*100 : 0);

    // Payment methods (today)
    const pay={};
    for(const s of todaySales){ pay[s.method]=(pay[s.method]||0)+s.total; }

    // Top products by units sold
    const topProducts=[...products].sort((a,b)=>b.sold-a.sold).slice(0,6);
    const bestMargin=[...products].filter(p=>p.price>0).sort((a,b)=>b.marginPct-a.marginPct).slice(0,5);
    const worstMargin=[...products].filter(p=>p.price>0).sort((a,b)=>a.marginPct-b.marginPct).slice(0,5);

    const lowStock=products.filter(p=> stockState(p)!=='ok');
    const topCat=cats[0];

    // Per-canal metrics (from today's sales)
    function canalMetrics(salesArr){
      const local = salesArr.filter(s=>(s.tipo||'local')==='local');
      const despacho = salesArr.filter(s=>s.tipo==='despacho');
      const calc = arr=>({ count:arr.length, total:arr.reduce((a,s)=>a+s.total,0), cost:arr.reduce((a,s)=>a+s.cost,0), profit:arr.reduce((a,s)=>a+s.profit,0) });
      const lm=calc(local), dm=calc(despacho);
      return {
        local:{...lm, margin:lm.total?lm.profit/lm.total*100:0, ticket:lm.count?lm.total/lm.count:0},
        despacho:{...dm, margin:dm.total?dm.profit/dm.total*100:0, ticket:dm.count?dm.total/dm.count:0},
      };
    }
    const canalHoy = canalMetrics(todaySales);
    // Monthly canal approximation (scale from today's ratio)
    const localShare = todayTotal>0?(canalHoy.local.total/todayTotal):0.62;
    const canalMes = {
      local:{ count:Math.round(boletas*localShare*25), total:totRevenue*localShare, cost:totCost*localShare, profit:totProfit*localShare, margin:totRevenue?totProfit/totRevenue*100:0, ticket:totRevenue*localShare/(boletas*localShare*25||1) },
      despacho:{ count:Math.round(boletas*(1-localShare)*25), total:totRevenue*(1-localShare), cost:totCost*(1-localShare), profit:totProfit*(1-localShare), margin:totRevenue?totProfit/totRevenue*100:0, ticket:totRevenue*(1-localShare)/(boletas*(1-localShare)*25||1) },
    };

    // Debt metrics
    const deudaPendiente = sales.filter(s=>s.credito&&!s.pagado);
    const totalDeuda = deudaPendiente.reduce((a,s)=>a+(s.montoPendiente||s.total),0);
    const clientesDeudoresList = [...new Set(deudaPendiente.map(s=>s.cliente?.nombre).filter(Boolean))];
    const deudaPorCliente={};
    for(const s of deudaPendiente){
      const k=s.cliente?.nombre||'Sin nombre';
      if(!deudaPorCliente[k]) deudaPorCliente[k]={nombre:k,telefono:s.cliente?.telefono||'',ventas:[],total:0};
      deudaPorCliente[k].ventas.push(s); deudaPorCliente[k].total+=(s.montoPendiente||s.total);
    }

    return { todaySales, todayTotal, todayProfit, todayCost, boletas, avgMargin,
      cats, totRevenue, totCost, totProfit, totMargin: totRevenue?totProfit/totRevenue*100:0,
      pay, topProducts, bestMargin, worstMargin, lowStock, topCat,
      canalHoy, canalMes,
      totalDeuda, clientesDeudores: clientesDeudoresList.length, deudaPorCliente, deudaPendiente };
  },[products, sales]);
}

Object.assign(window, { StoreProvider, useStore, useMetrics, TODAY, fmtDate, clientMetrics, buildSalesCSV, exportCSV });
