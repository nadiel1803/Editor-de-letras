// app.js - main frontend logic
import { db, collection, addDoc, getDocs, doc, setDoc, deleteDoc, onSnapshot, query, orderBy, limit } from './firebase.js';

const songsCol = collection(db, 'songs');
const foldersCol = collection(db, 'folders');

const $ = sel => document.querySelector(sel);
const appEl = $('#app'); // NOVO
const songListEl = $('#songList');
const folderListEl = $('#folderList');
const recentListEl = $('#recentList');
const songsCountEl = $('#songsCount');
const foldersCountEl = $('#foldersCount');
const recentCountEl = $('#recentCount');

const form = $('#songForm');
const titleInput = $('#songTitle');
const folderSelect = $('#songFolder');
const lyricsInput = $('#lyrics');
const saveBtn = $('#saveBtn'); 
const downloadBtn = $('#downloadBtn');
const deleteBtn = $('#deleteBtn');
const newSongBtn = $('#newSongBtn');
const newFolderBtn = $('#newFolderBtn');
const importBtn = $('#importBtn'); 
const searchInput = $('#search');

// NOVO: Seletores da Navegação Móvel
const mobileNavMenu = $('#mobileNavMenu');
const mobileNavSongs = $('#mobileNavSongs');
const mobileNavEditor = $('#mobileNavEditor');
const mobileNavBtns = document.querySelectorAll('.mobile-nav-btn');

let currentSongId = null;
let songsCache = [];
let foldersCache = [];

function applyThemeFromStorage(){
  const t = localStorage.getItem('theme') || 'light';
  document.documentElement.setAttribute('data-theme', t);
}
applyThemeFromStorage();

$('#themeToggle').addEventListener('click', ()=>{
  const cur = document.documentElement.getAttribute('data-theme') || 'light';
  const nxt = cur==='light'?'dark':'light';
  document.documentElement.setAttribute('data-theme', nxt);
  localStorage.setItem('theme', nxt);
});

async function refreshCounts(){
  songsCountEl.textContent = songsCache.length;
  foldersCountEl.textContent = foldersCache.length;
  recentCountEl.textContent = Math.min(5, songsCache.length);
}

function setActiveFolder(folderId) {
  folderId = folderId || 'all';
  document.querySelectorAll('#folderList li').forEach(li => {
    li.classList.remove('active');
  });
  const activeLi = $(`#folderList li[data-id="${folderId}"]`);
  if (activeLi) {
    activeLi.classList.add('active');
  }
}

function renderFolders(){
  folderListEl.innerHTML = '';
  
  const allLi = document.createElement('li');
  allLi.textContent = 'Todas as Músicas';
  allLi.dataset.id = 'all';
  allLi.addEventListener('click', () => filterByFolder(null));
  folderListEl.appendChild(allLi);

  folderSelect.innerHTML = '<option value="">— Sem pasta —</option>';
  foldersCache.forEach(f=>{
    const li = document.createElement('li');
    li.textContent = f.name;
    li.dataset.id = f.id;
    li.addEventListener('click', ()=> filterByFolder(f.id));
    folderListEl.appendChild(li);

    const opt = document.createElement('option');
    opt.value = f.id;
    opt.textContent = f.name;
    folderSelect.appendChild(opt);
  });
  foldersCountEl.textContent = foldersCache.length;
}

function renderRecent(){
  recentListEl.innerHTML = '';
  const sorted = [...songsCache].sort((a,b)=> b.updatedAt - a.updatedAt).slice(0,5);
  sorted.forEach(s=>{
    const li = document.createElement('li');
    li.textContent = s.title;
    li.addEventListener('click', ()=> loadSong(s.id));
    recentListEl.appendChild(li);
  });
  recentCountEl.textContent = sorted.length;
}

function renderSongs(list){
  songListEl.innerHTML = '';
  list.forEach(s=>{
    const tpl = document.getElementById('songItemTpl');
    const item = tpl.content.firstElementChild.cloneNode(true);
    item.querySelector('.song-title').textContent = s.title;
    item.querySelector('.song-meta').textContent = (s.folderName? s.folderName + ' • ' : '') + new Date(s.updatedAt).toLocaleString();
    item.addEventListener('click', ()=> loadSong(s.id));
    songListEl.appendChild(item);
  });
  songsCountEl.textContent = list.length;
}

// NOVO: Helper para controlar a visualização móvel
function setMobileView(view) {
  appEl.dataset.mobileView = view;
  mobileNavBtns.forEach(btn => btn.classList.remove('active'));
  
  if (view === 'menu') mobileNavMenu.classList.add('active');
  if (view === 'songs') mobileNavSongs.classList.add('active');
  if (view === 'editor') mobileNavEditor.classList.add('active');
}

function filterByFolder(folderId){
  const filtered = folderId ? songsCache.filter(s=> s.folderId === folderId) : songsCache;
  renderSongs(filtered);
  setActiveFolder(folderId || 'all');
  
  // NOVO: Muda para a lista de músicas ao filtrar no mobile
  if (window.innerWidth <= 800) {
    setMobileView('songs');
  }
}

function loadSong(id){
  const s = songsCache.find(x=>x.id===id);
  if(!s) return;
  currentSongId = id;
  titleInput.value = s.title;
  folderSelect.value = s.folderId || '';
  lyricsInput.value = s.lyrics;
  deleteBtn.style.display = 'inline-block';
  titleInput.focus();
  
  // NOVO: Muda para o editor ao carregar uma música no mobile
  if (window.innerWidth <= 800) {
    setMobileView('editor');
  }
}

