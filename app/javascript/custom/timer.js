document.addEventListener('turbo:load', function () {
  var timer = document.getElementById('timer');
  if (!timer) return;
  var deadline = Date.UTC(2019, 4, 31, 4, 24) + (3 * 60 * 60 * 1000); 
  var x = setInterval(function () {
    var now = new Date().getTime();
    // now-deadline = count up // deadline-now = count down
    var distance = now - deadline;
    var days = Math.floor(distance / (1000 * 60 * 60 * 24));
    var hours = Math.floor(
      (distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)
    );
    var minutes = Math.floor(
      (distance % (1000 * 60 * 60)) / (1000 * 60)
    );
    var seconds = Math.floor((distance % (1000 * 60)) / 1000);
    timer.innerHTML =
      days +
      ' дней ' +
      hours +
      ' часов ' +
      minutes +
      ' мин ' +
      seconds +
      ' сек';
    if (distance < 0) {
      clearInterval(x);
      timer.innerHTML = '0d 0h 0m 0s';
    }
  }, 1000);
});
