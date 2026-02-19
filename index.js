const MODULE_NAME = 'cheatmod';
const { eventSource, event_types, extensionSettings, saveSettingsDebounced, renderExtensionTemplateAsync } = SillyTavern.getContext();

let currentSettings = {};

function getDefaultSettings() {
    return {
        enabled: true,
        sliders: {
            "Повествование в стиле писателя Ли Чайлд": 60,
            "Развитие сюжета в стиле писателя Роберт Ладлэм": 40,
            "Написание диалогов в стиле писателя Элмор Леонард": 40,
            "Реалистичность действий и последствий": 80,
            "Напряжение и саспенс в сценах": 70,
            "Натуралистичность жестокости (Gore)": 40,
            "Темп развития событий": 70,
            "Подробные описания физических ощущений": 60,
            "Использовать в тексте слова: озон": 0,
            "Мат в диалогах": 20
        },
        notes: ["Да, тут пишешь что угодно. Небо всегда зеленое, слоп всегда отборный!"],
        relationships: []  // [{char1: "Барб Уайр", char2: "Адам Смэшер", type: "Друзья", affinity: 50}]
    };
}

async function loadPanel() {
    try {
        const html = await renderExtensionTemplateAsync(MODULE_NAME, 'template');
        $('body').append(html);
        initPanel();
        console.log('✅ Читмод v1.0 загружен');
    } catch (e) {
        console.error('CheatMod load error:', e);
    }
}

function initPanel() {
    currentSettings = extensionSettings[MODULE_NAME] || getDefaultSettings();
    if (!extensionSettings[MODULE_NAME]) extensionSettings[MODULE_NAME] = currentSettings;

    renderSliders();
    renderNotes();
    renderRelationships();

    // Плавающая кнопка
    const floatBtn = $('<div id="cheatmod-float-btn">📊</div>').css({
        position: 'fixed', bottom: '25px', right: '25px', width: '56px', height: '56px',
        background: 'linear-gradient(135deg, #ff9500, #ff2d55)', color: '#fff',
        borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '28px', cursor: 'pointer', zIndex: 99999, boxShadow: '0 4px 20px rgba(255,149,0,0.6)'
    }).on('click', () => $('#cheatmod-panel').toggle());
    $('body').append(floatBtn);

    $('#cheatmod-save').on('click', saveAll);
    $('#cheatmod-close, #cheatmod-x').on('click', () => $('#cheatmod-panel').hide());
    $('#add-note-btn').on('click', addNote);
    $('#add-relationship-btn').on('click', addRelationship);
}

function renderSliders() {
    $('.slider-item').each(function() {
        const label = $(this).find('span:first').text().trim();
        const slider = $(this).find('input[type=range]');
        const percent = $(this).find('.percent');
        const val = currentSettings.sliders[label] !== undefined ? currentSettings.sliders[label] : 50;
        slider.val(val);
        percent.text(val + '%');
        slider.on('input', () => {
            currentSettings.sliders[label] = parseInt(slider.val());
            percent.text(slider.val() + '%');
        });
    });
}

function renderNotes() {
    const container = $('#notes-list');
    container.empty();
    currentSettings.notes.forEach((note, i) => {
        const div = $(`<div class="note-item"><span>${note}</span><button class="trash-btn">🗑</button></div>`);
        div.find('.trash-btn').on('click', () => {
            currentSettings.notes.splice(i, 1);
            renderNotes();
        });
        container.append(div);
    });
}

function addNote() {
    const input = $('#new-note').val().trim();
    if (input) {
        currentSettings.notes.push(input);
        $('#new-note').val('');
        renderNotes();
    }
}

function renderRelationships() {
    const container = $('#relationships-list');
    container.empty();
    currentSettings.relationships.forEach((rel, i) => {
        const div = $(`
            <div class="relationship-row">
                <span>${rel.char1}</span> → <span>${rel.char2}</span>
                <select class="rel-type"><option>Друзья</option><option>Враги</option><option>Любовники</option><option>Незнакомцы</option></select>
                <input type="range" min="0" max="100" value="${rel.affinity}">
                <span class="percent">${rel.affinity}%</span>
                <button class="trash-btn">🗑</button>
            </div>`);
        div.find('select').val(rel.type);
        div.find('input[type=range]').on('input', function() {
            rel.affinity = parseInt(this.value);
            $(this).siblings('.percent').text(this.value + '%');
        });
        div.find('select').on('change', () => rel.type = $(this).val());
        div.find('.trash-btn').on('click', () => {
            currentSettings.relationships.splice(i, 1);
            renderRelationships();
        });
        container.append(div);
    });
}

function addRelationship() {
    const char1 = prompt("Имя первого персонажа:");
    const char2 = prompt("Имя второго персонажа:");
    if (char1 && char2) {
        currentSettings.relationships.push({char1, char2, type: "Друзья", affinity: 50});
        renderRelationships();
    }
}

function saveAll() {
    extensionSettings[MODULE_NAME] = currentSettings;
    saveSettingsDebounced();
    toastr.success('✅ Читмод сохранён! Теперь влияет на все генерации');
    $('#cheatmod-panel').hide();
}

// ====================== INTERCEPTOR (главная магия) ======================
globalThis.cheatmodInterceptor = async function(chat, contextSize, abort, type) {
    if (!currentSettings.enabled || !currentSettings) return;

    let prompt = `\n\n[Читмод — строгие инструкции для ИИ (следуй на 100%):]\n`;

    // Ползунки
    prompt += "Стиль повествования:\n";
    for (const [label, value] of Object.entries(currentSettings.sliders)) {
        if (value > 0) prompt += `- ${label}: ${value}%\n`;
    }

    // Заметки
    if (currentSettings.notes.length) {
        prompt += "\nДополнительные жёсткие правила:\n";
        currentSettings.notes.forEach(n => prompt += `- ${n}\n`);
    }

    // Отношения
    if (currentSettings.relationships.length) {
        prompt += "\nОтношения персонажей (учитывай при генерации):\n";
        currentSettings.relationships.forEach(r => {
            prompt += `- ${r.char1} и ${r.char2}: ${r.type} (${r.affinity}%)\n`;
        });
    }

    prompt += "\n[Конец Читмод инструкций — строго соблюдай!]\n\n";

    // Добавляем в начало последнего системного сообщения или создаём новое
    const systemMsgIndex = chat.findIndex(m => !m.is_user && m.mes.includes("System"));
    if (systemMsgIndex !== -1) {
        chat[systemMsgIndex].mes += prompt;
    } else {
        chat.unshift({
            is_user: false,
            name: "System",
            mes: prompt,
            send_date: Date.now()
        });
    }
};

eventSource.on(event_types.APP_READY, loadPanel);