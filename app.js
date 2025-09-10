/* Quran Flashcards — baseline stable
   Front  = big Arabic (left), root/meaning/morphology + Derivations
   Back   = single centered column (Arabic | Bangla) rows
   Robust manifest loader + error catcher
*/

const state = { manifest: [], surah: null, words: [], order: [], idx: 0, mode: 'sequential' };

const els = {
  modeSelect: document.getElementById('modeSelect'),
  surahSelect: document.getElementById('surahSelect'),
  quickSearch: document.getElementById('quickSearch'),
  quickGo: document.getElementById('quickGo'),

  card: document.getElementById('card'),
  ayahArabic: document.getElementById('ayahArabic'),
  ayahBangla: document.getElementById('ayahBangla'),

  wordId: document.getElementById('wordId'),
  frontArabicWord: document.getElementById('frontArabicWord'),
  frontBanglaMeaning: document.getElementById('frontBanglaMeaning'),
  frontRoot: document.getElementById('frontRoot'),
  frontRootMeaning: document.getElementById('frontRootMeaning'),
  frontDerivationMethod: document.getElementById('frontDerivationMethod'),
  frontDerivList: document.getElementById('frontDerivList'),

  backDerivList: document.getElementById('backDerivList'),

  firstBtn: document.getElementById('firstBtn'),
  prevBtn: document.getElementById('prevBtn'),
  flipBtn: document.getElementById('flipBtn'),
  nextBtn: document.getElementById('nextBtn'),
  lastBtn: document.getElementById('lastBtn'),
  positionText: document.getElementById('positionText'),

  errorBanner: document.getElementById('errorBanner'),
};

/* Global error-catching so silent errors don’t hide the dropdown */
window.addEventListener('error', (e) => {
  console.error('[global error]', e.message, e.filename, e.lineno, e.colno, e.error);
  showError('স্ক্রিপ্ট ত্রুটি: ' + e.message);
});
window.addEventListener('unhandledrejection', (e) => {
  console.error('[promise rejection]', e.reason);
  showError('ডেটা লোডিং ত্রুটি — বিস্তারিত কনসোলে দেখুন');
});

/* utils */
const shuffle = a => { a=a.slice(); for(let i=a.length-1;i>0;i--){const j=(Math.random()*(i+1))|0; [a[i],a[j]]=[a[j],a[i]];} return a; };
const showError = m => { if(!els.errorBanner) return; els.errorBanner.textContent=m; els.errorBanner.classList.remove('hidden'); setTimeout(()=>els.errorBanner.classList.add('hidden'),6000); };
const flattenWords = s => { const out=[]; (s.ayats||[]).forEach((ayah,ai)=> (ayah.words||[]).forEach((word,wi)=> out.push({ayahIndex:ai,wordIndex:wi,ayah,word})) ); return out; };
const makeOrder = () => { const idxs=[...Array(state.words.length).keys()]; state.order = (state.mode==='random')? shuffle(idxs): idxs; state.idx=0; };
const renderPosition = () => { els.positionText.textContent = `${state.idx+1} / ${state.order.length}`; };
const renderAyahStrip = a => { els.ayahArabic.textContent=a.arabic||''; els.ayahBangla.textContent=a.bangla||''; };
const ensureFront = () => els.card.classList.remove('flipped');

