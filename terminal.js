(() => {
  const input = document.querySelector('#command');
  const form = document.querySelector('#command-form');
  const history = document.querySelector('#history');
  const overview = document.querySelector('#overview');
  const list = document.querySelector('#suggestions');
  const feedback = document.querySelector('#feedback');
  const root = { description: 'Tous les sites', children: {} };
  const descriptions = { cours: 'Cours de MPI et MP2I', exercices: 'Automates, langages et logique', programmation: 'OCaml, C, SQL et environnement de TP' };
  for (const link of document.querySelectorAll('.directories a')) {
    const parts = link.dataset.path.split('/');
    let node = root;
    parts.forEach((name, index) => {
      node.children[name] ??= { description: descriptions[name] || '', children: {} };
      node = node.children[name];
      if (index === parts.length - 1) { node.url = link.href; node.description = link.querySelector('.description').textContent; }
    });
  }
  const commands = ['ls', 'tree', 'cd', 'pwd', 'help', 'man', 'rm', 'cp', 'mv', 'clear'];
  let cwd = [];
  function normalize(path, base = cwd) {
    const parts = path.startsWith('/') || path.startsWith('~') ? [] : [...base];
    for (const part of path.replace(/^~(?=\/|$)/, '').split('/')) {
      if (!part || part === '.') continue;
      if (part === '..') parts.pop(); else parts.push(part);
    }
    return parts;
  }
  function getNode(parts) { return parts.reduce((node, part) => node?.children?.[part], root); }
  function pathText(parts = cwd) { return '~/sites' + (parts.length ? '/' + parts.join('/') : ''); }
  function updatePrompt() {
    form.querySelector('.path').textContent = pathText();
    document.querySelector('h1 span').textContent = '— ' + pathText();
    input.placeholder = cwd.length ? 'cd ' + Object.keys(getNode(cwd).children)[0] : 'cd cours/';
  }
  function siteLink(name, node, parts) {
    const link = document.createElement('a');
    link.href = node.url || '#/' + parts.join('/') + '/';
    const label = document.createElement('span'); label.className = 'directory'; label.textContent = name + (node.url ? '' : '/');
    const description = document.createElement('span'); description.className = 'description'; description.textContent = node.description;
    link.append(label, description);
    if (!node.url) link.addEventListener('click', event => { event.preventDefault(); execute('cd /' + parts.join('/')); });
    return link;
  }
  function showListing(parts = cwd) {
    const node = getNode(parts);
    if (!node) { print('ls : répertoire introuvable.'); return; }
    const nav = document.createElement('nav'); nav.className = 'directories'; nav.setAttribute('aria-label', 'Sites disponibles dans ' + pathText(parts));
    if (node.url) nav.append(siteLink(parts.at(-1), node, parts));
    else for (const [name, child] of Object.entries(node.children)) nav.append(siteLink(name, child, [...parts, name]));
    history.append(nav);
  }
  function showTree(parts = cwd, target = history) {
    const node = getNode(parts);
    if (!node) { print('tree : répertoire introuvable.'); return; }
    const tree = document.createElement('div'); tree.className = 'tree'; tree.setAttribute('aria-label', 'Arborescence de ' + pathText(parts));
    const heading = document.createElement('div'); heading.textContent = pathText(parts); tree.append(heading);
    function visit(parent, parentParts, prefix = '') {
      Object.entries(parent.children).forEach(([name, child], index, children) => {
        const last = index === children.length - 1;
        const row = document.createElement('div'); row.className = 'tree-row';
        const branch = document.createElement('span'); branch.className = 'branch'; branch.textContent = prefix + (last ? '└── ' : '├── ');
        const link = siteLink(name, child, [...parentParts, name]);
        row.append(branch, link); tree.append(row);
        if (!child.url) visit(child, [...parentParts, name], prefix + (last ? '    ' : '│   '));
      });
    }
    if (node.url) tree.append(siteLink(parts.at(-1), node, parts)); else visit(node, parts);
    target.append(tree);
  }
  const entries = ['tree'];
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
    if (cd) {
      const argument = cd[1] || '';
      const slash = argument.lastIndexOf('/');
      const prefix = slash < 0 ? '' : argument.slice(0, slash + 1);
      const fragment = slash < 0 ? argument : argument.slice(slash + 1);
      const parent = getNode(normalize(prefix));
      matches = parent && !parent.url ? Object.entries(parent.children).filter(([name]) => name.startsWith(fragment)).map(([name, node]) => ({ value: `cd ${prefix}${name}${node.url ? '' : '/'}`, name: name + (node.url ? '' : '/'), description: node.description })) : [];
    } else matches = value && !value.includes(' ') ? commands.filter(command => command.startsWith(value) && command !== value).map(command => ({ value: command === 'cd' ? 'cd ' : command, name: command, description: 'commande' })) : [];
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
      option.addEventListener('click', () => { input.value = match.value; closeSuggestions(); input.focus(); if (match.value.startsWith('cd ') && match.value.trim() !== 'cd') execute(match.value); else suggest(); });
      list.append(option);
    }
    list.hidden = false;
    input.setAttribute('aria-expanded', 'true');
    updateSelection();
  }
  function printCommand(value) {
    const line = document.createElement('div'); line.className = 'command-line';
    const prompt = form.querySelector('.prompt').cloneNode(true); prompt.removeAttribute('for'); prompt.querySelector('.sr-only')?.remove();
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
      case 'ls': showListing(args.length ? normalize(args[0]) : cwd); break;
      case 'tree': showTree(args.length ? normalize(args[0]) : cwd); break;
      case 'pwd': print('/sites' + (cwd.length ? '/' + cwd.join('/') : '')); break;
      case 'cd': {
        const parts = normalize(args[0] || '~');
        const node = getNode(parts);
        if (!node || args.length > 1) { print(`cd : ${args.join(' ')} : répertoire introuvable. Un petit tree pour retrouver son chemin ?`); break; }
        if (node.url) { print(`Ouverture de ${parts.at(-1)}…`); location.assign(node.url); break; }
        cwd = parts; window.history.pushState(null, '', '#/' + cwd.join('/') + (cwd.length ? '/' : ''));
        updatePrompt(); showListing(); feedback.textContent = 'Dossier ' + pathText(); break;
      }
      case 'help': print('ls [dossier]       Lister le dossier courant ou un autre dossier.\ntree [dossier]     Afficher toute son arborescence cliquable.\ncd <chemin>        Entrer dans un dossier ou ouvrir un site.\ncd .. / cd /       Remonter / revenir à la racine.\npwd                Afficher le dossier courant.\nTab                Compléter un chemin, même sur plusieurs niveaux.\n↑ / ↓              Choisir une suggestion ; sinon, parcourir l\'historique.\nEntrée             Exécuter ou ouvrir la suggestion sélectionnée.\nÉchap              Fermer les suggestions.\nclear              Effacer le terminal.\nman, rm, cp, mv     À utiliser avec un peu de second degré.'); break;
      case 'rm': print('rm : permission refusée. On ne supprime pas les exercices : ils reviennent au concours.'); break;
      case 'cp': print('cp : copier une solution ne copie pas la compréhension. Pour le reste, Ctrl+C fait très bien son travail.'); break;
      case 'mv': print('mv : déplacer le problème ne le résout pas. Le jury a déjà essayé.'); break;
      case 'man': print(args.length ? `man ${args.join(' ')} : la documentation ne remplace pas la démonstration. Mais help peut vous mettre sur la bonne piste.` : 'MPI(1) — Manuel de survie\n\nNOM\n  mpi — transformer du café en preuves et en programmes.\n\nUTILISATION\n  ls, puis cd <site>. Tab fait le travail répétitif.\n\nBUGS\n  Une solution en O(1) n\'est pas forcément « ne rien faire ».\n\nVOIR AUSSI\n  help, une feuille de brouillon, un peu de sommeil.'); break;
      default: print(`${command} : commande introuvable. Même en MPI, on ne peut pas tout inventer. Essayer help.`);
    }
    input.focus({ preventScroll: true });
    history.scrollTop = history.scrollHeight;
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
    const argument = /^cd\s+(\S+)\s*$/.exec(text);
    const completeSite = argument && getNode(normalize(argument[1]));
    execute(!list.hidden && /^cd(?:\s|$)/.test(text) && (!completeSite || selectedByArrow) ? matches[selected].value : input.value);
  });
  function restorePath() {
    let parts;
    try { parts = normalize(decodeURIComponent(location.hash.slice(1)), []); } catch { parts = []; }
    const node = getNode(parts);
    if (!node || node.url) parts = [];
    if (parts.join('/') === cwd.join('/')) return;
    cwd = parts; updatePrompt(); closeSuggestions(); printCommand('ls'); showListing();
  }
  overview.querySelector('.directories').remove();
  showTree([], overview);
  updatePrompt(); restorePath();
  window.addEventListener('popstate', restorePath);
  window.addEventListener('hashchange', restorePath);
  document.addEventListener('click', event => { if (!form.contains(event.target)) closeSuggestions(); });
})();
