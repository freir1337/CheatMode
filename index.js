// =============================================================
//  CheatMode v3.0 — SillyTavern Extension
//  github.com/freir1337/CheatMode
// =============================================================

const MODULE_NAME = 'cheatmod';
const extensionFolderPath = `scripts/extensions/third-party/${MODULE_NAME}`;

const DEFAULT_SLIDERS = [
    { id: 'leechild',   label: 'Повествование в стиле Ли Чайлд',          value: 60, template: 'Пиши повествование в стиле Ли Чайлд на {value}%: короткие рубленые предложения, экшен, никакой воды.' },
    { id: 'ludlum',     label: 'Развитие сюжета в стиле Роберт Ладлэм',   value: 40, template: 'Развивай сюжет в стиле Роберта Ладлэма на {value}%: заговоры, неожиданные повороты, высокие ставки.' },
    { id: 'leonard',    label: 'Диалоги в стиле Элмор Леонард',           value: 40, template: 'Пиши диалоги в стиле Элмора Леонарда на {value}%: живо, коротко, с характером.' },
    { id: 'realism',    label: 'Реалистичность действий и последствий',   value: 80, template: 'Действия и последствия должны быть реалистичными на {value}%.' },
    { id: 'suspense',   label: 'Напряжение и саспенс в сценах',           value: 70, template: 'Поддерживай напряжение и саспенс в сценах на {value}%.' },
    { id: 'gore',       label: 'Натуралистичность жестокости (Gore)',      value: 40, template: 'Описывай жестокость и насилие натуралистично на {value}%.' },
    { id: 'pace',       label: 'Темп развития событий',                   value: 70, template: 'Держи темп событий высоким на {value}%.' },
    { id: 'sensations', label: 'Подробные описания физических ощущений',  value: 60, template: 'Описывай физические ощущения персонажей подробно на {value}%.' },
    { id: 'ozone',      label: 'Использовать в тексте слово: озон',       value: 0,  template: 'Используй слово "озон" {value} раз в ответе.' },
    { id: 'swear',      label: 'Мат в диалогах',                          value: 20, template: 'Используй ненормативную лексику в диалогах на {value}% интенсивности.' },
];

// =============================================================
//  Настройки
// =============================================================
function getS() {
    return SillyTavern.getContext().extension_settings[MODULE_NAME];
}

function saveS() {
    SillyTavern.getContext().saveSettingsDebounced();
}

// =============================================================
//  Промпт
// =============================================================
function buildPrompt() {
    const s = getS();
    if (!s.enabled) return null;

    const lines = ['[CHEATMODE — ОБЯЗАТЕЛЬНЫЕ ИНСТРУКЦИИ. ВЫПОЛНЯТЬ СТРОГО.]'];
    s.sliders.forEach(sl => {
        if (sl.value > 0) lines.push(sl.template.replace('{value}', sl.value));
    });
    if (s.notes && s.notes.length > 0) {
        lines.push('');
        lines.push('Правила мира:');
        s.notes.forEach(n => lines.push('- ' + n));
    }
    if (s.relations && s.relations.length > 0) {
        lines.push('');
        lines.push('Отношения персонажей:');
        s.relations.forEach(r => lines.push(`- ${r.char1} и ${r.char2}: ${r.type}, симпатия ${r.affinity}%`));
    }
    lines.push('[КОНЕЦ CHEATMODE]');
    return lines.join('\n');
}

function interceptPrompt(data) {
    if (!data || !Array.isArray(data.chat)) return;
    const prompt = buildPrompt();
    if (!prompt) return;
    data.chat.splice(1, 0, { role: 'system', content: prompt });
}

// =============================================================
//  Вспомогалки
// =============================================================
const q = id => document.getElementById(id);

