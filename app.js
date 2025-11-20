// app.js - main frontend logic
import { db, collection, addDoc, getDocs, doc, setDoc, deleteDoc, onSnapshot, query, orderBy, limit } from './firebase.js';

const songsCol = collection(db, 'songs');
const foldersCol = collection(db, 'folders');

const $ = sel => document.querySelector(sel);
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
const downloadBtn = $('#downloadBtn');
const deleteBtn = $('#deleteBtn');
const newSongBtn = $('#newSongBtn');
const newFolderBtn = $('#newFolderBtn');
const searchInput = $('#search');

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

function renderFolders(){
  folderListEl.innerHTML = '';
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

function filterByFolder(folderId){
  const filtered = folderId ? songsCache.filter(s=> s.folderId === folderId) : songsCache;
  renderSongs(filtered);
}

function loadSong(id){
  const s = songsCache.find(x=>x.id===id);
  if(!s) return;
  currentSongId = id;
  titleInput.value = s.title;
  folderSelect.value = s.folderId || '';
  lyricsInput.value = s.lyrics;
  deleteBtn.style.display = 'inline-block';
}

// Local editor helpers
form.addEventListener('submit', async (e)=>{
  e.preventDefault();
  const data = {
    title: titleInput.value.trim() || 'Sem título',
    folderId: folderSelect.value || null,
    folderName: folderSelect.selectedOptions?.[0]?.text || null,
    lyrics: lyricsInput.value,
    updatedAt: Date.now()
  };
  if(currentSongId){
    await setDoc(doc(db,'songs',currentSongId), data, {merge:true});
    alert('Atualizado!');
  } else {
    await addDoc(songsCol, data);
    alert('Salvo!');
  }
  // clear selection
  currentSongId = null;
  form.reset();
});

// download as plain text compatible with Holyrics (simple .txt with title then lyrics)
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

// delete
deleteBtn.addEventListener('click', async ()=>{
  if(!currentSongId) return;
  if(!confirm('Confirma exclusão desta música?')) return;
  await deleteDoc(doc(db,'songs',currentSongId));
  currentSongId = null;
  form.reset();
});

// new song
newSongBtn.addEventListener('click', ()=>{
  currentSongId = null;
  form.reset();
  deleteBtn.style.display = 'none';
});

// new folder
newFolderBtn.addEventListener('click', async ()=>{
  const name = prompt('Nome da nova pasta:');
  if(!name) return;
  await addDoc(foldersCol, {name, createdAt: Date.now()});
});

// realtime listeners
onSnapshot(songsCol, (snap)=>{
  songsCache = snap.docs.map(d=> ({id:d.id, ...d.data()}));
  renderSongs(songsCache);
  renderRecent();
  refreshCounts();
});

onSnapshot(foldersCol, (snap)=>{
  foldersCache = snap.docs.map(d=> ({id:d.id, ...d.data()}));
  renderFolders();
  refreshCounts();
});

// simple search
searchInput.addEventListener('input', (e)=>{
  const q = e.target.value.toLowerCase();
  const filtered = songsCache.filter(s=> s.title.toLowerCase().includes(q) || (s.lyrics||'').toLowerCase().includes(q));
  renderSongs(filtered);
});

// quick hint: pressing Shift+Enter keeps a blank line; single Enter is normal newline
lyricsInput.addEventListener('keydown', (ev)=>{
  // accessibility hint - no special handling required, but we add small helper: Ctrl+Enter downloads
  if(ev.ctrlKey && ev.key === 'Enter'){
    ev.preventDefault();
    downloadBtn.click();
  }
});
