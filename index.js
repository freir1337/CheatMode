// ============================================================
//  ЧИТМОД — SillyTavern Extension
//  Floating panel: sliders → hidden prompts, notes, relations
// ============================================================

import {
    getContext,
    extension_settings,
    saveSettingsDebounced,
    renderExtensionTemplateAsync,
} from '../../../extensions.js';

import {
    eventSource,
    event_types,
    saveSettingsDebounced as globalSaveDebounced,
    getCharacters,
    this_chid,
} from '../../../../script.js';

// ── Extension ID ──────────────────────────────────────────────
const EXT_NAME = 'cheatmod';

// ── Default settings ──────────────────────────────────────────
const DEFAULT_SETTINGS = {
    sliders: [
        {
            id: 'slider_1',
            label: 'Повествование в стиле писателя Ли Чайлд',
            value: 60,
            prompt: 'Пиши повествование в лаконичном, динамичном стиле Ли Чайлда. Короткие предложения, чёткое действие, минимум лирических отступлений. Интенсивность: {value}%.',
            enabled: true,
        },
        {
            id: 'slider_2',
            label: 'Развитие сюжета в стиле Роберта Ладлэма',
            value: 40,
            prompt: 'Развивай сюжет в духе Роберта Ладлэма: многоуровневые заговоры, резкие повороты, постоянное нагнетание опасности. Интенсивность: {value}%.',
            enabled: true,
        },
        {
            id: 'slider_3',
            label: 'Написание диалогов в стиле Элмора Леонарда',
            value: 40,
            prompt: 'Пиши диалоги в манере Элмора Леонарда: живые, острые, с характером каждого персонажа, без лишних атрибуций. Интенсивность: {value}%.',
            enabled: true,
        },
        {
            id: 'slider_4',
            label: 'Реалистичность действий и последствий',
            value: 80,
            prompt: 'Соблюдай реалистичность физических действий и их последствий. Удары, ранения, усталость — всё имеет вес и цену. Уровень реализма: {value}%.',
            enabled: true,
        },
        {
            id: 'slider_5',
            label: 'Напряжение и саспенс в сценах',
            value: 70,
            prompt: 'Поддерживай напряжение и саспенс: не раскрывай информацию раньше времени, держи читателя на краю. Интенсивность: {value}%.',
            enabled: true,
        },
        {
            id: 'slider_6',
            label: 'Натуралистичность жестокости (Gore)',
            value: 40,
            prompt: 'Описывай насилие натуралистично, не смягчая и не приукрашивая. Кровь, боль и смерть реальны. Уровень: {value}%.',
            enabled: true,
        },
        {
            id: 'slider_7',
            label: 'Темп развития событий',
            value: 70,
            prompt: 'Управляй темпом: при высоком значении сцены сжаты и динамичны, при низком — неспешны и атмосферны. Текущий темп: {value}% (100% — максимальная динамика).',
            enabled: true,
        },
        {
            id: 'slider_8',
            label: 'Подробные описания физических ощущений',
            value: 60,
            prompt: 'Добавляй подробные описания физических ощущений персонажей: тепло, холод, боль, усталость, запахи, текстуры. Детализация: {value}%.',
            enabled: true,
        },
        {
            id: 'slider_9',
            label: 'Мат в диалогах',
            value: 20,
            prompt: 'Используй ненормативную лексику в диалогах персонажей там, где это органично для характера. Частота: {value}%.',
            enabled: true,
        },
    ],
    // Слайдеры с ключевым словом
    wordSliders: [
        {
            id: 'wslider_1',
            label: 'Использовать в тексте слово',
            word: 'озон',
            value: 0,
            prompt: 'Органично вплетай слово "{word}" в текст. Частота: {value}%.',
            enabled: true,
        },
    ],
    notes: [],
    relations: [],
    panelOpen: false,
    panelX: 20,
    panelY: 80,
};

