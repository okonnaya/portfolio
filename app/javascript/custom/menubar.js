const TOTAL_MENU_ITEMS = 4;

document.addEventListener('turbo:load', function () {
  let currentLinkIndex;
  var currentPath = window.location.pathname;
  var menuLinks = document.querySelectorAll('.A_MenuLink');
  var mobileMenuLinks = document.querySelector('.O_MenubarMobile .M_MenuLinks');
  var mobileMenuLink = document.querySelector('.O_MenubarMobile .M_MenuLinks > a:first-child');
  var mobileMenuArrow = document.querySelector('.O_MenubarMobile .A_Arrow');

  const applyMargin = () => {
    mobileMenuLink.style.cssText = `margin-top: -${(22 + 30) * (currentLinkIndex ?? 0)}px`;
  };

  menuLinks.forEach(function (link, index) {
    var linkPath = new URL(link.href).pathname;
    if (linkPath === currentPath) {
      link.classList.add('Current');
      currentLinkIndex = index >= TOTAL_MENU_ITEMS ? index - TOTAL_MENU_ITEMS : index;
    }
  });

  applyMargin();

  mobileMenuArrow.addEventListener('click', () => {
    const isCollapsed = mobileMenuLinks.classList.toggle('Collapsed');
    mobileMenuArrow.classList.toggle('Collapsed', isCollapsed)
    if (isCollapsed) {
      applyMargin();
    } else {
      mobileMenuLink.removeAttribute('style')
    }
  });
});
