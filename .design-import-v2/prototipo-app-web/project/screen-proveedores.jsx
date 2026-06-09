/* ---------- Proveedores: gestión simple de proveedores ---------- */

const PROV_CATS = ['Aceitunas','Embutidos','Frutos secos','Huevos','Mantequillas','Mermeladas','Queso de cabra','Quesos','General'];

function seedProveedores(){
  return [
    { id:'pv1', nombre:'Huevos del Valle', contacto:'Roberto Fuentes', telefono:'+56912345678', correo:'huevosdelvalle@mail.com', categorias:['Huevos'], condicion:'30 días', notas:'Entrega lunes y jueves', activo:true, pedidos:12, ultimoPedido:new Date(2026,5,3) },
    { id:'pv2', nombre:'Quesos del Sur', contacto:'Ana María Lagos', telefono:'+56923456789', correo:'quesossur@mail.com', categorias:['Quesos','Queso de cabra'], condicion:'15 días', notas:'Requiere pedido mínimo $50.000', activo:true, pedidos:8, ultimoPedido:new Date(2026,5,1) },
    { id:'pv3', nombre:'Frutos Selectos SpA', contacto:'Carlos Rodríguez', telefono:'+56934567890', correo:'frutos@mail.com', categorias:['Frutos secos'], condicion:'Contado', notas:'Precio por volumen +5kg', activo:true, pedidos:5, ultimoPedido:new Date(2026,4,28) },
    { id:'pv4', nombre:'Aceitunas Maipo', contacto:'Patricia Vega', telefono:'+56945678901', correo:'aceitunas@mail.com', categorias:['Aceitunas'], condicion:'15 días', notas:'Granel disponible', activo:true, pedidos:6, ultimoPedido:new Date(2026,4,20) },
    { id:'pv5', nombre:'Embutidos Sur', contacto:'Jorge Soto', telefono:'+56956789012', correo:'embutidos@mail.com', categorias:['Embutidos'], condicion:'Contado', notas:'Solo efectivo o transferencia', activo:false, pedidos:3, ultimoPedido:new Date(2026,3,15) },
  ];
}

function ProveedorModal({ initial, onSave, onClose }){
  const [f,setF]=useState(initial||{ nombre:'', contacto:'', telefono:'', correo:'', categorias:[], condicion:'Contado', notas:'', activo:true });
  const set=(k,v)=>setF(s=>({...s,[k]:v}));
  const toggleCat=(c)=>set('categorias', f.categorias.includes(c)?f.categorias.filter(x=>x!==c):[...f.categorias,c]);
  return (
    <Modal title={initial?'Editar proveedor':'Agregar proveedor'} sub="Registra contacto, categorías y condiciones de pago" onClose={onClose} width={520}
      footer={<><button className="btn btn-ghost" onClick={onClose}>Cancelar</button>
        <button className="btn btn-primary" disabled={!f.nombre.trim()} onClick={()=>{ onSave({...f, id:initial?.id||'pv'+Date.now(), pedidos:initial?.pedidos||0, ultimoPedido:initial?.ultimoPedido||new Date()}); onClose(); }}><Icon name="check" size={16}/>Guardar</button></>}>
      <div style={{display:'grid',gap:14}}>
        <div className="grid" style={{gridTemplateColumns:'1fr 1fr'}}>
          <Field label="Nombre del proveedor"><input className="input" value={f.nombre} onChange={e=>set('nombre',e.target.value)} placeholder="Ej: Huevos del Valle" autoFocus/></Field>
          <Field label="Contacto"><input className="input" value={f.contacto} onChange={e=>set('contacto',e.target.value)} placeholder="Nombre de la persona"/></Field>
        </div>
        <div className="grid" style={{gridTemplateColumns:'1fr 1fr'}}>
          <Field label="Teléfono / WhatsApp"><input className="input" value={f.telefono} onChange={e=>set('telefono',e.target.value)} placeholder="+56912345678"/></Field>
          <Field label="Correo"><input className="input" value={f.correo} onChange={e=>set('correo',e.target.value)} placeholder="correo@mail.com"/></Field>
        </div>
        <Field label="Categorías que provee">
          <div style={{display:'flex',gap:7,flexWrap:'wrap',marginTop:4}}>
            {PROV_CATS.map(c=>(
              <button key={c} onClick={()=>toggleCat(c)} className="chip" style={{cursor:'pointer',border:'1px solid '+(f.categorias.includes(c)?'var(--primary)':'var(--line)'),background:f.categorias.includes(c)?'var(--primary-tint)':'var(--surface)',color:f.categorias.includes(c)?'var(--primary-700)':'var(--ink-2)',padding:'5px 11px',fontFamily:'inherit'}}>{c}</button>
            ))}
          </div>
        </Field>
        <div className="grid" style={{gridTemplateColumns:'1fr 1fr'}}>
          <Field label="Condición de pago"><select className="select" value={f.condicion} onChange={e=>set('condicion',e.target.value)}><option>Contado</option><option>7 días</option><option>15 días</option><option>30 días</option><option>45 días</option><option>60 días</option></select></Field>
          <Field label="Estado"><select className="select" value={f.activo?'activo':'inactivo'} onChange={e=>set('activo',e.target.value==='activo')}><option value="activo">Activo</option><option value="inactivo">Inactivo</option></select></Field>
        </div>
        <Field label="Notas internas"><input className="input" value={f.notas} onChange={e=>set('notas',e.target.value)} placeholder="Ej: pedido mínimo, días de entrega, etc."/></Field>
      </div>
    </Modal>
  );
}