// ── State ─────────────────────────────────────────────────────
let settings = {};
let $panel = null;
let $toggle = null;
let isDragging = false;
let dragOffsetX = 0;
let dragOffsetY = 0;

// ── Init ──────────────────────────────────────────────────────
jQuery(async () => {
    initSettings();
    injectSettingsUI();
    createFloatingPanel();
    hookPromptGeneration();
    console.log('[Читмод] Расширение загружено ✓');
});

// ── Settings init ─────────────────────────────────────────────
function initSettings() {
    if (!extension_settings[EXT_NAME]) {
        extension_settings[EXT_NAME] = structuredClone(DEFAULT_SETTINGS);
    }
    // Merge defaults for any missing keys
    const def = DEFAULT_SETTINGS;
    const s = extension_settings[EXT_NAME];
    if (!s.sliders) s.sliders = def.sliders;
    if (!s.wordSliders) s.wordSliders = def.wordSliders;
    if (!s.notes) s.notes = [];
    if (!s.relations) s.relations = [];
    if (s.panelOpen === undefined) s.panelOpen = false;
    if (s.panelX === undefined) s.panelX = 20;
    if (s.panelY === undefined) s.panelY = 80;
    settings = extension_settings[EXT_NAME];
}

function save() {
    saveSettingsDebounced();
}

// ── Build prompt injection text ───────────────────────────────
function buildInjectionText() {
    const lines = [];

    // Sliders
    for (const sl of settings.sliders) {
        if (!sl.enabled || sl.value === 0) continue;
        const text = sl.prompt.replace('{value}', sl.value);
        lines.push(text);
    }

    // Word sliders
    for (const wsl of settings.wordSliders) {
        if (!wsl.enabled || wsl.value === 0) continue;
        const text = wsl.prompt
            .replace('{word}', wsl.word)
            .replace('{value}', wsl.value);
        lines.push(text);
    }

    // Notes
    for (const note of settings.notes) {
        if (note && note.trim()) lines.push(note.trim());
    }

    // Relations
    for (const rel of settings.relations) {
        if (rel.charName && rel.userName) {
            const pct = rel.value !== undefined ? rel.value : 50;
            lines.push(
                `Отношения персонажа "${rel.charName}" к "${rel.userName}": ${rel.type || 'нейтральные'}, уровень привязанности: ${pct}%.`
            );
        }
    }

    return lines.length ? '\n\n[ЧИТМОД ИНСТРУКЦИИ]\n' + lines.join('\n') + '\n[/ЧИТМОД]' : '';
}

// ── Hook prompt generation ────────────────────────────────────
function hookPromptGeneration() {
    eventSource.on(event_types.GENERATE_BEFORE_COMBINE_PROMPTS, (data) => {
        const injection = buildInjectionText();
        if (!injection) return;

        // Find system prompt entry and append
        if (data && Array.isArray(data.prompts)) {
            const systemEntry = data.prompts.find(p => p.role === 'system');
            if (systemEntry) {
                systemEntry.content += injection;
            } else {
                data.prompts.unshift({ role: 'system', content: injection });
            }
        }
    });

    // Also hook for older ST versions
    eventSource.on(event_types.CHAT_COMPLETION_SETTINGS_READY, (data) => {
        const injection = buildInjectionText();
        if (!injection) return;
        if (data && data.messages) {
            const sys = data.messages.find(m => m.role === 'system');
            if (sys) sys.content += injection;
        }
    });

    // Auto-update relations after AI response
    eventSource.on(event_types.MESSAGE_RECEIVED, () => {
        autoUpdateRelations();
    });
}

