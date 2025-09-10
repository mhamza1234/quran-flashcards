/* Quran Word Flashcards – back face redesign + fixes
   - Front = quick recognition
   - Back  = Ayah breakdown (word-by-word) + Derivation Details + stats
*/

const state = {
  manifest: [],
  surah: null,
  words: [],
  order: [],
  idx: 0,
  mode: 'sequential'
};

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

  backSurahNameBn: document.getElementById('backSurahNameBn'),
  backArabicWord: document.getElementById('backArabicWord'),
  backArabicBig: document.getElementById('backArabicBig'),
  backBanglaMeaning: document.getElementById('backBanglaMeaning'),
  backDerivList: document.getElementById('backDerivList'), // we reuse this as the back content container

  firstBtn: document.getElementById('firstBtn'),
  prevBtn: document.getElementById('prevBtn'),
  flipBtn: document.getElementById('flipBtn'),
  nextBtn: document.getElementById('nextBtn'),
  lastBtn: document.getElementById('lastBtn'),
  positionText: document.getElementById('positionText'),

  errorBanner: document.getElementById('errorBanner'),
};

// ---------- utils ----------
const shuffle = (a) => {
  a = a.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

const showError = (msg) => {
  if (!els.errorBanner) return;
  els.errorBanner.textContent = msg;
  els.errorBanner.classList.remove('hidden');
  setTimeout(() => els.errorBanner.classList.add('hidden'), 6000);
};

const flattenWords = (surah) => {
  const list = [];
  (surah.ayats || []).forEach((ayah, ai) => {
    (ayah.words || []).forEach((word, wi) =>
      list.push({ ayahIndex: ai, wordIndex: wi, ayah, word })
    );
  });
  return list;
};

const makeOrder = () => {
  const idxs = [...Array(state.words.length).keys()];
  state.order = state.mode === 'random' ? shuffle(idxs) : idxs;
  state.idx = 0;
};

const renderPosition = () => {
  els.positionText.textContent = `${state.idx + 1} / ${state.order.length}`;
};

const renderAyahStrip = (a) => {
  els.ayahArabic.textContent = a.arabic || '';
  els.ayahBangla.textContent = a.bangla || '';
};

// ---------- derivations renderer (returns stats for back face) ----------
function renderDerivations(list, container, compact = false) {
  // Clear but DO NOT destroy outer container (we may append stats below)
  container.innerHTML = '';

  const summary = { totalRefs: 0, uniqueSurahs: new Set(), forms: new Set() };

  if (!Array.isArray(list) || !list.length) {
    const empty = document.createElement('div');
    empty.className = compact ? '' : 'deriv-item';
    empty.innerHTML = '<div class="meaning">— কোনো ডেরিভেশন নেই —</div>';
    container.appendChild(empty);
    return summary;
  }

  list.forEach(d => {
    summary.forms.add((d.arabic || '').trim());
    (d.occurrences || []).forEach(o => {
      summary.totalRefs += 1;
      const sid = String(o.ayah_id || '');
      const surahNo = sid.split(':')[0];
      if (surahNo) summary.uniqueSurahs.add(surahNo);
    });

    // Map exampleBangla robustly
    const exampleBn =
      d.exampleBangla ?? d.exampleBn ?? d.exampleBN ?? '';

    const box = document.createElement('div');
    box.className = compact ? '' : 'deriv-item';

    const arab = document.createElement('div');
    arab.className = 'arabic bigger-ar';
    arab.textContent = d.arabic || '';

    const mean = document.createElement('div');
    mean.className = 'meaning';
    mean.textContent = d.meaning || '';

    const exAr = document.createElement('div');
    exAr.className = 'ex rtl';
    exAr.innerHTML = `<b>উদাহরণ (Ar):</b> <span class="exa">${d.exampleArabic || ''}</span>`;

    const exBn = document.createElement('div');
    exBn.className = 'ex';
    exBn.innerHTML = `<b>উদাহরণ (Bn):</b> <span class="exb">${exampleBn}</span>`;

    const occWrap = document.createElement('div');
    occWrap.className = 'occ-wrap';
    (d.occurrences || []).forEach(o => {
      const chip = document.createElement('span');
      chip.className = 'chip-sm';
      chip.textContent = o.ayah_id;
      chip.title = 'Click to copy Ayah ID';
      chip.addEventListener('click', () => {
        navigator.clipboard?.writeText(o.ayah_id);
        chip.classList.add('copied');
        setTimeout(() => chip.classList.remove('copied'), 600);
      });
      occWrap.appendChild(chip);
    });

    box.appendChild(arab);
    box.appendChild(mean);
    box.appendChild(exAr);
    box.appendChild(exBn);
    box.appendChild(occWrap);
    container.appendChild(box);
  });

  return summary;
}

// ---------- back: Ayah breakdown (word → meaning per line) ----------
function renderAyahBreakdown(ayah, container) {
  const wrap = document.createElement('div');
  wrap.className = 'ayah-breakdown';

  const title = document.createElement('div');
  title.className = 'section-title';
  title.textContent = 'আয়াতের শব্দ-by-শব্দ';
  wrap.appendChild(title);

  const grid = document.createElement('div');
  grid.className = 'abw-grid';

  (ayah.words || []).forEach(w => {
    const row = document.createElement('div');
    row.className = 'abw-row';

    const ar = document.createElement('div');
    ar.className = 'abw-ar rtl bigger-ar';
    ar.textContent = w.arabic_word || '';

    const bn = document.createElement('div');
    bn.className = 'abw-bn';
    bn.textContent = w.bangla_meaning || '';

    row.appendChild(ar);
    row.appendChild(bn);
    grid.appendChild(row);
  });

  wrap.appendChild(grid);
  container.appendChild(wrap);
}

// ---------- render the card ----------
function renderCard() {
  if (!state.order.length) {
    els.positionText.textContent = '0 / 0';
    els.ayahArabic.textContent = '';
    els.ayahBangla.textContent = '';
    els.frontArabicWord.textContent = '';
    els.frontBanglaMeaning.textContent = '';
    els.frontRoot.textContent = '';
    els.frontRootMeaning.textContent = '';
    els.frontDerivationMethod.textContent = '';
    els.frontDerivList.innerHTML = '';
    els.backDerivList.innerHTML = '';
    return;
  }

  const cur = state.words[state.order[state.idx]];
  const { ayah, word } = cur;

  // top strip
  renderAyahStrip(ayah);

  // FRONT (quick)
  els.wordId.textContent = word.word_id || '';
  els.frontArabicWord.textContent = word.arabic_word || '';
  els.frontBanglaMeaning.textContent = word.bangla_meaning || '';
  els.frontRoot.textContent = word.root || '';
  els.frontRootMeaning.textContent = word.rootMeaning || '';
  els.frontDerivationMethod.textContent = word.derivationMethod || '';
  renderDerivations(word.quranicDerivations || [], els.frontDerivList, false);

  // BACK (Ayah breakdown + derivation details + stats)
  els.backSurahNameBn.textContent = state.surah?.name_bn || '';
  els.backArabicWord.textContent = word.arabic_word || '';
  els.backArabicBig.textContent = word.arabic_word || '';
  els.backBanglaMeaning.textContent = word.bangla_meaning || '';

  els.backDerivList.innerHTML = '';

  // 1) Word-by-word breakdown of the whole ayah
  renderAyahBreakdown(ayah, els.backDerivList);

  // Divider
  const hr = document.createElement('div');
  hr.className = 'divider';
  els.backDerivList.appendChild(hr);

  // 2) Derivation details (for the focused word)
  const derivHeader = document.createElement('div');
  derivHeader.className = 'section-title';
  derivHeader.textContent = 'Derivation Details';
  els.backDerivList.appendChild(derivHeader);

  const stats = renderDerivations(word.quranicDerivations || [], els.backDerivList, true);

  // 3) Stats block
  const statsDiv = document.createElement('div');
  statsDiv.className = 'stats';
  const forms = Array.from(stats.forms).filter(Boolean);
  statsDiv.innerHTML = `
    <div class="stats-row">
      <span class="stat"><b>মোট রেফারেন্স:</b> ${stats.totalRefs}</span>
      <span class="stat"><b>সুরার সংখ্যা:</b> ${stats.uniqueSurahs.size}</span>
      <span class="stat"><b>ভিন্ন ফর্ম:</b> ${forms.length}</span>
    </div>
    ${forms.length ? `<div class="forms-row">${forms.map(f => `<span class="chip-sm rtl">${f}</span>`).join(' ')}</div>` : ''}
  `;
  els.backDerivList.appendChild(statsDiv);

  renderPosition();
}

// ---------- navigation ----------
function goFirst(){ state.idx = 0; ensureFront(); renderCard(); }
function goLast(){ state.idx = Math.max(0, state.order.length-1); ensureFront(); renderCard(); }
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
  }catch(err){
    showError(err.message);
  }
}

