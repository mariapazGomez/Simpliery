/* ---------- Tweaks panel: explore color & type directions ---------- */
const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "primary": "oklch(0.58 0.045 145)",
  "secondary": "oklch(0.68 0.09 55)",
  "font": "Plus Jakarta Sans",
  "bg": "crema",
  "radius": "suave"
}/*EDITMODE-END*/;

function parseOk(str){
  const m = str.match(/oklch\(([\d.]+)\s+([\d.]+)\s+([\d.]+)/);
  return m ? { L:+m[1], C:+m[2], H:+m[3] } : { L:0.58, C:0.045, H:145 };
}
const ok = (L,C,H)=> `oklch(${L.toFixed(3)} ${C.toFixed(3)} ${H.toFixed(1)})`;

function applyTweaks(t){
  const r = document.documentElement.style;
  // Primary scale
  const p = parseOk(t.primary);
  r.setProperty('--primary', t.primary);
  r.setProperty('--primary-700', ok(p.L-0.08, p.C+0.01, p.H));
  r.setProperty('--primary-600', ok(p.L-0.03, p.C, p.H));
  r.setProperty('--primary-tint', ok(0.95, Math.min(p.C,0.03), p.H));
  r.setProperty('--primary-tint2', ok(0.90, Math.min(p.C+0.01,0.045), p.H));
  r.setProperty('--ok', t.primary);
  r.setProperty('--ok-tint', ok(0.94, Math.min(p.C,0.03), p.H));
  // Secondary
  const s = parseOk(t.secondary);
  r.setProperty('--terra', t.secondary);
  r.setProperty('--terra-700', ok(s.L-0.08, s.C+0.01, s.H));
  r.setProperty('--terra-tint', ok(0.95, Math.min(s.C,0.035), s.H));
  // Font
  r.setProperty('--font', `'${t.font}'`);
  // Background
  const bgMap = { crema:['#FAF7F0','#F4EFE5'], marfil:['#FFFDF7','#F6F1E7'], gris:['#F6F5F2','#ECEBE6'] };
  const [b1,b2] = bgMap[t.bg] || bgMap.crema;
  r.setProperty('--bg', b1); r.setProperty('--bg-2', b2);
  // Radius
  const radMap = { redondeado:[12,17,23,30], suave:[9,13,18,24], minimo:[5,7,10,13] };
  const [rs,rr,rl,rx] = radMap[t.radius] || radMap.suave;
  r.setProperty('--r-sm', rs+'px'); r.setProperty('--r', rr+'px'); r.setProperty('--r-lg', rl+'px'); r.setProperty('--r-xl', rx+'px');
}

function TweaksUI(){
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);
  useEffect(()=>{ applyTweaks(t); }, [t]);
  return (
    <TweaksPanel>
      <TweakSection label="Color principal" />
      <TweakColor label="Acento" value={t.primary}
        options={[ 'oklch(0.58 0.045 145)', 'oklch(0.56 0.07 150)', 'oklch(0.55 0.05 215)', 'oklch(0.60 0.06 120)' ]}
        onChange={v=>setTweak('primary', v)} />
      <TweakColor label="Secundario" value={t.secondary}
        options={[ 'oklch(0.68 0.09 55)', 'oklch(0.74 0.08 85)', 'oklch(0.58 0.07 45)', 'oklch(0.62 0.10 30)' ]}
        onChange={v=>setTweak('secondary', v)} />

      <TweakSection label="Tipografía" />
      <TweakSelect label="Fuente" value={t.font}
        options={['Plus Jakarta Sans','Nunito Sans','Manrope','Lato']}
        onChange={v=>setTweak('font', v)} />

      <TweakSection label="Estilo" />
      <TweakRadio label="Fondo" value={t.bg} options={['crema','marfil','gris']} onChange={v=>setTweak('bg', v)} />
      <TweakRadio label="Esquinas" value={t.radius} options={['redondeado','suave','minimo']} onChange={v=>setTweak('radius', v)} />
    </TweaksPanel>
  );
}
window.TweaksUI = TweaksUI;
