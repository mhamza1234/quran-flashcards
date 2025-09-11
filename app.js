// ----------- State -----------
let manifest = [];
let data = null;            // current dataset JSON
let wordsFlat = [];         // flat list of all word entries (for sequential/random)
let index = 0;              // current flat index
let mode = "sequential";

// DOM refs
const surahSelect = document.getElementById('surahSelect');
const modeSelect  = document.getElementById('modeSelect');
const jumpInput   = document.getElementById('jumpInput');
const goBtn       = document.getElementById('goBtn');

const crumb    = document.getElementById('crumb');
const firstBtn = document.getElementById('firstBtn');
const prevBtn  = document.getElementById('prevBtn');
const flipBtn  = document.getElementById('flipBtn');
const nextBtn  = document.getElementById('nextBtn');
const lastBtn  = document.getElementById('lastBtn');

const frontFace = document.getElementById('frontFace');
const backFace  = document.getElementById('backFace');

const wordArabic = document.getElementById('wordArabic');
const wordBangla = document.getElementById('wordBangla');

const audioBtn   = document.getElementById('audioBtn');
const audioEl    = document.getElementById('ayahAudio');
const audioStatus= document.getElementById('audioStatus');

const tajSummary = document.getElementById('tajSummary');
const tajList    = document.getElementById('tajList');
const tajExample = document.getElementById('tajExample');
const exArabic   = document.getElementById('exArabic');
const exBangla   = document.getElementById('exBangla');

const backCrumb  = document.getElementById('backCrumb');
const backArabic = document.getElementById('backArabic');
const backBangla = document.getElementById('backBangla');

const tabRoots = document.getElementById('tabRoots');
const tabWbw   = document.getElementById('tabWbw');
const rootsPane= document.getElementById('rootsPane');
const wbwPane  = document.getElementById('wbwPane');
const wbwScope = document.getElementById('wbwScope');

const rootTxt  = document.getElementById('rootTxt');
const rootMeaningTxt = document.getElementById('rootMeaningTxt');
const morphTxt = document.getElementById('morphTxt');
const derivList = document.getElementById('derivList');
const derivEmpty= document.getElementById('derivEmpty');

const wbwList  = document.getElementById('wbwList');

// ----------- Init -----------
init();

async function init(){
  await loadManifest();
  await loadDatasetFromSelect();

  // controls
  modeSelect.addEventListener('change', ()=> mode = modeSelect.value);
  goBtn.addEventListener('click', onGo);
  firstBtn.addEventListener('click', ()=> { index = 0; render(); });
  lastBtn .addEventListener('click', ()=> { index = wordsFlat.length-1; render(); });
  prevBtn .addEventListener('click', prev);
  nextBtn .addEventListener('click', next);
  flipBtn .addEventListener('click', flip);
  audioBtn.addEventListener('click', toggleAudio);

  tabRoots.addEventListener('click', ()=> switchTab('roots'));
  tabWbw  .addEventListener('click', ()=> switchTab('wbw'));
  wbwScope.addEventListener('change', ()=> renderBack());

  document.addEventListener('keydown', (e)=>{
    if(e.code==='Space'){ e.preventDefault(); toggleAudio(); }
    if(e.key==='ArrowRight') next();
    if(e.key==='ArrowLeft')  prev();
    if(e.key.toLowerCase()==='f') flip();
  });

  render();
}

async function loadManifest(){
  const resp = await fetch('data/manifest.json', { cache: 'no-store' });
  manifest = await resp.json();
  surahSelect.innerHTML = manifest.map(m => `<option value="${m.filename}">${m.display || m.name_bn || m.name_ar}</option>`).join('');
  surahSelect.addEventListener('change', loadDatasetFromSelect);
}

async function loadDatasetFromSelect(){
  const file = surahSelect.value || (manifest[0] && manifest[0].filename);
  if(!file) return;
  const resp = await fetch(`data/${file}`, { cache: 'no-store' });
  data = await resp.json();

  // build flat word list [ {ayah, word, ayahIndex, wordIndex} ... ]
  wordsFlat = [];
  (data.ayats || []).forEach((a, ai)=>{
    (a.words || []).forEach((w, wi)=>{
      wordsFlat.push({ a, w, ai, wi });
    });
  });
  index = 0;
  render();
}

