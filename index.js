// =============================================================
//  CheatMode v2.0 — SillyTavern Extension
//  github.com/freir1337/CheatMode
// =============================================================

const MODULE_NAME = 'cheatmod';

const DEFAULT_SLIDERS = [
    {
        id: 'leechild',
        label: 'Повествование в стиле писателя Ли Чайлд',
        value: 60,
        template: 'Пиши повествование в стиле Ли Чайлд на {value}%: короткие рубленые предложения, экшен, никакой воды.'
    },
    {
        id: 'ludlum',
        label: 'Развитие сюжета в стиле Роберт Ладлэм',
        value: 40,
        template: 'Развивай сюжет в стиле Роберта Ладлэма на {value}%: заговоры, неожиданные повороты, высокие ставки.'
    },
    {
        id: 'leonard',
        label: 'Диалоги в стиле Элмор Леонард',
        value: 40,
        template: 'Пиши диалоги в стиле Элмора Леонарда на {value}%: живо, коротко, с характером.'
    },
    {
        id: 'realism',
        label: 'Реалистичность действий и последствий',
        value: 80,
        template: 'Действия и последствия должны быть реалистичными на {value}%.'
    },
    {
        id: 'suspense',
        label: 'Напряжение и саспенс в сценах',
        value: 70,
        template: 'Поддерживай напряжение и саспенс в сценах на {value}%.'
    },
    {
        id: 'gore',
        label: 'Натуралистичность жестокости (Gore)',
        value: 40,
        template: 'Описывай жестокость и насилие натуралистично на {value}%.'
    },
    {
        id: 'pace',
        label: 'Темп развития событий',
        value: 70,
        template: 'Держи темп событий высоким на {value}%.'
    },
    {
        id: 'sensations',
        label: 'Подробные описания физических ощущений',
        value: 60,
        template: 'Описывай физические ощущения персонажей подробно на {value}%.'
    },
    {
        id: 'ozone',
        label: 'Использовать в тексте слова: озон',
        value: 0,
        template: 'Используй слово "озон" {value} раз в ответе.'
    },
    {
        id: 'swear',
        label: 'Мат в диалогах',
        value: 20,
        template: 'Используй ненормативную лексику в диалогах на {value}% интенсивности.'
    }
];

// =============================================================
//  Сборка финального промпта
// =============================================================
function buildPrompt() {
    const s = getSettings();
    const lines = [];

    lines.push('[CHEATMODE — ОБЯЗАТЕЛЬНЫЕ ИНСТРУКЦИИ. ВЫПОЛНЯТЬ СТРОГО]');

    s.sliders.forEach(slider => {
        if (slider.value > 0) {
            lines.push(slider.template.replace('{value}', slider.value));
        }
    });

    if (s.notes.length > 0) {
        lines.push('');
        lines.push('Правила мира (выполнять всегда):');
        s.notes.forEach(n => lines.push('- ' + n));
    }

    if (s.relations.length > 0) {
        lines.push('');
        lines.push('Отношения персонажей:');
        s.relations.forEach(r => {
            lines.push(`- ${r.char1} и ${r.char2}: ${r.type}, симпатия ${r.affinity}%`);
        });
    }

    lines.push('[КОНЕЦ CHEATMODE]');
    return lines.join('\n');
}

// =============================================================
//  Получение настроек (всегда через extension_settings)
// =============================================================
function getSettings() {
    const { extension_settings } = SillyTavern.getContext();
    return extension_settings[MODULE_NAME];
}

function saveSettings() {
    const { saveSettingsDebounced } = SillyTavern.getContext();
    saveSettingsDebounced();
}

// =============================================================
//  Перехват промпта — CHAT COMPLETION (OpenAI, Claude и т.д.)
//  ST передаёт объект { chat: [{role, content}, ...] }
// =============================================================
function interceptChatCompletion(data) {
    if (!data || !Array.isArray(data.chat)) return;
    const msg = { role: 'system', content: buildPrompt() };
    // Вставляем после первого system-сообщения (system prompt ST)
    data.chat.splice(1, 0, msg);
}

// =============================================================
//  UI Helpers
// =============================================================
function el(id) { return document.getElementById(id); }

function makeBtn(text, cls, onClick) {
    const btn = document.createElement('button');
    btn.textContent = text;
    if (cls) btn.className = cls;
    btn.addEventListener('click', onClick);
    return btn;
}

// =============================================================
//  Рендер ползунков
// =============================================================
function renderSliders() {
    const container = el('cm-sliders');
    if (!container) return;
    container.innerHTML = '';

    const s = getSettings();
    s.sliders.forEach((slider, i) => {
        const row = document.createElement('div');
        row.className = 'cm-slider-block';

        const pctId = `cm-pct-${i}`;

        row.innerHTML = `
            <div class="cm-slider-head">
                <span class="cm-slider-name">${slider.label}</span>
                <button class="cm-btn-trash" data-i="${i}">🗑</button>
            </div>
            <div class="cm-slider-foot">
                <input type="range" min="0" max="100" value="${slider.value}">
                <span class="cm-pct" id="${pctId}">${slider.value}%</span>
            </div>
        `;

        row.querySelector('input[type=range]').addEventListener('input', function () {
            s.sliders[i].value = +this.value;
            el(pctId).textContent = this.value + '%';
        });

        row.querySelector('.cm-btn-trash').addEventListener('click', () => {
            if (confirm(`Удалить ползунок «${slider.label}»?`)) {
                s.sliders.splice(i, 1);
                renderSliders();
            }
        });

        container.appendChild(row);
    });
}