// =============================================================
//  ГЛАВНАЯ ПАНЕЛЬ (плавающая)
// =============================================================
function renderPanelSliders() {
    const c = q('cm-sliders');
    if (!c) return;
    c.innerHTML = '';
    getS().sliders.forEach((sl, i) => {
        const d = document.createElement('div');
        d.className = 'cm-slider-block';
        d.innerHTML = `
            <div class="cm-slider-head">
                <span class="cm-slider-name">${sl.label}</span>
                <button class="cm-trash">🗑</button>
            </div>
            <div class="cm-slider-foot">
                <input type="range" min="0" max="100" value="${sl.value}">
                <span class="cm-pct" id="cm-pct-${i}">${sl.value}%</span>
            </div>`;
        d.querySelector('input').addEventListener('input', function () {
            getS().sliders[i].value = +this.value;
            q(`cm-pct-${i}`).textContent = this.value + '%';
        });
        d.querySelector('.cm-trash').addEventListener('click', () => {
            if (confirm(`Удалить «${sl.label}»?`)) { getS().sliders.splice(i, 1); renderPanelSliders(); }
        });
        c.appendChild(d);
    });
}

function renderPanelNotes() {
    const list = q('cm-notes-list');
    if (!list) return;
    list.innerHTML = '';
    getS().notes.forEach((note, i) => {
        const d = document.createElement('div');
        d.className = 'cm-note-row';
        d.innerHTML = `<span>${note}</span>`;
        const btn = document.createElement('button');
        btn.className = 'cm-trash';
        btn.textContent = '🗑';
        btn.onclick = () => { getS().notes.splice(i, 1); renderPanelNotes(); };
        d.appendChild(btn);
        list.appendChild(d);
    });
}

function addNote() {
    const inp = q('cm-note-input');
    const val = inp.value.trim();
    if (!val) return;
    getS().notes.push(val);
    renderPanelNotes();
    inp.value = '';
}

function renderPanelRelations() {
    const list = q('cm-rel-list');
    if (!list) return;
    list.innerHTML = '';
    getS().relations.forEach((r, i) => {
        const d = document.createElement('div');
        d.className = 'cm-rel-block';
        d.innerHTML = `
            <div class="cm-rel-head">
                <span class="cm-rel-names">${r.char1} → ${r.char2}</span>
                <button class="cm-trash">🗑</button>
            </div>
            <div class="cm-rel-foot">
                <select class="cm-rel-type">
                    ${['Нейтрал','Друзья','Враги','Влюблены','Соперники','Незнакомцы']
                        .map(t => `<option${r.type===t?' selected':''}>${t}</option>`).join('')}
                </select>
                <input type="range" min="0" max="100" value="${r.affinity}" class="cm-affinity-sl">
                <span class="cm-affinity-val" id="cm-rpct-${i}">${r.affinity}%</span>
            </div>`;
        d.querySelector('.cm-rel-type').onchange = function () { getS().relations[i].type = this.value; };
        d.querySelector('.cm-affinity-sl').oninput = function () {
            getS().relations[i].affinity = +this.value;
            q(`cm-rpct-${i}`).textContent = this.value + '%';
        };
        d.querySelector('.cm-trash').onclick = () => { getS().relations.splice(i, 1); renderPanelRelations(); };
        list.appendChild(d);
    });
}

function addRelation() {
    const c1 = prompt('Имя персонажа (char):');
    if (!c1) return;
    const c2 = prompt('Имя второго / user:');
    if (!c2) return;
    getS().relations.push({ char1: c1.trim(), char2: c2.trim(), type: 'Нейтрал', affinity: 50 });
    renderPanelRelations();
}

function exportPreset() {
    const a = document.createElement('a');
    a.href = 'data:application/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(getS(), null, 2));
    a.download = 'cheatmod_preset.json';
    a.click();
}

function makeDraggable(panel, handle) {
    let ox, oy, sx, sy;
    handle.addEventListener('mousedown', e => {
        if (e.target.tagName === 'BUTTON') return;
        e.preventDefault();
        sx = e.clientX; sy = e.clientY;
        const r = panel.getBoundingClientRect();
        ox = r.left; oy = r.top;
        panel.style.right = 'auto'; panel.style.bottom = 'auto';
        const mv = e => { panel.style.left = (ox+e.clientX-sx)+'px'; panel.style.top = (oy+e.clientY-sy)+'px'; };
        const up = () => { document.removeEventListener('mousemove', mv); document.removeEventListener('mouseup', up); };
        document.addEventListener('mousemove', mv);
        document.addEventListener('mouseup', up);
    });
}

function openPanel() {
    const panel = q('cheatmod-panel');
    if (!panel) return;
    panel.style.display = 'flex';
}

function togglePanel() {
    const panel = q('cheatmod-panel');
    if (!panel) return;
    panel.style.display = panel.style.display === 'flex' ? 'none' : 'flex';
}

