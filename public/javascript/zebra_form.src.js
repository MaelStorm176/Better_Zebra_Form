/**
 *  Zebra_Form
 *
 *  Client-side validation for Zebra_Form
 *
 *  Visit {@link http://stefangabos.ro/php-libraries/zebra-form/} for more information.
 *
 *  For more resources visit {@link http://stefangabos.ro/}
 *
 *  @author     Stefan Gabos <contact@stefangabos.ro>
 *  @version    2.9.8 (last revision: June 19, 2017)
 *  @copyright  (c) 2011 - 2017 Stefan Gabos
 *  @license    http://www.gnu.org/licenses/lgpl-3.0.txt GNU LESSER GENERAL PUBLIC LICENSE
 *  @package    Zebra_Form
 */
(function($) {

    $.Zebra_Form = function(element, options) {

        /**
                 *  Checks if all the conditions set by the "dependencies" rule are met or not.
                 *
                 *  @param  element {string}     The ID of the element to check.
                 *
                 *  @param  referer {Array}     (Private) Used by the library to prevent entering an infinite loop of dependencies.
                 *
                 *  @return boolean             Returns TRUE if all the conditions are met or FALSE otherwise.
                 *
                 *  @access private
                 */
        const _validate_dependencies = function(element, referer) {

            // if referer is not available, initialize it now
            if (undefined === referer) referer = [];

            // if there are more than 2 entries in the referer array, remove the first one
            if (referer.length > 2) referer.shift();

            // if current element is the referer array
            if ($.inArray(element, referer) > -1)

                // we're having a recursion and we're stopping execution
                throw new Error('Infinite recursion detected. The loop of dependencies is created by the following elements: "' + referer.join('", "') + '"');

            // add current element to the stack
            referer.push(element);

            // get all the conditions needed to validate the element
            let conditions = plugin.settings.validation_rules[element]['dependencies'];

            // if the name of a callback function is also given
            // the actual conditions are in the first entry of the array
            if (typeof conditions[1] == 'string') conditions = conditions[0];

            let result = true;

            // iterate through the elements the validation of the current element depends on (proxies)
            for (const proxy in conditions) {

                // if we have a cached result of the result
                if (undefined !== proxies_cache[proxy] && undefined !== proxies_cache[proxy][conditions[proxy]])

                    // get the result from cache
                    result = proxies_cache[proxy][conditions[proxy]];

                // if we don't have a cached result of the result
                else {

                    // if proxy also depends on another condition
                    if (undefined !== plugin.settings.validation_rules[proxy] && undefined !== plugin.settings.validation_rules[proxy]['dependencies'])

                        // check recursively that the conditions of all parents are met
                        result = _validate_dependencies(proxy, referer);

                    // continue if the conditions of all parents (if any) are met
                    if (result) {

                        // for each proxy/value combination there's a stored function
                        // for the function's name we use a special array-to-string method
                        const function_name = _toString(conditions[proxy]);

                        // if proxy is not an existing element or any of the condition is not met, flag that
                        if (!proxies[proxy] || !proxies[proxy]['conditions'][function_name]()) result = false;

                    }

                    // cache the result
                    if (undefined === proxies_cache[proxy]) proxies_cache[proxy] = {};
                    if (undefined === proxies_cache[proxy][conditions[proxy]]) proxies_cache[proxy][conditions[proxy]] = result;

                }

                // if there's a problem, don't check any furhter
                if (!result) break;

            }

            // if not all conditions are met, don't validate further
            return result;

        };
        /**
                 *  Returns an element's type
                 *
                 *  @param  $element {jQuery} A jQuery element for which to identify the type.
                 *
                 *  @return string          Returns an element's type.
                 *
                 *                          Possible values are:
                 *
                 *                          button,
                 *                          checkbox,
                 *                          file,
                 *                          password,
                 *                          radio,
                 *                          submit,
                 *                          text,
                 *                          select-one,
                 *                          select-multiple,
                 *                          textarea
                 *
                 *  @access private
                 */
        const _type = function($element) {

            // values that may be returned by the is() function
            const types = [
                'button',
                'input:checkbox',
                'input:file',
                'input:image',
                'input:password',
                'input:radio',
                'input:submit',
                'input:text',
                'select',
                'textarea'
            ];
            const html5_types = [
                'email',
                'number'
            ];

            // because elements of type "email" and "number" were not yet added to jQuery (as of jQuery 1.11.1)
            // we'll test for those separately

            // iterate through the possible types
            for (let index in html5_types)

                // if we found the element's type to be one of those, treate element as input type="text"
                if ($element.attr('type') && $element.attr('type').toLowerCase() === html5_types[index]) return 'text';

            // iterate through the possible types
            for (let index in types)

                // if we have an element's type
                if ($element.is(types[index])) {

                    // if type is "select"
                    if (types[index] === 'select') {

                        // if the "multiple" attribute is set
                        if ($element.attr('multiple')) return 'select-multiple';

                        // if the "multiple" attribute is not set
                        else return 'select-one';

                    }

                    // return the element's type, from which we remove the "input:" string
                    return types[index].replace(/input\:/, '');

                }

        };
        /**
                 *  Returns the string representation of an array; used by the "dependencies" rule.
                 *
                 *  @param  array   array   The array for which to create the string representation.
                 *
                 *  @return string  Returns the string representation of the array given as argument.
                 *
                 *  @access private
                 */
        const _toString = function(array) {

            // if argument is not an array, return the argument
            if (!$.isArray(array)) return array;

            let result = '';

            // iterate through the entries in the array
            $.each(array, function(index) {

                let value = array[index];

                // if entry is also an array, call this method recursively
                // and place it inside some special characters
                if ($.isArray(value)) value = '|' + _toString(value) + '|';

                // build the string
                result += (result !== '' ? '' : '') + value;

            });

            // return the resulting string
            return result;

        };
        /**
                 *  Shows or hides, as necessary, the "other" options for a "select" control, that has an "other" option set.
                 *
                 *  @param  jQuery      $element    A  <select> element having the "other" property set.
                 *
                 *  @return void
                 *
                 *  @access private
                 */
        const _show_hide_other_option = function($element) {

            // reference to the "other option" text box
            // it has the ID of the select control, suffixed by "_other"
            const $other = $('#' + $element.attr('id') + '_other');

            // if the select control's value is "other"
            // show the "other option" text box
            if ($element.val() === 'other') $other.css('display', 'block');

            // if the select control's value is different than "other"
            // hide the "other option" text box
            else $other.css('display', 'none');

        };
        /**
                 *  Generates an iFrame shim in Internet Explorer 6 so that the tooltips appear above select boxes.
                 *
                 *  @return void
                 *
                 *  @access private
                 */
        const _shim = function($element) {

            // this is necessary only if browser is Internet Explorer 6
    		if (browser.name === 'explorer' && browser.version == 6) {

                // if an iFrame was not yet attached to the element
                if (!$element.data('shim')) {

                    const // get element's top and left position
                        offset = $element.offset(),

                        // the iFrame has to have the element's zIndex minus 1
                        zIndex = parseInt($element.css('zIndex'), 10) - 1,

                        // create the iFrame
                        shim = jQuery('<iframe>', {
                            'src': 'javascript:document.write("")',
                            'scrolling': 'no',
                            'frameborder': 0,
                            'allowTransparency': 'true',
                            'class': 'Zebra_Form_error_iFrameShim',
                            'css': {
                                'zIndex': zIndex,
                                'position': 'absolute',
                                'top': offset.top,
                                'left': offset.left,
                                'width': $element.outerWidth(),
                                'height': $element.outerHeight(),
                                'filter': 'progid:DXImageTransform.Microsoft.Alpha(opacity=0)',
                                'display': 'block'
                            }
                        });

                    // inject iFrame into DOM
                    $('body').append(shim);

                    // attach the shim to the element
                    $element.data('shim', shim);

                }

            }

        };
        /**
                 *  Computes the difference between a string's length when computed by PHP and by JavaScript.
                 *
                 *  In PHP new line characters have 2 bytes! Read more at
                 *  http://www.sitepoint.com/line-endings-in-javascript/ and at
                 *  http://drupal.org/node/1267802
                 *
                 *  @return integer    Returns the difference in length between a string as computed by PHP and by JavaScript.
                 *
                 *  @access private
                 */
        const _maxlength_diff = function(el) {

            const // get the value in the textarea, if any
                str = el.val(),

                // get the length as computed by JavaScript
                len1 = str.length,

                // get the length as computed by PHP
                len2 = str.replace(/(\r\n|\r|\n)/g, "\r\n").length;

            // return the difference in length
            return len2 - len1;

        };
        /**
                 *  Gets the cursor's position in a text element.
                 *
                 *  Used by the filter_input method.
                 *
                 *  @param  object  element     A DOM element
                 *
                 *  @return integer             Returns the cursor's position in a text or textarea element.
                 *
                 *  @access private
                 */
        const _get_caret_position = function(element) {

            // if selectionStart function exists, return the cursor's position
            // (this is available for most browsers except IE < 9)
    		if (element.selectionStart != null) return element.selectionStart;

            // for IE < 9
            const range = document.selection.createRange();
            const duplicate = range.duplicate();

            // if element is a textbox, return the cursor's position
    		if (element.type === 'text') return (0 - duplicate.moveStart('character', -100000));

            // if element is a textarea
    		else {

                // do some computations...
                const value = element.value;
                const offset = value.length;

                duplicate.moveToElementText(element);
    			duplicate.setEndPoint('StartToStart', range);

                // return the cursor's position
    			return offset - duplicate.text.length;

            }

        };
        /**
                 *  Escapes special characters in a string, preparing it for use in a regular expression.
                 *
                 *  @param  string  str     The string in which special characters should be escaped.
                 *
                 *  @return string          Returns the string with escaped special characters.
                 *
                 *  @access private
                 */
        const _escape_regexp = function(str) {

		  return str.replace(/([-.*+?^${}()|[\]\/\\])/g, '\\$1');

        };
        /**
                 *  Continuously checks for value updates on fields having placeholders.
                 *
                 *  We needs this so that we can hide the placeholders when the fields are updated by the browsers' auto-complete
                 *  feature.
                 *
                 *  @access private
                 */
        const _check_values = function() {

            // iterate through the elements that have placeholders
            $.each(placeholders, function() {

                // reference to the jQuery version of the element
                const $element = $(this);

                // reference to the placeholder element
                const $placeholder = $element.data('Zebra_Form_Placeholder');

                // if element has no value and it doesn't have the focus, display the placeholder
                if ($element.val() === '' && !$element.is(':focus')) $placeholder.show();

                // otherwise, hide the placeholder
                else $placeholder.hide();

            });

        };
        const plugin = this;

        // public properties
        const defaults = {
            scroll_to_error: true,
            tips_position: 'left',
            close_tips: true,
            validate_on_the_fly: false,
            validate_all: false,
            assets_path: null
        };

        plugin.settings = {}

        // private properties
        let validation_rules = {},
            controls_groups = {},
            error_blocks = {},
            placeholders = [],
            proxies = {},
            proxies_cache = {},
            reload = false, validated = false, browser, elements;

        // the jQuery version of the element
        // "form" (without the $) will point to the DOM element
        const $form = $(element), form = element;

        // code by Joyce Babu
        // found at http://www.weberdev.com/get_example-4437.html
        plugin.filter_input = function(filter_type, evt, custom_chars) {
            let key_code, key, control, filter = '';
            const alphabet = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
            const digits = '0123456789';
            if (window.event) {
                key_code = window.event.keyCode;
                evt = window.event;
            } else if (evt)
                key_code = evt.which;
            else
                return true;
            switch (filter_type) {
                case 'alphabet':
                    filter = alphabet;
                    break;
                case 'digits':
                case 'number':
                case 'float':
                    filter = digits;
                    break;
                case 'alphanumeric':
                    filter = alphabet + digits;
                    break;
                default:
                    return true;
            }
            if (custom_chars) { filter += custom_chars }
            control = evt.srcElement ? evt.srcElement : evt.target || evt.currentTarget;
            if (key_code==null || key_code==0 || key_code==8 || key_code==9 || key_code==13 || key_code==27) return true;
            key = String.fromCharCode(key_code);
            if ((key==='v' || key==='a' || key==='c' || key==='x') && evt.ctrlKey) return true;
            if (filter.indexOf(key) > -1) return true;
            if (filter_type === 'number' && key === '-' && _get_caret_position(control) === 0) return true;
            return filter_type === 'float' && ((key === '-' && _get_caret_position(control) === 0) || (key === '.' && _get_caret_position(control) !== 0 && control.value.match(/\./) == null));

        }

        /**
         *  Constructor method
         *
         *  @return void
         */
        plugin.init = function() {

            plugin.settings = $.extend({}, defaults, options);

            // find all dummy options and remove them from the DOM
            // we need them"dummy options" to create valid HTML/XHTML output because empty option groups are not
            // allowed; unfortunately, IE does not support neither the "disabled" attribute nor styling these
            // empty options so we need to remove them from the DOM
            $form.find('option.dummy').remove();

            // find any error blocks generated by the server-side script and iterate through them
            $('div.error', $form).each(function() {

                // attach a function to the error block's "close" button
                $('div.close a', $(this)).bind('click', function(e) {

                    e.preventDefault();

                    // morph the error block's height and opacity to 0
                    $(this).closest('div.error').animate({

                        'height'    : 0,
                        'opacity'   : 0

                    }, 250, function() {

                        // remove from DOM when done
                        $(this).remove();

                    });

                });

            });

            // get all the form's elements
            elements = $('.control', $form);

            // iterate through the form's elements
            elements.each(function() {


                const character_counter = jQuery('<div>', {
                    'class': 'Zebra_Character_Counter',
                    'css':  {
                        'visibility':   'hidden'
                    }
                })

                // use as initial content the value of maxlength attribute
                // to get the element's width
                .html(element.data('maxlength'))

                // inject it into the DOM right after the textarea element
                // (we need to do this so we can get its width and height)
                .insertAfter(element);
// create a text element that will float above the element until the the parent element receives the focus
                let placeholder;
                let position;
                let element = $(this),

                    // get some attributes of the element
                    attributes = {'id': element.attr('id'), 'name': element.attr('name'), 'type': _type(element)},

                    // in order to highlight the row that the element is in
                    // get the parent element having the "row" class set
                    parent = element.closest('.row');

                // if element also has the "name" attribute
                // (some plugins copy the original element's classes and Zebra_Form will falsely belive they are form elements
                // once it gets to them)
                if (undefined !== attributes['name'])

                    // sanitize element's name by removing square brackets (if available)
                    attributes['name'] = attributes['name'].replace(/[\[\]]/g, '');

                if (

                    // if element has the "inside" class set
                    // meaning that the element's label needs to be shown inside the element, until the element receives focus
                    (element.hasClass('inside') && (

                        // the class is applied to an allowed element type
                        attributes['type'] === 'text' ||
                        attributes['type'] === 'password' ||
                        attributes['type'] === 'textarea'

                    )) ||

                    // or element has a character counter attached
                    element.hasClass('show-character-counter') ||

                    // element is "text" or "password" and has the "prefix" data attribute set
                    ((attributes['type'] === 'text' || attributes['type'] === 'password') && element.data('prefix'))


                ) {

                    // we create a wrapper for the parent element so that we can later position the
                    // placeholder, prefix or characer counter
                    // also, make sure the wrapper inherits some important css properties of the parent element
                    const element_wrapper = jQuery('<span class="Zebra_Form_Wrapper"></span>').css({
                        'display': element.css('display'),
                        'position': element.css('position') === 'static' ? 'relative' : element.css('position'),
                        'float': element.css('float'),
                        'top': element.css('top'),
                        'right': element.css('right'),
                        'bottom': element.css('bottom'),
                        'left': element.css('left')
                    });

                    // replace the parent element with the wrapper and then place it inside the wrapper
                    // also, make sure we set some important css properties for it
                    element = element.replaceWith(element_wrapper).css({
                        'position': 'relative',
                        'top':      'auto',
                        'right':    'auto',
                        'bottom':   'auto',
                        'left':     'auto'
                    }).appendTo(element_wrapper);

                }

                // if a parent element having the "row" class exists
                if (parent.length)

                    // bind these events to the element
                    element.bind({

                        // when the element receives focus
                        // add the "highlight" class to the parent element
                        'focus':    function() { parent.addClass('highlight') },

                        // when the element receives focus
                        // remove the "highlight" class from the parent element
                        'blur':     function() { parent.removeClass('highlight') }

                    });

                if (

                    // if element has the "inside" class set
                    // meaning that the element's label needs to be shown inside the element, until the element receives focus
                    element.hasClass('inside') && (

                        // the class is applied to an allowed element type
                        attributes['type'] === 'text' ||
                        attributes['type'] === 'password' ||
                        attributes['type'] === 'textarea'

                    )

                ) {

                    // get element's offset relative to the first positioned parent element
                    position = element.position();

                    // if element is a text box or a password
                    if (attributes['type'] === 'text' || attributes['type'] === 'password') {
                        placeholder = jQuery('<input>').attr({
                            'type':         'text',
                            'class':        'Zebra_Form_Placeholder',
                            'autocomplete': 'off',
                            'value':        element.attr('title')
                        });
                    }

                    // if element is a textarea
                    else

                        // create a textarea element that will float above the element until the parent element receives the focus
                        {
                            placeholder = jQuery('<textarea>').attr({
                                'class': 'Zebra_Form_Placeholder',
                                'autocomplete': 'off'
                            }).html(element.attr('title'));
                        }

                    // if element is a password field
                    if (attributes['type'] === 'password')

                        // temporarily set the font family to "inherit" so that the placeholder's font will be the
                        // same everywhere
                        element.css('fontFamily', 'inherit');

                    // position the placeholder right above the element
                    // and clone the parent element's styles
                    placeholder.css({
                        'fontFamily':       element.css('fontFamily'),
                        'fontSize':         element.css('fontSize'),
                        'fontStyle':        element.css('fontStyle'),
                        'fontWeight':       element.css('fontWeight'),
                        'left':             position.left,
                        'top':              position.top,
                        'width':            parseInt(element.css('width'), 10) + (parseInt(element.css('borderLeftWidth'), 10) || 0) + (parseInt(element.css('borderRightWidth'), 10) || 0),
                        'height':           parseInt(element.css('height'), 10) + (parseInt(element.css('borderTopWidth'), 10) || 0) + (parseInt(element.css('borderBottomWidth'), 10) || 0),
                        'paddingTop':       parseInt(element.css('paddingTop'), 10) || 0,
                        'paddingRight':     parseInt(element.css('paddingRight'), 10) || 0,
                        'paddingBottom':    parseInt(element.css('paddingBottom'), 10) || 0,
                        'paddingLeft':      parseInt(element.css('paddingLeft'), 10) || 0,
                        'marginTop':        parseInt(element.css('marginTop'), 10) || 0,
                        'marginRight':      parseInt(element.css('marginRight'), 10) || 0,
                        'marginBottom':     parseInt(element.css('marginBottom'), 10) || 0,
                        'marginLeft':       parseInt(element.css('marginLeft'), 10) || 0
                    })

                    // inject the placeholder into the DOM
                    .insertAfter(element).hide();

                    // remove the title attribute on textareas (which was used to store the placeholder's text)
                    element.removeAttr('title');

                    // when the placeholder receives focus
                    placeholder.bind('focus', function() {

                        // pass focus to the element
                        element.focus();

                    });

                    element.bind({

                        // hide the placeholder when the element receives focus
                        'focus':    function() {
                            placeholder.hide();
                        },

                        // if element loses focus but it's empty, show the placeholder
                        'blur':     function() { if ($(this).val() === '') placeholder.show() }

                    });

                    // cache the placeholder element
                    element.data('Zebra_Form_Placeholder', placeholder);

                    // cache the elements having a placeholder
                    placeholders.push(element);

                    // set the password field's font family back to this so that the discs will look the same on all browsers
                    // WebKit browsers (Chrome & Safari) seem to get it wrong for password fields when using various
                    // font families, and display really small dots instead of the discs that appear for every other browser
                    if (attributes['type'] === 'password')

                        element.css({
                            'fontFamily': 'Verdana, Tahoma, Arial'
                        });

                // if element has the "other" class set and element is a drop-down
                } else if (element.hasClass('other') && attributes['type'] === 'select-one') {

                    // run this private method that shows/hides the "other" text box depending on the selection
                    _show_hide_other_option(element);

                    // whenever the drop-down's value is changed
                    element.change(function() {

                        // run this private method that shows/hides the "other" text box depending on the selection
                        _show_hide_other_option(element);

                    });

                }

                // if there are any validation rules set for this element (the extra check is for time controls)
                if ('undefined' != typeof plugin.settings.validation_rules[attributes['name']] || 'undefined' != typeof plugin.settings.validation_rules[attributes['name'].replace(/\_(hours|minutes|seconds|ampm)$/, '')])

                    // register the element
                    plugin.register(element, false);

                // if element is a valid element with the maxlength attribute set
                if ((attributes['type'] === 'text' || attributes['type'] === 'textarea' || attributes['type'] === 'password') && element.attr('maxlength')) {

                    // because PHP and JavaScript treat new lines differently, we need to do some extra work
                    // in PHP new line characters count as 2 characters while in JavaScript as 1
                    // http://www.sitepoint.com/line-endings-in-javascript/
                    // http://drupal.org/node/1267802

                    // first, save the maxlength attribute's original value
                    // (we will dynamically change its value as we go on)
                    element.data('maxlength', element.attr('maxlength'));

                    // handle the onKeyUp event
                    element.bind('keyup', function(e) {

                        const // reference to the textarea element
                            $el = $(this),

                            // the value of the "maxlength" attribute
                            maxlength = $el.data('maxlength'),

                            // the difference between PHP's way of counting and JavaScript's
                            diff = _maxlength_diff($el);

                        // adjust the maxlength attribute to reflect PHP's way of counting, where new lines count as 2
                        // characters; therefore, we need to reduce the value of maxlength with 1 for each new line
                        // character added to compensate
                        $el.attr('maxlength', maxlength - diff);

                        // if the character counter needs to be shown
                        if ($el.hasClass('show-character-counter')) {

                            // get the number of characters left
                            const available_chars = maxlength - diff - $el.val().length;

                            // update the character counter
                            character_counter.html(available_chars < 0 ? '<span>' + available_chars + '</span>' : available_chars);

                        }

                    });

                    // if the character counter needs to be shown
                    if (element.hasClass('show-character-counter')) {

                        position = element.position();

                        // get the character counter's width and height
                        const width = character_counter.outerWidth();
                        const height = character_counter.outerHeight();

                        // position the character counter at the bottom-right of the textarea, and make it visible
                        character_counter.css({
                            'top':          position.top + element.outerHeight() - (height / 1.5),
                            'left':         position.left + element.outerWidth() - (width / 1.5),
                            'width':        character_counter.width(),
                            'visibility':   'visible'
                        });

                        // trigger the "onKeyUp" event to do the initial computing if there is already content in the textarea
                        element.trigger('keyup');

                    }

                }

                // if element is "text" or "password" and has the "prefix" data attribute set
                if ((attributes['type'] === 'text'
                    || attributes['type'] === 'password')
                    && element.data('prefix')
                ) {
                    // get the "prefix" data attribute's value and split it into the prefix and the element's value
                    let prefix = element.data('prefix'),
                        match = decodeURIComponent(prefix.replace(/\+/g, ' ')).match(/^img\:(.*)/i),

                        // is the prefix an image?
                        is_image = null != match,

                        $prefix;

                    // if prefix is an image
                    if (is_image)

                        // create an <img> tag with the specified "src"
                        $prefix = jQuery('<img>', {
                            'src': match[1]
                        });

                    // if prefix is not an image
                   else

                        // create a <div> tag and clone the parent element's font styles
                        $prefix = jQuery('<div>', {
                            'css': {
                                'fontFamily': element.css('fontFamily'),
                                'fontSize': element.css('fontSize')
                            }
                        // the content in the prefix
                        }).html(decodeURIComponent(prefix.replace(/\+/g, ' ')));

                    // add some properties and insert the prefix in the DOM right after the element
                    $prefix.attr({
                        'class': 'Zebra_Form_Input_Prefix'
                    }).css({
                        'visibility': 'hidden',
                        'position': 'absolute'
                    }).insertAfter(element);

                    // correctly position the prefix
                    $prefix.css({
                        'top': (element.outerHeight() - $prefix.outerHeight()) / 2,
                        'left': parseInt(element.css('paddingLeft'), 10),
                        'visibility': 'visible'
                    });

                    // adjust the element's left padding
                    element.css({
                        'paddingLeft':  '+=' + $prefix.outerWidth(true)
                    });

                    // if box-sizing is not "border-box"
                    if (element.css('boxSizing') !== 'border-box')

                        // adjust the element's width
                        element.css({
                            'width':        '-=' + $prefix.outerWidth(true)
                        });

                    // if element has a placeholder
                    if (undefined !== placeholder)

                        // adjust also the placeholder's position
                        placeholder.css({
                            'left':  '+=' + $prefix.outerWidth(true)
                        });

                }

            });

            // bind a function to the "click" event for all submit buttons/images
            $('input.submit, input.image, button', $form).bind('click', function() {

                // set the value of a flag (used for dependencies validation)
                $form.data('zf_clicked_button', $(this).attr('id'));

            });

            // iterate through the elements that have validation rules
            for (const element in plugin.settings.validation_rules)

                // iterate through the rules of each element
                for (const rule_name in plugin.settings.validation_rules[element])

                    // if "dependencies" rule exists
                    if (rule_name === 'dependencies') {

                        (function() {

                            // get all the conditions needed to validate the element
                            let proxy;

                            let conditions = plugin.settings.validation_rules[element][rule_name];

                            // if the name of a callback function is also given
                            // the actual conditions are in the first entry of the array
                            if (typeof conditions[1] == 'string') conditions = conditions[0];

                            // iterate through the elements the validation of the current element depends on (proxies)
                            for (proxy in conditions) {

                                // find the proxy / proxies (as more radio buttons can share the same name)
                                let $proxy = $('input[name="' + proxy + '"],select[name="' + proxy + '"],textarea[name="' + proxy + '"],button[name="' + proxy + '"]', form);

                                // if no elements were found search again as checkbox groups and multiple selects
                                // also have [] in their name
                                if ($proxy.length === 0) $proxy = $('input[name="' + proxy + '[]"],select[name="' + proxy + '[]"],textarea[name="' + proxy + '[]"]', form);

                                // if proxy was found
                                if ($proxy.length > 0) {

                                    // if haven't yet started storing information about this proxy, start now
                                    if (!proxies[proxy]) proxies[proxy] = {

                                        // the functions of the proxy
                                        conditions: {},

                                        // an array of elements whose validation depends on the proxy
                                        elements: [],

                                        // the function to be run whenever the proxy's value change
                                        event: false

                                    };

                                    // if the current element is not already in the array of elements whose validation depends on the proxy
                                    // add it now
                                    if ($.inArray(element, proxies[proxy]['elements']) === -1) proxies[proxy]['elements'].push(element);

                                    const
                                        // for each proxy/value combination we will store a function
                                        // for the function's name we use a special array-to-string method
                                        function_name = _toString(conditions[proxy]),

                                        // get the type of the proxy by checking the first item
                                        type = _type($($proxy[0]));

                                    // in order to scope these values when creating the function after this one, we use
                                    // them as arguments to an anonymous function
                                    (function($proxy, proxy, type) {

                                        // if for this proxy we haven't yet stored a function that checks for this/these values, create it now
                                        if (!proxies[proxy]['conditions'][function_name]) proxies[proxy]['conditions'][function_name] = function() {

                                            const
                                                // the condition/conditions to compare the proxy's current value with
                                                condition = conditions[proxy],

                                                // the current values/values of the proxy
                                                value = [];

                                            // let's get the current value/values of the proxy
                                            // iterate through the whole group
                                            $proxy.each(function() {

                                                // based on the proxy's type
                                                switch (type) {

                                                    // if it's radio buttons or checkboxes we're talking about
                                                    case 'radio':
                                                    case 'checkbox':

                                                        // and get the value of the checked radio button
                                                        if (this.checked) value.push($(this).val());

                                                        break;

                                                    // if it is a submit button
                                                    case 'button':
                                                    case 'image':
                                                    case 'submit':

                                                        // if the correct button was clicked
                                                        if ($form.data('zf_clicked_button') == $(this).attr('id')) value.push('click');

                                                        break;

                                                    // for the other controls
                                                    default:

                                                        // and get the value/values of the element
                                                        value.push($(this).val());

                                                        break;

                                                }

                                            });

                                            // now let's see if the proxy's value is what is required by the condition/conditions
                                            let found = false;

                                            // if proxy has any value
                                            if (value.length > 0)

                                                // if condition is not an array
                                                if (!$.isArray(condition)) {

                                                    // iterate through the proxy's values
                                                    // (remember, we store it as an array even if there's a single value)
                                                    $.each(value, function(index) {

                                                        // if the value of the condition is amongst the proxy's values
                                                        // flag it
                                                        if (condition == value[index]) found = true;

                                                    });

                                                // if condition is given as an array
                                                } else {

                                                    // iterate through all the conditions
                                                    $.each(condition, function(key) {

                                                        let matches = 0;

                                                        // iterate through the values of the proxy element
                                                        // (remember, we store it as an array even if there's a single value)
                                                        $.each(value, function(index) {

                                                            // if current entry in the conditions list is not an array
                                                            // and its value is equal to the current value
                                                            if (!$.isArray(condition[key]) && value[index] == condition[key]) found = true;

                                                            // if current entry in the conditions list is an array
                                                            // and the current value is part of that array
                                                            else if ($.isArray(condition[key]) && $.inArray(value[index], condition[key]) > -1) matches++;

                                                        });

                                                        // if conditions are met
                                                        if (!found && matches === condition[key].length) found = true;

                                                    });

                                                }

                                            // return true or false
                                            return found;

                                        }

                                        // if proxy was found and we've not already attached the function to handle the value change
                                        if ($proxy.length > 0 && false == proxies[proxy]['event']) {

                                            proxies[proxy]['event'] = function(e) {

                                                // iterate through elements that depend on the current proxy
                                                $.each(proxies[proxy]['elements'], function(index) {

                                                    const callback = segments.shift();
                                                    const args = segments;
                                                    let
                                                        // the current element
                                                        $element = proxies[proxy]['elements'][index],

                                                        // get all the conditions needed to validate the element
                                                        conditions = plugin.settings.validation_rules[$element]['dependencies'],

                                                        // by default, we assume that all conditions are met
                                                        result = true;

                                                    // if the name of a callback function is also given
                                                    if (typeof conditions[1] == 'string') {

                                                        // first, split by comma (,) to get the callback function and its arguments
                                                        let segments = conditions[1].split(',');
                                                        segments = $.map(segments, function (n) {
                                                            return $.trim(n)
                                                        });
                                                        conditions = conditions[0];
                                                    }

                                                    // iterate through the elements in the condition
                                                    for (const element in conditions) {

                                                        // each condition has a function
                                                        const function_name = _toString(conditions[element]);

                                                        // execute the appropriate function and update the result accordingly
                                                        if (!proxies[element]['conditions'][function_name]()) result = false;

                                                    }

                                                    // if a callback function exists for the current condition/conditions
                                                    if (undefined !== conditions[proxy]) {

                                                        // if all conditions are met, there's a callback function to be called
                                                        // and the callback function needs to be called
                                                        if (undefined !== callback) {

                                                            // get ready to call the callback function
                                                            // base context is the "window" object
                                                            let context = window,

                                                                // split by dot (.) in case the callback function is namespaced
                                                                namespaces = callback.split('.'),

                                                                // function is the last in list
                                                                // also, remove it from the array
                                                                fn = namespaces.pop();

                                                            // iterate through the namespaces (if any)
                                                            for (let i = 0; i < namespaces.length; i++)

                                                                // if namespace exists
                                                                if (undefined !== context[namespaces[i]])

                                                                    // set the context
                                                                    context = context[namespaces[i]];

                                                                // throw an error and stop execution if context doesn't exist
                                                                else throw new Error('"' + namespaces[i] + '" namespace doesn\'t exist in the global scope!');

                                                            // finally
                                                            try {

                                                                // try to execute the function
                                                                context[fn].apply(undefined, [result].concat(args));

                                                            // or
                                                            } catch(error) {

                                                                // throw an error otherwise
                                                                throw new Error('"' + fn + '" callback function was not found!');

                                                            }

                                                        }

                                                    }

                                                });

                                            }

                                            // we need to check all the conditions whenever the proxy changes its value
                                            $proxy.bind(

                                                // for checkboxes, radio buttons, submits, buttons and multiple selects, we do it on click
                                                type === 'checkbox' ||
                                                type === 'radio' ||
                                                type === 'select-multiple' ||
                                                type === 'submit' ||
                                                type === 'button' ? 'click' : (

                                                // for selects we do it on change
                                                type === 'select-one' ? 'change' :

                                                // for the other controls we do it on blur
                                                'blur'

                                            ), proxies[proxy]['event']);

                                        }

                                    })($proxy, proxy, type);

                                }

                            }

                            // if proxy was found
                            // execute the function now, so it handles default values, if it is the case, for all of the
                            // elements that depend on it
                            // (needs to be here, so it is executed for each proxy)
                            for (proxy in proxies) proxies[proxy]['event']();

                        })();

                    }

            // are there any CAPTCHAs on the form?
            const $captcha_container = $('.captcha-container');

            // if there are
            if ($captcha_container.length > 0) {

                const $image = $('img', $captcha_container);
                const $anchor = $('a', $captcha_container);

                // when clicking the "reload" button
                $anchor.bind('click', function(e) {

                    e.preventDefault();

                    // regenerate the CAPTCHA image
                    $image.attr('src', $image.attr('src').replace(/nocache=[0-9]+/, 'nocache=' + new Date().getTime()));

                });

            }

            // handle the form's "submit" event
            $form.bind('submit', function(e) {

                // if
                if (

                    // form is not to be simply reloaded
                    reload === false &&

                    // and there are any controls that need to be validated
                    undefined !== plugin.settings.validation_rules &&

                    // if the validate() method was not already run
                    !validated

                // if form doesn't validate, prevent form submission
                ) if (!plugin.validate()) {

                    e.preventDefault();

                    // stop other handlers from executing
                    e.stopImmediatePropagation();

                }

                // consider again that the validate method was not run
                validated = false;

            });

            // if there are any placeholders on the page,
            // continuously checks for value updates on fields having placeholders.
            // We needs this so that we can hide the placeholders when the fields are updated by the browsers' auto-complete
            // feature.
            if (placeholders.length > 0) setInterval(_check_values, 50);

            // since with jQuery 1.9.0 the $.browser object was removed, we rely on this piece of code from
            // http://www.quirksmode.org/js/detect.html to detect the browser
            browser = {
            	init: function () {
            		this.name = this.searchString(this.dataBrowser) || '';
            		this.version = this.searchVersion(navigator.userAgent)
            			|| this.searchVersion(navigator.appVersion)
            			|| '';
            	},
            	searchString: function (data) {
            		for (let i=0; i<data.length; i++)	{
                        const dataString = data[i].string;
                        const dataProp = data[i].prop;
                        this.versionSearchString = data[i].versionSearch || data[i].identity;
            			if (dataString) {
            				if (dataString.indexOf(data[i].subString) !== -1) {
                                return data[i].identity;
                            }
            			}
            			else if (dataProp) {
                            return data[i].identity;
                        }
            		}
            	},
            	searchVersion: function (dataString) {
                    const index = dataString.indexOf(this.versionSearchString);
                    if (index === -1) return;
            		return parseFloat(dataString.substring(index+this.versionSearchString.length+1));
            	},
            	dataBrowser: [
            		{
            			string: navigator.userAgent,
            			subString: 'Firefox',
            			identity: 'firefox'
            		},
            		{
            			string: navigator.userAgent,
            			subString: 'MSIE',
            			identity: 'explorer',
            			versionSearch: 'MSIE'
            		}
            	]
            }
            browser.init();

        }

        /**
         *  Shows an error tooltip, with a custom message, for a given element.
         *
         *  @param  jQuery  element     The form's element to attach the tip to.
         *
         *  @param  string  message     The message to be displayed in the tooltip.
         *
         *  @return void
         */
        plugin.attach_tip = function(element, message) {

    		// get element's ID
            const id = element.attr('id');

            // in case we're attaching the tip to an element outside those that are to be validated by default
            if (undefined === validation_rules[id]) {
                // we need to set these attributes or the "show_errors" method will crash
                validation_rules[id] = {'element': element};
            }

    		// bind the message to the target element
            validation_rules[id].message = message;

    		// show the error message
            plugin.show_errors(element);

        }

        /**
         *  Hides all error tooltips.
         *
         *  @return void
         */
        plugin.clear_errors = function() {

            // remove all iFrameShims (if available) from the DOM
            $('.Zebra_Form_error_iFrameShim').remove();

            // remove all error messages from the DOM
            $('.Zebra_Form_error_message').remove();

            // remove the "error" class used for styling erroneous controls
            elements.removeClass('error');

            // remove all error blocks
            error_blocks = {};

        }

        /**
         *  After a file upload occurs, the script will automatically run this method that removes the temporarily created
         *  iFrame element, the spinner and replaces the file upload control with the name of the uploaded file.
         *
         *  @param  object  element     The name (id) of the file upload element
         *
         *  @param  array   file_info   An array of properties of the uploaded file, returned by process.php
         *
         *  @return void
         *
         *  @access private
         */
        plugin.end_file_upload = function(element, file_info) {

            const $element = $('#' + element);

            // if element exists
            if ($element.length) {

                // hide any errors
                plugin.clear_errors();

                // delete the "target" attribute of the form
                $form.removeAttr('target');

                // get the element's ID
                const id = element;

                // remove from the DOM the attached IFrame
                // (slight delay so we don't remove the iframe before it is fully loaded)
                setTimeout(function() { $('#' + id + '_iframe').remove() }, 1000);

                // remove from the DOM the attached spinner
                $('#' + id + '_spinner').remove();

                // if element has rules attached to it
                if (undefined !== validation_rules[element]) {

                    // if
                    if (

                        // the method has a second argument
                        undefined !== file_info &&

                        // the second argument is an object
                        'object' == typeof(file_info) &&

                        // the second argument is properly formatted
                        undefined !== file_info[0] &&
                        undefined !== file_info[1] &&
                        undefined !== file_info[2] &&
                        undefined !== file_info[3]

                    )

                        // set the second argument as a property of the element
                        $element.data('file_info', file_info);

                    // if control does not validate
                    if (true !== plugin.validate_control($element)) {

                        // clear the element's value
                        $element.val('');

                        // make the element visible (was hidden to show the spinner)
                        $element.css('visibility', 'visible');

                        // show the attached error message
                        plugin.show_errors($element);

                        // clear file info information
                        $element.data('file_info', '');

                    // if control validates
                    } else {
                        // get the element's coordinates, relative to the document
                        const coordinates = $element.offset();

                        // create an element containing the file's name
                        // which will replace the container with the file upload control
                         const file_name = jQuery('<div>', {

                                'class': 'Zebra_Form_filename',
                                'css': {
                                    'left': coordinates.left,
                                    'top': coordinates.top,
                                    'width': $element.outerWidth(),
                                    'opacity': 0
                                }

                                // set the file's name as the content of the newly created element
                            }).html(file_info[0]);

                        // add also an "close" button for canceling the file selection
                        const cancel_button = jQuery('<a>', {

                            'href': 'javascript:void(0)'

                        }).html('x').bind('click', function (e) {

                            // stop default event
                            e.preventDefault();

                            // remove the uploaded file's name from the DOM
                            file_name.remove();

                            // clear the element's value
                            $element.val('');

                            // if the element has the "file_info" attribute set, remove it
                            if ($element.data('file_info')) $element.removeData('file_info');

                            // make the element visible
                            $element.css('visibility', 'visible');

                        });

                        // inject everything into the DOM
                        $('body').append(file_name.append(cancel_button));

                        // fine tune the element's position and make it visible
                        file_name.css({
                            'top':      parseInt(file_name.css('top'), 10) + (($element.outerHeight() - file_name.outerHeight()) / 2),
                            'opacity':  1
                        });

                    }

                }

            }

        }

        /**
         *  Hides the error tooltip for a given element.
         *
         *  @param  string  element_name    The name (id) of a form's element.
         *
         *  @return void
         */
        plugin.hide_error = function(element_name) {

            // reference to the jQuery object
            const $element = $('#' + element_name);

            // unless there's a specific request to hide the error message attached to a specific element,
            // and we need to validate elements on the fly and the current element is not valid
            if (undefined === arguments[1] && plugin.settings.validate_on_the_fly && true !== plugin.validate_control($element))

                // we'll use this opportunity to instead show the error message attached to the current element
                // (as this method is called onblur for every element of a form)
                // the second argument instructs the script not to hide other error messages
                plugin.show_errors($element, false);

            // if we need to hide the error block attached to the current element
            else {

                const container = $('#Zebra_Form_error_message_' + element_name);

                // if an error block exists for the element with the given id
                if (container.length > 0) {

                    // remove the "error" class used for styling erroneous controls
                    $element.removeClass('error');

                    // fade out the error block
                    // (which, on complete, destroys the IFrame shim - if it exists - and also the error block itself)
                    container.animate({
                        'opacity':  0
                    },
                    250,
                    function() {

                        // get a reference to the iFrame shim (if any)
                        const shim = container.data('shim');

                        // if an attached iFrame shim exists, remove it from the DOM
                        if (undefined !== shim) shim.remove();

                        // remove the container from the DOM
                        container.remove()

                        // remove from the error blocks array
                        delete error_blocks[element_name];

                    });

                }

            }

        }

        /**
         *  Registers a form element for validation.
         *
         *  @param  object  element A jQuery element.
         *
         *  @return void
         */
        plugin.register = function(element) {

            // get some attributes of the element
            const attributes = {'id': element.attr('id'), 'name': element.attr('name'), 'type': _type(element)};

            // if element also has the "name" attribute
            // (some plugins copy the original element's classes and Zebra_Form will falsely belive they are form elements
            // once it gets to them)
            if (undefined !== attributes['name']) {

                // sanitize element's name by removing square brackets (if available)
                attributes['name'] = attributes['name'].replace(/[\[\]]/g, '');

                // if element has the "time" class, we assume it is part of a time picker
                // as all elements are treated as one single element, we have to remove the prefixes
                if (element.hasClass('time')) attributes['name'] = attributes['name'].replace(/\_(hours|minutes|seconds|ampm)$/, '');

                switch (attributes['type']) {

                    case 'radio':
                    case 'checkbox':

                        // attach the function to the onClick and onBlur events
                        element.bind({

                            'click':    function() { plugin.hide_error(attributes['name']) },
                            'blur':     function() { plugin.hide_error(attributes['name']) }

                        });

                        // we will also keep track of radio buttons and checkboxes sharing the same name
                        if (undefined === controls_groups[attributes['id']])

                            // group together radio buttons and checkboxes sharing the same name
                            controls_groups[attributes['id']] = $form.find('input[name^=' + attributes['name'] + ']');

                        break;

                    // if element is file
                    case 'file':

                        // we replace the original control with a clone, as only file controls created dynamically from
                        // javascript behave as expected

                        // create a clone of the element (along with content and ID)
                        const clone = element.clone(true);

                        // unset the element's value
                        clone.attr('value', '');

                        // replace the original element
                        element.replaceWith(clone);

                        clone.bind({

                            // attach a function to the onKeyPress event
                            'keypress': function(e) {

                                // stop event
                                // e.preventDefault();

                                // unset the element's value
                                clone.attr('value', '');

                            },

                            // attach a function to the onChange event
                            'change': function() {

                                // if upload rule exists
                                if (undefined !== validation_rules[attributes['name']]['rules']['upload']) {

                                    // hide any attached error message
                                    plugin.hide_error(attributes['name']);

                                    // if the "file_info" attribute is already set for the element
                                    if (clone.data('file_info'))

                                        // remove it
                                        clone.removeData('file_info');

                                    // create an IFrame that we will use to submit the form to
                                    // ("name" and "id" attributes must be submitted like that and not like attributes or it won't work in IE7)
                                    const iFrameSubmit = jQuery('<iframe id="' + attributes['id'] + '_iframe' + '" name="' + attributes['id'] + '_iframe' + '">', {
                                        'src': 'javascript:void(0)',
                                        'scrolling': 'no',
                                        'marginwidth': 0,
                                        'marginheight': 0,
                                        'width': 0,
                                        'height': 0,
                                        'frameborder': 0,
                                        'allowTransparency': 'true'
                                    }).css({
                                        'position': 'absolute',
                                        'top': 0,
                                        'left': -1000
                                    });

                                    // inject the newly created IFrame into the DOM
                                    $('body').append(iFrameSubmit);

                                    // save the form's original action
                                    const original_action = $form.attr('action');

                                    // alter the action of the form
                                    $form.attr('action',
                                        decodeURIComponent(plugin.settings.assets_path) + 'process.php' +
                                        '?form=' + $form.attr('id') +
                                        '&control=' + attributes['id'] +
                                        '&path=' + encodeURIComponent(decodeURIComponent(validation_rules[attributes['name']]['rules']['upload'][0])) +
                                        '&nocache=' + new Date().getTime());

                                    // the form will submit to the IFrame
                                    $form.attr('target', attributes['id'] + '_iframe');

                                    // hide the element
                                    element.css('visibility', 'hidden');

                                    // get the element's coordinates
                                    const coordinates = element.offset(),

                                        // crate the spinner element
                                        // and position it in the same position as the element
                                        spinner = jQuery('<div>', {
                                            'id': attributes['id'] + '_spinner',
                                            'class': 'Zebra_Form_spinner',
                                            'css': {
                                                'left': coordinates.left,
                                                'top': coordinates.top
                                            }
                                        });

                                    // inject the newly create element into the DOM
                                    $('body').append(spinner);

                                    // make sure we submit the form without validating it - we just need to submit the uploaded file
                                    reload = true;

                                    // submit the form
                                    $form.trigger('submit');

                                    // restore the form's original action
                                    $form.attr('action', original_action);

                                    // reset the flag
                                    reload = false;

                                }

                            },

                            // attach a function to the onBlur event
                            'blur': function() { plugin.hide_error(attributes['name']) }

                        });

                        // element will now reference the clone
                        element = clone;

                        break;

                    // if element is a select control (single or multi-values)
                    case 'select-one':
                    case 'select-multiple':

                        // attach the function to the onChange and onBlur events
                        element.bind({

                            'change':   function() { plugin.hide_error(attributes['name']) },
                            'blur':     function() { plugin.hide_error(attributes['name']) }

                        });

                        break;

                    // for all other element types (text, textarea, password)
                    default:

                        // attach a function to the onBlur event
                        element.blur(function() {

                            // by default, we need to hide the error message on the element itself
                            let target = attributes['name'];

                            // if element is a text control having the "other" class
                            // (meaning it is attached to a select control)
                            if (attributes['type'] === 'text' && element.hasClass('other')) {

                                // get the name of the parent element
                                const parent = attributes['id'].match(/^(.*)\_other$/);

                                // the name of the parent element
                                if (null != parent) target = parent[1];

                            }

                            // hide the error messages for the parent element
                            plugin.hide_error(target);

                        });

                }

                // get validation rules of the element
                const rules = plugin.settings.validation_rules[attributes['name']];

                // if there are any rules
                if (null != rules) {

                    // if a second argument to the method was not provided
                    // it means that the script will automatically need to figure out the order in which the element will be
                    // validated, based on where it is in the DOM
                    if (undefined === arguments[1]) {

                        // get all the form's controls
                        elements = $('.control', $form);

                        // iterate through the form's controls
                        $.each(elements, function(index, ele) {

                            // if we've found the element we're registering
                            if (ele === element.get(0)) {
                                // the jQuery object
                                let el = $(ele),

                                    // we need to move backwards and find the previous control in the DOM

                                    // the ID of the previous element
                                    previous_element_id = null,

                                    // the previous control's position in the validation chain
                                    position = index - 1;

                                // while
                                while (

                                    // "previous_element_id" is null
                                    previous_element_id == null &&

                                    // a previous element exists
                                    undefined !== elements[position]

                                ) {

                                    // get the ID of the previous element
                                    previous_element_id = $(elements[position]).attr('id');

                                    // decrement position
                                    position--;

                                }

                                // if a previous element doesn't exists
                                if (!validation_rules[previous_element_id]) {

                                    // create a temporary object
                                    const tmp = {};

                                    // assign the validation rules
                                    tmp[attributes['id']] = {'element': element, 'rules': rules};

                                    $.extend(validation_rules, tmp);

                                // if a previous element does exist
                                } else {

                                    // create a temporary object which will contain the reordered validation rules
                                    const new_validation_rules = {};

                                    // iterate through the already existing validation rules
                                    for (index in validation_rules) {

                                        // add each entry to the new array
                                        new_validation_rules[index] = validation_rules[index];

                                        // if we found the previous element
                                        if (previous_element_id == index)

                                            // append the validation rules for the current element
                                            new_validation_rules[attributes['id']] = {'element': element, 'rules': rules};

                                    }

                                    // copy the content of the temporary variable to the validation_rules property
                                    validation_rules = new_validation_rules;

                                }

                            }

                        });

                    // if a second argument to the method was provided and it is an element
                    // it means that the current control needs to be validated after that particular element
                    } else if (undefined !== arguments[1] && $('#' + arguments[1]).length) {
                        // get the ID of the element after which the current element needs to be validated
                        const id = $('#' + arguments[1]).attr('id');

                        // create a temporary object which will contain the reordered validation rules
                        const new_validation_rules = {};

                        // iterate through the already existing validation rules
                        for (let index in validation_rules) {

                            // add each entry to the new array
                            new_validation_rules[index] = validation_rules[index];

                            // if we found the previous element
                            if (previous_element_id == index)

                                // append the validation rules for the current element
                                new_validation_rules[attributes['id']] = {'element': element, 'rules': rules};

                        }

                        // copy the content of the temporary variable to the validation_rules property
                        validation_rules = new_validation_rules;

                    // if a second argument to the method was provided and it is boolean false
                    // it means that the element will be validated in the same order as it was registered
                    } else if (undefined !== arguments[1] && arguments[1] === false) {
                        // add the validation rules for the current element
                        validation_rules[attributes['id']] = {'element': element, 'rules': rules};
                    }

                }

            }

        }

        /**
         *  If the "validate_all" property is set to FALSE, it shows the error message tooltip for the first control that
         *  didn't validate.
         *
         *  If the "validate_all" property is set to TRUE, it will show error message tooltips for all the controls that
         *  didn't validate.
         *
         *  The "validate" or "validate_control" methods need to be called prior to calling this method or calling
         *  this method will produce no results!
         *
         *  @return void
         */
        plugin.show_errors = function() {

            // unless we're showing the error message for a specific element, as part of the on-the-fly validation
            if (!(undefined !== arguments[1] && arguments[1] === false)) {

                // hide all errors tips
                plugin.clear_errors();

            }

            let counter = 0;

            // iterate through the validation rules
            for (let index in validation_rules) {

                let // current validation rule
                    validation_rule = validation_rules[index],

                    // current element
                    element = validation_rule['element'],

                    // get some attributes of the element
                    attributes = {'id': element.attr('id'), 'name': element.attr('name'), 'type': _type(element)},

                    // we'll use this later for associating an error block with the element
                    id = (attributes['type'] === 'radio' || attributes['type'] === 'checkbox' ? attributes['name'].replace(/[\[\]]/g, '') : attributes['id']);

                // if element has the "time" class, we assume it is part of a time picker
                // as all elements are treated as one single element, we have to remove the prefixes
                if (element.hasClass('time')) id = attributes['name'].replace(/\_(hours|minutes|seconds|ampm)$/, '');

                // if the method has an element of the form as argument, and the current element is not that particular
                // element, skip the rest
                if (undefined !== arguments[0] && arguments[0].get(0) !== element.get(0)) continue;

                // if element's value did not validate (there's an error message)
                // and there isn't already an error block shown for the element
                if (undefined !== validation_rule.message && undefined === error_blocks[id]) {

                    // focus the element
                    // (IE triggers an error if control has display:none)
                    // also, don't focus on the invalid element if we're showing the error message as part of the on-the-fly validation
                    if (

                        element.css('display') !== 'none' && !(undefined !== arguments[1] && arguments[1] === false) &&

                        // if we have validate_all set to TRUE than focus to the first invalid control
                        !(plugin.settings.validate_all && counter > 0)

                    ) element.focus();

                    // get element's coordinates
                    let element_position = $.extend(element.offset());

                    // find element's "right"
                    element_position = $.extend(element_position, {'right': Math.floor(element_position.left + element.outerWidth())});

//                     // weird behaviour...
//                     // if an item somewhere far below in a long list of a dropdown is selected, positions get messed up
//                     // get element's scroll
//                     var element_scroll = element.getScroll();
//
//                     // if element is scrolled vertically
//                     if (element_scroll.y != 0) {
//
//                         // adjust it's top position
//                         element_position.top += element_scroll.y;
//
//                     }

                    const // the main container holding the error message
                        container = jQuery('<div/>', {
                            'class': 'Zebra_Form_error_message',
                            'id': 'Zebra_Form_error_message_' + id,
                            'css': {
                                'opacity': 0
                            }
                        }),

                        // the container of the actual error message
                        // width:auto is for IE6
                        message = jQuery('<div/>', {
                            'class': 'message' + (!plugin.settings.close_tips ? ' noclose' : ''),
                            'css': {
                                '_width': 'auto'
                            }
                        }).

                            // add the error message
                            html(validation_rule.message).

                            // add the message container to the main container
                            appendTo(container);

                    // if a "close" button is required
                    if (plugin.settings.close_tips) {
                        // create the close button
                        const close = jQuery('<a/>', {
                            'href': 'javascript:void(0)',
                            'class': 'close' + (browser.name === 'explorer' && browser.version === 6 ? '-ie6' : '')
                        }).

                            // all it contains is an "x"
                            html('x').

                            // add the close button to the error message
                            appendTo(message).

                            // attach the events
                            bind({

                                'click': function (e) {
                                    e.preventDefault();
                                    plugin.hide_error($(this).closest('div.Zebra_Form_error_message').attr('id').replace(/^Zebra\_Form\_error\_message\_/, ''), true)
                                },
                                'focus': function () {
                                    $(this).blur()
                                }

                            });
                    }
                    // create the error message's arrow
                    const arrow = jQuery('<div/>', {'class': 'arrow'}).appendTo(container);

                    // inject the error message into the DOM
                    $('body').append(container);

                    // get container's size
                    let container_size = {'x': container.outerWidth(), 'y': container.outerHeight()};

                    // get arrow's size
                    let arrow_size = {'x': arrow.outerWidth(), 'y': arrow.outerHeight()};

                    let left;
                    switch(plugin.settings.tips_position) {
                        case 'right':
                            left = element_position.right - (container_size.x / 2);
                            break;
                        case 'center':
                            left = element_position.left - (container_size.x / 2) + (element.outerWidth() / 2);
                            break;
                        default:
                            left = element_position.left - (container_size.x / 2);
                    }

                    // set the arrow centered horizontally
                    arrow.css('left', (container_size.x / 2) - (arrow_size.x / 2) - 1);

                    // if element is a radio button or a checkbox
                    if (attributes['type'] === 'radio' || attributes['type'] === 'checkbox')

                        // set the "left" of the container centered on the radio button/checkbox
                        left = element_position.right - (container_size.x / 2) - (element.outerWidth() / 2);

                    // if "left" is outside the visible part of the page, adjust it
                    if (left < 0) left = 2;

                    // set left now because this might lead to text wrapping
                    container.css('left', left);

                    // now get the size again
                    container_size = {'x': container.outerWidth(), 'y': container.outerHeight()};

                    // set the container's "top"
                    let top = (element_position.top - container_size.y + (arrow_size.y / 2) - 1);

                    // if "top" is outside the visible part of the page, adjust it
                    if (top < 0) top = 2;

                    // set the final position of the container
                    container.css({
                        'left':     left + 'px',
                        'top':      top + 'px',
                        'height':   (container_size.y - (arrow_size.y / 2)) + 'px'
                    });

                    // add the error to the error blocks array
                    error_blocks[id] = container;

                    // create an IFrame shim for the container (only in IE6)
                    _shim(container);

                    // the error message is slightly transparent
                    container.animate({
                        'opacity': .9
                    }, 250);

                    // if this is the first error message, and we have to scroll to it,
                    // and we're not showing the error as part of the on-the-fly validation process
                    if (++counter === 1 && plugin.settings.scroll_to_error && !(undefined !== arguments[1] && arguments[1] === false))

                        // scroll so that the element is centered in the viewport
                        $('html, body').animate({'scrollTop': Math.max(parseInt(container.css('top'), 10) + (parseInt(container.css('height'), 10) / 2) - ($(window).height() / 2), 0)}, 0);

                    // if control is not a file upload control,
                    // add a class for customizing the erroneous control's aspect
                    if (attributes['type'] !== 'file') element.addClass('error');

                    // unless we need to validate all elements, don't check any further
                    if (!plugin.settings.validate_all) break;

                }

            }

        }

        /**
         *  Submits the form.
         *
         *  @return void
         */
        plugin.submit = function() {

            // trigger the form's submit event which will take care of everything
            $form.trigger('submit');

        }

        /**
         *  Checks if an element is valid or not.
         *
         *  @param  object  element     The jQuery element to check.
         *
         *  @return boolean             Returns TRUE if every rule attached to the element was obeyed, FALSE if not.
         */
        plugin.validate_control = function(element) {
            let file_info;
            let exp;
            let rule_not_passed;
// get some attributes of the element
            let attributes = {'id': element.attr('id'), 'name': element.attr('name'), 'type': _type(element)},

                // by default, we assume the control validates
                control_is_valid = true,

                // get the control's validation rules
                control_validation_rules = validation_rules[attributes['id']],

                // we'll use this later for associating an error block with the element
                id = (attributes['type'] === 'radio' || attributes['type'] === 'checkbox' ? attributes['name'].replace(/[\[\]]/g, '') : attributes['id']);

            // if element has the "time" class, we assume it is part of a time picker
            // as all elements are treated as one single element, we have to remove the prefixes
            if (element.hasClass('time')) id = attributes['name'].replace(/\_(hours|minutes|seconds|ampm)$/, '');

            // if
            if (

                // control has any validation rules attached
                undefined !== control_validation_rules &&
                (
                    // is not hidden OR
                    (element.css('display') !== 'none' && element.css('visibility') !== 'hidden') ||

                    // element is a file control and a file was selected (and currently the element is hidden and the
                    // spinner is shown)
                    element.data('file_info')

                )

            ) {
                // if a rule is not passed, this variable hold the name of that rule
                rule_not_passed = null;
                // if a rule is not passed, and it is a custom rule, this variable hold the name of that rule
                let custom_rule_name = null;

                // delete any error messages for the current control
                delete control_validation_rules.message;

                // iterate through the validation rules
                for (const rule in control_validation_rules['rules']) {

                    // if control is not valid, do not look further
                    if (!control_is_valid) break;

                    // check the rule's name
                    switch (rule) {

                        case 'age':

                            // if element type is one of the following
                            switch (attributes['type']) {

                                case 'text':

                                    // value is not an empty string and current element was validated and contains a valid date as the value
                                    if ($.trim(element.val()) !== '' && undefined !== element.data('timestamp')) {

                                        // compute age
                                        let today = new Date(),
                                            birthDate = new Date(element.data('timestamp')),
                                            age = today.getFullYear() - birthDate.getFullYear(),
                                            months = today.getMonth() - birthDate.getMonth(),
                                            min_age = control_validation_rules['rules'][rule][0][0],
                                            max_age = control_validation_rules['rules'][rule][0][1];

                                        if (months < 0 || (months === 0 && today.getDate() < birthDate.getDate())) age--;

                                        // if age is invalid
                                        if (!((min_age <= 0 || age >= min_age) && (max_age <= 0 || age <= max_age))) {
                                            // the rule doesn't validate
                                            control_is_valid = false;
                                        }

                                    }

                                    break;

                            }

                            break;

                        case 'alphabet':

                            // if element type is one of the following
                            switch (attributes['type']) {

                                case 'password':
                                case 'text':
                                case 'textarea':

                                    // the regular expression to use:
                                    // a-z plus additional characters (if any), case-insensitive
                                    exp = new RegExp('^[a-z' + _escape_regexp(control_validation_rules['rules'][rule][0]).replace(/\s/, '\\s') + ']+$', 'ig');

                                    // if value is not an empty string and the regular expression is not matched, the rule doesn't validate
                                    if ($.trim(element.val()) !== '' && !exp.test(element.val())) control_is_valid = false;

                                    break;

                            }

                            break;

                        case 'alphanumeric':

                            // if element type is one of the following
                            switch (attributes['type']) {

                                case 'password':
                                case 'text':
                                case 'textarea':

                                    // the regular expression to use:
                                    // a-z, 0-9 plus additional characters (if any), case-insensitive
                                    exp = new RegExp('^[a-z0-9' + _escape_regexp(control_validation_rules['rules'][rule][0]).replace(/\s/, '\\s') + ']+$', 'ig');

                                    // if value is not an empty string and the regular expression is not matched, the rule doesn't validate
                                    if ($.trim(element.val()) !== '' && !exp.test(element.val())) control_is_valid = false;

                                    break;

                            }

                            break;

                        case 'compare':

                            // if element type is one of the following
                            switch (attributes['type']) {

                                case 'password':
                                case 'text':
                                case 'textarea':

                                    // if
                                    if (

                                        // element to compare with doesn't exist OR
                                        !$('#' + control_validation_rules['rules'][rule][0]) ||

                                        // element to compare with exists
                                        // but it doesn't have the same value as the current element's value
                                        element.val() != $('#' + control_validation_rules['rules'][rule][0]).val()

                                    // the rule doesn't validate
                                    ) control_is_valid = false;

                                    break;

                            }

                            break;

                        // if 'dependencies'
                        case 'dependencies':

                            // if not all conditions are met, don't validate the control
                            if (!_validate_dependencies(id)) return true;

                            break;

                        case 'custom':

                            let break_inner_loop = false;

                            // iterate through the custom functions
                            $.each(control_validation_rules['rules'][rule], function(index, args) {

                                // exit if we don't need to look any further
                                if (break_inner_loop) return;

                                // the array of arguments will contain, in order, the function's name,
                                // the element's value and any additional arguments
                                args = $.merge($.merge([args[0]], [element.val()]), args.slice(1));

                                // see if function is in the global namespace (member of the window object) or in jQuery's namespace
                                const fn = (typeof args[0] == 'function') ? args[0] : (typeof window[args[0]] == 'function' ? window[args[0]] : false);

                                // if custom function exists
                                // call the custom function
                                if (fn !== false) control_is_valid = fn.apply(fn, args.slice(1));

                                // if custom function doesn't exist
                                else {

                                    // consider that the control does not pass validation
                                    control_is_valid = false;

                                    // also throw an error
                                    throw new Error('Function "' + args[0] + '" doesn\'t exist!');

                                }

                                // if the rule doesn't validate, don't check the other custom functions
                                if (!control_is_valid) {

                                    // save the custom function's name
                                    // we'll need it later to retrieve the associated error message
                                    custom_rule_error_message = args[args.length - 1];

                                    // don't check any other custom functions
                                    break_inner_loop = true;

                                }

                            });

                            break;

                        case 'date':

                            // if element type is one of the following
                            switch (attributes['type']) {

                                case 'text':

                                    // if element has a value
                                    let segments;
                                    let iterable;
                                    if ($.trim(element.val()) !== '') {

                                        let // by default, we assume the date is invalid
                                            valid_date = false,

                                            // get the required date format
                                            format = element.data('Zebra_DatePicker').settings.format,

                                            // allowed characters in date's format
                                            format_chars = ['d', 'D', 'j', 'l', 'N', 'S', 'w', 'F', 'm', 'M', 'n', 'Y', 'y', 'G', 'H', 'g', 'h', 'a', 'A', 'i', 's', 'U'],

                                            // this array will contain the characters defining the date's format
                                            matches = [],

                                            // this array will contain the regular expression built for each of the characters
                                            // used in the date's format
                                            regexp = [];

                                        // escape characters that could have special meaning in a regular expression
                                        format = _escape_regexp(format);

                                        // iterate through the allowed characters in date's format
                                        for (let i = 0; i < format_chars.length; i++) {
                                            // if character is found in the date's format
                                            const position = format.indexOf(format_chars[i]);
                                            if (position > -1) {
                                                // save it, alongside the character's position
                                                matches.push({'character': format_chars[i], 'position': position});
                                            }
                                        }

                                        // sort characters defining the date's format based on their position, ascending
                                        matches.sort(function (a, b) {
                                            return a.position - b.position
                                        });

                                        // iterate through the characters defining the date's format
                                        $.each(matches, function (index, match) {

                                            // add to the array of regular expressions, based on the character
                                            switch (match.character) {

                                                case 'd':
                                                    regexp.push('0[1-9]|[12][0-9]|3[01]');
                                                    break;
                                                case 'D':
                                                    regexp.push('[a-z]{3}');
                                                    break;
                                                case 'j':
                                                    regexp.push('[1-9]|[12][0-9]|3[01]');
                                                    break;
                                                case 'l':
                                                    regexp.push('[a-z]+');
                                                    break;
                                                case 'N':
                                                    regexp.push('[1-7]');
                                                    break;
                                                case 'S':
                                                    regexp.push('st|nd|rd|th');
                                                    break;
                                                case 'w':
                                                    regexp.push('[0-6]');
                                                    break;
                                                case 'F':
                                                    regexp.push('[a-z]+');
                                                    break;
                                                case 'm':
                                                    regexp.push('0[1-9]|1[012]+');
                                                    break;
                                                case 'M':
                                                    regexp.push('[a-z]{3}');
                                                    break;
                                                case 'n':
                                                    regexp.push('[1-9]|1[012]');
                                                    break;
                                                case 'Y':
                                                    regexp.push('[0-9]{4}');
                                                    break;
                                                case 'y':
                                                    regexp.push('[0-9]{2}');
                                                    break;
                                                case 'G':
                                                    regexp.push('[0-9]|1[0-9]|2[0-3]');
                                                    break;
                                                case 'H':
                                                    regexp.push('0[0-9]|1[0-9]|2[0-3]');
                                                    break;
                                                case 'g':
                                                    regexp.push('[0-9]|1[0-2]');
                                                    break;
                                                case 'h':
                                                    regexp.push('0[0-9]|1[0-2]');
                                                    break;
                                                case 'a':
                                                case 'A':
                                                    regexp.push('(am|pm)');
                                                    break;
                                                case 'i':
                                                    regexp.push('[0-5][0-9]');
                                                    break;
                                                case 's':
                                                    regexp.push('[0-5][0-9]');
                                                    break;
                                                case 'U':
                                                    regexp.push('[0-9]+');
                                                    break;
                                                default:
                                                    break;
                                            }

                                        });

                                        // if we have an array of regular expressions
                                        if (regexp.length > 0) {

                                            // we will replace characters in the date's format in reversed order
                                            matches.reverse();

                                            // iterate through the characters in date's format
                                            $.each(matches, function (index, match) {

                                                // replace each character with the appropriate regular expression
                                                format = format.replace(match.character, '(' + regexp[regexp.length - index - 1] + ')');

                                            });

                                            // the final regular expression
                                            regexp = new RegExp('^' + format + '$', 'ig');

                                            // if regular expression was matched
                                            if ((segments = regexp.exec(element.val()))) {

                                                // check if date is a valid date (i.e. there's no February 31)

                                                let original_day = null;
                                                let original_month = null;
                                                let original_year = null;
                                                const english_days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
                                                const english_months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
                                                let iterable = null;

                                                // by default, we assume the date is valid
                                                let valid = true;

                                                // reverse back the characters in the date's format
                                                matches.reverse();

                                                // iterate through the characters in the date's format
                                                $.each(matches, function (index, match) {

                                                    // if the date is not valid, don't look further
                                                    if (!valid) return true;

                                                    // based on the character
                                                    switch (match.character) {

                                                        case 'm':
                                                        case 'n':

                                                            // extract the month from the value entered by the user
                                                            original_month = parseInt(segments[index + 1], 10);

                                                            break;

                                                        case 'd':
                                                        case 'j':

                                                            // extract the day from the value entered by the user
                                                            original_day = parseInt(segments[index + 1], 10);

                                                            break;

                                                        case 'D':
                                                        case 'l':
                                                        case 'F':
                                                        case 'M':

                                                            // if day is given as day name, we'll check against the names in the used language
                                                            if (match.character === 'D' || match.character === 'l') iterable = element.data('Zebra_DatePicker').settings.days;

                                                            // if month is given as month name, we'll check against the names in the used language
                                                            else iterable = element.data('Zebra_DatePicker').settings.months;

                                                            // by default, we assume the day or month was not entered correctly
                                                            valid = false;

                                                            // iterate through the month/days in the used language
                                                            $.each(iterable, function (key, value) {

                                                                // if month/day was entered correctly, don't look further
                                                                if (valid) return true;

                                                                // if month/day was entered correctly
                                                                if (segments[index + 1].toLowerCase() === value.substring(0, (match.character == 'D' || match.character == 'M' ? 3 : value.length)).toLowerCase()) {

                                                                    // extract the day/month from the value entered by the user
                                                                    switch (match.character) {

                                                                        case 'D':
                                                                            segments[index + 1] = english_days[key].substring(0, 3);
                                                                            break;
                                                                        case 'l':
                                                                            segments[index + 1] = english_days[key];
                                                                            break;
                                                                        case 'F':
                                                                            segments[index + 1] = english_months[key];
                                                                            original_month = key + 1;
                                                                            break;
                                                                        case 'M':
                                                                            segments[index + 1] = english_months[key].substring(0, 3);
                                                                            original_month = key + 1;
                                                                            break;

                                                                    }

                                                                    // day/month value is valid
                                                                    valid = true;

                                                                }

                                                            });

                                                            break;

                                                        case 'Y':

                                                            // extract the year from the value entered by the user
                                                            original_year = parseInt(segments[index + 1], 10);

                                                            break;

                                                        case 'y':

                                                            // extract the year from the value entered by the user
                                                            original_year = '19' + parseInt(segments[index + 1], 10);

                                                            break;

                                                    }
                                                });

                                                // if everything was ok so far
                                                if (valid) {

                                                    // if date format does not include day, make day = 1
                                                    if (!original_day) original_day = 1;

                                                    // if date format does not include month, make month = 1
                                                    if (!original_month) original_month = 1;

                                                    // if date format does not include year, use the current year
                                                    if (!original_year) original_year = new Date().getFullYear();

                                                    // generate a Date object using the values entered by the user
                                                    const date = new Date(original_year, original_month - 1, original_day);

                                                    // if, after that, the date is the same as the date entered by the user
                                                    if (date.getFullYear() == original_year && date.getDate() == original_day && date.getMonth() == (original_month - 1)) {

                                                        // set the timestamp as a property of the element
                                                        element.data('timestamp', Date.parse(english_months[original_month - 1] + ' ' + original_day + ', ' + original_year));

                                                        // date is valid
                                                        valid_date = true;

                                                    }

                                                }

                                            }

                                        }

                                        // if date is not valid, the rule doesn't validate
                                        if (!valid_date) control_is_valid = false;

                                    }

                                break;
                            }

                            break;

                        case 'datecompare':

                            // if element type is one of the following
                            switch (attributes['type']) {

                                case 'password':
                                case 'text':
                                case 'textarea':

                                    // if element has a value
                                    if ($.trim(element.val()) !== '') {

                                        // if
                                        if (

                                            // rule is setup correctly
                                            undefined !== control_validation_rules['rules'][rule][0] &&
                                            undefined !== control_validation_rules['rules'][rule][1] &&

                                            // element to compare to exists
                                            $(control_validation_rules['rules'][rule][0]) &&

                                            // element to compare to has a valid date as the value
                                            plugin.validate_control($(control_validation_rules['rules'][rule][0])) === true &&

                                            // current element was validated and contains a valid date as the value
                                            undefined !== element.data('timestamp')

                                        ) {

                                            // compare the two dates according to the comparison operator

                                            const date_id = control_validation_rules['rules'][rule][0];
                                            const date = $('#' + date_id);
                                            switch (control_validation_rules['rules'][rule][1]) {
                                                case '>':

                                                    control_is_valid = (element.data('timestamp') > date.data('timestamp'));
                                                    break;

                                                case '>=':

                                                    control_is_valid = (element.data('timestamp') >= date.data('timestamp'));
                                                    break;

                                                case '<':

                                                    control_is_valid = (element.data('timestamp') < date.data('timestamp'));
                                                    break;

                                                case '<=':

                                                    control_is_valid = (element.data('timestamp') <= date.data('timestamp'));
                                                    break;

                                            }

                                        // otherwise, there is a problem and thus, the rule does not validate
                                        } else control_is_valid = false;

                                        break;

                                    }

                            }

                            break;

                        case 'digits':

                            // if element type is one of the following
                            switch (attributes['type']) {

                                case 'password':
                                case 'text':
                                case 'textarea':

                                    // the regular expression to use:
                                    // 0-9 plus additional characters (if any)
                                    exp = new RegExp('^[0-9' + _escape_regexp(control_validation_rules['rules'][rule][0]).replace(/\s/, '\\s') + ']+$', 'ig');

                                    // if value is not an empty string and the regular expression is not matched, the rule doesn't validate
                                    if ($.trim(element.val()) !== '' && !exp.test(element.val())) control_is_valid = false;

                                    break;
                            }

                            break;

                        case 'email':

                            // if element type is one of the following
                            switch (attributes['type']) {

                                case 'password':
                                case 'text':
                                case 'textarea':

                                    // if
                                    if (

                                        // value is not an empty string
                                        $.trim(element.val()) !== '' &&
                                        (

                                            // email address contains consecutive dots
                                            null !== element.val().match(/\.{2,}/) ||

                                            // email address is longer than the maximum allowed length
                                            element.val().length > 254 ||

                                            // email address has an invalid format
                                            null == element.val().match(/^[^\.][a-z0-9_\-\+\~\^\{\}\.]{1,64}@[a-z0-9_\-\+\~\^\{\}\.]{1,255}\.[a-z0-9]{2,}$/i)

                                        )

                                    ) control_is_valid = false;

                                    break;
                            }

                            break;

                        case 'emails':

                            // if element type is one of the following
                            switch (attributes['type']) {

                                case 'password':
                                case 'text':
                                case 'textarea':

                                    // split addresses by commas
                                    const addresses = element.val().split(',');

                                    // iterate through the email addresses
                                    $.each(addresses, function(index, address) {

                                        // if value is not an empty string and the regular expression is not matched, the rule doesn't validate
                                        if ($.trim(address) !== '' && null == $.trim(address).match(/^([a-zA-Z0-9_\-\+\~\^\{\}]+[\.]?)+@{1}([a-zA-Z0-9_\-\+\~\^\{\}]+[\.]?)+\.[A-Za-z0-9]{2,}$/)) control_is_valid = false;

                                    });

                                    break;

                            }

                            break;

                        case 'filesize':

                            // if element type is one of the following
                            switch (attributes['type']) {

                                case 'file':

                                    // see if a file was uploaded
                                    file_info = element.data('file_info');

                                    // if a file was uploaded
                                    if (file_info)

                                        // if
                                        if (

                                            // there's something wrong with the uploaded file
                                            undefined === file_info[2] ||
                                            undefined === file_info[3] ||

                                            // there was a specific error while uploading the file
                                            file_info[2] != 0 ||

                                            // the uploaded file's size is larger than the allowed size
                                            parseInt(file_info[3], 10) > parseInt(control_validation_rules['rules'][rule][0], 10)

                                        // the rule doesn't validate
                                        ) control_is_valid = false;

                                    break;

                            }

                            break;

                        case 'filetype':

                            // if element type is one of the following
                            switch (attributes['type']) {

                                case 'file':

                                    // see if a file was uploaded
                                    file_info = element.data('file_info');

                                    // if a file was uploaded
                                    if (file_info) {

                                        // if file with mime types was not already loaded
                                        if (undefined === plugin.mimes)

                                            // load file with mime types
                                            $.ajax({
                                                'url':      decodeURIComponent(plugin.settings.assets_path) + 'mimes.json',
                                                'async':    false,
                                                'success':  function(result) {
                                                    plugin.mimes = result;
                                                },
                                                'dataType': 'json'
                                            });

                                        // get the allowed file types
                                        const allowed_file_types = $.map(control_validation_rules['rules'][rule][0].split(','), function (value) {
                                                return $.trim(value)
                                            });

                                        // this will contain an array of file types that match for the currently uploaded file's mime type
                                        const matching_file_types = [];

                                        // iterate through the known mime types
                                        $.each(plugin.mimes, function(extension, type) {

                                            // if
                                            if (

                                                // there are more mime types associated with the file extension and
                                                // the uploaded file's type is among them
                                                $.isArray(type) && $.inArray(file_info[1], type) > -1 ||

                                                // a single mime type is associated with the file extension and
                                                // the uploaded file's type matches the mime type
                                                !$.isArray(type) && type === file_info[1]

                                            )

                                                // add file type to the list of file types that match for the currently uploaded
                                                // file's mime type
                                                matching_file_types.push(extension)

                                        });


                                        // is the file allowed?

                                        let found = false;

                                        // iterate through the mime types associated with the uploaded file
                                        $.each(matching_file_types, function(index, extension) {

                                            // if uploaded file mime type is allowed, set a flag
                                            if ($.inArray(extension, allowed_file_types) > -1) found = true;

                                        });

                                        // if file is not allowed
                                        // the rule doesn't validate
                                        if (!found) control_is_valid = false;

                                    }

                                    break;

                            }

                            break;

                        case 'float':

                            // if element type is one of the following
                            switch (attributes['type']) {

                                case 'password':
                                case 'text':
                                case 'textarea':

                                    // the regular expression to use:
                                    // only digits (0 to 9) and/or one dot (but not as the very first character) and/or one minus sign
                                    // (but only if it is the very first character) plus characters given as additional characters (if any).
                                    exp = new RegExp('^[0-9\-\.' + _escape_regexp(control_validation_rules['rules'][rule][0]).replace(/\s/, '\\s') + ']+$', 'ig');

                                    // if
                                    if (

                                        // value is not an empty string
                                        $.trim(element.val()) !== '' &&

                                        (

                                            // value is a minus sign
                                            $.trim(element.val()) === '-' ||

                                            // value is a dot
                                            $.trim(element.val()) === '.' ||

                                            // there are more than one minus signs
                                            (null != element.val().match(/\-/g) && element.val().match(/\-/g).length > 1) ||

                                            // there are more than one dots
                                            (null != element.val().match(/\./g) && element.val().match(/\./g).length > 1) ||

                                            // if the minus sign is not the very first character
                                            element.val().indexOf('-') > 0 ||

                                            // the regular expression is not matched
                                            !exp.test(element.val())

                                        )

                                    // the rule doesn't validate
                                    ) control_is_valid = false;

                                    break;

                            }

                            break;

                        case 'image':

                            // if element type is one of the following
                            switch (attributes['type']) {

                                case 'file':

                                    // see if a file was uploaded
                                    file_info = element.data('file_info');

                                    // if
                                    if (

                                        // a file was uploaded
                                        file_info &&

                                        // uploaded file is not a valid image type
                                        null == file_info[1].match(/image\/(gif|jpeg|png|pjpeg)/i)

                                    // the rule doesn't validate
                                    ) control_is_valid = false;

                                    break;

                            }

                            break;

                        case 'length':

                            // if element type is one of the following
                            switch (attributes['type']) {

                                case 'password':
                                case 'text':
                                case 'textarea':

                                    // if
                                    if (

                                        // value is not an empty string
                                        element.val() !== '' &&

                                        // lower limit is given and the length of entered value is smaller than it
                                        (undefined != control_validation_rules['rules'][rule][0] && (element.val().length - _maxlength_diff(element)) < control_validation_rules['rules'][rule][0]) ||

                                        // upper limit is given and the length of entered value is greater than it
                                        (undefined != control_validation_rules['rules'][rule][1] && control_validation_rules['rules'][rule][1] > 0 && (element.val().length - _maxlength_diff(element)) > control_validation_rules['rules'][rule][1])

                                    // the rule doesn't validate
                                    ) control_is_valid = false;

                                    break;

                            }

                            break;

                        case 'number':

                            // if element type is one of the following
                            switch (attributes['type']) {

                                case 'password':
                                case 'text':
                                case 'textarea':

                                    // the regular expression to use:
                                    // digits (0 to 9) and/or one minus sign (but only if it is the very first character) plus
                                    // characters given as additional characters (if any).
                                    exp = new RegExp('^[0-9\-' + _escape_regexp(control_validation_rules['rules'][rule][0]).replace(/\s/, '\\s') + ']+$', 'ig');

                                    // if
                                    if (

                                        // value is not an empty string
                                        $.trim(element.val()) !== '' &&

                                        (

                                            // value is a minus sign
                                            $.trim(element.val()) === '-' ||

                                            // there are more than one minus signs
                                            (null != element.val().match(/\-/g) && element.val().match(/\-/g).length > 1) ||

                                            // the minus sign is not the very first character
                                            element.val().indexOf('-') > 0 ||

                                            // the regular expression is not matched
                                            !exp.test(element.val())

                                        )

                                    // the rule doesn't validate
                                    ) control_is_valid = false;

                                    break;

                            }

                            break;

                        case 'range':

                            // if element type is one of the following
                            switch (attributes['type']) {

                                case 'text':

                                    // value is not an empty string
                                    if ($.trim(element.val()) !== '') {

                                        // get the allowed min and max
                                        const min = control_validation_rules['rules'][rule][0][0];
                                        const max = control_validation_rules['rules'][rule][0][1];

                                        // make sure the value is a number
                                        const value = $.trim(parseFloat(element.val()));

                                        // if
                                        if (

                                            // element's value is not a number
                                            isNaN(value) ||

                                            // after applying parseFloat, the value is different than what the user entered
                                            value !== $.trim(element.val()) ||

                                            // or the value is not within range
                                            (!((min === 0 || value >= min) && (max === 0 || value <= max)))

                                        // the rule doesn't validate
                                        ) control_is_valid = false;

                                    }

                                    break;

                            }

                            break;

                        case 'regexp':

                            // if element type is one of the following
                            switch (attributes['type']) {

                                case 'password':
                                case 'text':
                                case 'textarea':

                                    // the regular expression to use
                                    exp = new RegExp(control_validation_rules['rules'][rule][0], 'g');

                                    // if value is not an empty string and the regular expression is not matched, the rule doesn't validate
                                    if ($.trim(element.val()) !== '' && null == exp.exec(element.val())) control_is_valid = false;

                                    break;

                            }

                            break;

                        case 'required':

                            // if element type is one of the following
                            switch (attributes['type']) {

                                case 'checkbox':
                                case 'radio':

                                    // by default, we assume there's nothing checked
                                    let checked = false;

                                    // iterate through the controls sharing the same name as the current element
                                    controls_groups[attributes['id']].each(function() {

                                        // if any of them is checked set a flag
                                        if (this.checked) checked = true;

                                    });

                                    // if nothing is checked, the rule doesn't validate
                                    if (!checked) control_is_valid = false;

                                    break;

                                case 'file':
                                case 'password':
                                case 'text':
                                case 'textarea':

                                    // if value is am empty string, the rule doesn't validate
                                    if ($.trim(element.val()) === '') control_is_valid = false;

                                    break;

                                case 'select-one':

                                    // if select control is part of a time-selection element, and no value is selected
                                    if (element.hasClass('time') && element.get(0).selectedIndex === 0) {

                                        // the error message is set for a nonexisting control with the name set when
                                        // creating the form; the actual controls have a suffix of "hours", "minutes",
                                        // "seconds" and "ampm"; so, in order to show the error message we need to
                                        // remove the suffix
                                        attributes['id'] = attributes['id'].replace(/\_(hours|minutes|seconds|ampm)$/, '');

                                        // the rule doesn't validate
                                        control_is_valid = false;

                                    // for other select boxes
                                    } else if (

                                        // if
                                        (

                                            // the "other" attribute is set
                                            element.hasClass('other') &&

                                            // the "other" value is set
                                            element.val() === 'other' &&

                                            // nothing is entered in the attached "other" field
                                            (!$('#' + attributes['id'] + '_other').length || $.trim($('#' + attributes['id'] + '_other').val()).empty())

                                        ) ||

                                        // nothing is selected
                                        element.get(0).selectedIndex === 0

                                    // the rule doesn't validate
                                    ) control_is_valid = false;

                                    break;

                                case 'select-multiple':

                                    // if nothing is selected, the rule doesn't validate
                                    if (element.get(0).selectedIndex === -1) control_is_valid = false;

                                    break;

                            }

                            break;

                        case 'upload':

                            // if element type is one of the following
                            switch (attributes['type']) {

                                case 'file':

                                    // see if a file was uploaded
                                    file_info = element.data('file_info');

                                    // if
                                    if (

                                        // if a file was uploaded
                                        file_info &&

                                        // a file was not successfully uploaded
                                        (!file_info[2] || file_info[2] != 0)

                                    // the rule doesn't validate
                                    ) control_is_valid = false;

                                    break;

                            }

                            break;

                        case 'url':

                            // if element type is one of the following
                            switch (attributes['type']) {

                                case 'password':
                                case 'text':
                                case 'textarea':

                                    // the regular expression to use:
                                    exp = new RegExp("^(http(s)?://)" + (control_validation_rules['rules'][rule][0] === true ? '' : '?') + "[^\\s\\.]+\\..{2,}", 'i');

                                    // if
                                    if (

                                        // value is not an empty string
                                        $.trim(element.val()) !== '' &&

                                        // the regular expression is not matched
                                        !exp.test(element.val())

                                    // the rule doesn't validate
                                    ) control_is_valid = false;

                                    break;

                            }

                            break;

                    }

                    // if the rule didn't validate
                    if (!control_is_valid) {

                        // the name of the rule that didn't validate
                        rule_not_passed = rule;

                        // for custom rules, we know the error message
                        if (rule === 'custom') control_validation_rules.message = custom_rule_error_message;

                        // for other rules set the error message's text
                        else control_validation_rules.message = plugin.settings.validation_rules[id][rule_not_passed][plugin.settings.validation_rules[id][rule_not_passed].length - (rule_not_passed === 'length' && plugin.settings.validation_rules[id][rule_not_passed].length === 4 ? 2 : 1)];

                        // save the element's value
                        control_validation_rules.value = element.val();

                    }

                }

            }

            // return TRUE if the all the rules were obeyed or the name of the rule if a rule didn't validate
            return (control_is_valid ? true : rule_not_passed);

        }

        /**
         *  Checks if form is valid or not
         *
         *  @return boolean     Returns TRUE if all the form's controls are valid or FALSE otherwise.
         */
        plugin.validate = function() {

            let element,

                // by default, we assume the form validates
                form_is_valid = true;

            // clear any error tips that might be visible
            plugin.clear_errors();

            // reset this variable
            proxies_cache = {};

            // iterate through all the validation rules
            for (let index in validation_rules) {

                // if form is not valid, and we don't need to check all controls, don't check any further
                if (!form_is_valid && !plugin.settings.validate_all) break;

                // get the element that needs to be validated
                element = validation_rules[index]['element'];

                // if element does not validate, the form is not valid
                if (plugin.validate_control(element) !== true) form_is_valid = false;

            }

            // if there are any errors, show them
            if (!form_is_valid && undefined === arguments[0]) plugin.show_errors();

            // set this flag to true
            // this is used for not running this method twice when using
            // if ($form->validate()) $form->submit();
            validated = true;

            // return the result of the validation
            return form_is_valid;

        }


        // fire up the plugin!
        // call the "constructor" method
        plugin.init();

    }

    $.fn.Zebra_Form = function(options) {

        return this.each(function() {
            const plugin = new $.Zebra_Form(this, options);
            $(this).data('Zebra_Form', plugin);
            if (typeof plugin.settings.on_ready === 'function') plugin.settings.on_ready($(this).attr('id'));
        });

    }

})(jQuery);
