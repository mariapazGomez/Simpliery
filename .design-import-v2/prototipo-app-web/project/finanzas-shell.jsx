/* ---------- Finanzas y Contabilidad: main screen shell ---------- */
const FIN_TABS = [
  { id:'resumen',       label:'Resumen',               icon:'wallet',      group:'principal' },
  { id:'resultados',    label:'Estado de resultados',  icon:'receipt',     group:'principal' },
  { id:'flujo',         label:'Flujo de caja',         icon:'trending',    group:'principal' },
  { id:'cxc',           label:'Por cobrar',            icon:'coins',       group:'cuentas'   },
  { id:'cxp',           label:'Por pagar',             icon:'tag',         group:'cuentas'   },
  { id:'deudas',        label:'Deudas y créditos',     icon:'building',    group:'cuentas'   },
  { id:'balance',       label:'Balance',               icon:'balance',     group:'cuentas'   },
  { id:'iva',           label:'IVA e impuestos',       icon:'calculator',  group:'tributario'},
  { id:'documentos',    label:'Documentos',            icon:'receipt',     group:'tributario'},
  { id:'metas',         label:'Metas',                 icon:'target',      group:'gestion'   },
  { id:'gastos',        label:'Gastos',                icon:'coins',       group:'gestion'   },
  { id:'proyeccion',    label:'Proyección',            icon:'trendUp',     group:'gestion'   },
  { id:'equilibrio',    label:'Equilibrio',            icon:'balance',     group:'gestion'   },
  { id:'exportar',      label:'Exportar',              icon:'download',    group:'contador'  },
];

const TAB_GROUPS = [
  { id:'principal', label:'Principal' },
  { id:'cuentas',   label:'Cuentas'   },
  { id:'tributario',label:'Tributario'},
  { id:'gestion',   label:'Gestión'   },
  { id:'contador',  label:'Contador'  },
];

function Finanzas(){
  const [tab, setTab] = useState(()=> localStorage.getItem('fin_tab')||'resumen');
  const goTab = (t)=>{ setTab(t); localStorage.setItem('fin_tab',t); };
  const m = useFinMetrics();
  const { creditos } = useFinanzas();

  const SCREENS = {
    resumen:     ()=> <FinResumen setTab={goTab}/>,
    resultados:  ()=> <FinResultados/>,
    flujo:       ()=> <FinFlujo/>,
    cxc:         ()=> <FinCxC/>,
    cxp:         ()=> <FinCxP/>,
    deudas:      ()=> <FinPasivos/>,
    balance:     ()=> <FinBalance/>,
    iva:         ()=> <FinIVA/>,
    documentos:  ()=> <FinDocumentos/>,
    metas:       ()=> <FinMetas/>,
    gastos:      ()=> <FinGastos/>,
    proyeccion:  ()=> <FinProyeccion/>,
    equilibrio:  ()=> <FinEquilibrio/>,
    exportar:    ()=> <FinExportar/>,
  };
  const ScreenEl = SCREENS[tab] || SCREENS.resumen;

  return (
    <div className="fade-in">
      {/* Page header */}
      <PageHeader title="Finanzas y Contabilidad" sub="Entiende cuánto entra, cuánto sale y cuánto te queda">
        <div className="chip chip-neutral tnum" style={{fontSize:13}}>
          <Icon name="wallet" size={13}/>Caja estimada: <strong>{fmtCLP(m.cajaProyectada)}</strong>
        </div>
        <button className="btn btn-ghost" onClick={()=>goTab('exportar')}><Icon name="download" size={15}/>Exportar</button>
      </PageHeader>

      {/* Disclaimer strip */}
      <div style={{display:'flex',alignItems:'center',gap:9,padding:'9px 14px',background:'oklch(0.95 0.025 90)',borderRadius:10,marginBottom:16,fontSize:12.5,fontWeight:600,color:'oklch(0.45 0.08 75)'}}>
        <Icon name="shield" size={14} style={{flexShrink:0}}/>Esta sección te ayuda a ordenar tus números. No reemplaza la revisión de tu contador. Los cálculos tributarios son estimaciones.
      </div>

      {/* Tab bar — grouped */}
      <div style={{marginBottom:22, overflowX:'auto', paddingBottom:4}}>
        {TAB_GROUPS.map(g=>{
          const groupTabs = FIN_TABS.filter(t=>t.group===g.id);
          return (
            <div key={g.id} style={{display:'inline-flex', alignItems:'center', gap:4, marginRight:16, marginBottom:6, flexShrink:0}}>
              <span style={{fontSize:10.5,fontWeight:800,letterSpacing:'0.07em',textTransform:'uppercase',color:'var(--ink-3)',marginRight:4}}>{g.label}</span>
              {groupTabs.map(t=>{
                const active = tab===t.id;
                const hasBadge =
                  (t.id==='cxp' && m.gastosPendientes>0) ||
                  (t.id==='deudas' && creditos && creditos.filter(c=>c.estado==='atrasado').length>0) ||
                  (t.id==='documentos');
                return (
                  <button key={t.id} onClick={()=>goTab(t.id)} style={{
                    display:'flex', alignItems:'center', gap:7, padding:'8px 14px', borderRadius:10,
                    whiteSpace:'nowrap', flexShrink:0,
                    border: active?'1px solid var(--primary)':'1px solid var(--line)',
                    background: active?'var(--primary-tint)':'var(--surface)',
                    color: active?'var(--primary-700)':'var(--ink-2)',
                    fontWeight:700, fontSize:13, cursor:'pointer', transition:'.14s', fontFamily:'inherit'}}>
                    <Icon name={t.icon} size={14}/>{t.label}
                    {hasBadge && !active && <span style={{width:6,height:6,borderRadius:'50%',background:'var(--danger)',flexShrink:0,marginLeft:2}}></span>}
                  </button>
                );
              })}
            </div>
          );
        })}
      </div>

      <ScreenEl/>
    </div>
  );
}
window.Finanzas = Finanzas;
