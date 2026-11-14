<?php
// This file is part of Moodle - http://moodle.org/
// АэроЛаб: глобальные настройки плагина (Администрирование → Плагины → Модули → АэроЛаб).

defined('MOODLE_INTERNAL') || die();

require_once(__DIR__ . '/lib.php');

if ($ADMIN->fulltree) {
    $settings->add(new admin_setting_heading(
        'mod_aerolab/general',
        get_string('adminheading', 'aerolab'),
        get_string('adminheading_desc', 'aerolab')
    ));

    $settings->add(new admin_setting_configtext(
        'mod_aerolab/defaultbaseurl',
        get_string('defaultbaseurl', 'aerolab'),
        get_string('defaultbaseurl_desc', 'aerolab'),
        AEROLAB_DEFAULT_BASEURL,
        PARAM_URL
    ));

    $settings->add(new admin_setting_configtext(
        'mod_aerolab/defaultheight',
        get_string('defaultheight', 'aerolab'),
        get_string('defaultheight_desc', 'aerolab'),
        '720',
        PARAM_INT
    ));
}
