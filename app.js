/* ====== State ====== */
let manifest = [];
let deck = null;           // the loaded JSON for the selected surah/deck
let wordsFlat = [];        // [{a, w, ai, wi}]
let idx = 0;
let mode = "sequential";

/* ====== DOM ====== */
const el = (id) => document.getElementById(id);

const selSurah   = el('surahSelect');
const selMode    = el('modeSelect');
const quickInput = el('quickSearch');
const quickGo    = el('quickGo');

const errorBanner = el('errorBanner');

const ayahArabic = el('ayahArabic');
const ayahBangla = el('ayahBangla');

const wordId        = el('wordId');
const frontArabic   = el('frontArabicWord');
const frontBangla   = el('frontBanglaMeaning');
const frontRoot     = el('frontRoot');
const frontRootM    = el('frontRootMeaning');
const frontDerivM   = el('frontDerivationMethod');
const frontDerivList= el('frontDerivList');

const backDerivList = el('backDerivList');

const btnFirst = el('firstBtn');
const btnPrev  = el('prevBtn');
const btnFlip  = el('flipBtn');
const btnNext  = el('nextBtn');
const btnLast  = el('lastBtn');

const posText  = el('positionText');

const cardWrap = el('card'); // container holding .front and .back faces

/* ====== Init ====== */
init();

async function init(){
  try{
    await loadManifest();
    await loadSelectedDeck();
  }catch(err){
    showError("Failed to initialize. " + (err?.message || err));
  }

  // UI events
  selMode.addEventListener('change', ()=> { mode = selMode.value; });
  selSurah.addEventListener('change', loadSelectedDeck);
  quickGo.addEventListener('click', onQuickGo);

  btnFirst.addEventListener('click', ()=> { idx = 0; render(); });
  btnLast .addEventListener('click', ()=> { idx = Math.max(0, wordsFlat.length-1); render(); });
  btnPrev .addEventListener('click', prev);
  btnNext .addEventListener('click', next);
  btnFlip .addEventListener('click', flip);

  document.addEventListener('keydown', (e)=>{
    if(e.key === 'ArrowRight') next();
    if(e.key === 'ArrowLeft')  prev();
    if(e.key.toLowerCase()==='f') flip();
  });
}

async function loadManifest(){
  clearError();
  const res = await fetch('data/manifest.json', {cache: "no-store"});
  if(!res.ok) throw new Error(`Could not load data/manifest.json (${res.status})`);
  manifest = await res.json();

  // Populate dropdown
  selSurah.innerHTML = manifest.map(m =>
    `<option value="${m.filename}">${m.display || m.name_bn || m.name_ar || m.id}</option>`
  ).join('');
}

async function loadSelectedDeck(){
  clearError();
  const filename = selSurah.value || (manifest[0] && manifest[0].filename);
  if(!filename){
    throw new Error("No deck filename in manifest.");
  }
  const url = `data/${filename}`;
  const res = await fetch(url, {cache: "no-store"});
  if(!res.ok){
    showError(`Failed to load ${url} (${res.status}). Check that the file exists under /data and the name matches manifest.json exactly.`);
    wordsFlat = []; deck = null; idx = 0; render();
    return;
  }

  deck = await res.json();

  // Flatten words
  wordsFlat = [];
  (deck.ayats || []).forEach((a, ai)=>{
    (a.words || []).forEach((w, wi)=>{
      wordsFlat.push({ a, w, ai, wi });
    });
  });
  idx = 0;
  render();
}

/* ====== Navigation ====== */
function prev(){
  if(!wordsFlat.length) return;
  if(mode === 'random'){
    idx = Math.floor(Math.random() * wordsFlat.length);
  }else{
    idx = Math.max(0, idx - 1);
  }
  render();
}
function next(){
  if(!wordsFlat.length) return;
  if(mode === 'random'){
    idx = Math.floor(Math.random() * wordsFlat.length);
  }else{
    idx = Math.min(wordsFlat.length - 1, idx + 1);
  }
  render();
}
function flip(){
  // Toggle which side is visible by adding/removing a class
  cardWrap.classList.toggle('show-back');
}