// ── Auto-update relations based on AI response ────────────────
function autoUpdateRelations() {
    if (!settings.relations.length) return;
    const ctx = getContext();
    const lastMsg = ctx.chat && ctx.chat[ctx.chat.length - 1];
    if (!lastMsg || lastMsg.is_user) return;

    const text = (lastMsg.mes || '').toLowerCase();

    for (const rel of settings.relations) {
        let delta = 0;

        // Simple sentiment heuristics (Russian)
        const positive = ['рад', 'благодарн', 'люблю', 'нравит', 'хорош', 'спасибо', 'улыбн', 'смеёт', 'доверя'];
        const negative = ['ненавиж', 'злост', 'раздраж', 'злой', 'противн', 'предател', 'обман', 'уход', 'отверн'];

        positive.forEach(w => { if (text.includes(w)) delta += 3; });
        negative.forEach(w => { if (text.includes(w)) delta -= 3; });

        if (delta !== 0) {
            rel.value = Math.max(0, Math.min(100, (rel.value || 50) + delta));
        }
    }

    save();
    renderRelations();
}

// ── Floating panel ────────────────────────────────────────────
function createFloatingPanel() {
    // Toggle button
    $toggle = $(`
        <div id="cheatmod-toggle" title="Читмод">
            <span class="cm-toggle-icon">✏️</span>
            <span class="cm-toggle-label">Читмод</span>
        </div>
    `);
    $('body').append($toggle);

    $toggle.on('click', togglePanel);

    // Main panel
    $panel = $(`
        <div id="cheatmod-panel" class="${settings.panelOpen ? '' : 'cm-hidden'}">
            <div id="cm-header">
                <span class="cm-title">✏️ Читмод</span>
                <button id="cm-save-btn" title="Сохранить">💾 Сохранить</button>
                <button id="cm-close-btn" title="Свернуть">✕</button>
            </div>
            <div id="cm-body">
                <div class="cm-section">
                    <div class="cm-section-title">🌐 Настройки мира и стилей</div>
                    <div id="cm-sliders-list"></div>
                    <button class="cm-add-btn" id="cm-add-slider">＋ Добавить ползунок</button>
                </div>

                <div class="cm-section">
                    <div class="cm-section-title">📝 Заметки и инструкции</div>
                    <div id="cm-notes-list"></div>
                    <div class="cm-note-input-row">
                        <input type="text" id="cm-note-input" placeholder="Небо всегда зелёное, слоп всегда отборный!" />
                        <button id="cm-add-note-btn">✓ Добавить</button>
                    </div>
                </div>

                <div class="cm-section">
                    <div class="cm-section-title">❤️ Отношения персонажей</div>
                    <div id="cm-relations-list"></div>
                    <button class="cm-add-btn" id="cm-add-relation-btn">＋ Добавить зависимость</button>
                </div>
            </div>
            <div id="cm-footer">
                <button id="cm-export-btn">📥 Экспорт пресета</button>
                <button id="cm-import-btn">📤 Импорт пресета</button>
                <input type="file" id="cm-import-file" accept=".json" style="display:none" />
            </div>
        </div>
    `);

    $('body').append($panel);

    // Position
    $panel.css({ left: settings.panelX + 'px', top: settings.panelY + 'px' });

    // Drag
    $('#cm-header').on('mousedown', startDrag);
    $(document).on('mousemove', onDrag).on('mouseup', stopDrag);

    // Buttons
    $('#cm-close-btn').on('click', togglePanel);
    $('#cm-save-btn').on('click', () => { save(); flashSave(); });
    $('#cm-add-slider').on('click', addNewSlider);
    $('#cm-add-note-btn').on('click', addNote);
    $('#cm-note-input').on('keypress', e => { if (e.key === 'Enter') addNote(); });
    $('#cm-add-relation-btn').on('click', addRelation);
    $('#cm-export-btn').on('click', exportPreset);
    $('#cm-import-btn').on('click', () => $('#cm-import-file').click());
    $('#cm-import-file').on('change', importPreset);

    renderSliders();
    renderNotes();
    renderRelations();
}

function togglePanel() {
    settings.panelOpen = !settings.panelOpen;
    $panel.toggleClass('cm-hidden', !settings.panelOpen);
    save();
}