// =============================================================
//  Рендер заметок
// =============================================================
function renderNotes() {
    const list = el('cm-notes-list');
    if (!list) return;
    list.innerHTML = '';

    const s = getSettings();
    s.notes.forEach((note, i) => {
        const row = document.createElement('div');
        row.className = 'cm-note-row';
        row.innerHTML = `<span>${note}</span>`;
        const del = makeBtn('🗑', 'cm-btn-trash', () => {
            s.notes.splice(i, 1);
            renderNotes();
        });
        row.appendChild(del);
        list.appendChild(row);
    });
}

function addNote() {
    const input = el('cm-note-input');
    const val = input.value.trim();
    if (!val) return;
    getSettings().notes.push(val);
    renderNotes();
    input.value = '';
}

// =============================================================
//  Рендер отношений
// =============================================================
function renderRelations() {
    const list = el('cm-rel-list');
    if (!list) return;
    list.innerHTML = '';

    const s = getSettings();
    s.relations.forEach((r, i) => {
        const row = document.createElement('div');
        row.className = 'cm-rel-block';

        const pctId = `cm-rpct-${i}`;

        row.innerHTML = `
            <div class="cm-rel-head">
                <span class="cm-rel-names">${r.char1} → ${r.char2}</span>
                <button class="cm-btn-trash" data-i="${i}">🗑</button>
            </div>
            <div class="cm-rel-foot">
                <select class="cm-rel-type">
                    ${['Нейтрал','Друзья','Враги','Влюблены','Соперники','Незнакомцы']
                        .map(t => `<option${r.type === t ? ' selected' : ''}>${t}</option>`).join('')}
                </select>
                <input type="range" min="0" max="100" value="${r.affinity}" class="cm-affinity-slider">
                <span class="cm-affinity-val" id="${pctId}">${r.affinity}%</span>
            </div>
        `;

        row.querySelector('.cm-rel-type').addEventListener('change', function () {
            s.relations[i].type = this.value;
        });

        row.querySelector('.cm-affinity-slider').addEventListener('input', function () {
            s.relations[i].affinity = +this.value;
            el(pctId).textContent = this.value + '%';
        });

        row.querySelector('.cm-btn-trash').addEventListener('click', () => {
            s.relations.splice(i, 1);
            renderRelations();
        });

        list.appendChild(row);
    });
}

function addRelation() {
    const char1 = prompt('Имя персонажа (char):');
    if (!char1) return;
    const char2 = prompt('Имя второго персонажа или user:');
    if (!char2) return;
    getSettings().relations.push({
        char1: char1.trim(),
        char2: char2.trim(),
        type: 'Нейтрал',
        affinity: 50
    });
    renderRelations();
}

// =============================================================
//  Экспорт пресета
// =============================================================
function exportPreset() {
    const json = JSON.stringify(getSettings(), null, 2);
    const a = document.createElement('a');
    a.href = 'data:application/json;charset=utf-8,' + encodeURIComponent(json);
    a.download = 'cheatmod_preset.json';
    a.click();
}

// =============================================================
//  Drag & Drop панели
// =============================================================
function makeDraggable(panel, handle) {
    let ox = 0, oy = 0, sx = 0, sy = 0;

    handle.addEventListener('mousedown', function (e) {
        // Не перетаскивать если кликнули на кнопку
        if (e.target.tagName === 'BUTTON') return;
        e.preventDefault();
        sx = e.clientX;
        sy = e.clientY;
        const rect = panel.getBoundingClientRect();
        ox = rect.left;
        oy = rect.top;
        panel.style.right = 'auto';
        panel.style.bottom = 'auto';

        function onMove(e) {
            panel.style.left = (ox + e.clientX - sx) + 'px';
            panel.style.top  = (oy + e.clientY - sy) + 'px';
        }
        function onUp() {
            document.removeEventListener('mousemove', onMove);
            document.removeEventListener('mouseup', onUp);
        }
        document.addEventListener('mousemove', onMove);
        document.addEventListener('mouseup', onUp);
    });
}