async function loadSurahByIndex(i){
  const m = state.manifest[i];
  if(!m) return;
  try{
    const res = await fetch('data/' + m.filename + '?ts=' + Date.now());
    if(!res.ok) throw new Error('Surah JSON লোড করা যায়নি: ' + m.filename);
    const arr = await res.json();
    const s = Array.isArray(arr) ? arr[0] : arr;
    if(!s || !Array.isArray(s.ayats)) throw new Error('ভুল surah schema: ' + m.filename);

    state.surah = s;
    state.words = flattenWords(s);
    makeOrder();
    renderCard();
  }catch(err){
    showError(err.message);
  }
}

// quick jump: 67:ayah:word or 67:ayah
function handleQuickGo(){
  const val = els.quickSearch.value.trim();
  if(!val) return;
  const parts = val.split(':');
  if(parts.length < 2) return;
  const targetAyah = parts[1];
  const targetWord = parts[2] || null;

  const flatIdx = state.words.findIndex(w=>{
    const [s,a,wpos] = (w.word.word_id||'').split(':');
    return (!targetWord ? a===targetAyah : (a===targetAyah && wpos===targetWord));
  });
  if(flatIdx >= 0){
    const inOrder = state.order.indexOf(flatIdx);
    state.idx = inOrder >= 0 ? inOrder : flatIdx;
    ensureFront(); renderCard();
  }
}

