const MODULE_NAME = 'cheatmod';
const ctx = SillyTavern.getContext();
const { eventSource, event_types, extension_settings, saveSettingsDebounced, Popup } = ctx;

let settings = extension_settings[MODULE_NAME] || {};
if (!settings.sliders) {
    settings.sliders = [
        {id: 'leechild', label: 'Повествование в стиле писателя Ли Чайлд', value: 60, template: 'Пиши повествование строго в стиле Ли Чайлд на {{value}}%: короткие рубленые предложения, максимум экшена, минимум описаний.'},
        {id: 'ludlum', label: 'Развитие сюжета в стиле писателя Роберт Ладлэм', value: 40, template: 'Развивай сюжет в стиле Роберта Ладлэма на {{value}}%: заговоры, повороты, высокие ставки.'},
        {id: 'leonard', label: 'Написание диалогов в стиле писателя Элмор Леонард', value: 40, template: 'Пиши диалоги в стиле Элмора Леонарда на {{value}}%: реалистично, коротко, с характером и матом.'},
        {id: 'realism', label: 'Реалистичность действий и последствий', value: 80, template: 'Действия и последствия должны быть реалистичными на {{value}}%.'},
        {id: 'suspense', label: 'Напряжение и саспенс в сценах', value: 70, template: 'Добавляй напряжение и саспенс на {{value}}%.'},
        {id: 'gore', label: 'Натуралистичность жестокости (Gore)', value: 40, template: 'Описывай жестокость натуралистично на {{value}}%.'},
        {id: 'pace', label: 'Темп развития событий', value: 70, template: 'Держи темп событий на {{value}}%.'},
        {id: 'sensations', label: 'Подробные описания физических ощущений', value: 60, template: 'Описывай физические ощущения подробно на {{value}}%.'},
        {id: 'ozone', label: 'Использовать в тексте слова: озон', value: 0, template: 'Вставляй слово "озон" {{value}} раз в ответ.'},
        {id: 'swear', label: 'Мат в диалогах', value: 20, template: 'Мат в диалогах на {{value}}% интенсивности.'}
    ];
    settings.notes = ["Да, тут пишешь что угодно. Небо всегда зеленое, слоп всегда отборный!"];
    settings.relationships = [];
}
extension_settings[MODULE_NAME] = settings;
saveSettingsDebounced();

let panel;

function createPanel() {
    panel = document.createElement('div');
    panel.id = 'cheatmod-panel';
    panel.innerHTML = `
        <div class="cheatmod-header">
            <div>📊 Читмод</div>
            <button id="close-btn">✕</button>
        </div>
        <div class="section">
            <h3>🌍 Настройки мира и стилей (Боевик)</h3>
            <div id="sliders"></div>
        </div>
        <div class="section">
            <h3>📝 Заметки</h3>
            <div id="notes-list"></div>
            <input id="new-note" placeholder="Да, тут пишешь что угодно...">
            <button id="add-note">+ Добавить</button>
        </div>
        <div class="section">
            <h3>❤️ Отношения персонажей</h3>
            <div id="relations-list"></div>
            <button id="add-relation">+ Добавить зависимость</button>
        </div>
        <div class="footer">
            <button id="save-btn">💾 Сохранить</button>
            <button id="export-btn">Экспорт пресета</button>
        </div>
    `;
    document.body.appendChild(panel);

    renderSliders();
    renderNotes();
    renderRelations();

    panel.querySelector('#add-note').onclick = addNote;
    panel.querySelector('#add-relation').onclick = addRelation;
    panel.querySelector('#save-btn').onclick = () => { saveSettingsDebounced(); toastr.success('Сохранено!'); panel.style.display = 'none'; };
    panel.querySelector('#close-btn').onclick = () => panel.style.display = 'none';
    panel.querySelector('#export-btn').onclick = exportPreset;
}

function renderSliders() {
    const container = panel.querySelector('#sliders');
    container.innerHTML = '';
    settings.sliders.forEach((s, i) => {
        const div = document.createElement('div');
        div.className = 'slider-item';
        div.innerHTML = `
            <span>${s.label}</span>
            <input type="range" min="0" max="100" value="${s.value}">
            <span class="percent">${s.value}%</span>
            <button class="trash-btn">🗑</button>
        `;
        const range = div.querySelector('input');
        range.oninput = () => {
            s.value = +range.value;
            div.querySelector('.percent').textContent = s.value + '%';
        };
        div.querySelector('.trash-btn').onclick = () => {
            if (confirm('Удалить ползунок?')) {
                settings.sliders.splice(i, 1);
                renderSliders();
            }
        };
        container.appendChild(div);
    });
}

function renderNotes() {
    const list = panel.querySelector('#notes-list');
    list.innerHTML = settings.notes.map((note, i) => `
        <div class="note-item">
            ${note}
            <button class="trash-btn" data-i="${i}">🗑</button>
        </div>
    `).join('');
    list.querySelectorAll('.trash-btn').forEach(btn => {
        btn.onclick = () => {
            settings.notes.splice(+btn.dataset.i, 1);
            renderNotes();
        };
    });
}

function addNote() {
    const input = panel.querySelector('#new-note');
    if (input.value.trim()) {
        settings.notes.push(input.value.trim());
        renderNotes();
        input.value = '';
    }
}

function renderRelations() {
    const list = panel.querySelector('#relations-list');
    list.innerHTML = settings.relationships.map((r, i) => `
        <div class="rel-row">
            ${r.char1} → ${r.char2} (${r.type || 'Друзья'} ${r.affinity || 50}%)
            <button class="trash-btn" data-i="${i}">🗑</button>
        </div>
    `).join('');
    // добавь логику изменения процентов позже
}

function addRelation() {
    const char1 = prompt("Имя первого персонажа:");
    const char2 = prompt("Имя второго персонажа:");
    if (char1 && char2) {
        settings.relationships.push({char1, char2, type: 'Друзья', affinity: 50});
        renderRelations();
    }
}

function exportPreset() {
    const data = JSON.stringify(settings, null, 2);
    const blob = new Blob([data], {type: 'application/json'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'cheatmod_preset.json'; a.click();
}

globalThis.cheatmodInterceptor = async function(chat) {
    let instr = '\n[Читмод — СТРОГИЕ инструкции ИИ (выполняй на 100%)]\n';
    settings.sliders.forEach(s => {
        if (s.value > 0) instr += s.template.replace('{{value}}', s.value) + '\n';
    });
    if (settings.notes.length) instr += '\nДополнительные правила:\n' + settings.notes.join('\n') + '\n';
    if (settings.relationships.length) {
        instr += '\nОтношения персонажей:\n';
        settings.relationships.forEach(r => instr += `- ${r.char1} и ${r.char2}: ${r.type} (${r.affinity}%)\n`);
    }
    instr += '[Конец Читмод — соблюдай строго!]\n\n';

    chat.unshift({is_user: false, name: 'System', mes: instr});
};

eventSource.on(event_types.APP_READY, () => {
    createPanel();
    const btn = document.createElement('div');
    btn.textContent = '📊';
    btn.style.cssText = 'position:fixed;bottom:25px;right:25px;width:56px;height:56px;background:linear-gradient(135deg,#ff9500,#ff2d55);color:#fff;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:28px;cursor:pointer;z-index:99999;box-shadow:0 4px 20px rgba(255,149,0,0.6);';
    btn.onclick = () => panel.style.display = panel.style.display === 'block' ? 'none' : 'block';
    document.body.appendChild(btn);
    console.log('✅ Читмод загружен');
});