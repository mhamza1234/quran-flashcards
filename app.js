/* ===============================
   Quran Flashcards – Dual Layouts
   =============================== */

/* ---------- State ---------- */
let manifest = [];
let deck = null;          // current deck JSON
let wordsFlat = [];       // flattened words [{a,w,ai,wi}]
let idx = 0;
let mode = "sequential";
let features = {};
let currentLayout = "full-centered-wbw";

/* ---------- DOM helpers ---------- */
const $ = (id) => document.getElementById(id);

const selSurah   = $('surahSelect');
const selMode    = $('modeSelect');
const quickInput = $('quickSearch') || $('jumpInput');
const quickGo    = $('quickGo')     || $('goBtn');

const errorBanner = $('errorBanner');

const ayahArabic = $('ayahArabic');
const ayahBangla = $('ayahBangla');

const wordId      = $('wordId');
const frontArabic = $('frontArabicWord');
const frontBangla = $('frontBanglaMeaning');
const frontRoot   = $('frontRoot');
const frontRootM  = $('frontRootMeaning');
const frontDerivM = $('frontDerivationMethod');

const frontDerivList = $('frontDerivList');    // we keep it empty in Full layout
const backDerivList  = $('backDerivList');

const btnFirst = $('firstBtn');
const btnPrev  = $('prevBtn');
const btnFlip  = $('flipBtn');
const btnNext  = $('nextBtn');
const btnLast  = $('lastBtn');
const posText  = $('positionText');

const card     = $('card');

/* ---------- Init ---------- */
init();

async function init(){
  try{
    await loadManifest();
    await loadSelectedDeck();
  }catch(err){
    showError("Failed to initialize. " + (err?.message || err));
  }

  if (selMode)  selMode.addEventListener('change', ()=> { mode = selMode.value; });
  if (selSurah) selSurah.addEventListener('change', loadSelectedDeck);

  if (quickGo && quickInput){
    quickGo.addEventListener('click', onQuickGo);
    quickInput.addEventListener('keydown', e => { if (e.key === 'Enter') onQuickGo(); });
  }

  if (btnFirst) btnFirst.addEventListener('click', ()=>{ idx = 0; render(); });
  if (btnLast)  btnLast .addEventListener('click', ()=>{ idx = Math.max(0, wordsFlat.length-1); render(); });
  if (btnPrev)  btnPrev .addEventListener('click', prev);
  if (btnNext)  btnNext .addEventListener('click', next);
  if (btnFlip)  btnFlip .addEventListener('click', flip);

  document.addEventListener('keydown', (e)=>{
    if(e.key === 'ArrowRight') next();
    if(e.key === 'ArrowLeft')  prev();
    if(e.key.toLowerCase() === 'f') flip();
  });
}

/* ---------- Data loading ---------- */
async function loadManifest(){
  clearError();
  const res = await fetch('data/manifest.json', { cache: 'no-store' });
  if(!res.ok) throw new Error(`Could not load data/manifest.json (${res.status})`);
  manifest = await res.json();

  if (selSurah){
    selSurah.innerHTML = manifest.map(m =>
      `<option value="${m.filename}">${m.display || m.name_bn || m.name_ar || m.id}</option>`
    ).join('');
  }
}

async function loadSelectedDeck(){
  clearError();

  const filename = (selSurah && selSurah.value) || (manifest[0] && manifest[0].filename);
  if (!filename) throw new Error("No deck filename in manifest.");

  const res = await fetch(`data/${filename}`, { cache:'no-store' });
  if (!res.ok){
    showError(`Failed to load selected deck. Check path & JSON.`);
    wordsFlat = []; deck = null; idx = 0; render();
    return;
  }

  deck = await res.json();

  // Merge features/layout from manifest + deck.ui
  const man = (manifest || []).find(m => m.filename === filename) || {};
  const ui  = (deck && deck.ui) || {};

  features = Object.assign(
    { rightPanel:false, tabsOnBack:false, tajweed:false, audio:false },
    man.features || {},
    ui.features  || {}
  );

  currentLayout = ui.layout || man.layout || 'full-centered-wbw';
  const defaultFace = ui.defaultFace || man.defaultFace || 'front';
  if (card) card.classList.toggle('show-back', defaultFace === 'back');

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

/* ---------- Navigation ---------- */
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
  if (!card) return;
  card.classList.toggle('show-back');
}

