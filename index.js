import { CheatModeCore } from './src/cheatmode-core.js';
import { UIHelpers } from './src/ui-helpers.js';

// Инициализация расширения при загрузке ST
document.addEventListener('DOMContentLoaded', () => {
  const cheatMode = new CheatModeCore();
  const ui = new UIHelpers(cheatMode);

  // Добавляем кнопку в меню ST
  ui.addMenuButton();

  // Подключаем хуки для работы с промптом
  cheatMode.initPromptHooks();
});