/* Quran Word Cards — front/back exactly as requested
   Front  = quick word panel + Derivations list
   Back   = word-by-word ayah grid only
*/

const state = {
  manifest: [],
  surah: null,
  words: [],
  order: [],
  idx: 0,
  mode: 'sequential',
};

const els = {
  // header controls
  modeSelect: document.getElementById('modeSelect'),
  surahSelect: document.getElementById('surahSelect'),
  quickSearch: document.getElementById('quickSearch'),
  quickGo: document.getElementById('quickGo'),

  // card + strips
  card: document.getElementById('card'),
  ayahArabic: document.getElementById('ayahArabic'),
  ayahBangla: document.getElementById('ayahBangla'),

  // front
  wordId: document.getElementById('wordId'),
  frontArabicWord: document.getElementById('frontArabicWord'),
  frontBanglaMeaning: document.getElementById('frontBanglaMeaning'),
  frontRoot: document.getElementById('frontRoot'),
  frontRootMeaning: document.getElementById('frontRootMeaning'),
  frontDerivationMethod: document.getElementById('frontDerivationMethod'),
  frontDerivList: document.getElementById('frontDerivList'),

  // back (we reuse this container to render the ayah grid)
  backSurahNameBn: document.getElementById('backSurahNameBn'),
  backArabicWord: document.getElementById('backArabicWord'),
  backArabicBig: document.getElementById('backArabicBig'),
  backBanglaMeaning: document.getElementById('backBanglaMeaning'),
  backDerivList: document.getElementById('backDerivList'),

  // nav
  firstBtn: document.getElementById('firstBtn'),
  prevBtn: document.getElementById('prevBtn'),
  flipBtn: document.getElementById('flipBtn'),
  nextBtn: document.getElementById('nextBtn'),
  lastBtn: document.getElementById('lastBtn'),
  positionText: document.getElementById('positionText'),

  errorBanner: document.getElementById('errorBanner'),
};

// ---------- utils ----------
const shuffle = a => {
  a = a.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};
const showError = msg => {
  els.errorBanner.textContent = msg;
  els.errorBanner.classList.remove('hidden');
  setTimeout(() => els.errorBanner.classList.add('hidden'), 6000);
};
const flattenWords = s => {
  const list = [];
  (s.ayats || []).forEach((ayah, ai) => {
    (ayah.words || []).forEach((word, wi) => list.push({ ayahIndex: ai, wordIndex: wi, ayah, word }));
  });
  return list;
};
const makeOrder = () => {
  const idxs = [...Array(state.words.length).keys()];
  state.order = state.mode === 'random' ? shuffle(idxs) : idxs;
  state.idx = 0;
};
const renderPosition = () => (els.positionText.textContent = `${state.idx + 1} / ${state.order.length}`);
const renderAyahStrip = a => {
  els.ayahArabic.textContent = a.arabic || '';
  els.ayahBangla.textContent = a.bangla || '';
};

// ---------- FRONT: derivations list ----------
function renderDerivations(list, container) {
  container.innerHTML = '';
  if (!Array.isArray(list) || !list.length) {
    const d = document.createElement('div');
    d.className = 'deriv-item';
    d.innerHTML = '<div class="meaning">— কোনো ডেরিভেশন নেই —</div>';
    container.appendChild(d);
    return;
  }
  list.forEach(dv => {
    const exBn = dv.exampleBangla ?? dv.exampleBn ?? dv.exampleBN ?? '';
    const wrap = document.createElement('div');
    wrap.className = 'deriv-item';
    wrap.innerHTML = `
      <div class="arabic ar-lg">${dv.arabic || ''}</div>
      <div class="meaning">${dv.meaning || ''}</div>
      <div class="ex rtl"><b>উদাহরণ (Ar):</b> ${dv.exampleArabic || ''}</div>
      <div class="ex"><b>উদাহরণ (Bn):</b> ${exBn}</div>
      ${
        Array.isArray(dv.occurrences) && dv.occurrences.length
          ? `<div class="occ-wrap">${dv.occurrences
              .map(
                o => `<span class="chip-sm" title="Click to copy">${o.ayah_id}</span>`
              )
              .join('')}</div>`
          : ''
      }
    `;
    // copy ayah id
    wrap.querySelectorAll('.chip-sm').forEach(ch => {
      ch.addEventListener('click', () => {
        navigator.clipboard?.writeText(ch.textContent);
        ch.classList.add('copied');
        setTimeout(() => ch.classList.remove('copied'), 600);
      });
    });
    container.appendChild(wrap);
  });
}

// ---------- BACK: word-by-word ayah grid ONLY ----------
function renderAyahGrid(ayah, container) {
  container.innerHTML = '';
  const shell = document.createElement('div');
  shell.className = 'ayah-grid-shell';

  const grid = document.createElement('div');
  grid.className = 'ayah-grid';
  (ayah.words || []).forEach(w => {
    const pair = document.createElement('div');
    pair.className = 'pair';

    const ar = document.createElement('div');
    ar.className = 'pair-ar';
    ar.textContent = w.arabic_word || '';

    const bn = document.createElement('div');
    bn.className = 'pair-bn';
    bn.textContent = w.bangla_meaning || '';

    pair.appendChild(ar);
    pair.appendChild(bn);
    grid.appendChild(pair);
  });

  shell.appendChild(grid);
  container.appendChild(shell);
}

