function resize() {
    $('.main').width($(window).width() - 280);
}

$(window).resize(function () {
    resize();
});

$(document).ready(function () {
    resize();
});
