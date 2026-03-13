let fileSystem = [];
let fileHandles = {}; // Зберігаємо "ручки" до файлів для збереження
let lastEditedFileId = null;
let saveTimeout = null;

document.addEventListener('DOMContentLoaded', () => {
    setupKeyboardListeners();
    document.getElementById('btn-open-dir').addEventListener('click', openWorkspace);
});

// 1. Відкриття папки з жорсткого диска
async function openWorkspace() {
    try {
        const dirHandle = await window.showDirectoryPicker();
        fileSystem = [];
        fileHandles = {};
        await readDirectory(dirHandle, "");
        
        renderFileTree();
        await renderEditorStream();
    } catch (error) {
        console.warn('Скасовано або помилка доступу:', error);
    }
}

// 2. Рекурсивне читання папок
async function readDirectory(directoryHandle, currentPath) {
    for await (const entry of directoryHandle.values()) {
        // Пропускаємо приховані папки гіта
        if (entry.name.startsWith('.git')) continue;

        const fullPath = currentPath ? `${currentPath}/${entry.name}` : entry.name;

        if (entry.kind === 'file') {
            fileSystem.push({ type: 'file', name: '📄 ' + entry.name, path: fullPath });
            fileHandles[fullPath] = entry; // Зберігаємо доступ для запису
        } else if (entry.kind === 'directory') {
            fileSystem.push({ type: 'dir', name: '📁 ' + entry.name, path: fullPath });
            await readDirectory(entry, fullPath);
        }
    }
}

// 3. Рендер дерева файлів
function renderFileTree() {
    const treeContainer = document.getElementById('file-tree');
    treeContainer.innerHTML = ''; 

    const sortedFS = [...fileSystem].sort((a, b) => {
        if (a.type !== b.type) return a.type === 'dir' ? -1 : 1;
        return a.path.localeCompare(b.path);
    });

    sortedFS.forEach(item => {
        const el = document.createElement('div');
        el.className = 'tree-item';
        el.textContent = `${item.name}`;
        
        if (item.type === 'file') {
            el.onclick = () => scrollToNode(item.path);
        }
        treeContainer.appendChild(el);
    });
}

// 4. Рендер стрічки редакторів
async function renderEditorStream() {
    const stream = document.getElementById('editors-stream');
    stream.innerHTML = '';

    const files = fileSystem.filter(f => f.type === 'file');

    for (const file of files) {
        // Читаємо реальний вміст файлу з диска
        const handle = fileHandles[file.path];
        const fileData = await handle.getFile();
        const content = await fileData.text();

        const block = document.createElement('div');
        block.className = 'file-block';
        block.id = `block-${file.path}`;

        block.innerHTML = `
            <div class="file-separator">📍 ${file.path}</div>
            <textarea class="code-area" id="editor-${file.path}" spellcheck="false"></textarea>
        `;
        stream.appendChild(block);
        
        const textarea = block.querySelector('.code-area');
        textarea.value = content;

        textarea.addEventListener('input', (e) => {
            lastEditedFileId = file.path;
            triggerAutoSave(file.path, e.target.value);
        });
        textarea.addEventListener('focus', () => lastEditedFileId = file.path);
    }
    setupIntersectionObserver();
}

// 5. Збереження ПРЯМО НА ДИСК
async function triggerAutoSave(path, newContent) {
    const statusIcon = document.getElementById('status-icon');
    const statusText = document.getElementById('status-text');
    
    statusIcon.textContent = '⏳';
    statusText.textContent = 'Збереження...';
    
    clearTimeout(saveTimeout);
    saveTimeout = setTimeout(async () => {
        try {
            const handle = fileHandles[path];
            // Запитуємо дозвіл на запис (браузер може запитати користувача один раз)
            const writable = await handle.createWritable();
            await writable.write(newContent);
            await writable.close();
            
            statusIcon.textContent = '✅';
            statusText.textContent = 'Збережено';
        } catch (err) {
            console.error(err);
            statusIcon.textContent = '❌';
            statusText.textContent = 'Помилка доступу';
        }
    }, 1000); // Чекаємо 1 секунду після останнього натискання клавіші
}

// Навігація та гарячі клавіші
function scrollToNode(path) {
    const block = document.getElementById(`block-${path}`);
    if (block) block.scrollIntoView({ behavior: 'smooth' });
}

function setupIntersectionObserver() {
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                document.querySelectorAll('.tree-item').forEach(el => el.classList.remove('active'));
                const activeTreeItem = Array.from(document.querySelectorAll('.tree-item'))
                    .find(el => el.textContent.includes(entry.target.id.split('/').pop()));
                if (activeTreeItem) activeTreeItem.classList.add('active');
            }
        });
    }, { threshold: 0.2 });

    document.querySelectorAll('.file-block').forEach(block => observer.observe(block));
}

function setupKeyboardListeners() {
    document.addEventListener('keydown', (e) => {
        if (e.ctrlKey && e.key === 'b') {
            e.preventDefault();
            document.getElementById('sidebar').classList.toggle('hidden');
        }
        if (e.ctrlKey && e.key === 'Enter' && lastEditedFileId) {
            e.preventDefault();
            const textarea = document.getElementById(`editor-${lastEditedFileId}`);
            scrollToNode(lastEditedFileId);
            textarea.focus();
        }
    });
}
