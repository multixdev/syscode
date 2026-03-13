// Мокові дані файлової системи (в майбутньому тягнемо з GitHub/IndexedDB)
const fileSystem = [
    { type: 'dir', name: 'config__', path: 'config__' },
    { type: 'dir', name: 'system', path: 'system' },
    { type: 'file', name: 'main', path: 'main', content: '; MULTIX Точка входу\n:\n  x1 csr.mhartid\n  system.hardware.init' },
    { type: 'file', name: 'milkv_jupiter', path: 'config__/milkv_jupiter', content: 'RAM_START 0x00000000' },
    { type: 'file', name: 'init', path: 'system/memory/init', content: '; Ініціалізація пам\'яті\n:\n  _' }
];

let lastEditedFileId = null;
let saveTimeout = null;

document.addEventListener('DOMContentLoaded', () => {
    renderFileTree();
    renderEditorStream();
    setupKeyboardListeners();
    setupSyncButton();
});

// 1. Сортування та рендер дерева файлів
function renderFileTree() {
    const treeContainer = document.getElementById('file-tree');
    // Сортуємо: каталоги перші, потім по алфавіту
    const sortedFS = [...fileSystem].sort((a, b) => {
        if (a.type !== b.type) return a.type === 'dir' ? -1 : 1;
        return a.path.localeCompare(b.path);
    });

    sortedFS.forEach(item => {
        const el = document.createElement('div');
        el.className = 'tree-item';
        el.innerHTML = `<span>${item.type === 'dir' ? '📁' : '📄'}</span> ${item.path}`;
        
        if (item.type === 'file') {
            el.onclick = () => scrollToNode(item.path);
        }
        treeContainer.appendChild(el);
    });
}

// 2. Рендер стрічки файлів (Infinite Scroll Concept)
function renderEditorStream() {
    const stream = document.getElementById('editors-stream');
    const files = fileSystem.filter(f => f.type === 'file');

    files.forEach(file => {
        const block = document.createElement('div');
        block.className = 'file-block';
        block.id = `block-${file.path}`;

        block.innerHTML = `
            <div class="file-separator">📍 ${file.path}</div>
            <textarea class="code-area" id="editor-${file.path}" spellcheck="false">${file.content}</textarea>
        `;
        stream.appendChild(block);

        // Автозбереження та запам'ятовування позиції
        const textarea = block.querySelector('.code-area');
        textarea.addEventListener('input', () => {
            lastEditedFileId = file.path;
            triggerAutoSave(file.path);
        });
        textarea.addEventListener('focus', () => {
            lastEditedFileId = file.path;
        });
    });

    // Intersection Observer для підсвітки активного файлу в дереві
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                document.querySelectorAll('.tree-item').forEach(el => el.classList.remove('active'));
                const activeTreeItem = Array.from(document.querySelectorAll('.tree-item'))
                    .find(el => el.textContent.includes(entry.target.id.replace('block-', '')));
                if (activeTreeItem) activeTreeItem.classList.add('active');
            }
        });
    }, { threshold: 0.5 });

    document.querySelectorAll('.file-block').forEach(block => observer.observe(block));
}

// 3. Автозбереження (Мок)
function triggerAutoSave(path) {
    const statusIcon = document.getElementById('status-icon');
    const statusText = document.getElementById('status-text');
    
    statusIcon.textContent = '⏳';
    statusText.textContent = 'Збереження...';
    
    clearTimeout(saveTimeout);
    saveTimeout = setTimeout(() => {
        // Тут буде запис у IndexedDB
        statusIcon.textContent = '✅';
        statusText.textContent = 'Збережено локально';
    }, 1000);
}

// 4. Навігація
function scrollToNode(path) {
    const block = document.getElementById(`block-${path}`);
    if (block) block.scrollIntoView({ behavior: 'smooth' });
}

function setupKeyboardListeners() {
    document.addEventListener('keydown', (e) => {
        // Сховати/показати сайдбар (Ctrl+B)
        if (e.ctrlKey && e.key === 'b') {
            e.preventDefault();
            document.getElementById('sidebar').classList.toggle('hidden');
        }
        // Повернення до останнього місця редагування (Наприклад, Ctrl+Enter)
        if (e.ctrlKey && e.key === 'Enter' && lastEditedFileId) {
            e.preventDefault();
            const textarea = document.getElementById(`editor-${lastEditedFileId}`);
            scrollToNode(lastEditedFileId);
            textarea.focus();
        }
    });
}

// 5. GitHub Діалог (Мок)
function setupSyncButton() {
    const btnSync = document.getElementById('btn-sync');
    const dialog = document.getElementById('commit-dialog');
    const btnCancel = document.getElementById('btn-cancel-commit');
    const btnPush = document.getElementById('btn-push');

    btnSync.onclick = () => dialog.showModal();
    btnCancel.onclick = () => dialog.close();
    btnPush.onclick = () => {
        dialog.close();
        document.getElementById('status-icon').textContent = '🚀';
        document.getElementById('status-text').textContent = 'Pushed to GitHub';
    };
}
