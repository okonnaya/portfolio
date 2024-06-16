console.log('таймер');
document.addEventListener('DOMContentLoaded', function () {
  var deadline = new Date('May 31, 2019 4:24.000+03:00').getTime();
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
    document.getElementById('timer').innerHTML =
      days +
      ' days ' +
      hours +
      ' hours ' +
      minutes +
      ' mins ' +
      seconds +
      ' secs';
    if (distance < 0) {
      clearInterval(x);
      document.getElementById('timer').innerHTML = '0d 0h 0m 0s';
    }
  }, 1000);
});
