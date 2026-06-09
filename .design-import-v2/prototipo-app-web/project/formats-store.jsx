/* ---------- Formats Store: multi-format inventory ---------- */

const FmtCtx = React.createContext(null);
function useFormats(){ return React.useContext(FmtCtx); }

/* ── Seed formats from existing products ──────── */
function seedFormats(products){
  const formats = [];

  /* Huevos: unit base = 1 huevo */
  const huevos = products.filter(p=>p.cat==='Huevos');
  huevos.forEach(p=>{
    const cpu = p.cost; // cost per unit
    formats.push(...[
      {id:`f-${p.id}-1`,  productId:p.id, name:'Pack 6 unidades',   qty:6,   price:Math.round(cpu*6*1.45)},
      {id:`f-${p.id}-2`,  productId:p.id, name:'Docena 12 unidades', qty:12,  price:Math.round(cpu*12*1.42)},
      {id:`f-${p.id}-3`,  productId:p.id, name:'Bandeja 30 unidades',qty:30,  price:p.price},
      {id:`f-${p.id}-4`,  productId:p.id, name:'Pack 90 unidades',   qty:90,  price:Math.round(p.price*2.9)},
      {id:`f-${p.id}-5`,  productId:p.id, name:'Caja 180 unidades',  qty:180, price:Math.round(p.price*5.5)},
    ]);
  });

  /* Frutos secos: unit base = 1 unidad (bag/portion already defined by product) */
  const gFrutos = products.filter(p=>p.cat==='Frutos secos');
  gFrutos.forEach(p=>{
    // Formats are multiples of the existing product unit (1 bag, 2 bags, 5 bags, etc.)
    const pu = p.unit||'';
    formats.push(...[
      {id:`f-${p.id}-1`, productId:p.id, name:`1 ${pu}`,     qty:1,  price:p.price},
      {id:`f-${p.id}-2`, productId:p.id, name:`2 ${pu}`,     qty:2,  price:Math.round(p.price*2*0.97)},
      {id:`f-${p.id}-3`, productId:p.id, name:`5 ${pu}`,     qty:5,  price:Math.round(p.price*5*0.93)},
      {id:`f-${p.id}-4`, productId:p.id, name:`Caja 10 ${pu}`,qty:10, price:Math.round(p.price*10*0.88)},
    ]);
  });

  /* Quesos: similar approach — multiples of existing unit */
  const quesos = products.filter(p=>p.cat==='Quesos'||p.cat==='Queso de cabra');
  quesos.forEach(p=>{
    const pu=p.unit||'';
    formats.push(...[
      {id:`f-${p.id}-1`, productId:p.id, name:`1 ${pu}`,     qty:1,  price:p.price},
      {id:`f-${p.id}-2`, productId:p.id, name:`2 ${pu}`,     qty:2,  price:Math.round(p.price*2*0.96)},
      {id:`f-${p.id}-3`, productId:p.id, name:`3 ${pu}`,     qty:3,  price:Math.round(p.price*3*0.93)},
      {id:`f-${p.id}-4`, productId:p.id, name:`Caja 6 ${pu}`,qty:6,  price:Math.round(p.price*6*0.87)},
    ]);
  });

  return formats;
}

/* ── Which products have formats enabled ──────── */
function seedHasFormats(products){
  const enabled = {};
  products.forEach(p=>{
    if(p.cat==='Huevos'||p.cat==='Frutos secos'||p.cat==='Quesos'||p.cat==='Queso de cabra')
      enabled[p.id]=true;
  });
  return enabled;
}

/* ── Base unit config per category ────────────── */
const BASE_UNITS = {
  'Huevos':        { unit:'unidad',  label:'unidades', displayFn: n=>`${n} u.` },
  'Frutos secos':  { unit:'unidad',  label:'unidades', displayFn: n=>`${n} u.` },
  'Quesos':        { unit:'unidad',  label:'unidades', displayFn: n=>`${n} u.` },
  'Queso de cabra':{ unit:'unidad',  label:'unidades', displayFn: n=>`${n} u.` },
};
function getBaseUnit(cat){ return BASE_UNITS[cat]||{ unit:'unidad', label:'unidades', displayFn:n=>n+' u.' }; }

/* ── Provider ─────────────────────────────────── */
function FormatsProvider({ children }){
  const { products } = useStore();
  const [formats, setFormats] = useState(()=>seedFormats(products));
  const [hasFormats, setHasFormats] = useState(()=>seedHasFormats(products));

  const getFormats = React.useCallback((productId)=>
    formats.filter(f=>f.productId===productId)
  ,[formats]);

  const getFormat = React.useCallback((formatId)=>
    formats.find(f=>f.id===formatId)
  ,[formats]);

  const productHasFormats = React.useCallback((productId)=>!!hasFormats[productId],[hasFormats]);

  const toggleFormats = React.useCallback((productId,val)=>
    setHasFormats(h=>({...h,[productId]:val}))
  ,[]);

  const addFormat = React.useCallback((productId, f)=>
    setFormats(fs=>[...fs,{...f,id:`f-${productId}-${Date.now()}`,productId}])
  ,[]);

  const updateFormat = React.useCallback((id,patch)=>
    setFormats(fs=>fs.map(f=>f.id===id?{...f,...patch}:f))
  ,[]);

  const deleteFormat = React.useCallback((id)=>
    setFormats(fs=>fs.filter(f=>f.id!==id))
  ,[]);

  /* Stock helpers */
  const baseStockForSale = React.useCallback((productId, formatId, qty, products)=>{
    const fmt = formats.find(f=>f.id===formatId);
    if(!fmt) return qty;
    return fmt.qty * qty;
  },[formats]);

  const canSellFormat = React.useCallback((product, formatId, qty=1)=>{
    const fmt = formats.find(f=>f.id===formatId);
    if(!fmt) return {ok:true, needed:qty, available:product.stock};
    const needed = fmt.qty * qty;
    return { ok: product.stock >= needed, needed, available: product.stock, formatQty: fmt.qty };
  },[formats]);

  const maxUnitsForFormat = React.useCallback((product, formatId)=>{
    const fmt = formats.find(f=>f.id===formatId);
    if(!fmt||fmt.qty<=0) return 0;
    return Math.floor(product.stock / fmt.qty);
  },[formats]);

  return (
    <FmtCtx.Provider value={{ formats, hasFormats, getFormats, getFormat, productHasFormats, toggleFormats, addFormat, updateFormat, deleteFormat, baseStockForSale, canSellFormat, maxUnitsForFormat }}>
      {children}
    </FmtCtx.Provider>
  );
}

Object.assign(window, { FormatsProvider, useFormats, getBaseUnit, BASE_UNITS });
