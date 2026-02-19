export class UIHelpers {
  constructor(cheatModeCore) {
    this.core = cheatModeCore;
    this.initElements();
    this.bindEvents();
  }

  // Инициализация элементов интерфейса
  initElements() {
    this.settingsPanel = document.getElementById('cheatmode-settings');
    this.styleList = document.getElementById('style-settings-list');
    this.phrasesList = document.getElementById('custom-phrases-list');
    this.relationsList = document.getElementById('char-relations-list');
  }

  // Добавление кнопки в меню ST
  addMenuButton() {
    if (window.ui?.addMenuItem) {
      window.ui.addMenuItem({
        label: 'Читмод',
        icon: '🎮',
        onClick: () => this.showSettingsPanel()
      });
    }
  }

  // Отображение панели настроек
  showSettingsPanel() {
    this.settingsPanel.classList.remove('hidden');
    window.ui?.showModal({
      content: this.settingsPanel,
      title: 'Читмод',
      size: 'large'
    });
    this.renderSettings();
  }

  // Отрисовка сохраненных настроек
  renderSettings() {
    this.renderStyleSettings();
    this.renderCustomPhrases();
    this.renderCharRelations();
  }

  // Отрисовка настроек стилей
  renderStyleSettings() {
    this.styleList.innerHTML = '';
    this.core.settings.styleSettings.forEach(setting => {
      const template = document.getElementById('style-setting-template').content.cloneNode(true);
      const labelInput = template.querySelector('.setting-label');
      const slider = template.querySelector('.setting-slider');
      const percent = template.querySelector('.percent');

      labelInput.value = setting.label;
      slider.value = setting.value;
      percent.textContent = `${setting.value}%`;

      slider.addEventListener('input', () => {
        percent.textContent = `${slider.value}%`;
      });

      template.querySelector('.delete-btn').addEventListener('click', (e) => {
        e.target.closest('.setting-row').remove();
      });

      this.styleList.appendChild(template);
    });
  }

  // Отрисовка кастомных фраз
  renderCustomPhrases() {
    this.phrasesList.innerHTML = '';
    this.core.settings.customPhrases.forEach(phrase => {
      const template = document.getElementById('phrase-template').content.cloneNode(true);
      const input = template.querySelector('.phrase-input');
      input.value = phrase.text || '';
      template.querySelector('.delete-btn').addEventListener('click', (e) => {
        e.target.closest('.setting-row').remove();
      });
      this.phrasesList.appendChild(template);
    });
  }

  // Отрисовка отношений персонажей
  renderCharRelations() {
    this.relationsList.innerHTML = '';

    // Собираем уникальный список имён из уже сохранённых отношений
    const names = new Set();
    this.core.settings.charRelations.forEach(r => {
      if (r.from) names.add(r.from);
      if (r.to) names.add(r.to);
    });

    const makeOptions = (selected) => {
      const select = document.createElement('select');
      select.className = 'char-select';
      const empty = document.createElement('option');
      empty.value = '';
      empty.textContent = '--';
      select.appendChild(empty);
      names.forEach(n => {
        const o = document.createElement('option');
        o.value = n;
        o.textContent = n;
        if (n === selected) o.selected = true;
        select.appendChild(o);
      });
      if (selected && !names.has(selected)) {
        const o = document.createElement('option');
        o.value = selected;
        o.textContent = selected;
        o.selected = true;
        select.appendChild(o);
      }
      return select;
    };

    this.core.settings.charRelations.forEach(rel => {
      const template = document.getElementById('relation-template').content.cloneNode(true);
      const row = template.querySelector('.relation-row');
      const leftPlaceholder = row.querySelectorAll('.char-select')[0];
      const rightPlaceholder = row.querySelectorAll('.char-select')[1];

      // Заменяем пустые селекты на наши, чтобы можно было добавить опции
      const left = makeOptions(rel.from || '');
      const right = makeOptions(rel.to || '');
      leftPlaceholder.replaceWith(left);
      rightPlaceholder.replaceWith(right);

      row.querySelector('.delete-btn').addEventListener('click', (e) => {
        e.target.closest('.relation-row').remove();
      });

      this.relationsList.appendChild(row);
    });
  }

  // Привязка событий к кнопкам
  bindEvents() {
    document.getElementById('save-settings').addEventListener('click', () => this.saveCurrentSettings());
    document.getElementById('export-preset').addEventListener('click', () => this.core.exportPreset());
    document.getElementById('add-style-setting').addEventListener('click', () => this.addNewStyleSetting());
    document.getElementById('add-phrase').addEventListener('click', () => this.addNewPhrase());
    document.getElementById('add-relation').addEventListener('click', () => this.addNewRelation());
    document.getElementById('close-settings').addEventListener('click', () => this.closeSettingsPanel());
    const closeX = document.getElementById('cheatmode-close');
    if (closeX) closeX.addEventListener('click', () => this.closeSettingsPanel());
  }

  // Сохранение текущих настроек из интерфейса
  saveCurrentSettings() {
    const styleSettings = [];
    this.styleList.querySelectorAll('.setting-row').forEach(row => {
      const label = row.querySelector('.setting-label')?.value?.trim() || '';
      const value = parseInt(row.querySelector('.setting-slider')?.value || '0', 10);
      if (label) styleSettings.push({ label, value });
    });

    const customPhrases = [];
    this.phrasesList.querySelectorAll('.setting-row').forEach(row => {
      const text = row.querySelector('.phrase-input')?.value?.trim() || '';
      if (text) customPhrases.push({ text });
    });

    const charRelations = [];
    this.relationsList.querySelectorAll('.relation-row').forEach(row => {
      const selects = row.querySelectorAll('.char-select');
      const from = selects[0]?.value || '';
      const to = selects[1]?.value || '';
      if (from || to) charRelations.push({ from, to });
    });

    this.core.settings.styleSettings = styleSettings;
    this.core.settings.customPhrases = customPhrases;
    this.core.settings.charRelations = charRelations;

    this.core.saveSettings();
    this.renderSettings();
  }

  addNewStyleSetting() {
    const template = document.getElementById('style-setting-template').content.cloneNode(true);
    const slider = template.querySelector('.setting-slider');
    const percent = template.querySelector('.percent');
    slider.value = 50;
    percent.textContent = '50%';
    template.querySelector('.delete-btn').addEventListener('click', (e) => {
      e.target.closest('.setting-row').remove();
    });
    this.styleList.appendChild(template);
  }

  addNewPhrase() {
    const template = document.getElementById('phrase-template').content.cloneNode(true);
    template.querySelector('.delete-btn').addEventListener('click', (e) => {
      e.target.closest('.setting-row').remove();
    });
    this.phrasesList.appendChild(template);
  }

  addNewRelation() {
    // Собираем имена для опций
    const names = new Set();
    this.relationsList.querySelectorAll('.relation-row').forEach(r => {
      const s = r.querySelectorAll('.char-select');
      if (s[0]) names.add(s[0].value);
      if (s[1]) names.add(s[1].value);
    });
    this.core.settings.customPhrases.forEach(p => { if (p.text) names.add(p.text); });

    const template = document.getElementById('relation-template').content.cloneNode(true);
    const row = template.querySelector('.relation-row');
    const leftPlaceholder = row.querySelectorAll('.char-select')[0];
    const rightPlaceholder = row.querySelectorAll('.char-select')[1];

    const makeSelect = () => {
      const select = document.createElement('select');
      select.className = 'char-select';
      const empty = document.createElement('option');
      empty.value = '';
      empty.textContent = '--';
      select.appendChild(empty);
      names.forEach(n => {
        if (!n) return;
        const o = document.createElement('option');
        o.value = n;
        o.textContent = n;
        select.appendChild(o);
      });
      return select;
    };

    leftPlaceholder.replaceWith(makeSelect());
    rightPlaceholder.replaceWith(makeSelect());
    row.querySelector('.delete-btn').addEventListener('click', (e) => {
      e.target.closest('.relation-row').remove();
    });
    this.relationsList.appendChild(row);
  }

  closeSettingsPanel() {
    this.settingsPanel.classList.add('hidden');
    if (window.ui?.closeModal) window.ui.closeModal();
  }
}