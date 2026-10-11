const previous = '/enseignement';
if (location.pathname === previous || location.pathname.startsWith(`${previous}/`)) {
  location.replace(`/exercices${location.pathname.slice(previous.length)}${location.search}${location.hash}`);
}