/* front derivations */
function renderDerivations(list, container){
  container.innerHTML='';
  if(!Array.isArray(list) || !list.length){
    const d=document.createElement('div'); d.className='deriv-item';
    d.innerHTML='<div class="meaning">— কোনো ডেরিভেশন নেই —</div>';
    container.appendChild(d); return;
  }
  list.forEach(dv=>{
    const exBn = dv.exampleBangla ?? dv.exampleBn ?? dv.exampleBN ?? '';
    const wrap=document.createElement('div'); wrap.className='deriv-item';
    wrap.innerHTML = `
      <div class="arabic ar-lg">${dv.arabic || ''}</div>
      <div class="meaning">${dv.meaning || ''}</div>
      <div class="ar-example">${dv.exampleArabic || ''}</div>
      <div class="ex ex-bn"><b>উদাহরণ (Bn):</b> ${exBn}</div>
      ${Array.isArray(dv.occurrences) && dv.occurrences.length
        ? `<div class="occ-wrap">${dv.occurrences.map(o=>`<span class="chip-sm" title="Click to copy">${o.ayah_id}</span>`).join('')}</div>`
        : ''
      }
    `;
    wrap.querySelectorAll('.chip-sm').forEach(ch=>{
      ch.addEventListener('click', ()=>{ navigator.clipboard?.writeText(ch.textContent); ch.classList.add('copied'); setTimeout(()=>ch.classList.remove('copied'),600); });
    });
    container.appendChild(wrap);
  });
}

/* back grid */
function renderAyahGrid(ayah, container){
  container.innerHTML='';
  const grid = document.createElement('div');
  grid.className = 'ayah-grid one-col';
  (ayah.words || []).forEach(w=>{
    const row=document.createElement('div'); row.className='pair';
    row.innerHTML = `
      <div class="pair-ar">${w.arabic_word || ''}</div>
      <div class="pair-bn">${w.bangla_meaning || ''}</div>
    `;
    grid.appendChild(row);
  });
  container.appendChild(grid);
}

/* render */
function renderCard(){
  if(!state.order.length){
    els.positionText.textContent='0 / 0';
    els.ayahArabic.textContent=els.ayahBangla.textContent='';
    els.frontDerivList.innerHTML=els.backDerivList.innerHTML='';
    els.frontArabicWord.textContent=els.frontBanglaMeaning.textContent='';
    els.frontRoot.textContent=els.frontRootMeaning.textContent=els.frontDerivationMethod.textContent='';
    return;
  }
  const cur = state.words[state.order[state.idx]];
  const { ayah, word } = cur;

  renderAyahStrip(ayah);

  // FRONT
  els.wordId.textContent = word.word_id || '';
  els.frontArabicWord.textContent = word.arabic_word || '';
  els.frontBanglaMeaning.textContent = word.bangla_meaning || '';
  els.frontRoot.textContent = word.root || '';
  els.frontRootMeaning.textContent = word.rootMeaning || '';
  els.frontDerivationMethod.textContent = word.derivationMethod || '';
  renderDerivations(word.quranicDerivations || [], els.frontDerivList);

  // BACK
  renderAyahGrid(ayah, els.backDerivList);

  renderPosition();
}

/* nav */
function goFirst(){ state.idx=0; ensureFront(); renderCard(); }
function goLast(){ state.idx=Math.max(0,state.order.length-1); ensureFront(); renderCard(); }
function goNext(){ state.idx=(state.idx+1)%state.order.length; ensureFront(); renderCard(); }
function goPrev(){ state.idx=(state.idx-1+state.order.length)%state.order.length; ensureFront(); renderCard(); }
function flip(){ els.card.classList.toggle('flipped'); }