function onGo(){
  const val = (jumpInput.value || '').trim();
  // Accept 67:5 or 67:5:3
  const m = val.match(/^(\d+):(\d+)(?::(\d+))?$/);
  if(!m){ return; }
  const ay = `${m[1]}:${m[2]}`;
  const wantWord = m[3] ? parseInt(m[3],10) : null;

  // find first index that matches ayah (and word if provided)
  const idx = wordsFlat.findIndex(x=>{
    const [s,a] = x.a.ayah_id.split(':').map(Number);
    const [ss,aa] = ay.split(':').map(Number);
    if(s!==ss || a!==aa) return false;
    if(wantWord==null) return true;
    const wi = parseInt(x.w.word_id.split(':')[2],10);
    return wi===wantWord;
  });
  if(idx>=0){ index = idx; render(); }
}

function prev(){
  if(mode==='random'){
    index = Math.floor(Math.random()*wordsFlat.length);
  }else{
    index = Math.max(0, index-1);
  }
  render();
}
function next(){
  if(mode==='random'){
    index = Math.floor(Math.random()*wordsFlat.length);
  }else{
    index = Math.min(wordsFlat.length-1, index+1);
  }
  render();
}

function flip(){
  const f = frontFace.style.display !== 'none';
  frontFace.style.display = f ? 'none' : 'block';
  backFace .style.display = f ? 'block' : 'none';
  if(!f) stopAudio();
  if(!f) renderBack(); // when flipping to back, (re)render its content
}

function toggleAudio(){
  const { w } = wordsFlat[index];
  if(!w.audio || !w.audio.ayahAudioUrl){
    audioStatus.textContent = 'No audio';
    return;
  }
  if(audioEl.src !== w.audio.ayahAudioUrl){
    audioEl.src = w.audio.ayahAudioUrl;
  }
  if(audioEl.paused){
    audioEl.play().then(()=>{
      audioStatus.textContent = 'Playing… (Space to pause)';
    }).catch(()=>{ audioStatus.textContent = 'Audio blocked (user gesture needed)'; });
  }else{
    audioEl.pause();
    audioStatus.textContent = 'Paused';
  }
}
function stopAudio(){ try{ audioEl.pause(); audioStatus.textContent='Ready'; }catch(e){} }

// ----------- Rendering -----------
function render(){
  const { a, w, ai, wi } = wordsFlat[index] || {};

  if(!w){
    crumb.textContent = '—';
    wordArabic.textContent = '—';
    wordBangla.textContent = '—';
    tajSummary.innerHTML = '';
    tajList.innerHTML = '<div class="taj-line muted">No data.</div>';
    tajExample.style.display='none';
    backCrumb.textContent='—'; backArabic.textContent='—'; backBangla.textContent='—';
    posText();
    return;
  }

  // crumb & counters
  crumb.textContent = `${a.ayah_id}:${wi+1} — ${index+1} / ${wordsFlat.length}`;
  function posText(){}

  // FRONT
  wordArabic.textContent = w.arabic_word || '—';
  wordBangla .textContent = w.bangla_meaning || '—';

  // Tajwīd summary chips
  tajSummary.innerHTML = '';
  const chips = [];
  if(w.tajweed && Array.isArray(w.tajweed.rules)){
    w.tajweed.rules.forEach(r=>{
      const chip = document.createElement('span');
      chip.className = 'chip';
      chip.innerHTML = `<b>${r.rule}</b>${r.subtype?` — ${r.subtype}`:''}`;
      chips.push(chip);
    });
  }
  if(chips.length){ chips.forEach(c=>tajSummary.appendChild(c)); }

  // Tajwīd lines (detailed)
  tajList.innerHTML = '';
  if(w.tajweed && Array.isArray(w.tajweed.rules) && w.tajweed.rules.length){
    w.tajweed.rules.forEach(r=>{
      const line = document.createElement('div');
      line.className = 'taj-line';
      const key = `<span class="taj-key">${r.rule}${r.subtype?` — ${r.subtype}`:''}</span>`;
      const ar  = r.trigger ? ` <span class="taj-ar">${r.trigger}</span>` : '';
      const note= r.note ? ` — ${r.note}` : '';
      line.innerHTML = key + ar + note;
      tajList.appendChild(line);
    });
  }else{
    const line = document.createElement('div');
    line.className = 'taj-line muted';
    line.textContent = 'No recorded rules for this word.';
    tajList.appendChild(line);
  }

  // Example block (if provided)
  if(w.exampleArabic || w.exampleBangla){
    exArabic.textContent = w.exampleArabic || '';
    exBangla.textContent = w.exampleBangla || '';
    tajExample.style.display = 'block';
  }else{
    tajExample.style.display = 'none';
  }

  // ensure front visible by default
  frontFace.style.display = 'block';
  backFace .style.display = 'none';
  audioEl.src = ''; // reset audio source (avoid autoplay when switching words)
  audioStatus.textContent = 'Ready';
}

