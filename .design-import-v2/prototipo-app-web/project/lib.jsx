/* ---------- Formatting & data helpers ---------- */
function fmtCLP(n){ return '$' + Math.round(n).toLocaleString('es-CL'); }
function fmtNum(n){ return Math.round(n).toLocaleString('es-CL'); }
function fmtPct(n){ return (Math.round(n*10)/10).toLocaleString('es-CL') + '%'; }

const CAT_COLORS = {
  'Aceitunas':   'oklch(0.62 0.10 130)',
  'Embutidos':   'oklch(0.60 0.13 30)',
  'Frutos secos':'oklch(0.64 0.10 70)',
  'Huevos':      'oklch(0.76 0.11 90)',
  'Mantequillas':'oklch(0.78 0.08 100)',
  'Mermeladas':  'oklch(0.62 0.13 10)',
  'Queso de cabra':'oklch(0.68 0.06 55)',
  'Quesos':      'oklch(0.66 0.10 48)',
};
function catColor(c){ return CAT_COLORS[c] || 'var(--ink-3)'; }
function stockState(p){ if(p.stock<=0) return 'sin'; if(p.stock<=p.min) return 'bajo'; return 'ok'; }
const STATE_LABEL = { ok:'OK', bajo:'Stock bajo', sin:'Sin stock' };

function StockChip({ state }){
  const cls = state==='ok'?'chip-ok':state==='bajo'?'chip-warn':'chip-danger';
  const dot = state==='ok'?'var(--ok)':state==='bajo'?'var(--warn)':'var(--danger)';
  return <span className={'chip '+cls}><span className="chip-dot" style={{background:dot}}></span>{STATE_LABEL[state]}</span>;
}

/* ── Shared tooltip ── */
function ChartTooltip({ visible, x, y, content, containerW=0 }){
  if(!visible) return null;
  const left = Math.min(x, containerW-160);
  return (
    <div style={{ position:'absolute', left, top:y-8, transform:'translateY(-100%)',
      background:'var(--ink)', color:'#fff', borderRadius:10, padding:'9px 13px',
      fontSize:13, fontWeight:600, pointerEvents:'none', zIndex:50, minWidth:130,
      boxShadow:'0 8px 24px rgba(0,0,0,0.22)', whiteSpace:'nowrap' }}>
      {content}
      <div style={{position:'absolute', bottom:-6, left:Math.max(12,Math.min(x-left-6,104)),
        width:12, height:12, background:'var(--ink)', transform:'rotate(45deg)', borderRadius:2}}></div>
    </div>
  );
}

