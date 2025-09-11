console.log("Quran Flashcards FULL build v=full5");

// ---------------- State ----------------
let manifest = [];
let data = null;
let wordsFlat = [];    // [{ a, w, ai, wi, isMajor }]
let index = 0;
let mode = "sequential";

// ---------------- DOM ----------------
const $ = id => document.getElementById(id);

const surahSelect = $('surahSelect');
const modeSelect  = $('modeSelect');
const jumpInput   = $('jumpInput');
const goBtn       = $('goBtn');

const crumb = $('crumb');
const firstBtn = $('firstBtn');
const prevBtn  = $('prevBtn');
const flipBtn  = $('flipBtn');
const nextBtn  = $('nextBtn');
const lastBtn  = $('lastBtn');

const frontFace = $('frontFace');
const backFace  = $('backFace');

const wordArabic = $('wordArabic');
const wordBangla = $('wordBangla');

const audioBtn    = $('audioBtn');
const audioStatus = $('audioStatus');
const audioEl     = $('ayahAudio');

const tajSummary = $('tajSummary');
const tajList    = $('tajList');
const tajExample = $('tajExample');
const exArabic   = $('exArabic');
const exBangla   = $('exBangla');

const backCrumb  = $('backCrumb');
const backArabic = $('backArabic');
const backBangla = $('backBangla');

const tabRoots = $('tabRoots');
const tabWbw   = $('tabWbw');
const rootsPane= $('rootsPane');
const wbwPane  = $('wbwPane');
const wbwScope = $('wbwScope');

const rootTxt  = $('rootTxt');
const rootMeaningTxt = $('rootMeaningTxt');
const morphTxt = $('morphTxt');
const derivList = $('derivList');
const derivEmpty= $('derivEmpty');
const wbwList   = $('wbwList');

// --------------- Utils ---------------
function showBanner(msg){
  let el = $('errorBanner');
  if(!el){
    el = document.createElement('div');
    el.id = 'errorBanner';
    el.style.cssText = 'background:#3b1e1e;color:#ffd7d7;border:1px solid #6b2b2b;border-left:6px solid #c44545;margin:10px auto;width:min(1000px,94vw);border-radius:10px;padding:10px 12px;font-size:14px;';
    document.body.prepend(el);
  }
  el.textContent = msg;
}

const val = (obj, ...keys) => {
  for(const k of keys){ if(obj && obj[k] != null && obj[k] !== '') return obj[k]; }
  return '';
};

// Normalize one entry into a common {a,w} shape
function normalizeEntry(src, isMajor, ai=0, wi=0){
  if(isMajor){
    // src is a card
    const a = {
      ayah_id: src.ayah_id || src.ayahId || '67:1',
      arabic: src.ayahArabic || '',
      bangla: src.ayahBangla || ''
    };
    const w = {
      word_id: src.word_id || src.wordId || `${a.ayah_id}:${wi+1}`,
      arabic_word: val(src, 'arabic_word','arabic','word','form'),
      bangla_meaning: val(src, 'bangla_meaning','bangla','meaning_bn','meaning'),
      root: val(src, 'root'),
      rootMeaning: val(src, 'rootMeaning','root_meaning'),
      derivationMethod: val(src, 'derivationMethod','morphology','morph'),
      tajweed: src.tajweed || null,
      exampleArabic: src.exampleArabic || '',
      exampleBangla: src.exampleBangla || '',
      quranicDerivations: src.quranicDerivations || [],
      audio: src.audio || null
    };
    return { a, w, ai, wi, isMajor:true };
  }else{
    // src is {a,w}
    const a = src.a;
    const w0 = src.w;
    const w = {
      word_id: w0.word_id || `${a.ayah_id}:${wi+1}`,
      arabic_word: val(w0, 'arabic_word','arabic'),
      bangla_meaning: val(w0, 'bangla_meaning','bangla'),
      root: w0.root || '',
      rootMeaning: val(w0,'rootMeaning','root_meaning'),
      derivationMethod: val(w0,'derivationMethod','morphology'),
      tajweed: w0.tajweed || null,
      exampleArabic: w0.exampleArabic || '',
      exampleBangla: w0.exampleBangla || '',
      quranicDerivations: w0.quranicDerivations || [],
      audio: w0.audio || null
    };
    return { a, w, ai:src.ai, wi:src.wi, isMajor:false };
  }
}

