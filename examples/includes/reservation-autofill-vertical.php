<h2>A meeting room reservation form</h2>

<p>All fields will be automatically filled with random values - very useful for when debugging forms. The random values will obey the rules set for each element!</p>

<?php

    // include the Zebra_Form class
    require '../Zebra_Form.php';

    // instantiate a Zebra_Form object
    $form = new Zebra_Form('formik');

    // auto-fill fields with random values
    // very useful for when debugging forms
    $form->auto_fill();

    // the label for the "name" element
    $form->add('label', 'label_name', 'name', 'Your name:');

    // add the "name" element
    $obj = $form->add('text', 'name');

    // set rules
    $obj->set_rule(array(

        // error messages will be sent to a variable called "error", usable in custom templates
        'required' => array('error', 'Name is required!')

    ));

    // "email"
    $form->add('label', 'label_email', 'email', 'Your email address:');
    $obj = $form->add('text', 'email');
    $obj->set_rule(array(
        'required'  =>  array('error', 'Email is required!'),
        'email'     =>  array('error', 'Email address seems to be invalid!'),
    ));

    // "department"
    $form->add('label', 'label_department', 'department', 'Department:');
    $obj = $form->add('select', 'department', '', array('other' => true));
    $obj->add_options(array(
        'Marketing',
        'Operations',
        'Customer Service',
        'Human Resources',
        'Sales Department',
        'Accounting Department',
        'Legal Department',
    ));
    $obj->set_rule(array(
        'required' => array('error', 'Department is required!')
    ));

    // "room"
    $form->add('label', 'label_room', 'room', 'Which room would you like to reserve:');
    $obj = $form->add('radios', 'room', array(
        'A' =>  'Room A',
        'B' =>  'Room B',
        'C' =>  'Room C',
    ));
    $obj->set_rule(array(
        'required' => array('error', 'Room selection is required!')
    ));

    // "extra"
    $form->add('label', 'label_extra', 'extra', 'Extra requirements:');
    $obj = $form->add('checkboxes', 'extra[]', array(
        'flipchard'     =>  'Flipchard and pens',
        'plasma'        =>  'Plasma TV screen',
        'beverages'     =>  'Coffee, tea and mineral water',
    ));

    // "date"
    $form->add('label', 'label_date', 'date', 'Reservation date');
    $date = $form->add('date', 'date');
    $date->set_rule(array(
        'required'      =>  array('error', 'Date is required!'),
        'date'          =>  array('error', 'Date is invalid!'),
    ));

    // date format
    // don't forget to use $date->get_date() if the form is valid to get the date in YYYY-MM-DD format ready to be used
    // in a database or with PHP's strtotime function!
    $date->format('M d, Y');

    $form->add('note', 'note_date', 'date', 'Date format is M d, Y');

    // "time"
    $form->add('label', 'label_time', 'time', 'Reservation time :');
    $obj = $form->add('time', 'time', '', array(
        'format'    =>  'hm',
        'hours'     =>  array(9, 10, 11, 12, 13, 14, 15, 16, 17),
        'minutes'   =>  array(0, 30),
    ));

    $obj->set_rule(array(
        'required'      =>  array('error', 'Time is required!'),
    ));

    // "submit"
    $form->add('submit', 'btnsubmit', 'Submit');

    // if the form is valid
    if ($form->validate()) {

        // show results
        show_results();

    // otherwise
    } else {

        // generate output using a custom template
        $form->render();
    }

?>