/* manifest loader */
async function loadManifest(){
  console.log('[manifest] loading…');
  const paths = ['data/manifest.json','./data/manifest.json','manifest.json','./manifest.json'];

  const fetchJson = async (url) => {
    try {
      const r = await fetch(url + '?ts=' + Date.now());
      console.log('[manifest] fetch', url, '->', r.status);
      if (!r.ok) throw new Error(`HTTP ${r.status} @ ${url}`);
      return await r.json();
    } catch (e) {
      console.warn('[manifest] fetch failed:', url, e);
      return { __error: String(e), __url: url };
    }
  };

  let manifestRaw = null, usedPath = null;
  for (const p of paths) {
    const data = await fetchJson(p);
    if (data && !data.__error) { manifestRaw = data; usedPath = p; break; }
  }

  if (!manifestRaw) {
    showError('manifest.json লোড করা যায়নি — data/manifest.json আছে তো?');
    els.surahSelect.innerHTML = '<option value="" disabled selected>manifest.json মিসিং</option>';
    return;
  }

  let list = [];
  if (Array.isArray(manifestRaw)) list = manifestRaw;
  else if (manifestRaw.surahs && Array.isArray(manifestRaw.surahs)) list = manifestRaw.surahs;
  else if (manifestRaw.filename || manifestRaw.display || manifestRaw.display_bn || manifestRaw.surah_number) list = [manifestRaw];

  if (!Array.isArray(list) || list.length === 0) {
    showError('manifest.json পাওয়া গেছে কিন্তু ফরম্যাট সঠিক নয়/খালি।');
    els.surahSelect.innerHTML = '<option value="" disabled selected>কোনো সুরা পাওয়া যায়নি</option>';
    return;
  }

  state.manifest = list.map((m,i)=>({
    id: String(m.id ?? m.surah_number ?? i+1),
    surah_number: m.surah_number ?? Number(m.id ?? (i+1)),
    name_ar: m.name_ar ?? '',
    name_bn: m.name_bn ?? '',
    display: m.display ?? m.display_bn ?? m.name_bn ?? m.filename ?? `Surah ${m.surah_number ?? (i+1)}`,
    display_bn: m.display_bn ?? m.display ?? m.name_bn ?? '',
    filename: m.filename ?? m.file ?? ''
  })).filter(m => m.filename);

  els.surahSelect.innerHTML = '<option value="" disabled selected>সুরা বাছাই করুন…</option>';
  state.manifest.forEach((m,i)=>{
    const o=document.createElement('option');
    o.value=String(i);
    o.textContent=m.display_bn || m.display || m.filename;
    els.surahSelect.appendChild(o);
  });

  if (!state.manifest.length) {
    showError('manifest.json এ filename-সহ কোনো বৈধ item নেই।');
  } else {
    console.log(`[manifest] loaded ${state.manifest.length} item(s) from ${usedPath}`);
  }
}

/* load a surah */
async function loadSurahByIndex(i){
  const m = state.manifest[i]; if(!m) return;
  try{
    const r = await fetch('data/'+m.filename+'?ts='+Date.now());
    if(!r.ok) throw new Error('Surah JSON লোড করা যায়নি: '+m.filename);
    const arr = await r.json();
    const s = Array.isArray(arr)? arr[0] : arr;
    if(!s || !Array.isArray(s.ayats)) throw new Error('ভুল surah schema: '+m.filename);
    state.surah = s;
    state.words = flattenWords(s);
    makeOrder();
    ensureFront(); renderCard();
  }catch(e){ showError(e.message); }
}

/* quick jump */
function handleQuickGo(){
  const v = els.quickSearch.value.trim(); if(!v) return;
  const [, ay, wd] = v.split(':'); const targetAy=ay; const targetW = wd || null;
  const flatIdx = state.words.findIndex(x=>{
    const [s,a,w] = (x.word.word_id||'').split(':');
    return (!targetW ? a===targetAy : (a===targetAy && w===targetW));
  });
  if(flatIdx>=0){
    const pos = state.order.indexOf(flatIdx);
    state.idx = (pos>=0? pos : flatIdx);
    ensureFront(); renderCard();
  }
}

/* events */
els.modeSelect.addEventListener('change', ()=>{ state.mode=els.modeSelect.value; makeOrder(); ensureFront(); renderCard(); });
els.surahSelect.addEventListener('change', async ()=>{ const i=parseInt(els.surahSelect.value,10); await loadSurahByIndex(i); });
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
  else if(e.key.toLowerCase()==='r'){ state.mode=(state.mode==='sequential')?'random':'sequential'; els.modeSelect.value=state.mode; makeOrder(); ensureFront(); renderCard(); }
});

/* init */
(async function init(){ await loadManifest(); })();
