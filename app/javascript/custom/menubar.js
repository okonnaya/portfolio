document.addEventListener('turbo:load', function () {
  var currentPath = window.location.pathname;
  var menuLinks = document.querySelectorAll('.A_MenuLink');

  menuLinks.forEach(function (link) {
    var linkPath = new URL(link.href).pathname;
    if (linkPath === currentPath) {
      link.classList.add('Current');
    }
  });
});