/* ---------- Quick Jump: "67:6:1" or "67.6.1" ---------- */
function onQuickGo(){
  if (!quickInput || !wordsFlat.length) return;
  const v = (quickInput.value || '').trim();
  const m = v.match(/^(\d+)[.:](\d+)(?:[.:](\d+))?$/);
  if(!m) return;
  const s = +m[1], a = +m[2], w = m[3] ? +m[3] : null;

  const found = wordsFlat.findIndex(x=>{
    const [ss,aa] = x.a.ayah_id.split(':').map(Number);
    if (ss!==s || aa!==a) return false;
    if (w==null) return true;
    const wi = +(x.w.word_id?.split(':')[2] || 0);
    return wi === w;
  });
  if(found >= 0){ idx = found; render(); }
}

/* ---------- Render ---------- */
function render(){
  if(!wordsFlat.length){
    if (frontArabic) frontArabic.textContent = '—';
    if (frontBangla) frontBangla.textContent = '—';
    if (wordId) wordId.textContent = '—';
    if (ayahArabic) ayahArabic.textContent = '﴿ ﴾';
    if (ayahBangla) ayahBangla.textContent = '—';
    if (frontRoot) frontRoot.textContent = '';
    if (frontRootM) frontRootM.textContent = '';
    if (frontDerivM) frontDerivM.textContent = '';
    if (frontDerivList) frontDerivList.innerHTML = '';
    if (backDerivList) backDerivList.innerHTML = '';
    if (posText) posText.textContent = '0 / 0';
    return;
  }

  const { a, w, ai, wi } = wordsFlat[idx];

  // Top strip
  if (ayahArabic) ayahArabic.textContent = a.arabic || '﴿ ﴾';
  if (ayahBangla) ayahBangla.textContent = a.bangla || '—';
  if (posText) posText.textContent = `${idx+1} / ${wordsFlat.length}`;

  // Dispatch to current layout
  const L = LAYOUTS[currentLayout] || LAYOUTS['full-centered-wbw'];
  L.renderFront({a,w,ai,wi});
  L.renderBack({a,w,ai,wi});
}

/* ---------- Layouts ---------- */

const LAYOUTS = {
  /* Full deck: centered header, back = WBW only */
  'full-centered-wbw': {
    renderFront: renderFrontFullCentered,
    renderBack:  renderBackWbwOnly
  },

  /* Major words + audio + tajwīd: front with extras, back tabs (Derived / WBW) */
  'tajweed-audio-with-tabs': {
    renderFront: renderFrontTajweedAudio,
    renderBack:  renderBackTabs
  }
};

/* Arabic diacritics stripper for equality checks */
function stripTashkeel(s=''){
  return s.replace(/[\u064B-\u065F\u0670\u06D6-\u06ED]/g, '');
}

/* ===== FULL CENTERED FRONT ===== */
function renderFrontFullCentered({a,w}){
  if (wordId)      wordId.textContent      = a.ayah_id;
  if (frontArabic) { frontArabic.textContent = w.arabic_word || '—'; frontArabic.classList.add('centered'); }
  if (frontBangla) { frontBangla.textContent = w.bangla_meaning || '—'; frontBangla.classList.add('centered'); }
  if (frontRoot)   { frontRoot.textContent   = w.root || ''; frontRoot.classList.add('centered'); }
  if (frontRootM)  { frontRootM.textContent  = w.rootMeaning || ''; frontRootM.classList.add('centered'); }
  if (frontDerivM) { frontDerivM.textContent = w.derivationMethod || ''; frontDerivM.classList.add('centered'); }

  if (frontDerivList) frontDerivList.innerHTML = ''; // not used on this layout
}

/* ===== FULL BACK: WBW LIST ONLY ===== */
function renderBackWbwOnly({a}){
  if (!backDerivList) return;
  const rows = (a.words || []).map(w => `
    <div class="wbw-row centered">
      <div class="d-ar big" dir="rtl">${w.arabic_word||''}</div>
      <div class="d-bn">${w.bangla_meaning||''}</div>
    </div>
  `).join('');
  backDerivList.innerHTML = rows || `<div class="muted centered">—</div>`;
}