function createPanel() {
    if (q('cheatmod-panel')) return;
    const panel = document.createElement('div');
    panel.id = 'cheatmod-panel';
    panel.style.display = 'none';
    panel.innerHTML = `
        <div class="cm-header" id="cm-handle">
            <span class="cm-title">✏️ Читмод</span>
            <div class="cm-header-btns">
                <button id="cm-btn-save-top" title="Сохранить">💾</button>
                <button id="cm-btn-close-top" title="Закрыть">✕</button>
            </div>
        </div>
        <div class="cm-body">
            <div class="cm-section">
                <div class="cm-section-label">🌍 Настройки мира и стилей</div>
                <div id="cm-sliders"></div>
                <button class="cm-btn-add" id="cm-add-slider-btn">+ Добавить ползунок</button>
            </div>
            <div class="cm-section">
                <div class="cm-section-label">📝 Заметки (правила мира)</div>
                <div id="cm-notes-list"></div>
                <div class="cm-input-row">
                    <input id="cm-note-input" placeholder="Напиши правило мира...">
                    <button class="cm-btn-add-inline" id="cm-add-note-btn">+ Добавить</button>
                </div>
            </div>
            <div class="cm-section">
                <div class="cm-section-label">❤️ Отношения персонажей</div>
                <div id="cm-rel-list"></div>
                <button class="cm-btn-add" id="cm-add-rel-btn">+ Добавить зависимость</button>
            </div>
        </div>
        <div class="cm-footer">
            <button id="cm-btn-export">⬇ Экспорт</button>
            <button id="cm-btn-close-bot">✕ Закрыть</button>
            <button id="cm-btn-save-bot" class="cm-btn-primary">💾 Сохранить</button>
        </div>`;
    document.body.appendChild(panel);
    makeDraggable(panel, q('cm-handle'));
    renderPanelSliders(); renderPanelNotes(); renderPanelRelations();

    const close = () => { panel.style.display = 'none'; };
    const save  = () => { saveS(); if (typeof toastr!=='undefined') toastr.success('CheatMode сохранён!'); close(); };

    q('cm-btn-close-top').onclick  = close;
    q('cm-btn-close-bot').onclick  = close;
    q('cm-btn-save-top').onclick   = save;
    q('cm-btn-save-bot').onclick   = save;
    q('cm-btn-export').onclick     = exportPreset;
    q('cm-add-note-btn').onclick   = addNote;
    q('cm-add-rel-btn').onclick    = addRelation;
    q('cm-note-input').addEventListener('keydown', e => { if (e.key==='Enter') addNote(); });
    q('cm-add-slider-btn').onclick = () => {
        const label = prompt('Название ползунка:');
        if (!label) return;
        const tpl = prompt('Шаблон промпта (используй {value} для %):', label + ' на {value}%.');
        if (!tpl) return;
        getS().sliders.push({ id: 'custom_'+Date.now(), label: label.trim(), value: 50, template: tpl.trim() });
        renderPanelSliders();
        renderSettingsSliders(); // обновляем и страницу настроек
    };
}

function createFAB() {
    if (q('cheatmod-fab')) return;
    const fab = document.createElement('div');
    fab.id = 'cheatmod-fab';
    fab.title = 'Читмод';
    fab.textContent = '✏️';
    document.body.appendChild(fab);
    fab.addEventListener('click', togglePanel);
}

// =============================================================
//  НАСТРОЙКИ В МЕНЮ EXTENSIONS
//  ✅ Правильный способ: $.get(settings.html) → append('#extensions_settings')
// =============================================================
function renderSettingsSliders() {
    const list = q('cm-settings-sliders-list');
    if (!list) return;
    list.innerHTML = '';
    getS().sliders.forEach((sl, i) => {
        const block = document.createElement('div');
        block.className = 'cm-tpl-block';
        block.innerHTML = `
            <details>
                <summary class="cm-tpl-summary">${sl.label}</summary>
                <div class="cm-tpl-body">
                    <label>Название ползунка</label>
                    <input class="text_pole cm-tpl-label" value="${sl.label}">
                    <label>Шаблон промпта</label>
                    <textarea class="text_pole cm-tpl-text">${sl.template}</textarea>
                    <button class="menu_button cm-tpl-delete" style="margin-top:4px">🗑 Удалить этот ползунок</button>
                </div>
            </details>`;
        block.querySelector('.cm-tpl-label').addEventListener('input', function () {
            getS().sliders[i].label = this.value;
            renderPanelSliders();
        });
        block.querySelector('.cm-tpl-text').addEventListener('input', function () {
            getS().sliders[i].template = this.value;
        });
        block.querySelector('.cm-tpl-delete').addEventListener('click', () => {
            if (confirm(`Удалить «${sl.label}»?`)) {
                getS().sliders.splice(i, 1);
                renderSettingsSliders();
                renderPanelSliders();
                saveS();
            }
        });
        list.appendChild(block);
    });
}

