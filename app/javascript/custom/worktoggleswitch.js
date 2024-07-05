console.log('ьлктмщукт');

document.addEventListener('DOMContentLoaded', () => {
  var checkbox = document.getElementById('e');
  var graphicElements = document.querySelectorAll('.W_WorkPicsGraphic');
  var webElements = document.querySelectorAll('.W_WorkPicsWeb');

  function updateDisplay() {
    if (checkbox.checked) {
      graphicElements.forEach(function (element) {
        element.classList.remove('DisplayNone');
      });
      webElements.forEach(function (element) {
        element.classList.add('DisplayNone');
      });
    } else {
      graphicElements.forEach(function (element) {
        element.classList.add('DisplayNone');
      });
      webElements.forEach(function (element) {
        element.classList.remove('DisplayNone');
      });
    }
  }

  checkbox.addEventListener('change', updateDisplay);

  // Initialize the display based on the current state of the checkbox
  updateDisplay();
});