// ---------- events ----------
els.modeSelect.addEventListener('change', ()=>{ state.mode = els.modeSelect.value; makeOrder(); renderCard(); });
els.surahSelect.addEventListener('change', async ()=>{ const i = parseInt(els.surahSelect.value, 10); await loadSurahByIndex(i); });
els.quickGo.addEventListener('click', handleQuickGo);
els.quickSearch.addEventListener('keydown', e=>{ if(e.key==='Enter') handleQuickGo(); });

els.firstBtn.addEventListener('click', goFirst);
els.prevBtn.addEventListener('click', goPrev);
els.flipBtn.addEventListener('click', flip);
els.nextBtn.addEventListener('click', goNext);
els.lastBtn.addEventListener('click', goLast);

// keyboard shortcuts
window.addEventListener('keydown', e=>{
  if(e.target === els.quickSearch) return;
  if(e.key === 'ArrowRight' || e.key === ' ') goNext();
  else if(e.key === 'ArrowLeft') goPrev();
  else if(e.key.toLowerCase() === 'f') flip();
  else if(e.key.toLowerCase() === 'r'){
    state.mode = (state.mode === 'sequential') ? 'random' : 'sequential';
    els.modeSelect.value = state.mode;
    makeOrder(); renderCard();
  }
});

(async function init(){ await loadManifest(); })();