// ---------- render ----------
function renderCard() {
  if (!state.order.length) {
    els.positionText.textContent = '0 / 0';
    els.ayahArabic.textContent = '';
    els.ayahBangla.textContent = '';
    els.frontDerivList.innerHTML = '';
    els.backDerivList.innerHTML = '';
    els.frontArabicWord.textContent = els.frontBanglaMeaning.textContent = '';
    els.frontRoot.textContent = els.frontRootMeaning.textContent = els.frontDerivationMethod.textContent = '';
    return;
  }

  const cur = state.words[state.order[state.idx]];
  const { ayah, word } = cur;

  // Top strip
  renderAyahStrip(ayah);

  // FRONT (big readable Arabic + root/info on left, derivations on right)
  els.wordId.textContent = word.word_id || '';
  els.frontArabicWord.textContent = word.arabic_word || '';
  els.frontBanglaMeaning.textContent = word.bangla_meaning || '';
  els.frontRoot.textContent = word.root || '';
  els.frontRootMeaning.textContent = word.rootMeaning || '';
  els.frontDerivationMethod.textContent = word.derivationMethod || '';
  renderDerivations(word.quranicDerivations || [], els.frontDerivList);

  // BACK (only grid)
  els.backSurahNameBn.textContent = state.surah?.name_bn || '';
  els.backArabicWord.textContent = word.arabic_word || '';
  els.backArabicBig.textContent = word.arabic_word || '';
  els.backBanglaMeaning.textContent = word.bangla_meaning || '';
  renderAyahGrid(ayah, els.backDerivList);

  renderPosition();
}

// ---------- nav ----------
function goFirst(){ state.idx = 0; ensureFront(); renderCard(); }
function goLast(){ state.idx = Math.max(0, state.order.length - 1); ensureFront(); renderCard(); }
function goNext(){ state.idx = (state.idx + 1) % state.order.length; ensureFront(); renderCard(); }
function goPrev(){ state.idx = (state.idx - 1 + state.order.length) % state.order.length; ensureFront(); renderCard(); }
function flip(){ els.card.classList.toggle('flipped'); }
function ensureFront(){ els.card.classList.remove('flipped'); }

// ---------- loading ----------
async function loadManifest(){
  try{
    const res = await fetch('data/manifest.json?ts='+Date.now());
    if(!res.ok) throw new Error('manifest.json লোড করা যায়নি');
    const man = await res.json();
    if(!Array.isArray(man)) throw new Error('manifest.json অবশ্যই array হবে');
    state.manifest = man;
    els.surahSelect.innerHTML = '<option value="" disabled selected>সুরা বাছাই করুন…</option>';
    man.forEach((m,i)=>{
      const opt = document.createElement('option');
      opt.value = String(i);
      opt.textContent = m.display_bn || m.display || m.filename;
      els.surahSelect.appendChild(opt);
    });
  }catch(e){ showError(e.message); }
}

async function loadSurahByIndex(i){
  const m = state.manifest[i];
  if(!m) return;
  try{
    const res = await fetch('data/'+m.filename+'?ts='+Date.now());
    if(!res.ok) throw new Error('Surah JSON লোড করা যায়নি: '+m.filename);
    const arr = await res.json();
    const s = Array.isArray(arr) ? arr[0] : arr;
    if(!s || !Array.isArray(s.ayats)) throw new Error('ভুল surah schema: '+m.filename);
    state.surah = s;
    state.words = flattenWords(s);
    makeOrder();
    renderCard();
  }catch(e){ showError(e.message); }
}

// quick jump 67:ayah or 67:ayah:word
function handleQuickGo(){
  const val = els.quickSearch.value.trim();
  if(!val) return;
  const [surah, ayah, w] = val.split(':');
  const targetAyah = ayah;
  const targetWord = w || null;
  const flatIdx = state.words.findIndex(x=>{
    const [s,a,wp] = (x.word.word_id||'').split(':');
    return (!targetWord ? a===targetAyah : (a===targetAyah && wp===targetWord));
  });
  if(flatIdx >= 0){
    const inOrder = state.order.indexOf(flatIdx);
    state.idx = inOrder >= 0 ? inOrder : flatIdx;
    ensureFront(); renderCard();
  }
}

// ---------- events ----------
els.modeSelect.addEventListener('change', ()=>{ state.mode = els.modeSelect.value; makeOrder(); renderCard(); });
els.surahSelect.addEventListener('change', async ()=>{ const i = parseInt(els.surahSelect.value,10); await loadSurahByIndex(i); });
els.quickGo.addEventListener('click', handleQuickGo);
els.quickSearch.addEventListener('keydown', e=>{ if(e.key==='Enter') handleQuickGo(); });

els.firstBtn.addEventListener('click', goFirst);
els.prevBtn.addEventListener('click', goPrev);
els.flipBtn.addEventListener('click', flip);
els.nextBtn.addEventListener('click', goNext);
els.lastBtn.addEventListener('click', goLast);

window.addEventListener('keydown', e=>{
  if(e.target===els.quickSearch) return;
  if(e.key==='ArrowRight' || e.key===' ') goNext();
  else if(e.key==='ArrowLeft') goPrev();
  else if(e.key.toLowerCase()==='f') flip();
  else if(e.key.toLowerCase()==='r'){ state.mode = (state.mode==='sequential')?'random':'sequential'; els.modeSelect.value = state.mode; makeOrder(); renderCard(); }
});

// init
(async function init(){ await loadManifest(); })();