// Local editor helpers
form.addEventListener('submit', async (e)=>{
  e.preventDefault();
  
  saveBtn.disabled = true;
  saveBtn.textContent = 'Salvando...';

  try {
    const data = {
      title: titleInput.value.trim() || 'Sem título',
      folderId: folderSelect.value || null,
      folderName: folderSelect.selectedOptions?.[0]?.text.replace('— Sem pasta —', '') || null,
      lyrics: lyricsInput.value,
      updatedAt: Date.now()
    };

    if(currentSongId){
      await setDoc(doc(db,'songs',currentSongId), data, {merge:true});
      alert('Atualizado!');
    } else {
      const docRef = await addDoc(songsCol, data);
      alert('Salvo!');
      currentSongId = docRef.id;
      deleteBtn.style.display = 'inline-block';
    }
  } catch (err) {
    console.error(err);
    alert('Erro ao salvar: ' + err.message);
  } finally {
    saveBtn.disabled = false;
    saveBtn.textContent = 'Salvar';
  }
});

downloadBtn.addEventListener('click', ()=>{
  const title = titleInput.value.trim() || 'Sem título';
  const content = title + "\n\n" + lyricsInput.value;
  const blob = new Blob([content], {type:'text/plain;charset=utf-8'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = (title.replace(/[^a-z0-9]+/gi,'_') || 'letra') + '.txt';
  a.click();
  URL.revokeObjectURL(url);
});

deleteBtn.addEventListener('click', async ()=>{
  if(!currentSongId) return;
  if(!confirm('Confirma exclusão desta música?')) return;

  try {
    await deleteDoc(doc(db,'songs',currentSongId));
    currentSongId = null;
    form.reset();
    deleteBtn.style.display = 'none';
    alert('Excluído!');
    
    // NOVO: Volta para a lista de músicas ao excluir no mobile
    if (window.innerWidth <= 800) {
      setMobileView('songs');
    }
  } catch (err) {
    console.error(err);
    alert('Erro ao excluir: ' + err.message);
  }
});

newSongBtn.addEventListener('click', ()=>{
  currentSongId = null;
  form.reset();
  deleteBtn.style.display = 'none';
  titleInput.focus();
  
  // NOVO: Muda para o editor ao criar nova música no mobile
  if (window.innerWidth <= 800) {
    setMobileView('editor');
  }
});

newFolderBtn.addEventListener('click', async ()=>{
  const name = prompt('Nome da nova pasta:');
  if(!name || !name.trim()) return;

  try {
    await addDoc(foldersCol, {name: name.trim(), createdAt: Date.now()});
    alert('Pasta criada!');
  } catch (err) {
    console.error(err);
    alert('Erro ao criar pasta: ' + err.message);
  }
});

importBtn.addEventListener('click', () => {
  const fileInput = document.createElement('input');
  fileInput.type = 'file';
  fileInput.accept = '.txt,text/plain';
  
  fileInput.onchange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target.result;
        const lines = content.split(/\r?\n/);
        
        const title = lines[0]?.trim() || 'Importado sem título';
        const lyrics = lines.slice(2).join('\n'); 

        currentSongId = null;
        form.reset();
        titleInput.value = title;
        lyricsInput.value = lyrics;
        folderSelect.value = '';
        deleteBtn.style.display = 'none';
        
        alert('Arquivo importado! Clique em "Salvar" para adicioná-lo.');
        titleInput.focus();
        
        // NOVO: Muda para o editor ao importar no mobile
        if (window.innerWidth <= 800) {
          setMobileView('editor');
        }
      } catch (err) {
        console.error(err);
        alert('Erro ao ler o arquivo: ' + err.message);
      }
    };
    reader.readAsText(file);
  };
  
  fileInput.click();
});


// realtime listeners
onSnapshot(songsCol, (snap)=>{
  songsCache = snap.docs.map(d=> ({id:d.id, ...d.data()}));
  
  const activeFolderLi = $('#folderList li.active');
  const activeFolderId = activeFolderLi ? activeFolderLi.dataset.id : 'all';
  filterByFolder(activeFolderId === 'all' ? null : activeFolderId);
  
  renderRecent();
  refreshCounts();
});

onSnapshot(foldersCol, (snap)=>{
  const activeFolderLi = $('#folderList li.active');
  const activeFolderId = activeFolderLi ? activeFolderLi.dataset.id : 'all';

  foldersCache = snap.docs.map(d=> ({id:d.id, ...d.data()})).sort((a,b) => a.name.localeCompare(b.name));
  renderFolders();
  
  setActiveFolder(activeFolderId);
  refreshCounts();
});

searchInput.addEventListener('input', (e)=>{
  const q = e.target.value.toLowerCase();
  
  setActiveFolder('all'); 
  
  const filtered = songsCache.filter(s=> s.title.toLowerCase().includes(q) || (s.lyrics||'').toLowerCase().includes(q));
  renderSongs(filtered);
  
  // NOVO: Muda para a lista de músicas ao pesquisar no mobile
  if (window.innerWidth <= 800) {
    setMobileView('songs');
  }
});

lyricsInput.addEventListener('keydown', (ev)=>{
  if(ev.ctrlKey && ev.key === 'Enter'){
    ev.preventDefault();
    downloadBtn.click();
  }
});

// NOVO: Event Listeners para a Navegação Móvel
mobileNavMenu.addEventListener('click', () => setMobileView('menu'));
mobileNavSongs.addEventListener('click', () => setMobileView('songs'));
mobileNavEditor.addEventListener('click', () => setMobileView('editor'));

// NOVO: Define a visualização inicial no mobile
if (window.innerWidth <= 800) {
  setMobileView('songs'); // Começa na lista de músicas
}
