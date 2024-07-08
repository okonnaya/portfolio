document.addEventListener('turbo:load', () => {
    const audio = document.querySelector('#audio');
    const playButton = document.querySelector('.button_iframe-play__fuM1Z');
    const likeButton = document.querySelector('.button_iframe-like__ZF7ks');
    const shareButton = document.querySelector('.button_iframe-share__BWEVK');
    const playIcon = document.querySelector('.playIcon');
    const pauseIcon = document.querySelector('.pauseIcon');

    let isPlaying = false;

    if (!audio) return;

    playButton.addEventListener('click', () => {
        console.log('♫');
        if (isPlaying) {
            audio.pause();
            isPlaying = false;
            pauseIcon.style = 'display: none';
            playIcon.removeAttribute('style');
        } else {
            audio.play();
            isPlaying = true;
            playIcon.style = 'display: none';
            pauseIcon.removeAttribute('style');
        }
    })
    likeButton.addEventListener('click', () => {
        document.location = 'https://music.yandex.ru';
    });
    shareButton.addEventListener('click', () => {
        document.location = 'https://music.yandex.ru';
    });
});