/* ---------- Donut chart — interactive ---------- */
function Donut({ data, size=168, thickness=26, centerLabel, centerValue, fmt=fmtCLP }){
  const [hovered, setHovered] = useState(null);
  const total = data.reduce((a,d)=>a+d.value,0) || 1;
  const R = (size-thickness)/2; const C = 2*Math.PI*R; let off=0;
  const segments = data.map((d,i)=>{
    const len = d.value/total*C;
    const seg = { ...d, len, off, i };
    off += len; return seg;
  });
  const active = hovered!=null ? segments[hovered] : null;
  return (
    <div style={{position:'relative', width:size, height:size}}>
      <svg width={size} height={size} style={{transform:'rotate(-90deg)', cursor:'pointer'}}>
        <circle cx={size/2} cy={size/2} r={R} fill="none" stroke="var(--line)" strokeWidth={thickness}/>
        {segments.map((seg,i)=>(
          <circle key={i} cx={size/2} cy={size/2} r={R} fill="none"
            stroke={seg.color} strokeWidth={hovered===i ? thickness+5 : thickness}
            strokeDasharray={`${seg.len} ${C-seg.len}`} strokeDashoffset={-seg.off}
            strokeLinecap="butt" style={{transition:'stroke-width .15s, opacity .15s', cursor:'pointer',
              opacity: hovered!=null&&hovered!==i ? 0.55 : 1}}
            onMouseEnter={()=>setHovered(i)} onMouseLeave={()=>setHovered(null)}/>
        ))}
      </svg>
      <div style={{position:'absolute', inset:0, display:'grid', placeItems:'center', textAlign:'center', pointerEvents:'none'}}>
        {active ? (
          <div>
            <div className="tnum" style={{fontSize:15, fontWeight:800, letterSpacing:'-0.02em', color:active.color}}>{fmt(active.value)}</div>
            <div style={{fontSize:11, color:'var(--ink-3)', fontWeight:700, marginTop:2, maxWidth:size*0.6, lineHeight:1.2}}>{active.label||active.key}</div>
            <div style={{fontSize:11, color:'var(--ink-2)', fontWeight:700}}>{fmtPct(active.value/total*100)}</div>
          </div>
        ) : centerValue!==undefined ? (
          <div>
            <div className="tnum" style={{fontSize:22, fontWeight:800, letterSpacing:'-0.02em'}}>{centerValue}</div>
            <div style={{fontSize:11.5, color:'var(--ink-3)', fontWeight:700}}>{centerLabel}</div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

/* ---------- BarList — interactive ---------- */
function BarList({ rows, max, fmt=fmtCLP }){
  const m = max || Math.max(...rows.map(r=>r.value), 1);
  const [hovered, setHovered] = useState(null);
  return (
    <div style={{display:'flex', flexDirection:'column', gap:13}}>
      {rows.map((r,i)=>{
        const pct = r.value/m*100;
        const isHov = hovered===i;
        return (
          <div key={i} style={{cursor:'pointer'}} onMouseEnter={()=>setHovered(i)} onMouseLeave={()=>setHovered(null)}>
            <div style={{display:'flex', justifyContent:'space-between', marginBottom:5, fontSize:13.5,
              opacity: hovered!=null&&!isHov ? 0.55 : 1, transition:'opacity .14s'}}>
              <span style={{display:'flex', alignItems:'center', gap:8, fontWeight: isHov?800:600}}>
                <span style={{width: isHov?11:9, height: isHov?11:9, borderRadius:3,
                  background:r.color||'var(--primary)', transition:'.14s'}}></span>
                {r.label}
              </span>
              <span className="tnum" style={{fontWeight:800}}>{fmt(r.value)}</span>
            </div>
            <div style={{height: isHov?11:8, background:'var(--bg-2)', borderRadius:6, overflow:'hidden', transition:'height .14s'}}>
              <div style={{height:'100%', width:pct+'%', background:r.color||'var(--primary)',
                borderRadius:6, transition:'width .6s cubic-bezier(.2,.8,.3,1)'}}></div>
            </div>
            {isHov && <div style={{fontSize:11.5, color:'var(--ink-3)', fontWeight:700, marginTop:4, textAlign:'right'}}>
              {fmtPct(pct)} del total
            </div>}
          </div>
        );
      })}
    </div>
  );
}

/* ---------- ColumnChart — interactive with tooltip ---------- */
function ColumnChart({ groups, series, height=200, fmt=fmtCLP }){
  const max = Math.max(...groups.flatMap(g=>series.map(s=>g[s.key])), 1);
  const [hov, setHov] = useState(null); // {gi, si}
  const [tip, setTip] = useState({visible:false, x:0, y:0, content:''});
  const ref = useRef(null);
  return (
    <div ref={ref} style={{position:'relative'}}>
      <div style={{display:'flex', alignItems:'flex-end', gap:18, height, padding:'0 4px'}}>
        {groups.map((g,gi)=>(
          <div key={gi} style={{flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:8, height:'100%'}}>
            <div style={{flex:1, display:'flex', alignItems:'flex-end', gap:5, width:'100%', justifyContent:'center'}}>
              {series.map((s,si)=>{
                const isH = hov && hov.gi===gi && hov.si===si;
                const barH = (g[s.key]/max*100)+'%';
                return (
                  <div key={si}
                    style={{ width:'30%', maxWidth:28, minWidth:10, height:barH,
                      background: isH ? s.color : s.color+'cc',
                      borderRadius:'6px 6px 3px 3px',
                      transition:'height .6s cubic-bezier(.2,.8,.3,1), opacity .13s, transform .13s',
                      transform: isH?'scaleY(1.04)':'none', transformOrigin:'bottom',
                      cursor:'pointer', outline: isH?`2px solid ${s.color}`:'none', outlineOffset:2 }}
                    onMouseEnter={e=>{
                      setHov({gi,si});
                      const rect=ref.current?.getBoundingClientRect();
                      const br=e.currentTarget.getBoundingClientRect();
                      setTip({visible:true, x:br.left-rect.left+br.width/2, y:br.top-rect.top,
                        content: <><span style={{opacity:.7}}>{s.label}</span><br/><strong>{g.label}</strong><br/>{fmt(g[s.key])}</> });
                    }}
                    onMouseLeave={()=>{ setHov(null); setTip(t=>({...t,visible:false})); }}/>
                );
              })}
            </div>
            <div style={{fontSize:12, color: hov&&hov.gi===gi?'var(--ink)':'var(--ink-3)', fontWeight: hov&&hov.gi===gi?800:700, transition:'.13s'}}>{g.label}</div>
          </div>
        ))}
      </div>
      <ChartTooltip {...tip} containerW={ref.current?.offsetWidth||400}/>
      <div style={{display:'flex', gap:16, marginTop:14, flexWrap:'wrap'}}>
        {series.map((s,j)=>(
          <span key={j} style={{display:'flex', alignItems:'center', gap:7, fontSize:12.5, fontWeight:600, color:'var(--ink-2)'}}>
            <span style={{width:10, height:10, borderRadius:3, background:s.color}}></span>{s.label}
          </span>
        ))}
      </div>
    </div>
  );
}

/* ---------- Spark — interactive with scrubber ---------- */
function Spark({ data, color='var(--primary)', w=240, h=56, labels, fmt=fmtCLP }){
  const [idx, setIdx] = useState(null);
  const max=Math.max(...data,1), min=Math.min(...data,0);
  const rng=(max-min)||1;
  const pts=data.map((d,i)=>[ i/(data.length-1||1)*w, h - ((d-min)/rng)*(h-10) - 5 ]);
  const line=pts.map((p,i)=>(i?'L':'M')+p[0].toFixed(1)+' '+p[1].toFixed(1)).join(' ');
  const area=line+` L ${w} ${h} L 0 ${h} Z`;
  const id='sg'+Math.random().toString(36).slice(2,7);
  const hoverPt = idx!=null ? pts[idx] : null;
  return (
    <div style={{position:'relative', userSelect:'none'}}>
      <svg width="100%" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" style={{display:'block', cursor:'crosshair'}}
        onMouseMove={e=>{
          const rect=e.currentTarget.getBoundingClientRect();
          const xRel=(e.clientX-rect.left)/rect.width*w;
          const closest = pts.reduce((best,p,i)=> Math.abs(p[0]-xRel)<Math.abs(pts[best][0]-xRel)?i:best, 0);
          setIdx(closest);
        }} onMouseLeave={()=>setIdx(null)}>
        <defs><linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={color} stopOpacity="0.22"/>
          <stop offset="1" stopColor={color} stopOpacity="0"/>
        </linearGradient></defs>
        <path d={area} fill={`url(#${id})`}/>
        <path d={line} fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
        {hoverPt && <>
          <line x1={hoverPt[0]} y1={0} x2={hoverPt[0]} y2={h} stroke={color} strokeWidth="1.5" strokeDasharray="3 3" opacity="0.6"/>
          <circle cx={hoverPt[0]} cy={hoverPt[1]} r="5" fill={color} stroke="white" strokeWidth="2"/>
        </>}
      </svg>
      {hoverPt && idx!=null && (
        <div style={{position:'absolute', left:Math.min(hoverPt[0]/w*100, 75)+'%', top:0, transform:'translate(-50%,-110%)',
          background:'var(--ink)', color:'#fff', borderRadius:8, padding:'5px 10px', fontSize:12.5, fontWeight:700,
          pointerEvents:'none', whiteSpace:'nowrap', zIndex:10}}>
          {labels?.[idx] && <span style={{opacity:.7, marginRight:5}}>{labels[idx]}</span>}{fmt(data[idx])}
        </div>
      )}
    </div>
  );
}

/* ---------- LineChart multi-series — interactive ---------- */
function LineChart({ series, height=160, fmt=fmtCLP, xLabels }){
  const [idx, setIdx] = useState(null);
  const allVals = series.flatMap(s=>s.data);
  const max=Math.max(...allVals,1), min=0;
  const rng=max-min||1;
  const W=400, H=height-28;
  const pt=(v,i,len)=>[ i/(len-1||1)*W, H-((v-min)/rng)*(H-8)-4 ];
  const id='lc'+Math.random().toString(36).slice(2,6);
  return (
    <div style={{position:'relative'}}>
      <svg width="100%" viewBox={`0 0 ${W} ${H+28}`} preserveAspectRatio="none" style={{display:'block', cursor:'crosshair', overflow:'visible'}}
        onMouseMove={e=>{
          const rect=e.currentTarget.getBoundingClientRect();
          const xRel=(e.clientX-rect.left)/rect.width*W;
          const n=series[0]?.data.length||1;
          const closest=Math.round(xRel/W*(n-1));
          setIdx(Math.max(0,Math.min(n-1,closest)));
        }} onMouseLeave={()=>setIdx(null)}>
        {/* Grid lines */}
        {[0,.25,.5,.75,1].map((f,i)=>(
          <line key={i} x1={0} y1={H-f*(H-8)-4} x2={W} y2={H-f*(H-8)-4}
            stroke="var(--line)" strokeWidth="1" opacity=".5"/>
        ))}
        {series.map((s,si)=>{
          const pts=s.data.map((v,i)=>pt(v,i,s.data.length));
          const d=pts.map((p,i)=>(i?'L':'M')+p[0].toFixed(1)+' '+p[1].toFixed(1)).join(' ');
          const area=d+` L ${pts[pts.length-1][0]} ${H} L ${pts[0][0]} ${H} Z`;
          const gid=id+'_'+si;
          return (
            <g key={si}>
              <defs><linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor={s.color} stopOpacity=".15"/>
                <stop offset="1" stopColor={s.color} stopOpacity="0"/>
              </linearGradient></defs>
              <path d={area} fill={`url(#${gid})`}/>
              <path d={d} fill="none" stroke={s.color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              {idx!=null && pts[idx] && <circle cx={pts[idx][0]} cy={pts[idx][1]} r="5" fill={s.color} stroke="white" strokeWidth="2"/>}
            </g>
          );
        })}
        {idx!=null && <line x1={pt(0,idx,series[0]?.data.length||1)[0]} y1={0} x2={pt(0,idx,series[0]?.data.length||1)[0]} y2={H} stroke="var(--ink-3)" strokeWidth="1" strokeDasharray="3 3"/>}
        {/* X labels */}
        {xLabels && xLabels.map((l,i)=>(
          <text key={i} x={i/(xLabels.length-1||1)*W} y={H+18} textAnchor="middle" fill="var(--ink-3)"
            fontSize="11" fontWeight="700" fontFamily="inherit">{l}</text>
        ))}
      </svg>
      {/* Tooltip */}
      {idx!=null && (
        <div style={{position:'absolute', left:Math.min(80,idx/((series[0]?.data.length||1)-1)*100)+'%', top:0,
          transform:'translate(-50%,-110%)', background:'var(--ink)', color:'#fff', borderRadius:10, padding:'8px 13px',
          fontSize:12.5, fontWeight:600, pointerEvents:'none', whiteSpace:'nowrap', zIndex:10, boxShadow:'0 4px 16px rgba(0,0,0,.2)'}}>
          {xLabels?.[idx] && <div style={{opacity:.7, fontSize:11, marginBottom:3}}>{xLabels[idx]}</div>}
          {series.map((s,si)=>(
            <div key={si} style={{display:'flex', alignItems:'center', gap:7}}>
              <span style={{width:8,height:8,borderRadius:2,background:s.color,flexShrink:0}}></span>
              <span style={{opacity:.8}}>{s.label}:</span><strong>{fmt(s.data[idx])}</strong>
            </div>
          ))}
        </div>
      )}
      {/* Legend */}
      <div style={{display:'flex', gap:14, marginTop:4, flexWrap:'wrap'}}>
        {series.map((s,i)=>(
          <span key={i} style={{display:'flex', alignItems:'center', gap:6, fontSize:12, fontWeight:600, color:'var(--ink-2)'}}>
            <span style={{width:16,height:3,borderRadius:2,background:s.color}}></span>{s.label}
          </span>
        ))}
      </div>
    </div>
  );
}

Object.assign(window, { fmtCLP, fmtNum, fmtPct, catColor, CAT_COLORS, stockState, STATE_LABEL,
  StockChip, Donut, BarList, ColumnChart, Spark, LineChart, ChartTooltip });
