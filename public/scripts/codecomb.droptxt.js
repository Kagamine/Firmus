var lock = false;
(function($){
    $.fn.droptxt = function(url, field){
        var selector = this.selector;
        this.attr('autocomplete', 'Off');
        var txt = this;
        this.on('keyup', function () {
            if (lock) return;
            lock = true;
            var args = {};
            args[field] = txt.val();
            $('.codecomb-droptxt-outer').remove();
            $.getJSON(url, args, function (data) {
                var html = '<div class="codecomb-droptxt-outer" data-parent="' + selector + '">';
                for (var i = 0; i < data.length; i++) {
                    html += '<div class="codecomb-droptxt-item" onclick="$(\'' + selector + '\').val($(this).text()); $(\'.codecomb-droptxt-outer\').remove()">' + data[i] + '</div>'
                }
                html += '</div>';
                var dom = $(html);
                $('body').prepend(dom);
                dom.css('top', (txt.offset().top + txt.outerHeight()) + 'px');
                dom.css('left', txt.offset().left);
                dom.outerWidth(txt.outerWidth());
                lock = false;
            });
        });
        $(document).on('click', function (e) {
            if ($(e).hasClass('codecomb-droptxt-outer')) return;
            if ($(e).parent('.codecomb-droptxt-outer').length > 0) return;
            $('div[data-parent="' + selector + '"]').slideUp(200);
            setTimeout(function () {
                $('div[data-parent="' + selector + '"]').remove();
            }, 300);
        });
    }
})(jQuery)