// ── Drag ──────────────────────────────────────────────────────
function startDrag(e) {
    if ($(e.target).is('button, input')) return;
    isDragging = true;
    const offset = $panel.offset();
    dragOffsetX = e.clientX - offset.left;
    dragOffsetY = e.clientY - offset.top;
    $panel.addClass('cm-dragging');
}
function onDrag(e) {
    if (!isDragging) return;
    const x = Math.max(0, e.clientX - dragOffsetX);
    const y = Math.max(0, e.clientY - dragOffsetY);
    $panel.css({ left: x + 'px', top: y + 'px' });
    settings.panelX = x;
    settings.panelY = y;
}
function stopDrag() {
    if (isDragging) { isDragging = false; $panel.removeClass('cm-dragging'); save(); }
}

// ── Sliders ───────────────────────────────────────────────────
function renderSliders() {
    const $list = $('#cm-sliders-list').empty();

    for (const sl of settings.sliders) {
        $list.append(buildSliderRow(sl, 'slider'));
    }
    for (const wsl of settings.wordSliders) {
        $list.append(buildWordSliderRow(wsl));
    }
}

function buildSliderRow(sl, type) {
    const $row = $(`
        <div class="cm-slider-row" data-id="${sl.id}">
            <div class="cm-slider-header">
                <label class="cm-slider-label">${escHtml(sl.label)}</label>
                <button class="cm-del-btn" title="Удалить">🗑</button>
            </div>
            <div class="cm-slider-track-row">
                <input type="range" min="0" max="100" value="${sl.value}" class="cm-range" />
                <span class="cm-pct">${sl.value}%</span>
            </div>
        </div>
    `);

    $row.find('.cm-range').on('input', function () {
        sl.value = parseInt(this.value);
        $row.find('.cm-pct').text(sl.value + '%');
        save();
    });

    $row.find('.cm-del-btn').on('click', () => {
        settings.sliders = settings.sliders.filter(s => s.id !== sl.id);
        settings.wordSliders = settings.wordSliders.filter(s => s.id !== sl.id);
        save();
        renderSliders();
    });

    return $row;
}

function buildWordSliderRow(wsl) {
    const $row = $(`
        <div class="cm-slider-row" data-id="${wsl.id}">
            <div class="cm-slider-header">
                <span class="cm-slider-label">
                    Использовать слово:
                    <input type="text" class="cm-word-input" value="${escHtml(wsl.word)}" placeholder="слово" />
                </span>
                <button class="cm-del-btn" title="Удалить">🗑</button>
            </div>
            <div class="cm-slider-track-row">
                <input type="range" min="0" max="100" value="${wsl.value}" class="cm-range" />
                <span class="cm-pct">${wsl.value}%</span>
            </div>
        </div>
    `);

    $row.find('.cm-range').on('input', function () {
        wsl.value = parseInt(this.value);
        $row.find('.cm-pct').text(wsl.value + '%');
        save();
    });

    $row.find('.cm-word-input').on('input', function () {
        wsl.word = $(this).val();
        save();
    });

    $row.find('.cm-del-btn').on('click', () => {
        settings.wordSliders = settings.wordSliders.filter(s => s.id !== wsl.id);
        save();
        renderSliders();
    });

    return $row;
}

function addNewSlider() {
    // Show modal to choose type
    const type = prompt('Тип ползунка:\n1 — обычный (стиль/параметр)\n2 — слово в тексте\n\nВведи 1 или 2:');
    if (type === '1') {
        const label = prompt('Название ползунка:');
        if (!label) return;
        const promptText = prompt('Промпт (используй {value} для подстановки процентов):', `Следуй инструкции "${label}" с интенсивностью {value}%.`);
        settings.sliders.push({
            id: 'slider_' + Date.now(),
            label,
            value: 50,
            prompt: promptText || `Следуй инструкции "${label}" с интенсивностью {value}%.`,
            enabled: true,
        });
    } else if (type === '2') {
        settings.wordSliders.push({
            id: 'wslider_' + Date.now(),
            label: 'Использовать слово',
            word: 'слово',
            value: 50,
            prompt: 'Органично вплетай слово "{word}" в текст. Частота: {value}%.',
            enabled: true,
        });
    } else return;

    save();
    renderSliders();
}

