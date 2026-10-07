(() => {
  const input = document.querySelector('#command');
  const form = document.querySelector('#command-form');
  const history = document.querySelector('#history');
  const list = document.querySelector('#suggestions');
  const feedback = document.querySelector('#feedback');
  const directoryTemplate = document.querySelector('.directories').cloneNode(true);
  const sites = [...directoryTemplate.querySelectorAll('a')].map(link => ({ name: link.dataset.name, url: link.href, description: link.querySelector('.description').textContent }));
  const commands = ['ls', 'cd', 'help', 'man', 'rm', 'cp', 'mv', 'clear'];
  const entries = ['ls'];
  let historyIndex = entries.length;
  let draft = '';
  let matches = [];
  let selected = 0;
  let selectedByArrow = false;

  function closeSuggestions() {
    list.hidden = true;
    input.setAttribute('aria-expanded', 'false');
    input.removeAttribute('aria-activedescendant');
  }
  function updateSelection() {
    [...list.children].forEach((option, index) => option.setAttribute('aria-selected', String(index === selected)));
    input.setAttribute('aria-activedescendant', `completion-${selected}`);
  }
  function suggest() {
    const value = input.value.trimStart();
    const cd = /^cd(?:\s+(.*))?$/.exec(value);
    matches = cd ? sites.filter(site => site.name.startsWith((cd[1] || '').replace(/^\.\//, '').replace(/\/$/, ''))).map(site => ({ value: `cd ${site.name}/`, name: `${site.name}/`, description: site.description })) : value && !value.includes(' ') ? commands.filter(command => command.startsWith(value) && command !== value).map(command => ({ value: command === 'cd' ? 'cd ' : command, name: command, description: 'commande' })) : [];
    list.replaceChildren();
    selected = 0;
    selectedByArrow = false;
    if (!matches.length) { closeSuggestions(); return; }
    for (const [index, match] of matches.entries()) {
      const option = document.createElement('div');
      option.id = `completion-${index}`;
      option.className = 'suggestion';
      option.setAttribute('role', 'option');
      const name = document.createElement('span'); name.textContent = match.name;
      const description = document.createElement('small'); description.textContent = match.description;
      option.append(name, description);
      option.addEventListener('mousedown', event => event.preventDefault());
      option.addEventListener('click', () => { input.value = match.value; closeSuggestions(); input.focus(); if (match.value.startsWith('cd ') && match.value.endsWith('/')) execute(match.value); else suggest(); });
      list.append(option);
    }
    list.hidden = false;
    input.setAttribute('aria-expanded', 'true');
    updateSelection();
  }
  function printCommand(value) {
    const line = document.createElement('div'); line.className = 'command-line';
    const prompt = document.querySelector('.prompt').cloneNode(true); prompt.removeAttribute('for'); prompt.querySelector('.sr-only')?.remove();
    const command = document.createElement('span'); command.textContent = value;
    line.append(prompt, command); history.append(line);
  }
  function print(message) {
    const output = document.createElement('p'); output.className = 'output'; output.textContent = message; history.append(output); feedback.textContent = message;
  }
  function execute(value) {
    const text = value.trim();
    if (!text) return;
    entries.push(text); historyIndex = entries.length; draft = '';
    input.value = ''; closeSuggestions();
    const [command, ...args] = text.split(/\s+/);
    if (command === 'clear') { history.replaceChildren(); feedback.textContent = 'Terminal effacé.'; return; }
    printCommand(text);
    switch (command) {
      case 'ls': history.append(directoryTemplate.cloneNode(true)); break;
      case 'cd': {
        const name = (args[0] || '').replace(/^\.\//, '').replace(/\/$/, '');
        if (!name || name === '.' || name === '~' || name === '..' || name === '/') { print('Vous êtes déjà à la racine du savoir. Enfin, du site.'); break; }
        const site = sites.find(site => site.name === name);
        if (!site || args.length > 1) { print(`cd : ${args.join(' ')} : répertoire introuvable. Un petit ls pour retrouver son chemin ?`); break; }
        print(`Ouverture de ${site.name}/…`); location.assign(site.url); break;
      }
      case 'help': print('ls                 Lister les sites (ou cliquer sur un répertoire).\ncd <site>          Ouvrir un site.\nTab                Compléter la commande ou le nom du site.\n↑ / ↓              Choisir une suggestion ; sinon, parcourir l\'historique.\nEntrée             Exécuter ou ouvrir la suggestion sélectionnée.\nÉchap              Fermer les suggestions.\nclear              Effacer le terminal.\nman, rm, cp, mv     À utiliser avec un peu de second degré.'); break;
      case 'rm': print('rm : permission refusée. On ne supprime pas les exercices : ils reviennent au concours.'); break;
      case 'cp': print('cp : copier une solution ne copie pas la compréhension. Pour le reste, Ctrl+C fait très bien son travail.'); break;
      case 'mv': print('mv : déplacer le problème ne le résout pas. Le jury a déjà essayé.'); break;
      case 'man': print(args.length ? `man ${args.join(' ')} : la documentation ne remplace pas la démonstration. Mais help peut vous mettre sur la bonne piste.` : 'MPI(1) — Manuel de survie\n\nNOM\n  mpi — transformer du café en preuves et en programmes.\n\nUTILISATION\n  ls, puis cd <site>. Tab fait le travail répétitif.\n\nBUGS\n  Une solution en O(1) n\'est pas forcément « ne rien faire ».\n\nVOIR AUSSI\n  help, une feuille de brouillon, un peu de sommeil.'); break;
      default: print(`${command} : commande introuvable. Même en MPI, on ne peut pas tout inventer. Essayer help.`);
    }
    input.focus({ preventScroll: true });
    form.scrollIntoView({ block: 'nearest', behavior: 'instant' });
  }
  input.addEventListener('input', suggest);
  input.addEventListener('keydown', event => {
    if (event.key === 'Escape') { closeSuggestions(); return; }
    if (event.key === 'Tab' && !event.shiftKey) {
      if (list.hidden) suggest();
      if (!list.hidden) { event.preventDefault(); input.value = matches[selected].value; suggest(); }
      return;
    }
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      const direction = event.key === 'ArrowDown' ? 1 : -1;
      if (!list.hidden) { selected = (selected + direction + matches.length) % matches.length; selectedByArrow = true; updateSelection(); return; }
      if (historyIndex === entries.length) draft = input.value;
      historyIndex = Math.max(0, Math.min(entries.length, historyIndex + direction));
      input.value = historyIndex === entries.length ? draft : entries[historyIndex];
      input.setSelectionRange(input.value.length, input.value.length);
    }
  });
  form.addEventListener('submit', event => {
    event.preventDefault();
    const text = input.value.trim();
    // Preserve explicit commands; use the selected site only while choosing a directory.
    const completeSite = sites.some(site => text === `cd ${site.name}` || text === `cd ${site.name}/`);
    execute(!list.hidden && /^cd(?:\s|$)/.test(text) && (!completeSite || selectedByArrow) ? matches[selected].value : input.value);
  });
  document.addEventListener('click', event => { if (!form.contains(event.target)) closeSuggestions(); });
})();
