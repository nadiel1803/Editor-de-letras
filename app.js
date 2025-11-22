// Importar o 'db' do seu arquivo firebase.js
import { db } from './firebase.js';
// Importar funções do Firestore que você vai usar
import { collection, addDoc, getDocs, serverTimestamp, query, orderBy, limit } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";


document.addEventListener('DOMContentLoaded', () => {

    // --- LÓGICA DE TROCA DE TEMA (CLARO/ESCURO) ---
    const themeToggle = document.getElementById('theme-toggle');
    const lightModeIcon = document.querySelector('.theme-switcher span:first-child');
    const darkModeIcon = document.querySelector('.theme-switcher span:last-child');

    // Verifica preferência salva no localStorage
    const savedTheme = localStorage.getItem('theme') || 'light';
    document.body.dataset.theme = savedTheme;
    themeToggle.checked = savedTheme === 'dark';
    updateThemeIcons(savedTheme);

    themeToggle.addEventListener('change', () => {
        let theme = themeToggle.checked ? 'dark' : 'light';
        document.body.dataset.theme = theme;
        localStorage.setItem('theme', theme); // Salva a preferência
        updateThemeIcons(theme);
    });

    function updateThemeIcons(theme) {
        if (theme === 'dark') {
            darkModeIcon.classList.add('active');
            lightModeIcon.classList.remove('active');
        } else {
            lightModeIcon.classList.add('active');
            darkModeIcon.classList.remove('active');
        }
    }

    // --- LÓGICA DE NAVEGAÇÃO ENTRE PÁGINAS ---
    const navDashboard = document.getElementById('nav-dashboard');
    const navEditor = document.getElementById('nav-editor');
    const dashboardPage = document.getElementById('dashboard-page');
    const editorPage = document.getElementById('editor-page');

    function showPage(pageToShow) {
        dashboardPage.style.display = 'none';
        editorPage.style.display = 'none';
        // (Adicione outras páginas aqui)

        pageToShow.style.display = 'block';
    }

    navDashboard.addEventListener('click', (e) => {
        e.preventDefault();
        showPage(dashboardPage);
    });
    
    navEditor.addEventListener('click', (e) => {
        e.preventDefault();
        showPage(editorPage);
        // Limpar editor para nova música
        document.getElementById('song-title').value = '';
        document.getElementById('lyrics-editor').value = '';
    });


    // --- LÓGICA DO EDITOR (CORE) ---
    const downloadBtn = document.getElementById('download-txt');
    const saveToFirebaseBtn = document.getElementById('save-to-firebase');
    const lyricsEditor = document.getElementById('lyrics-editor');
    const songTitle = document.getElementById('song-title');

    // Função de Download do .txt
    downloadBtn.addEventListener('click', () => {
        const text = lyricsEditor.value;
        let filename = songTitle.value.trim() || 'musica';
        // Remove caracteres inválidos para nomes de arquivo
        filename = filename.replace(/[^a-z0-9_-\s]/gi, '').replace(/[\s]/g, '_');

        const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `${filename}.txt`;
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    });

    // Função de Salvar no Firebase (Exemplo)
    saveToFirebaseBtn.addEventListener('click', async () => {
        const title = songTitle.value;
        const lyrics = lyricsEditor.value;

        if (!title || !lyrics) {
            alert('Por favor, preencha o título e a letra da música.');
            return;
        }

        try {
            // 'musicas' é o nome da sua "coleção" (tabela) no Firestore
            const docRef = await addDoc(collection(db, "musicas"), {
                title: title,
                lyrics: lyrics,
                createdAt: serverTimestamp() // Adiciona data de criação
            });
            alert(`Música "${title}" salva com sucesso!`);
            // Limpa o editor
            songTitle.value = '';
            lyricsEditor.value = '';
            // Atualiza estatísticas
            updateDashboardStats();
            showPage(dashboardPage);
        } catch (e) {
            console.error("Erro ao adicionar documento: ", e);
            alert("Erro ao salvar a música. Verifique o console.");
        }
    });

    // --- LÓGICA DO DASHBOARD (CARREGAR ESTATÍSTICAS) ---
    const musicCountEl = document.getElementById('music-count');
    const folderCountEl = document.getElementById('folder-count');
    const recentSongsListEl = document.getElementById('recent-songs-list');

    async function updateDashboardStats() {
        try {
            // Contar músicas
            const musicCol = collection(db, 'musicas');
            const musicSnapshot = await getDocs(musicCol);
            musicCountEl.innerText = musicSnapshot.size;

            // TODO: Lógica para contar pastas
            folderCountEl.innerText = '0'; // Placeholder

            // Buscar músicas recentes
            const recentQuery = query(musicCol, orderBy('createdAt', 'desc'), limit(5));
            const recentSnapshot = await getDocs(recentQuery);
            
            recentSongsListEl.innerHTML = ''; // Limpa a lista
            if (recentSnapshot.empty) {
                recentSongsListEl.innerHTML = '<li>Nenhuma música recente</li>';
            } else {
                recentSnapshot.forEach((doc) => {
                    const song = doc.data();
                    const li = document.createElement('li');
                    li.textContent = song.title;
                    // TODO: Adicionar clique para abrir a música no editor
                    recentSongsListEl.appendChild(li);
                });
            }

        } catch (e) {
            console.error("Erro ao carregar estatísticas: ", e);
            // Deixa os valores padrão se falhar (pode ser problema de permissão no Firebase)
        }
    }

    // Carrega os dados do dashboard assim que a página abrir
    updateDashboardStats();
});
