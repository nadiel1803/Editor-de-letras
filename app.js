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
const saveBtn = $('#saveBtn'); // NOVO
const downloadBtn = $('#downloadBtn');
const deleteBtn = $('#deleteBtn');
const newSongBtn = $('#newSongBtn');
const newFolderBtn = $('#newFolderBtn');
const importBtn = $('#importBtn'); // NOVO
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

// NOVO: Helper para marcar pasta ativa na UI
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
  
  // NOVO: Adiciona o botão "Todas as Músicas"
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
  // MELHORIA: Atualiza contagem de músicas *filtradas*
  songsCountEl.textContent = list.length;
}

function filterByFolder(folderId){
  const filtered = folderId ? songsCache.filter(s=> s.folderId === folderId) : songsCache;
  renderSongs(filtered);
  // NOVO: Atualiza a UI para mostrar a pasta ativa
  setActiveFolder(folderId || 'all');
}

function loadSong(id){
  const s = songsCache.find(x=>x.id===id);
  if(!s) return;
  currentSongId = id;
  titleInput.value = s.title;
  folderSelect.value = s.folderId || '';
  lyricsInput.value = s.lyrics;
  deleteBtn.style.display = 'inline-block';
  titleInput.focus(); // NOVO: Foca no título ao carregar
}

// Local editor helpers
form.addEventListener('submit', async (e)=>{
  e.preventDefault();
  
  // NOVO: Feedback de carregamento e tratamento de erro
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
      // MELHORIA: Não limpa o formulário ao *atualizar*
    } else {
      const docRef = await addDoc(songsCol, data);
      alert('Salvo!');
      // MELHORIA: Limpa o formulário e seleciona a nova música
      currentSongId = docRef.id; // NOVO: define o ID da música recém-criada
      deleteBtn.style.display = 'inline-block'; // NOVO: mostra o botão de excluir
      // form.reset(); // (Opcional) - agora ele mantém a música salva na tela
    }
  } catch (err) {
    console.error(err);
    alert('Erro ao salvar: ' + err.message);
  } finally {
    saveBtn.disabled = false;
    saveBtn.textContent = 'Salvar';
  }
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

  // NOVO: Tratamento de erro
  try {
    await deleteDoc(doc(db,'songs',currentSongId));
    currentSongId = null;
    form.reset();
    deleteBtn.style.display = 'none'; // NOVO: esconde botão após excluir
    alert('Excluído!'); // NOVO: feedback
  } catch (err) {
    console.error(err);
    alert('Erro ao excluir: ' + err.message);
  }
});

// new song
newSongBtn.addEventListener('click', ()=>{
  currentSongId = null;
  form.reset();
  deleteBtn.style.display = 'none';
  titleInput.focus(); // NOVO: Foca no título
});

// new folder
newFolderBtn.addEventListener('click', async ()=>{
  const name = prompt('Nome da nova pasta:');
  if(!name || !name.trim()) return;

  // NOVO: Tratamento de erro
  try {
    await addDoc(foldersCol, {name: name.trim(), createdAt: Date.now()});
    alert('Pasta criada!');
  } catch (err) {
    console.error(err);
    alert('Erro ao criar pasta: ' + err.message);
  }
});

// NOVO: Importar .txt
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
        
        // Formato Holyrics: Título (linha 1), linha em branco (linha 2), letra (linha 3+)
        const title = lines[0]?.trim() || 'Importado sem título';
        const lyrics = lines.slice(2).join('\n'); // Pula título e linha em branco

        // Carrega no editor como uma nova música
        currentSongId = null;
        form.reset();
        titleInput.value = title;
        lyricsInput.value = lyrics;
        folderSelect.value = '';
        deleteBtn.style.display = 'none';
        
        alert('Arquivo importado! Clique em "Salvar" para adicioná-lo.');
        titleInput.focus();
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
  
  // MELHORIA: Mantém o filtro de pasta ativo ao atualizar
  const activeFolderLi = $('#folderList li.active');
  const activeFolderId = activeFolderLi ? activeFolderLi.dataset.id : 'all';
  filterByFolder(activeFolderId === 'all' ? null : activeFolderId);
  
  renderRecent();
  refreshCounts(); // Atualiza contagem geral (baseado no cache total)
});

onSnapshot(foldersCol, (snap)=>{
  // MELHORIA: Mantém a pasta ativa selecionada
  const activeFolderLi = $('#folderList li.active');
  const activeFolderId = activeFolderLi ? activeFolderLi.dataset.id : 'all';

  foldersCache = snap.docs.map(d=> ({id:d.id, ...d.data()})).sort((a,b) => a.name.localeCompare(b.name)); // NOVO: Ordena pastas
  renderFolders();
  
  setActiveFolder(activeFolderId); // Restaura seleção
  refreshCounts();
});

// simple search
searchInput.addEventListener('input', (e)=>{
  const q = e.target.value.toLowerCase();
  
  // NOVO: Limpa o filtro de pasta ao pesquisar
  setActiveFolder('all'); 
  
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