// --------------- Init ---------------
init();

async function init(){
  await loadManifest();
  await loadDatasetFromSelect();

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

  document.addEventListener('keydown', e=>{
    if(e.code==='Space'){ e.preventDefault(); toggleAudio(); }
    if(e.key==='ArrowRight') next();
    if(e.key==='ArrowLeft')  prev();
    if(e.key.toLowerCase()==='f') flip();
  });

  render();
}

async function loadManifest(){
  try{
    const resp = await fetch('data/manifest.json',{cache:'no-store'});
    if(!resp.ok) throw new Error(`manifest ${resp.status}`);
    manifest = await resp.json();
    surahSelect.innerHTML = manifest.map(m=>`<option value="${m.filename}">${m.display || m.name_bn || m.name_ar}</option>`).join('');
    surahSelect.addEventListener('change', loadDatasetFromSelect);
  }catch(e){
    console.error(e);
    showBanner('Failed to load data/manifest.json');
  }
}

async function loadDatasetFromSelect(){
  try{
    const file = surahSelect.value || (manifest[0] && manifest[0].filename);
    if(!file) throw new Error('No filename');
    const url = `data/${file}`;
    const resp = await fetch(url,{cache:'no-store'});
    if(!resp.ok) throw new Error(`${url} ${resp.status}`);
    data = await resp.json();

    wordsFlat = [];

    if (Array.isArray(data.cards)) {
      // Major deck schema
      data.cards.forEach((c, i)=>{
        wordsFlat.push(normalizeEntry(c, true, 0, i));
      });
    } else {
      // Full deck schema
      (data.ayats || []).forEach((a, ai)=>{
        (a.words || []).forEach((w, wi)=>{
          wordsFlat.push(normalizeEntry({a,w,ai,wi}, false));
        });
      });
    }

    if(!wordsFlat.length){
      showBanner('Loaded deck but found 0 words. Check your JSON keys.');
    }
    index = 0;
    render();
  }catch(e){
    console.error(e);
    showBanner('Failed to load selected deck. Check path & JSON.');
  }
}

// --------------- Navigation ---------------
function prev(){
  if(!wordsFlat.length) return;
  if(mode==='random') index = Math.floor(Math.random()*wordsFlat.length);
  else index = Math.max(0,index-1);
  render();
}
function next(){
  if(!wordsFlat.length) return;
  if(mode==='random') index = Math.floor(Math.random()*wordsFlat.length);
  else index = Math.min(wordsFlat.length-1,index+1);
  render();
}
function flip(){
  const showingFront = (frontFace.style.display !== 'none');
  if (showingFront){
    frontFace.style.display = 'none';
    backFace .style.display = 'block';
    renderBack();
  }else{
    backFace .style.display = 'none';
    frontFace.style.display = 'block';
    stopAudio();
  }
}

// --------------- Audio ---------------
function toggleAudio(){
  const cur = wordsFlat[index]; if(!cur) return;
  const url = cur.w?.audio?.ayahAudioUrl || cur.w?.audio?.url || '';
  if(!url){ audioStatus.textContent='No audio'; return; }
  if(audioEl.src !== url){ audioEl.src = url; }
  if(audioEl.paused){
    audioEl.play().then(()=> audioStatus.textContent='Playing… (Space to pause)')
                  .catch(()=> audioStatus.textContent='Audio blocked');
  }else{
    audioEl.pause(); audioStatus.textContent='Paused';
  }
}
function stopAudio(){ try{ audioEl.pause(); audioStatus.textContent='Ready'; }catch(e){} }