/* ====== Quick Jump: 67:ayah or 67:ayah:word ====== */
function onQuickGo(){
  const v = (quickInput.value || '').trim();
  const m = v.match(/^(\d+):(\d+)(?::(\d+))?$/);
  if(!m || !wordsFlat.length) return;
  const s = parseInt(m[1],10);
  const a = parseInt(m[2],10);
  const w = m[3] ? parseInt(m[3],10) : null;

  const found = wordsFlat.findIndex(x=>{
    const [ss,aa] = x.a.ayah_id.split(':').map(Number);
    if(ss!==s || aa!==a) return false;
    if(w==null) return true;
    const wi = parseInt((x.w.word_id || '0:0:0').split(':')[2],10);
    return wi === w;
  });
  if(found >= 0){ idx = found; render(); }
}

/* ====== Render ====== */
function render(){
  // guards
  if(!wordsFlat.length){
    frontArabic.textContent = '—';
    frontBangla.textContent = '—';
    ayahArabic.textContent = '﴿ ﴾';
    ayahBangla.textContent = '—';
    wordId.textContent = '—';
    frontRoot.textContent = '';
    frontRootM.textContent = '';
    frontDerivM.textContent = '';
    frontDerivList.innerHTML = '';
    backDerivList.innerHTML = '';
    posText.textContent = '0 / 0';
    return;
  }

  const { a, w, ai, wi } = wordsFlat[idx];

  // Top ayah strip
  ayahArabic.textContent = a.arabic || '﴿ ﴾';
  ayahBangla.textContent = a.bangla || '—';

  // Front
  wordId.textContent      = `${a.ayah_id}:${wi+1}`;
  frontArabic.textContent = w.arabic_word || '—';
  frontBangla.textContent = w.bangla_meaning || '—';
  frontRoot.textContent   = w.root || '';
  frontRootM.textContent  = w.rootMeaning || '';
  frontDerivM.textContent = w.derivationMethod || '';

  // Small derivations list (front-right)
  frontDerivList.innerHTML = '';
  const derivs = Array.isArray(w.quranicDerivations) ? w.quranicDerivations : [];
  if(derivs.length){
    derivs.slice(0, 6).forEach(d=>{
      const row = document.createElement('div');
      row.className = 'deriv-row small';
      row.innerHTML = `
        <div class="d-ar" dir="rtl">${d.arabic || ''}</div>
        <div class="d-bn">${d.meaning || ''}</div>
        <div class="d-meta">${(d.occurrences||[]).map(o=>o.ayah_id).join(', ')}</div>
      `;
      frontDerivList.appendChild(row);
    });
  }else{
    frontDerivList.innerHTML = `<div class="muted">No related forms.</div>`;
  }

  // Back – larger derivations bubble
  backDerivList.innerHTML = '';
  if(derivs.length){
    derivs.forEach(d=>{
      const row = document.createElement('div');
      row.className = 'deriv-row';
      row.innerHTML = `
        <div class="d-ar big" dir="rtl">${d.arabic || ''}</div>
        <div class="d-text">
          <div class="d-bn">${d.meaning || ''}</div>
          <div class="d-meta">${(d.occurrences||[]).map(o=>o.ayah_id).join(', ')}</div>
        </div>
      `;
      backDerivList.appendChild(row);
    });
  }else{
    backDerivList.innerHTML = `<div class="muted">No related forms found for this word’s root.</div>`;
  }

  // Pager
  posText.textContent = `${idx+1} / ${wordsFlat.length}`;
}

/* ====== Errors ====== */
function showError(msg){
  if(!errorBanner) return;
  errorBanner.textContent = msg;
  errorBanner.classList.remove('hidden');
}
function clearError(){
  if(!errorBanner) return;
  errorBanner.textContent = '';
  errorBanner.classList.add('hidden');
}