/* ===== TAJWEED + AUDIO FRONT ===== */
function renderFrontTajweedAudio({a,w}){
  // Header
  if (wordId)      wordId.textContent      = a.ayah_id;
  if (frontArabic) { frontArabic.textContent = w.arabic_word || '—'; frontArabic.classList.add('centered'); }
  if (frontBangla) { frontBangla.textContent = w.bangla_meaning || '—'; frontBangla.classList.add('centered'); }
  if (frontRoot)   { frontRoot.textContent   = w.root || ''; frontRoot.classList.add('centered'); }
  if (frontRootM)  { frontRootM.textContent  = w.rootMeaning || ''; frontRootM.classList.add('centered'); }
  if (frontDerivM) { frontDerivM.textContent = w.derivationMethod || ''; frontDerivM.classList.add('centered'); }

  // Audio button (only if features.audio)
  const audioBtn = $('audioBtn');
  if (audioBtn){
    if (features.audio){
      audioBtn.classList.remove('hidden');
      // wire basic play/pause using your audio element if present
      const audio = $('ayahAudio');
      audioBtn.onclick = ()=> {
        if (!audio) return;
        // You can compute the URL based on the ayah here if you want
        // audio.src = computeUrl(a.ayah_id);
        if (audio.paused) audio.play(); else audio.pause();
      };
    }else{
      audioBtn.classList.add('hidden');
    }
  }

  // Tajwīd block under header
  const tajBlock = $('tajBlock') || makeTajBlock(); // allow existing or create
  if (features.tajweed && w.tajweed && (w.tajweed.summary || (w.tajweed.rules||[]).length)){
    tajBlock.classList.remove('hidden');
    tajBlock.innerHTML = `
      <div class="block-title">Tajwid Rules</div>
      ${w.tajweed.summary ? `<p class="muted centered">${w.tajweed.summary}</p>` : ``}
      ${(w.tajweed.rules||[]).map(r=>`<div class="taj-row"><b>${r.title||''}</b> — ${r.text||''}</div>`).join('')}
      ${w.tajweed.example ? `
        <div class="taj-example">
          <div class="ex-line centered">
            <span dir="rtl">${w.tajweed.example.ar||''}</span>
            <span>${w.tajweed.example.bn||''}</span>
          </div>
        </div>` : ``}
    `;
  }else{
    tajBlock.classList.add('hidden');
    tajBlock.innerHTML = '';
  }

  function makeTajBlock(){
    // Attach right after front content left container if you have one; otherwise use frontDerivList container
    const host = frontDerivList || $('slotMain') || $('card');
    const div = document.createElement('div');
    div.id = 'tajBlock';
    div.className = 'taj-block';
    host && host.appendChild(div);
    return div;
  }
}

/* ===== BACK with TABS: Derived / WBW ===== */
function renderBackTabs({a,w}){
  if (!backDerivList) return;

  // Build tabs UI inside backDerivList
  backDerivList.innerHTML = `
    <div class="tabbar centered" style="margin-bottom:10px">
      <button id="tabDerived" class="btn accent">Derived Words</button>
      <button id="tabWbw" class="btn" style="margin-left:8px">Word-by-Word</button>
    </div>
    <div id="tabBody"></div>
  `;
  const tabBody = $('tabBody');
  const btnA = $('tabDerived'), btnB = $('tabWbw');

  const showDerived = ()=> {
    btnA.classList.add('accent'); btnB.classList.remove('accent');
    tabBody.innerHTML = buildDerivedHtml(a,w);
  };
  const showWbw = ()=> {
    btnB.classList.add('accent'); btnA.classList.remove('accent');
    tabBody.innerHTML = buildWbwHtml(a);
  };

  btnA.onclick = showDerived;
  btnB.onclick = showWbw;
  showDerived(); // default
}

/* Builders */
function buildDerivedHtml(a,w){
  const main = stripTashkeel(w.arabic_word || '');
  const derivs = (Array.isArray(w.quranicDerivations) ? w.quranicDerivations : [])
    .filter(d => stripTashkeel(d.arabic||'') !== main);

  if (!derivs.length) return `<div class="muted centered">No related forms.</div>`;

  return derivs.map(d=>{
    const morph = d.derivationMethod ? ` <span class="badge-morph">(${d.derivationMethod})</span>` : '';
    const occ   = (d.occurrences||[]).map(o=>o.ayah_id).join(', ');
    const ex    = (d.exampleArabic || d.exampleBangla)
      ? `<div class="ex-line centered"><span dir="rtl">${d.exampleArabic||''}</span><span>${d.exampleBangla||''}</span></div>` : '';
    return `
      <div class="deriv-row centered">
        <div class="d-ar big" dir="rtl">${d.arabic||''}${morph}</div>
        <div class="d-bn">${d.meaning||''}</div>
        ${occ ? `<div class="d-meta">${occ}</div>` : ``}
        ${ex}
      </div>
    `;
  }).join('');
}
function buildWbwHtml(a){
  return (a.words||[]).map(w => `
    <div class="wbw-row centered">
      <div class="d-ar big" dir="rtl">${w.arabic_word||''}</div>
      <div class="d-bn">${w.bangla_meaning||''}</div>
    </div>
  `).join('') || `<div class="muted centered">—</div>`;
}

/* ---------- Errors ---------- */
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
