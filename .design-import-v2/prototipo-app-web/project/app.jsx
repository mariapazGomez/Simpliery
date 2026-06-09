/* ---------- App shell: sidebar + routing ---------- */
const NAV_GROUPS = [
  { label:'Operación', items:[
    { id:'dashboard',     label:'Inicio',           icon:'dashboard'  },
    { id:'ventas',        label:'Ventas',            icon:'ventas'     },
    { id:'productos',     label:'Productos',         icon:'productos'  },
    { id:'inventario',    label:'Inventario',        icon:'inventario' },
    { id:'despachos',     label:'Despachos',         icon:'truck'      },
    { id:'proveedores',   label:'Proveedores',       icon:'store'      },
    { id:'cierreCaja',    label:'Cierre de caja',    icon:'wallet'     },
  ]},
  { label:'Clientes', items:[
    { id:'clientes',      label:'Clientes',          icon:'clientes'   },
    { id:'segmentos',     label:'Segmentos',         icon:'segment'    },
  ]},
  { label:'Gestión', items:[
    { id:'finanzas',      label:'Finanzas',          icon:'wallet'     },
    { id:'recordatorios', label:'Recordatorios',     icon:'bell'       },
    { id:'reportes',      label:'Reportes',          icon:'reportes'   },
  ]},
  { label:'Administración', items:[
    { id:'notificaciones',label:'Notificaciones',    icon:'bell'       },
    { id:'usuarios',      label:'Usuarios',          icon:'users'      },
    { id:'config',        label:'Configuración',     icon:'config'     },
  ]},
];
const TITLES = {
  dashboard:     ['Inicio',           'Tu negocio de un vistazo'],
  ventas:        ['Ventas',           'Registra una venta en segundos'],
  productos:     ['Productos',        'Tu catálogo y precios'],
  inventario:    ['Inventario',       'Stock y reposición'],
  clientes:      ['Clientes',         'Historial y análisis de compra'],
  segmentos:     ['Segmentos',        'Filtra y comunícate con tus clientes'],
  finanzas:      ['Finanzas',         'Flujo de caja, metas y gastos'],
  reportes:      ['Reportes',         'Cómo va tu negocio'],
  despachos:     ['Despachos',        'Entregas y rutas del día'],
  notificaciones:['Notificaciones',   'Alertas y recordatorios automáticos'],
  recordatorios: ['Recordatorios',    'Tareas y pendientes del negocio'],
  usuarios:      ['Usuarios',         'Equipo y permisos de acceso'],
  config:        ['Configuración',    'Ajustes del negocio'],
  proveedores:   ['Proveedores',      'Contactos y condiciones de compra'],
  cierreCaja:    ['Cierre de caja',   'Reconciliación de fin de jornada'],
};

