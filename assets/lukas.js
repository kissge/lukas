//= require jquery
//= require opentip
//= require skillsets

// TODO: 全体的にひどい

$(() => {
    let isEmpty = s => s.replace(/\s/g, '').length == 0;

    let flash = text => $('#txt-flash').text(text).fadeIn().delay(3000).fadeOut();

    Opentip.styles.skillStyle = {
        extends: "dark",    /* design theme */
        target: true,       /* stick to the element, not to cursor */
        tipJoint: "bottom", /* position (above the element) */
        group: "skills",    /* prevent multiple tips from showing at one time */
    };
    Opentip.defaultStyle = 'skillStyle';

    skillsets.forEach((s, i) => {
        let label = $('<label><input type="checkbox" /><span></span></label>');
        // label.data('tooltip', s.description);
        label.find('input').data('id', i);
        label.find('span').text(s.name);
        label.appendTo($('#labels'));
        new Opentip(label, s.description);
    });

    var current = {};

    // ---------------------------------------------------------

    let popup = $('#popup');
    $.extend(popup, {
        edit: false,
        hint: undefined,
        isClosed: () => popup.hasClass('closed'),
        open: () => {
            popup.removeClass('closed');
            $('#txt-body').removeClass('closed');
            popup.find('input[type=checkbox]').trigger('change');
        },
        close: () => {
            popup.addClass('closed');
            $('#txt-body').addClass('closed');
            $('.question-annotations li.editing').removeClass('editing');
            $('#txt-body span.selecting').removeClass('selecting');
        },
        load: (annot, edit) => { // TODO: this function is somewat kimoi
            if ('q' in annot) {
                popup.find('select').val(annot.q);
            }

            if ('skills' in annot) {
                popup.find('input[type=checkbox]').prop('checked', false);
                annot.skills.forEach(i => popup.find('input[type=checkbox]').eq(i).prop('checked', true));
            }

            if ('hint' in annot) {
                $('#txt-preview').html(annot.hint.text + ' [' + annot.hint.start + '&ndash;' + annot.hint.end + ']');
                $('#txt-body span').slice(annot.hint.start_internal, annot.hint.end_internal + 1).addClass('selecting');
                popup.hint = annot.hint;
            }

            if ('note' in annot) {
                popup.find('input[type=text]').val(annot.note);
            }

            if (typeof edit !== 'undefined') {
                popup.edit = edit;
                if (edit) {
                    popup.edit.q = annot.q;
                } else {
                    $('.question-annotations li.editing').removeClass('editing');
                }
                $('#btn-addsave').html(edit ? 'save' : 'add');
                $('#btn-remove').toggle(!!edit);
            }
        },
    });

    $('#txt-body').on('selectstart', e => {
        $('#txt-body span.selecting').removeClass('selecting');
    });

    $('#txt-body').on('mouseup', e => {
        $('#txt-body span.selecting').removeClass('selecting');

        if (window.getSelection().rangeCount == 0) return;

        let range = window.getSelection().getRangeAt(0);

        window.getSelection().removeAllRanges();

        if (isEmpty(range.toString())) return;

        let startNode = $(range.startContainer.parentNode), endNode = $(range.endContainer.parentNode);

        if ($('#txt-body span').index(startNode) > $('#txt-body span').index(endNode)) {
            let t = startNode;
            startNode = endNode;
            endNode = t;
        }

        while (!startNode.hasClass('non-empty') && startNode.next()) startNode = startNode.next();
        while (!endNode.hasClass('non-empty') && endNode.prev()) endNode = endNode.prev();

        let start = $('#txt-body span').index(startNode), end = $('#txt-body span').index(endNode);
        $('#txt-body span').slice(start, end + 1).addClass('selecting');

        let selectedText = $('#txt-body span').slice(start, end + 1).map((_, e) => $(e).text()).get().join('');

        if (isEmpty(selectedText)) return;

        if (selectedText.length > 100) {
            selectedText = selectedText.substr(0, 50) + ' … ' + selectedText.slice(-50);
        }

        if (popup.isClosed()) {
            popup.load({q: $('.question-row').index($('.question-row.active')), skills: [], note: ''}, false);
            popup.open();
        }

        popup.load({hint: {
            text: selectedText,
            start: $('#txt-body span.non-empty').index(startNode),
            end: $('#txt-body span.non-empty').index(endNode),
            start_internal: start,
            end_internal: end,
        }});
    });

    popup.find('input[type=checkbox]').on('change', e => {
        $('#btn-addsave').prop('disabled', popup.find('input[type=checkbox]:checked').length == 0);
    });

    $('#btn-close').on('click', popup.close);

    let annot2li = annot => {
        let li = $('<li><div class="skills-wrapper"></div><div class="hint"></div><div class="note"></div></li>');
        annot.skills.forEach(s => {
            let span = $('<span />');
            span.data('id', s);
            span.text(skillsets[s].name);
            span.appendTo(li.find('.skills-wrapper'));
        });
        li.data('annot', annot);
        li.find('.hint').text(annot.hint.text);
        li.find('.note').text(annot.note);

        return li;
    };

    $('#btn-addsave').on('click', e => {
        let annot = {
            q: +$('#popup select').val(),
            skills: $('#popup input[type=checkbox]:checked').map((_, e) => $(e).data('id')).get(),
            hint: popup.hint,
            note: $('#popup input[type=text]').val(),
        };

        let li = annot2li(annot);

        if (popup.edit && popup.edit.q == annot.q) { // keep position
            $(popup.edit).after(li);
        } else {
            li.appendTo($('.question-row').eq(annot.q).find('ul'));
        }

        if (popup.edit) {
            $(popup.edit).remove();
        }

        save();

        popup.close();
        questions.change(annot.q);
    });

    $('#btn-remove').on('click', e => {
        $(popup.edit).remove();
        save();
        popup.close();
        questions.change();
    });

    let questions = {
        change: q => {
            if (typeof q === 'undefined') {
                q = popup.find('select').val();
            } else {
                popup.load({q: q});
            }

            $('.question-row').removeClass('active');
            $('.question-row').eq(q).addClass('active');

            $('#txt-body span.selected').removeClass('selected');
            $('.question-row').eq(q).find('li')
                .map((_, e) => $(e).data('annot'))
                .each((_, annot) => $('#txt-body span').slice(annot.hint.start_internal, annot.hint.end_internal + 1).addClass('selected'));
        },
    };
    $('#txt-question').on('click', '.question-row', function() {
        return questions.change($('.question-row').index(this));
    });

    popup.on('change', 'select', function() {
        return questions.change();
    });

    $('#txt-question').on('click', '.question-annotations li', function() {
        popup.close();
        $(this).addClass('editing');

        setTimeout(() => {
            popup.load($(this).data('annot'), $(this));
            popup.open();
        }, 300);
    });

    $('#btn-up').on('click', () => $('#dlg-folders').parent().show());

    $('#btn-prev, #btn-next').on('click', function() {
        if (!$(this).hasClass('disabled')) {
            current.document = $(this).data('name');
            open();
        }
    });

    $('.dlg-overlay').on('click', function(e) {
        if (e.target === this) {
            $(this).hide();
        }
    });

    $('.btn-dlg-close').on('click', function() {
        $(this).closest('.dlg-overlay').hide();
    });

    $('#dlg-folders .css-treeview').on('click', 'a', function() {
        current.document = $(this).data('fullpath');
        $('#dlg-open ul li').remove();
        $(this).data('annotations').forEach(e => {
            let li = $('<li><a /> <span /></li>');
            li.find('a').text(e.filename).attr('href', '#');
            li.find('span').text(e.modified);
            li.appendTo($('#dlg-open ul'));
        });
        $('#dlg-open h2').eq(0).text(current.document);
        $('#dlg-open input').val(current.annotation);
        $('#dlg-open').parent().show();
    });

    $('#dlg-open ul').on('click', 'a', function() {
        open($(this).text());

        return false;
    });

    $('#dlg-open form').on('submit', _ => {
        let name = $('#dlg-open input').val();

        if (name.length == 0) {
            flash('Input name');

            return false;
        } else if (/[^-a-zA-Z0-9_.]/.test(name)) {
            flash('Only alphabets, digits, hyphens, underscores, and periods are allowed');

            return false;
        }

        open(name);

        return false;
    });

    let open = name => {
        if (name) {
            current.annotation = name;
        } else {
            name = current.annotation;
        }

        $('#title-bar span').text(current.document + ' / ' + name);
        $.post('/open', current).done(data => {
            $('#txt-body').html(data.body.replace(/(\S+|\s+)/g, '<span>$1</span>'));
            $('#txt-body span').each((_, e) => {
                if (!isEmpty($(e).text())) {
                    $(e).addClass('non-empty');
                }
            });

            $('.question-row').remove();
            $('#popup select option').remove();
            data.questions.forEach((q, i) => {
                let row = $('<section class="question-row">' +
                            '<div class="question-body"></div>' +
                            '<div class="question-annotations"><ul></ul></div>' +
                            '</section>');
                row.find('.question-body').text(q);
                row.appendTo($('#txt-question > section'));

                $('<option value="' + i + '">(Q' + (i + 1) + ') ' + q.split('\n')[0].substr(0, 100) + '...</option>')
                    .appendTo($('#popup select'));
            });

            if (data.annotation) {
                data.annotation.forEach(q => q.forEach(
                    annot => annot2li(annot).appendTo($('.question-row').eq(annot.q).find('ul'))
                ));
            }

            $('#btn-prev').data('name', data.prev).toggleClass('disabled', !data.prev);
            $('#btn-next').data('name', data.next).toggleClass('disabled', !data.next);

            popup.edit = false;
            popup.hint = undefined;
            popup.close();
            questions.change(0);

            $('.dlg-overlay').hide();
        });
    };

    let save = () => {
        $.post('/save', $.extend({
            annotations: JSON.stringify($('.question-annotations').map((_, e) => [
                $(e).find('li').map((_, e) => $(e).data('annot')).get()
            ]).get())
        }, current))
            .fail(_ => flash('Error while saving'));
    };

    $('#dlg-folders .css-treeview').load('/list');
});
