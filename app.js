const state = { manifest: [], surah: null, words: [], order: [], idx: 0, mode: 'sequential' };
const els = {
  modeSelect: document.getElementById('modeSelect'), surahSelect: document.getElementById('surahSelect'),
  quickSearch: document.getElementById('quickSearch'), quickGo: document.getElementById('quickGo'),
  card: document.getElementById('card'), ayahArabic: document.getElementById('ayahArabic'), ayahBangla: document.getElementById('ayahBangla'),
  wordId: document.getElementById('wordId'), frontArabicWord: document.getElementById('frontArabicWord'), frontBanglaMeaning: document.getElementById('frontBanglaMeaning'),
  frontRoot: document.getElementById('frontRoot'), frontRootMeaning: document.getElementById('frontRootMeaning'), frontDerivationMethod: document.getElementById('frontDerivationMethod'),
  frontDerivList: document.getElementById('frontDerivList'), backSurahNameBn: document.getElementById('backSurahNameBn'), backArabicWord: document.getElementById('backArabicWord'),
  backArabicBig: document.getElementById('backArabicBig'), backBanglaMeaning: document.getElementById('backBanglaMeaning'), backDerivList: document.getElementById('backDerivList'),
  firstBtn: document.getElementById('firstBtn'), prevBtn: document.getElementById('prevBtn'), flipBtn: document.getElementById('flipBtn'), nextBtn: document.getElementById('nextBtn'), lastBtn: document.getElementById('lastBtn'),
  positionText: document.getElementById('positionText'), errorBanner: document.getElementById('errorBanner'),
};
const shuffle=(a)=>{a=a.slice();for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;};
const showError=(m)=>{els.errorBanner.textContent=m;els.errorBanner.classList.remove('hidden');setTimeout(()=>els.errorBanner.classList.add('hidden'),6000);};
const flattenWords=(s)=>{const list=[];(s.ayats||[]).forEach((ayah,ai)=>{(ayah.words||[]).forEach((word,wi)=>list.push({ayahIndex:ai,wordIndex:wi,ayah,word}));});return list;};
const makeOrder=()=>{const idxs=[...Array(state.words.length).keys()];state.order=(state.mode==='random')?shuffle(idxs):idxs;state.idx=0;};
const renderPosition=()=>els.positionText.textContent=`${state.idx+1} / ${state.order.length}`;
const renderAyahStrip=(a)=>{els.ayahArabic.textContent=a.arabic||'';els.ayahBangla.textContent=a.bangla||'';};
function renderDerivations(list, container, compact=false){
  container.innerHTML='';
  if(!Array.isArray(list)||!list.length){const d=document.createElement('div');d.className='deriv-item';d.innerHTML='<div class="meaning">— কোনো ডেরিভেশন নেই —</div>';container.appendChild(d);return;}
  list.forEach(dv=>{
    const div=document.createElement('div');div.className=compact?'':'deriv-item';
    const occ=(dv.occurrences||[]).map(o=>o.ayah_id).join(', ');
    div.innerHTML=`<div class="arabic">${dv.arabic||''}</div>
      <div class="meaning">${dv.meaning||''}</div>
      <div class="ex"><b>উদাহরণ (Ar):</b> ${dv.exampleArabic||''}</div>
      <div class="ex"><b>উদাহরণ (Bn):</b> ${dv.exampleBangla||''}</div>
      <div class="ref"><b>রেফ:</b> ${occ}</div>`;
    container.appendChild(div);
  });
}
function renderCard(){
  if(!state.order.length){els.positionText.textContent='0 / 0'; return;}
  const cur=state.words[state.order[state.idx]]; const {ayah,word}=cur;
  renderAyahStrip(ayah);
  els.wordId.textContent=word.word_id||'';
  els.frontArabicWord.textContent=word.arabic_word||'';
  els.frontBanglaMeaning.textContent=word.bangla_meaning||'';
  els.frontRoot.textContent=word.root||'';
  els.frontRootMeaning.textContent=word.rootMeaning||'';
  els.frontDerivationMethod.textContent=word.derivationMethod||'';
  renderDerivations(word.quranicDerivations||[], els.frontDerivList);
  els.backSurahNameBn.textContent=state.surah.name_bn||'';
  els.backArabicWord.textContent=word.arabic_word||'';
  els.backArabicBig.textContent=word.arabic_word||'';
  els.backBanglaMeaning.textContent=word.bangla_meaning||'';
  renderDerivations(word.quranicDerivations||[], els.backDerivList, true);
  renderPosition();
}
function goFirst(){state.idx=0;ensureFront();renderCard();} function goLast(){state.idx=Math.max(0,state.order.length-1);ensureFront();renderCard();}
function goNext(){state.idx=(state.idx+1)%state.order.length;ensureFront();renderCard();} function goPrev(){state.idx=(state.idx-1+state.order.length)%state.order.length;ensureFront();renderCard();}
function flip(){els.card.classList.toggle('flipped');} function ensureFront(){els.card.classList.remove('flipped');}
async function loadManifest(){
  const res=await fetch('data/manifest.json?ts='+Date.now());
  if(!res.ok){showError('manifest.json লোড করা যায়নি'); return;}
  let man=[]; try{man=await res.json();}catch(e){showError('manifest.json JSON পার্স করতে ব্যর্থ'); return;}
  if(!Array.isArray(man)){showError('manifest.json অবশ্যই array হবে'); return;}
  state.manifest=man;
  els.surahSelect.innerHTML='<option value=\"\" disabled selected>সুরা বাছাই করুন…</option>';
  man.forEach((m,i)=>{const opt=document.createElement('option');opt.value=String(i);opt.textContent=m.display_bn||m.display||m.filename;els.surahSelect.appendChild(opt);});
}
async function loadSurahByIndex(i){
  const m=state.manifest[i]; if(!m){showError('সঠিক সুরা নির্বাচন করুন'); return;}
  const url='data/'+m.filename;
  const res=await fetch(url+'?ts='+Date.now());
  if(!res.ok){showError('Surah JSON লোড করা যায়নি: '+m.filename); state.words=[]; state.order=[]; renderCard(); return;}
  let arr; try{arr=await res.json();}catch(e){showError('Surah JSON পার্স করা যায়নি: '+m.filename);return;}
  const s=Array.isArray(arr)?arr[0]:arr;
  if(!s||!Array.isArray(s.ayats)){showError('ভুল surah schema: '+m.filename); return;}
  state.surah=s; state.words=flattenWords(s); makeOrder(); renderCard();
}
function handleQuickGo(){
  const val=els.quickSearch.value.trim(); if(!val) return;
  const parts=val.split(':'); if(parts.length<2) return;
  const targetAyah=parts[1]; const targetWord=parts[2]||null;
  const flatIdx=state.words.findIndex(w=>{const [s,a,wpos]=(w.word.word_id||'').split(':');return (!targetWord? a===targetAyah : (a===targetAyah && wpos===targetWord));});
  if(flatIdx>=0){state.idx=state.order.indexOf(flatIdx); if(state.idx===-1) state.idx=flatIdx; ensureFront(); renderCard();}
}
els.modeSelect.addEventListener('change',()=>{state.mode=els.modeSelect.value; makeOrder(); renderCard();});
els.surahSelect.addEventListener('change',async()=>{const i=parseInt(els.surahSelect.value,10); await loadSurahByIndex(i);});
els.quickGo.addEventListener('click',handleQuickGo); els.quickSearch.addEventListener('keydown',e=>{if(e.key==='Enter') handleQuickGo();});
els.firstBtn.addEventListener('click',goFirst); els.prevBtn.addEventListener('click',goPrev); els.flipBtn.addEventListener('click',flip); els.nextBtn.addEventListener('click',goNext); els.lastBtn.addEventListener('click',goLast);
window.addEventListener('keydown',e=>{if(e.target===els.quickSearch) return; if(e.key==='ArrowRight'||e.key===' ') goNext(); else if(e.key==='ArrowLeft') goPrev(); else if(e.key.toLowerCase()==='f') flip(); else if(e.key.toLowerCase()==='r'){state.mode=(state.mode==='sequential')?'random':'sequential'; els.modeSelect.value=state.mode; makeOrder(); renderCard();}});
(async function init(){await loadManifest();})();