// --------------- Render ---------------
function render(){
  const cur = wordsFlat[index];
  if(!cur){
    crumb.textContent = '—';
    wordArabic.textContent = '—';
    wordBangla.textContent = '—';
    tajSummary.innerHTML = '';
    tajList.innerHTML = '<div class="taj-line muted">No data.</div>';
    tajExample.style.display='none';
    return;
  }
  const { a, w, wi } = cur;

  // Front visible by default
  frontFace.style.display = 'block';
  backFace .style.display = 'none';

  crumb.textContent = `${a.ayah_id || '—'}:${(wi!=null?wi+1:'1')} — ${index+1} / ${wordsFlat.length}`;
  wordArabic.textContent = w.arabic_word || '—';
  wordBangla .textContent = w.bangla_meaning || '—';

  // Tajwīd chips + lines
  tajSummary.innerHTML = '';
  tajList.innerHTML = '';
  const rules = (w.tajweed && Array.isArray(w.tajweed.rules)) ? w.tajweed.rules : [];
  if(rules.length){
    rules.forEach(r=>{
      const chip = document.createElement('span');
      chip.className='chip';
      chip.innerHTML = `<b>${r.rule}</b>${r.subtype?` — ${r.subtype}`:''}`;
      tajSummary.appendChild(chip);

      const line = document.createElement('div');
      line.className='taj-line';
      line.innerHTML = `<span class="taj-key">${r.rule}${r.subtype?` — ${r.subtype}`:''}</span>${r.trigger?` <span class="taj-ar">${r.trigger}</span>`:''}${r.note?` — ${r.note}`:''}`;
      tajList.appendChild(line);
    });
  }else{
    tajList.innerHTML = '<div class="taj-line muted">No data.</div>';
  }

  if(w.exampleArabic || w.exampleBangla){
    exArabic.textContent = w.exampleArabic || '';
    exBangla.textContent = w.exampleBangla || '';
    tajExample.style.display='block';
  }else{
    tajExample.style.display='none';
  }

  audioEl.src=''; audioStatus.textContent='Ready';
}

function renderBack(){
  const cur = wordsFlat[index]; if(!cur) return;
  const { a, w, wi } = cur;

  backCrumb.textContent  = `${a.ayah_id || '—'}:${(wi!=null?wi+1:'1')}`;
  backArabic.textContent = w.arabic_word || '—';
  backBangla.textContent = w.bangla_meaning || '—';

  const onRoots = tabRoots.classList.contains('active');
  if(onRoots){
    rootTxt.textContent        = w.root || '—';
    rootMeaningTxt.textContent = w.rootMeaning || '—';
    morphTxt.textContent       = w.derivationMethod || '—';

    derivList.innerHTML = '';
    const derivs = Array.isArray(w.quranicDerivations) ? w.quranicDerivations : [];
    if(!derivs.length){ derivEmpty.style.display='block'; }
    else{
      derivEmpty.style.display='none';
      derivs.forEach(d=>{
        const refs = (d.occurrences||[]).map(o=>o.ayah_id).join(', ');
        const card = document.createElement('div');
        card.className='deriv-card';
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
      (data.ayats || []).forEach(ay=>{
        const hdr = document.createElement('div');
        hdr.className='detail-row';
        hdr.innerHTML = `<b>${ay.ayah_id}</b>`;
        wbwList.appendChild(hdr);
        (ay.words||[]).forEach(x=>{
          const row = document.createElement('div');
          row.className='wbw-row';
          row.innerHTML = `
            <div class="wbw-ar" dir="rtl">${x.arabic_word || x.arabic || ''}</div>
            <div class="wbw-bn">${x.bangla_meaning || x.bangla || ''}</div>`;
          wbwList.appendChild(row);
        });
      });
    }else{
      (a.words || []).forEach(x=>{
        const row = document.createElement('div');
        row.className='wbw-row';
        row.innerHTML = `
          <div class="wbw-ar" dir="rtl">${x.arabic_word || x.arabic || ''}</div>
          <div class="wbw-bn">${x.bangla_meaning || x.bangla || ''}</div>`;
        wbwList.appendChild(row);
      });
    }
  }
}

function switchTab(name){
  if(name==='roots'){
    tabRoots.classList.add('active');
    tabWbw.classList.remove('active');
    rootsPane.style.display='block';
    wbwPane.style.display='none';
  }else{
    tabWbw.classList.add('active');
    tabRoots.classList.remove('active');
    rootsPane.style.display='none';
    wbwPane.style.display='block';
  }
  renderBack();
}

function onGo(){
  const v = (jumpInput.value||'').trim();
  const m = v.match(/^(\d+):(\d+)(?::(\d+))?$/);
  if(!m || !wordsFlat.length) return;
  const wantAy = `${m[1]}:${m[2]}`;
  const wantW  = m[3] ? parseInt(m[3],10) : null;

  const found = wordsFlat.findIndex(x=>{
    const ay = x.a.ayah_id;
    if(ay !== wantAy) return false;
    if(wantW==null) return true;
    const wi = parseInt((x.w.word_id||'0:0:0').split(':')[2],10);
    return wi===wantW;
  });
  if(found>=0){ index = found; render(); }
}