function renderBack(){
  const { a, w, ai, wi } = wordsFlat[index];

  backCrumb.textContent  = `${a.ayah_id}:${wi+1}`;
  backArabic.textContent = w.arabic_word || '—';
  backBangla.textContent = w.bangla_meaning || '—';

  const onRoots = tabRoots.classList.contains('active');

  if(onRoots){
    // Fill details
    rootTxt.textContent = w.root || '—';
    rootMeaningTxt.textContent = w.rootMeaning || '—';
    morphTxt.textContent = w.derivationMethod || '—';

    // Derivations cards
    derivList.innerHTML = '';
    const derivs = Array.isArray(w.quranicDerivations) ? w.quranicDerivations : [];
    if(!derivs.length){ derivEmpty.style.display='block'; }
    else{
      derivEmpty.style.display='none';
      derivs.forEach(d=>{
        const refs = (d.occurrences||[]).map(o=>o.ayah_id).join(', ');
        const card = document.createElement('div');
        card.className = 'deriv-card';
        card.innerHTML = `
          <div class="deriv-ar" dir="rtl">${d.arabic || ''}</div>
          <div>
            <div class="deriv-bn">${d.meaning || ''}</div>
            <div class="deriv-meta">${refs}</div>
          </div>`;
        derivList.appendChild(card);
      });
    }
  }else{
    // Word-by-Word
    const whole = wbwScope.checked;
    wbwList.innerHTML = '';

    if(whole){
      // Entire surah (all ayats)
      (data.ayats||[]).forEach(ay=>{
        const hdr = document.createElement('div');
        hdr.className = 'detail-row';
        hdr.innerHTML = `<b>${ay.ayah_id}</b>`;
        wbwList.appendChild(hdr);

        (ay.words||[]).forEach(x=>{
          const row = document.createElement('div');
          row.className = 'wbw-row';
          row.innerHTML = `
            <div class="wbw-ar" dir="rtl">${x.arabic_word}</div>
            <div class="wbw-bn">${x.bangla_meaning}</div>`;
          wbwList.appendChild(row);
        });
      });
    }else{
      // Current ayah only
      (a.words||[]).forEach(x=>{
        const row = document.createElement('div');
        row.className = 'wbw-row';
        row.innerHTML = `
          <div class="wbw-ar" dir="rtl">${x.arabic_word}</div>
          <div class="wbw-bn">${x.bangla_meaning}</div>`;
        wbwList.appendChild(row);
      });
    }
  }
}

function switchTab(name){
  if(name==='roots'){
    tabRoots.classList.add('active');
    tabWbw.classList.remove('active');
    rootsPane.style.display = 'block';
    wbwPane.style.display   = 'none';
  }else{
    tabWbw.classList.add('active');
    tabRoots.classList.remove('active');
    rootsPane.style.display = 'none';
    wbwPane.style.display   = 'block';
  }
  renderBack();
}