// ── Notes ─────────────────────────────────────────────────────
function renderNotes() {
    const $list = $('#cm-notes-list').empty();
    for (let i = 0; i < settings.notes.length; i++) {
        const note = settings.notes[i];
        const $note = $(`
            <div class="cm-note-item">
                <span class="cm-note-text">${escHtml(note)}</span>
                <button class="cm-del-btn">🗑</button>
            </div>
        `);
        $note.find('.cm-del-btn').on('click', () => {
            settings.notes.splice(i, 1);
            save();
            renderNotes();
        });
        $list.append($note);
    }
}

function addNote() {
    const val = $('#cm-note-input').val().trim();
    if (!val) return;
    settings.notes.push(val);
    $('#cm-note-input').val('');
    save();
    renderNotes();
}

// ── Relations ─────────────────────────────────────────────────
const RELATION_TYPES = ['нейтральные', 'друзья', 'враги', 'влюблённые', 'соперники', 'незнакомцы', 'союзники', 'соучастники', 'ненависть'];

function renderRelations() {
    const $list = $('#cm-relations-list').empty();
    const ctx = getContext();
    const chars = ctx.characters || [];

    for (let i = 0; i < settings.relations.length; i++) {
        const rel = settings.relations[i];
        const pct = rel.value !== undefined ? rel.value : 50;

        const charAvatar = getCharAvatar(rel.charName, chars);
        const userAvatar = getUserAvatar(ctx);

        const typeOptions = RELATION_TYPES.map(t =>
            `<option value="${t}" ${t === rel.type ? 'selected' : ''}>${t}</option>`
        ).join('');

        const $rel = $(`
            <div class="cm-relation-item">
                <div class="cm-relation-chars">
                    <div class="cm-rel-char">
                        <img src="${charAvatar}" class="cm-avatar" onerror="this.src='img/ai4.png'" />
                        <span class="cm-char-name">${escHtml(rel.charName || 'Персонаж')}</span>
                    </div>
                    <div class="cm-rel-arrow">→</div>
                    <div class="cm-rel-char">
                        <img src="${userAvatar}" class="cm-avatar" onerror="this.src='img/user-default.png'" />
                        <span class="cm-char-name">${escHtml(rel.userName || 'Пользователь')}</span>
                    </div>
                </div>
                <div class="cm-relation-controls">
                    <select class="cm-rel-type">${typeOptions}</select>
                    <div class="cm-rel-pct-row">
                        <span class="cm-rel-pct-label">Привязанность:</span>
                        <input type="range" min="0" max="100" value="${pct}" class="cm-range cm-rel-range" />
                        <span class="cm-rel-pct">${pct}%</span>
                    </div>
                </div>
                <button class="cm-del-btn">🗑</button>
            </div>
        `);

        $rel.find('.cm-rel-type').on('change', function () {
            rel.type = $(this).val();
            save();
        });

        $rel.find('.cm-rel-range').on('input', function () {
            rel.value = parseInt(this.value);
            $rel.find('.cm-rel-pct').text(rel.value + '%');
            save();
        });

        $rel.find('.cm-del-btn').on('click', () => {
            settings.relations.splice(i, 1);
            save();
            renderRelations();
        });

        $list.append($rel);
    }
}

function addRelation() {
    const ctx = getContext();
    const chars = ctx.characters || [];
    const charNames = chars.map(c => c.name);

    if (!charNames.length) {
        alert('Нет загруженных персонажей. Открой карточку персонажа сначала.');
        return;
    }

    const charName = prompt('Имя персонажа (char):\n' + charNames.join(', '));
    if (!charName) return;
    const userName = prompt('Имя пользователя (user):', ctx.name1 || 'Пользователь');
    if (!userName) return;

    settings.relations.push({
        id: 'rel_' + Date.now(),
        charName,
        userName,
        type: 'нейтральные',
        value: 50,
    });
    save();
    renderRelations();
}