async function loadSettings() {
    // ✅ Загружаем settings.html и вставляем в Extensions меню ST
    const html = await $.get(`${extensionFolderPath}/settings.html`);
    $('#extensions_settings').append(html);

    // Рендерим список шаблонов
    renderSettingsSliders();

    // Чекбокс включения
    const toggle = q('cm-enabled-toggle');
    if (toggle) {
        toggle.checked = getS().enabled !== false;
        toggle.addEventListener('change', () => {
            getS().enabled = toggle.checked;
            saveS();
        });
    }

    // Кнопка открыть панель
    const openBtn = q('cm-settings-open-panel');
    if (openBtn) openBtn.addEventListener('click', openPanel);

    // Добавить ползунок из настроек
    const addBtn = q('cm-settings-add-slider');
    if (addBtn) {
        addBtn.addEventListener('click', () => {
            const label = prompt('Название ползунка:');
            if (!label) return;
            const tpl = prompt('Шаблон промпта (используй {value} для %):', label + ' на {value}%.');
            if (!tpl) return;
            getS().sliders.push({ id: 'custom_'+Date.now(), label: label.trim(), value: 50, template: tpl.trim() });
            renderSettingsSliders();
            renderPanelSliders();
            saveS();
        });
    }

    // Экспорт
    const expBtn = q('cm-settings-export');
    if (expBtn) expBtn.addEventListener('click', exportPreset);

    // Импорт
    const impBtn = q('cm-settings-import-btn');
    const impFile = q('cm-settings-import-file');
    if (impBtn && impFile) {
        impBtn.addEventListener('click', () => impFile.click());
        impFile.addEventListener('change', e => {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = ev => {
                try {
                    const data = JSON.parse(ev.target.result);
                    SillyTavern.getContext().extension_settings[MODULE_NAME] = data;
                    saveS();
                    renderSettingsSliders();
                    renderPanelSliders();
                    renderPanelNotes();
                    renderPanelRelations();
                    if (typeof toastr !== 'undefined') toastr.success('Пресет импортирован!');
                } catch {
                    if (typeof toastr !== 'undefined') toastr.error('Ошибка: неверный формат файла');
                }
            };
            reader.readAsText(file);
        });
    }
}

// =============================================================
//  ТОЧКА ВХОДА
// =============================================================
jQuery(async () => {
    const ctx = SillyTavern.getContext();
    const { eventSource, event_types, extension_settings, saveSettingsDebounced } = ctx;

    // Дефолтные настройки при первом запуске
    if (!extension_settings[MODULE_NAME] || !Array.isArray(extension_settings[MODULE_NAME].sliders)) {
        extension_settings[MODULE_NAME] = {
            enabled:   true,
            sliders:   DEFAULT_SLIDERS.map(s => ({ ...s })),
            notes:     ['Небо всегда зелёное, слоп всегда отборный!'],
            relations: []
        };
        saveSettingsDebounced();
    }
    // Совместимость со старыми версиями
    if (extension_settings[MODULE_NAME].enabled === undefined) {
        extension_settings[MODULE_NAME].enabled = true;
    }
    if (!extension_settings[MODULE_NAME].relations) {
        extension_settings[MODULE_NAME].relations = [];
    }

    // Перехват промпта
    eventSource.on(event_types.CHAT_COMPLETION_PROMPT_READY, interceptPrompt);

    // Загрузить settings.html в меню Extensions
    await loadSettings();

    // Создать плавающую панель и FAB
    createPanel();
    createFAB();

    console.log('[CheatMode] ✅ v3.0 загружен');
});