function Proveedores(){
  const { toast, products } = useStore();
  const [proveedores, setProveedores] = usePersisted('cl_proveedores', seedProveedores);
  const addProv = (p)=>setProveedores(ps=>[...ps,p]);
  const updateProv = (id,p)=>setProveedores(ps=>ps.map(x=>x.id===id?{...x,...p}:x));
  const [form,setForm]=useState(false);
  const [edit,setEdit]=useState(null);
  const [q,setQ]=useState('');
  const [cat,setCat]=useState('Todas');
  const cats = ['Todas',...new Set(proveedores.flatMap(p=>p.categorias))];
  const list = proveedores.filter(p=>(cat==='Todas'||p.categorias.includes(cat))&&p.nombre.toLowerCase().includes(q.toLowerCase()));

  // products by supplier (by matching categories)
  const prodsByProv = (pv)=> products.filter(p=>pv.categorias.includes(p.cat));

  return (
    <div className="fade-in">
      <PageHeader title="Proveedores" sub={`${proveedores.filter(p=>p.activo).length} proveedores activos`}>
        <SearchBox value={q} onChange={setQ} placeholder="Buscar proveedor…"/>
        <button className="btn btn-primary" onClick={()=>setForm(true)}><Icon name="plus" size={16}/>Agregar proveedor</button>
      </PageHeader>

      <div className="grid" style={{gridTemplateColumns:'repeat(auto-fit,minmax(170px,1fr))',marginBottom:18}}>
        <Metric icon="users" label="Proveedores activos" value={proveedores.filter(p=>p.activo).length} tone="primary"/>
        <Metric icon="tag" label="Categorías cubiertas" value={new Set(proveedores.flatMap(p=>p.categorias)).size} tone="info"/>
        <Metric icon="truck" label="Pedidos totales" value={proveedores.reduce((a,p)=>a+p.pedidos,0)} tone="terra"/>
        <Metric icon="clock" label="Último pedido" value={proveedores.filter(p=>p.ultimoPedido).sort((a,b)=>b.ultimoPedido-a.ultimoPedido)[0]?.nombre.split(' ')[0]||'—'} tone="primary"/>
      </div>

      <div style={{display:'flex',gap:7,marginBottom:16,overflowX:'auto',paddingBottom:2}}>
        {cats.map(c=><button key={c} onClick={()=>setCat(c)} className="chip" style={{border:'1px solid var(--line)',cursor:'pointer',whiteSpace:'nowrap',background:cat===c?'var(--primary)':'var(--surface)',color:cat===c?'#fff':'var(--ink-2)',padding:'7px 14px',fontSize:13}}>{c}</button>)}
      </div>

      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(300px,1fr))',gap:16}}>
        {list.map(pv=>{
          const diasDesde = pv.ultimoPedido?Math.round((TODAY-pv.ultimoPedido)/86400000):null;
          const prods = prodsByProv(pv);
          const bajos = prods.filter(p=>p.stock<=p.min);
          return (
            <div key={pv.id} className="card" style={{padding:'18px 20px',opacity:pv.activo?1:0.6}}>
              <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',marginBottom:12}}>
                <div>
                  <div style={{fontWeight:800,fontSize:15}}>{pv.nombre}</div>
                  <div style={{fontSize:12.5,color:'var(--ink-3)',fontWeight:600,marginTop:2}}>{pv.contacto}</div>
                </div>
                <div style={{display:'flex',gap:6}}>
                  <button className="btn btn-ghost btn-icon" style={{width:30,height:30}} onClick={()=>setEdit(pv)}><Icon name="edit" size={14}/></button>
                  {!pv.activo && <span className="chip chip-neutral" style={{fontSize:11}}>Inactivo</span>}
                </div>
              </div>
              <div style={{display:'flex',gap:6,flexWrap:'wrap',marginBottom:10}}>
                {pv.categorias.map(c=><span key={c} className="chip chip-neutral" style={{fontSize:11.5,padding:'3px 9px'}}>{c}</span>)}
              </div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginBottom:10}}>
                <div style={{padding:'8px 10px',background:'var(--surface-3)',borderRadius:9,textAlign:'center'}}>
                  <div style={{fontWeight:800,fontSize:15}}>{pv.pedidos}</div>
                  <div style={{fontSize:11,color:'var(--ink-3)',fontWeight:700}}>Pedidos</div>
                </div>
                <div style={{padding:'8px 10px',background:'var(--surface-3)',borderRadius:9,textAlign:'center'}}>
                  <div style={{fontWeight:800,fontSize:15}}>{diasDesde!==null?diasDesde+'d':'—'}</div>
                  <div style={{fontSize:11,color:'var(--ink-3)',fontWeight:700}}>Último pedido</div>
                </div>
              </div>
              {bajos.length>0 && <div style={{padding:'7px 10px',background:'var(--warn-tint)',borderRadius:9,fontSize:12.5,fontWeight:700,color:'oklch(0.50 0.10 70)',marginBottom:10}}><Icon name="alert" size={13} style={{verticalAlign:'-2px',marginRight:5}}/>{bajos.length} producto{bajos.length!==1?'s':''} por reponer</div>}
              <div style={{display:'flex',gap:7,flexWrap:'wrap'}}>
                {pv.telefono && <a href={`https://wa.me/${pv.telefono.replace(/\D/g,'')}?text=${encodeURIComponent('Hola '+pv.contacto.split(' ')[0]+', me gustaría hacer un pedido.')}`} target="_blank" rel="noopener noreferrer"><button className="btn btn-ghost" style={{fontSize:12.5,padding:'6px 11px'}}><Icon name="phone" size={14}/>WA</button></a>}
                {pv.correo && <a href={`mailto:${pv.correo}?subject=Pedido ${new Date().toLocaleDateString('es-CL')}`}><button className="btn btn-ghost" style={{fontSize:12.5,padding:'6px 11px'}}><Icon name="mail" size={14}/>Email</button></a>}
                <button className="btn btn-soft" style={{fontSize:12.5,padding:'6px 11px',marginLeft:'auto'}} onClick={()=>{ updateProv(pv.id,{pedidos:pv.pedidos+1,ultimoPedido:new Date()}); toast('Pedido registrado'); }}><Icon name="truck" size={14}/>Registrar pedido</button>
              </div>
              {pv.notas && <div style={{marginTop:8,fontSize:12,color:'var(--ink-3)',fontWeight:600,fontStyle:'italic'}}>{pv.notas}</div>}
            </div>
          );
        })}
        {list.length===0 && <div style={{gridColumn:'1/-1'}}><EmptyState icon="truck" title="Sin proveedores" text="Agrega tus proveedores para tener sus datos a mano al reponer stock." action={<button className="btn btn-primary" onClick={()=>setForm(true)}><Icon name="plus" size={15}/>Agregar proveedor</button>}/></div>}
      </div>

      {form && <ProveedorModal onSave={addProv} onClose={()=>setForm(false)}/>}
      {edit && <ProveedorModal initial={edit} onSave={p=>updateProv(edit.id,p)} onClose={()=>setEdit(null)}/>}
    </div>
  );
}
window.Proveedores = Proveedores;