function Sidebar({ route, go, open, setOpen }){
  const { settings, clientes } = useStore();
  const m = useMetrics();
  // upcoming buyers badge
  const { useState: _us, useMemo: _um } = React;
  const proximos = _um(()=>{
    return clientes.map(c=>clientMetrics(c)).filter(x=>x.daysUntilNext!=null&&x.daysUntilNext>=0&&x.daysUntilNext<=3).length;
  },[clientes]);

  const item = (n)=>(
    <button key={n.id} className={'nav-item'+(route===n.id?' active':'')} onClick={()=>{ go(n.id); setOpen(false); }}>
      <Icon name={n.icon} size={19} className="nav-ic"/>{n.label}
      {n.id==='inventario' && m.lowStock.length>0 && <span className="nav-badge">{m.lowStock.length}</span>}
      {n.id==='segmentos' && proximos>0 && <span className="nav-badge">{proximos}</span>}
      {n.id==='recordatorios' && <span className="nav-badge" style={{background:'var(--terra)'}}>!</span>}
      {n.id==='clientes' && m.totalDeuda>0 && <span className="nav-badge">{m.clientesDeudores}</span>}
    </button>
  );
  return (
    <aside className={'sidebar'+(open?' open':'')} style={{overflowY:'auto'}}>
      <div className="brand">
        <div className="brand-mark"><Icon name="store" size={21}/></div>
        <div><div className="brand-name">Control Local</div><div className="brand-sub">{settings.business}</div></div>
      </div>
      <button className="btn btn-primary" style={{margin:'2px 6px 6px', justifyContent:'center'}} onClick={()=>{ go('ventas'); setOpen(false); }}>
        <Icon name="plus" size={17}/>Registrar venta
      </button>
      {NAV_GROUPS.map(g=>(
        <div key={g.label}>
          <div className="nav-label">{g.label}</div>
          {g.items.map(item)}
        </div>
      ))}
      <div className="sidebar-foot">
        <div className="user-chip">
          <div className="avatar">M</div>
          <div style={{flex:1, minWidth:0}}>
            <div style={{fontWeight:700, fontSize:13.5, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis'}}>Marta Soto</div>
            <div style={{fontSize:11.5, color:'var(--ink-3)', fontWeight:600}}>Dueña</div>
          </div>
          <Icon name="config" size={15} style={{color:'var(--ink-3)'}}/>
        </div>
      </div>
    </aside>
  );
}

const MOBILE_NAV = [
  {id:'dashboard', label:'Inicio',   icon:'dashboard'},
  {id:'ventas',    label:'Vender',   icon:'ventas', primary:true},
  {id:'inventario',label:'Stock',    icon:'inventario'},
  {id:'clientes',  label:'Clientes', icon:'clientes'},
  {id:'finanzas',  label:'Finanzas', icon:'wallet'},
];

function App(){
  const [route,setRoute]=useState(()=> localStorage.getItem('cl_route')||'dashboard');
  const [open,setOpen]=useState(false);
  const [notifOpen,setNotifOpen]=useState(false);
  const go=(r)=>{ setRoute(r); localStorage.setItem('cl_route',r); window.scrollTo(0,0); setNotifOpen(false); };
  const [t1]=TITLES[route]||['—',''];
  const SCREENS = { dashboard:Dashboard, ventas:Ventas, productos:Productos, inventario:Inventario,
    clientes:Clientes, segmentos:Segmentos, finanzas:Finanzas, reportes:Reportes, despachos:Despachos,
    notificaciones:Notificaciones, recordatorios:Recordatorios, usuarios:Usuarios, config:Configuracion,
    proveedores:Proveedores, cierreCaja:CierreCaja };
  const [searchOpen, setSearchOpen] = useState(false);
  // Keyboard shortcut: Cmd/Ctrl+K
  useEffect(()=>{ const h=e=>{ if((e.metaKey||e.ctrlKey)&&e.key==='k'){ e.preventDefault(); setSearchOpen(v=>!v); } }; window.addEventListener('keydown',h); return ()=>window.removeEventListener('keydown',h); },[]);
  const Screen = SCREENS[route] || Dashboard;
  const m = useMetrics();
  const notifCount = m.lowStock.length + (m.cats.filter(c=>c.marginPct<25).length>0?1:0);
  return (
    <div className="app">
      <div className={'scrim'+(open?' show':'')} onClick={()=>setOpen(false)}></div>
      <Sidebar route={route} go={go} open={open} setOpen={setOpen}/>
      <div className="main">
        <header className="topbar">
          <button className="hamburger" onClick={()=>setOpen(true)} aria-label="Menú">
            <Icon name="dashboard" size={18}/>
          </button>
          <div style={{flex:1, minWidth:0}}><h1>{t1}</h1></div>
          <div className="search" onClick={()=>setSearchOpen(true)} style={{cursor:'pointer'}}>
            <Icon name="search" size={16}/>
            <input placeholder="Buscar… (⌘K)" readOnly style={{cursor:'pointer'}}/>
          </div>
          <button className="btn btn-ghost btn-icon" title="Avisos" style={{position:'relative'}} onClick={()=>setNotifOpen(v=>!v)}>
            <Icon name="bell" size={18}/>
            {notifCount>0 && <span style={{position:'absolute',top:7,right:8,width:7,height:7,borderRadius:'50%',background:'var(--danger)'}}></span>}
          </button>
        </header>
        <div className="content">
          <Screen go={go}/>
        </div>
      </div>
      <nav className="mobile-nav">
        {MOBILE_NAV.map(n=>(
          <button key={n.id} onClick={()=>go(n.id)} className={'mobile-nav-btn'+(route===n.id?' active':'')}
            style={n.primary?{background:'var(--primary)',color:'#fff',borderRadius:14,transform:'scale(1.08)'}:{}}>
            <Icon name={n.icon} size={22}/>{n.label}
          </button>
        ))}
      </nav>
      <NotifDrawer open={notifOpen} onClose={()=>setNotifOpen(false)} go={go}/>
      {searchOpen && <GlobalSearch onClose={()=>setSearchOpen(false)} go={go}/>}
    </div>
  );
}

class ErrorBoundary extends React.Component {
  constructor(p){ super(p); this.state={err:null}; }
  static getDerivedStateFromError(e){ return {err:e}; }
  render(){
    if(this.state.err) return (
      <div style={{padding:'48px 32px',textAlign:'center',display:'flex',flexDirection:'column',alignItems:'center',gap:12}}>
        <div style={{width:56,height:56,borderRadius:16,background:'var(--danger-tint)',color:'var(--danger)',display:'grid',placeItems:'center'}}><Icon name="alert" size={26}/></div>
        <div style={{fontWeight:800,fontSize:18}}>Algo salió mal</div>
        <div style={{color:'var(--ink-3)',fontSize:14,maxWidth:340}}>{this.state.err.message}</div>
        <button className="btn btn-primary" onClick={()=>this.setState({err:null})}>Reintentar</button>
      </div>
    );
    return this.props.children;
  }
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <StoreProvider><FormatsProvider><FinanzasProvider>
    <ErrorBoundary><App/></ErrorBoundary>
    <TweaksUI/>
  </FinanzasProvider></FormatsProvider></StoreProvider>
);
