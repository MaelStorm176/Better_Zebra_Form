<h2>A login form</h2>

<?php

    // include the Zebra_Form class
    require '../Zebra_Form.php';

    // instantiate a Zebra_Form object
    $form = new Zebra_Form('form', 'post', '', array('autocomplete' => 'off'));

    // the label for the "email" element
    $form->add('label', 'label_email', 'email', 'Email');

    // add the "email" element
    $obj = $form->add('text', 'email');

    // set rules
    $obj->set_rule(array(

        // error messages will be sent to a variable called "error", usable in custom templates
        'required'  =>  array('error', 'Email is required!'),
        'email'     =>  array('error', 'Email address seems to be invalid!'),

    ));

    // "password"
    $form->add('label', 'label_password', 'password', 'Password');
    $obj = $form->add('password', 'password');
    $obj->set_rule(array(
        'required'  => array('error', 'Password is required!'),
        'length'    => array(6, 10, 'error', 'The password must have between 6 and 10 characters!'),
    ));

    // "remember me"
    $form->add('checkbox', 'remember_me', 'yes');
    $form->add('label', 'label_remember_me_yes', 'remember_me_yes', 'Remember me', array('style' => 'font-weight:normal'));

    // "submit"
    $form->add('submit', 'btnsubmit', 'Submit');

    // if the form is valid
    if ($form->validate()) {
        show_results();
    }
    else
    {
        echo "Rendered form: <br /><br />";
        // auto generate output, labels above form elements
        $form->render();
    }

?>