// =============================================================
//  Создание главной панели
// =============================================================
function createPanel() {
    if (el('cheatmod-panel')) return;

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
            <button id="cm-btn-export">⬇ Экспорт пресета</button>
            <button id="cm-btn-close-bot">✕ Закрыть</button>
            <button id="cm-btn-save-bot" class="cm-btn-primary">💾 Сохранить</button>
        </div>
    `;

    document.body.appendChild(panel);

    // Drag
    makeDraggable(panel, el('cm-handle'));

    // Рендер данных
    renderSliders();
    renderNotes();
    renderRelations();

    // Закрыть
    const closePanel = () => { panel.style.display = 'none'; };
    el('cm-btn-close-top').addEventListener('click', closePanel);
    el('cm-btn-close-bot').addEventListener('click', closePanel);

    // Сохранить
    const doSave = () => {
        saveSettings();
        if (typeof toastr !== 'undefined') toastr.success('CheatMode сохранён!');
        closePanel();
    };
    el('cm-btn-save-top').addEventListener('click', doSave);
    el('cm-btn-save-bot').addEventListener('click', doSave);

    // Экспорт
    el('cm-btn-export').addEventListener('click', exportPreset);

    // Заметки
    el('cm-add-note-btn').addEventListener('click', addNote);
    el('cm-note-input').addEventListener('keydown', e => { if (e.key === 'Enter') addNote(); });

    // Отношения
    el('cm-add-rel-btn').addEventListener('click', addRelation);

    // Добавить ползунок
    el('cm-add-slider-btn').addEventListener('click', () => {
        const label = prompt('Название ползунка:');
        if (!label) return;
        const template = prompt(
            'Шаблон промпта (используй {value} для процента):',
            label + ' на {value}%.'
        );
        if (!template) return;
        getSettings().sliders.push({
            id: 'custom_' + Date.now(),
            label: label.trim(),
            value: 50,
            template: template.trim()
        });
        renderSliders();
    });
}

// =============================================================
//  Плавающая кнопка
// =============================================================
function createFAB() {
    if (el('cheatmod-fab')) return;

    const fab = document.createElement('div');
    fab.id = 'cheatmod-fab';
    fab.title = 'Читмод';
    fab.textContent = '✏️';
    document.body.appendChild(fab);

    fab.addEventListener('click', () => {
        const panel = el('cheatmod-panel');
        if (!panel) return;
        panel.style.display = panel.style.display === 'flex' ? 'none' : 'flex';
    });
}

// =============================================================
//  Страница настроек в меню Extensions ST
//  Здесь пользователь может редактировать шаблоны промптов
// =============================================================
function createExtensionSettings() {
    // ST ищет элемент с id extensions_settings
    const container = el('extensions_settings');
    if (!container) return;

    const wrapper = document.createElement('div');
    wrapper.className = 'cm-ext-settings';
    wrapper.innerHTML = `
        <div class="cm-ext-title">✏️ CheatMode — Шаблоны промптов</div>
        <div class="cm-ext-hint">Здесь редактируй шаблоны для каждого ползунка.<br>
        Используй <code>{value}</code> — подставляется процент ползунка.</div>
        <div id="cm-template-list"></div>
    `;
    container.appendChild(wrapper);

    renderTemplates();
}

function renderTemplates() {
    const list = el('cm-template-list');
    if (!list) return;
    list.innerHTML = '';

    const s = getSettings();
    s.sliders.forEach((slider, i) => {
        const block = document.createElement('div');
        block.className = 'cm-tpl-block';
        block.innerHTML = `
            <details>
                <summary class="cm-tpl-summary">${slider.label}</summary>
                <div class="cm-tpl-body">
                    <label>Название ползунка</label>
                    <input class="text_pole cm-tpl-label" value="${slider.label}">
                    <label>Шаблон промпта</label>
                    <textarea class="text_pole cm-tpl-text">${slider.template}</textarea>
                </div>
            </details>
        `;

        block.querySelector('.cm-tpl-label').addEventListener('input', function () {
            s.sliders[i].label = this.value;
            renderSliders(); // обновляем панель тоже
        });
        block.querySelector('.cm-tpl-text').addEventListener('input', function () {
            s.sliders[i].template = this.value;
        });

        list.appendChild(block);
    });
}

// =============================================================
//  ТОЧКА ВХОДА
// =============================================================
jQuery(async () => {
    const ctx = SillyTavern.getContext();
    const { eventSource, event_types, extension_settings, saveSettingsDebounced } = ctx;

    // Инициализируем хранилище настроек если первый запуск
    if (!extension_settings[MODULE_NAME] || !Array.isArray(extension_settings[MODULE_NAME].sliders)) {
        extension_settings[MODULE_NAME] = {
            sliders:   DEFAULT_SLIDERS.map(s => ({ ...s })),
            notes:     ['Небо всегда зелёное, слоп всегда отборный!'],
            relations: []
        };
        saveSettingsDebounced();
    }

    // Подключаем перехватчик промпта
    // Это событие срабатывает перед каждым запросом к нейросети (Chat Completion API)
    eventSource.on(event_types.CHAT_COMPLETION_PROMPT_READY, interceptChatCompletion);

    // Создаём UI
    createPanel();
    createFAB();
    createExtensionSettings();

    console.log('[CheatMode] ✅ v2.0 загружен');
});
