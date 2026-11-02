(function () {
  try {
    var t = localStorage.getItem('sr-theme');
    var dark = t ? t === 'dark' : window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (dark) document.documentElement.classList.add('dark');
    var l = localStorage.getItem('sr-lang');
    if (l === 'bn' || l === 'en') document.documentElement.lang = l;
  } catch (e) {}
})();
