export class CheatModeCore {
  constructor() {
    this.settings = this.loadSettings();
  }

  // Загрузка настроек из локального хранилища
  loadSettings() {
    const saved = localStorage.getItem('CheatModeSettings');
    return saved ? JSON.parse(saved) : {
      styleSettings: [],
      customPhrases: [],
      charRelations: []
    };
  }

  // Сохранение настроек
  saveSettings() {
    localStorage.setItem('CheatModeSettings', JSON.stringify(this.settings));
    this.showNotification('Настройки сохранены!', 'success');
  }

  // Экспорт пресета
  exportPreset() {
    const preset = JSON.stringify(this.settings, null, 2);
    const blob = new Blob([preset], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'cheatmode-preset.json';
    a.click();
    URL.revokeObjectURL(url);
  }

  // Добавление настроек в промпт ST
  modifyPrompt(prompt) {
    // Добавляем стили в промпт
    const stylePrompts = this.settings.styleSettings
      .filter(s => s.value > 0)
      .map(s => `${s.label}: ${s.value}%`)
      .join(', ');
    if (stylePrompts) prompt.parts.unshift(`[Стиль: ${stylePrompts}]`);

    // Добавляем кастомные фразы
    this.settings.customPhrases.forEach(p => {
      if (p.text) prompt.parts.unshift(p.text);
    });

    return prompt;
  }

  // Инициализация хуков ST
  initPromptHooks() {
    if (window.api?.hooks?.beforePromptGeneration) {
      window.api.hooks.beforePromptGeneration.add((prompt) => this.modifyPrompt(prompt));
    }
  }

  // Уведомление пользователю
  showNotification(text, type = 'info') {
    if (window.ui?.notify) {
      window.ui.notify(text, type);
    } else {
      alert(text);
    }
  }
}