function getCharAvatar(charName, chars) {
    const char = chars.find(c => c.name === charName);
    if (char && char.avatar) return `thumbnails/avatar/${char.avatar}`;
    return 'img/ai4.png';
}

function getUserAvatar(ctx) {
    const persona = ctx.personas && ctx.user_avatar ? ctx.personas[ctx.user_avatar] : null;
    return persona ? `User Avatars/${persona.name}` : 'img/user-default.png';
}

// ── Export / Import ───────────────────────────────────────────
function exportPreset() {
    const data = JSON.stringify(settings, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'cheatmod_preset.json';
    a.click();
    URL.revokeObjectURL(url);
}

function importPreset(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
        try {
            const imported = JSON.parse(ev.target.result);
            Object.assign(settings, imported);
            extension_settings[EXT_NAME] = settings;
            save();
            renderSliders();
            renderNotes();
            renderRelations();
            alert('Пресет импортирован!');
        } catch {
            alert('Ошибка: неверный файл пресета.');
        }
    };
    reader.readAsText(file);
    e.target.value = '';
}

// ── Settings panel in Extensions menu ────────────────────────
function injectSettingsUI() {
    const html = `
    <div id="cheatmod-settings" class="cm-ext-settings">
        <h4>✏️ Читмод — настройки промптов</h4>
        <p class="cm-hint">Здесь можно редактировать скрытые промпты для каждого ползунка.<br>
        Используй <code>{value}</code> для подстановки процентов, <code>{word}</code> для слов.</p>
        <div id="cm-settings-sliders"></div>
        <button id="cm-settings-save-btn" class="menu_button">💾 Сохранить промпты</button>
    </div>`;

    $('#extensions_settings').append(html);
    renderSettingsPrompts();

    $('#cm-settings-save-btn').on('click', () => {
        save();
        toastr.success('Промпты сохранены!', 'Читмод');
    });
}

function renderSettingsPrompts() {
    const $cont = $('#cm-settings-sliders').empty();

    for (const sl of settings.sliders) {
        $cont.append(`
            <div class="cm-setting-item">
                <label><b>${escHtml(sl.label)}</b></label>
                <textarea class="cm-prompt-editor" data-id="${sl.id}" rows="3">${escHtml(sl.prompt)}</textarea>
                <input type="text" class="cm-label-editor" data-id="${sl.id}" value="${escHtml(sl.label)}" placeholder="Название ползунка" />
            </div>
        `);
    }

    for (const wsl of settings.wordSliders) {
        $cont.append(`
            <div class="cm-setting-item">
                <label><b>Слово: ${escHtml(wsl.word)}</b></label>
                <textarea class="cm-prompt-editor" data-word-id="${wsl.id}" rows="3">${escHtml(wsl.prompt)}</textarea>
            </div>
        `);
    }

    $cont.find('.cm-prompt-editor[data-id]').on('input', function () {
        const id = $(this).data('id');
        const sl = settings.sliders.find(s => s.id === id);
        if (sl) sl.prompt = $(this).val();
    });

    $cont.find('.cm-label-editor[data-id]').on('input', function () {
        const id = $(this).data('id');
        const sl = settings.sliders.find(s => s.id === id);
        if (sl) { sl.label = $(this).val(); renderSliders(); }
    });

    $cont.find('.cm-prompt-editor[data-word-id]').on('input', function () {
        const id = $(this).data('word-id');
        const wsl = settings.wordSliders.find(s => s.id === id);
        if (wsl) wsl.prompt = $(this).val();
    });
}

// ── Helpers ───────────────────────────────────────────────────
function escHtml(str) {
    return String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function flashSave() {
    const $btn = $('#cm-save-btn');
    $btn.text('✓ Сохранено!');
    setTimeout(() => $btn.text('💾 Сохранить'), 1500);
}
