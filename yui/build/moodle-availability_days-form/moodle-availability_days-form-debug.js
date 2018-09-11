YUI.add('moodle-availability_days-form', function (Y, NAME) {

/*
 * JavaScript for form editing days conditions.
 *
 * @module moodle-availability_days-form
 */
// jshint unused:false, undef:false

M.availability_days = M.availability_days || {};

/*
 * @class M.availability_days.form
 * @extends M.core_availability.plugin
 */
M.availability_days.form = Y.Object(M.core_availability.plugin);

/*
 * Groupings available for selection (alphabetical order).
 *
 * @property days
 * @type Array
 */
M.availability_days.form.days = null;

/*
 * Initialises this plugin.
 *
 * @method initInner
 * @param {Array} standardFields Array of objects with .field, .display
 * @param {Array} customFields Array of objects with .field, .display
 */
M.availability_days.form.initInner = function(html) {
    this.datepickerhtml = html;
};

M.availability_days.form.getNode = function(json) {
    // Create HTML structure.
    var strings = M.str.availability_days;

    if (json.d === undefined) {
        json.d = '';
    }

    var html = '<div class="availability-group"><label>';
    html += ' <input type="text" size="4" name="field" class="availability_days_settings" value="' + json.d + '">';
    html +=  '&nbsp;';
    html += '<select name="units" class="custom-select availability_days_settings">' +
        '<option value="years">' + M.util.get_string('years', 'availability_days') + '</option>' +
        '<option value="months">' + M.util.get_string('months', 'availability_days') + '</option>' +
        '<option value="weeks">' + M.util.get_string('weeks', 'availability_days') + '</option>' +
        '<option value="days">' + M.util.get_string('days', 'availability_days') + '</option>' +
        '<option value="minutes">' + M.util.get_string('minutes', 'availability_days') + '</option>' +
        '<option value="seconds">' + M.util.get_string('seconds', 'availability_days') + '</option>' +
        '</select>';
    html +=  '&nbsp;';
    html += strings.conditiontitle;
    html += '</label></div>';
    html += '<div class="availability-group"><label>' + M.util.get_string('applyrestrictionforuserafter', 'availability_days') + '</label></div>';

    html += '<div class="availability-group"><label>' +
        this.datepickerhtml +
        '<input type="checkbox" class="availability_days_settings" name="enableenrolledafter" id="enableenrolledafter"/>' + M.util.get_string('enableenrolledafter', 'availability_days') +
        '</label></div>';

    var node = Y.Node.create('<span>' + html + '</span>');

    // Set initial values if specified.
    node.one('input[name=field]').set('value', json.d);

    // Set initial values if specified.
    var eeaval = false;
    if (json.eea !== undefined) {
        eeaval = json.eea;
    }
    node.one('input[name=enableenrolledafter]').set('checked', eeaval);
    node.all('span.datefields select').set('disabled', !eeaval);

    var val = 'days';
    if (json.units !== undefined) {
        val = json.units;
    }
    node.one('select[name=units]').set("value", val);

    if (json.t !== undefined) {
        node.setData('time', json.t);
        // Disable everything.
        node.all('span.datefields)').each(function(select) {
            select.set('disabled', true);
        });

        var url = M.cfg.wwwroot + '/availability/condition/days/ajax.php?action=fromtime' +
            '&time=' + json.t;
        Y.io(url, {on: {
                success: function(id, response) {
                    var fields = Y.JSON.parse(response.responseText);
                    for (var field in fields) {
                        var select = node.one('select[name=x\\[' + field + '\\]]');
                        select.set('value', '' + fields[field]);
                    }
                },
                failure: function() {
                    window.alert(M.util.get_string('ajaxerror', 'availability_days'));
                }
            }});
    } else {
        // Set default time that corresponds to the HTML selectors.
        node.setData('time', this.defaultTime);
    }

    // Add event handlers (first time only).
    if (!M.availability_days.form.addedEvents) {
        M.availability_days.form.addedEvents = true;
        var updateForm = function(input) {
            var ancestorNode = input.ancestor('span.availability_days');
            M.core_availability.form.update();
        };
        var root = Y.one('#fitem_id_availabilityconditionsjson');
        root.delegate('change', function() {
             updateForm(this);
        }, '.availability_days_settings');

        root.delegate('change', function() {
            // Update time using AJAX call from root node.
            M.availability_days.form.updateTime(this.ancestor('span.availability_days'));
        }, '.availability_days span.datefields');

        root.delegate('change', function() {
            Y.all('span.datefields select').set('disabled', !Y.one('.availability_days #enableenrolledafter').get('checked'));
        }, '.availability_days #enableenrolledafter');
    }

    if (node.one('a[href=#]')) {
        // Add the date selector magic.
        M.form.dateselector.init_single_date_selector(node);

        // This special handler detects when the date selector changes the year.
        var yearSelect = node.one('select[name=x\\[year\\]]');
        var oldSet = yearSelect.set;
        yearSelect.set = function(name, value) {
            oldSet.call(yearSelect, name, value);
            if (name === 'selectedIndex') {
                // Do this after timeout or the other fields haven't been set yet.
                setTimeout(function() {
                    M.availability_days.form.updateTime(node);
                }, 0);
            }
        };
    }

    return node;
};

/**
 * Updates time from AJAX. Whenever the field values change, we recompute the
 * actual time via an AJAX request to Moodle.
 *
 * This will set the 'time' data on the node and then update the form, once it
 * gets an AJAX response.
 *
 * @method updateTime
 * @param {Y.Node} component Node for plugin controls
 */
M.availability_days.form.updateTime = function(node) {
    // After a change to the date/time we need to recompute the
    // actual time using AJAX because it depends on the user's
    // time zone and calendar options.
    var url = M.cfg.wwwroot + '/availability/condition/days/ajax.php?action=totime' +
        '&year=' + node.one('select[name=x\\[year\\]]').get('value') +
        '&month=' + node.one('select[name=x\\[month\\]]').get('value') +
        '&day=' + node.one('select[name=x\\[day\\]]').get('value') +
        '&hour=' + node.one('select[name=x\\[hour\\]]').get('value') +
        '&minute=' + node.one('select[name=x\\[minute\\]]').get('value');
    Y.io(url, {on: {
            success: function(id, response) {
                node.setData('time', response.responseText);
                M.core_availability.form.update();
            },
            failure: function() {
                window.alert(M.util.get_string('ajaxerror', 'availability_date'));
            }
        }});
};

M.availability_days.form.fillValue = function(value, node) {
    // Set field.
    value.d = node.one('input[name=field]').get('value');
    value.units = node.one('select[name=units]').get('value');
    value.t = parseInt(node.getData('time'), 10);
    value.eea = node.one('input[name=enableenrolledafter]').get('checked');
};

}, '@VERSION@', {"requires": ["base", "node", "event", "io", "moodle-core_availability-form"]});
