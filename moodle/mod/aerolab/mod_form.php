<?php
// This file is part of Moodle - http://moodle.org/
// АэроЛаб: форма создания/редактирования активности.

defined('MOODLE_INTERNAL') || die();

require_once($CFG->dirroot . '/course/moodleform_mod.php');
require_once(__DIR__ . '/lib.php');

class mod_aerolab_mod_form extends moodleform_mod {

    public function definition() {
        $mform = $this->_form;

        $mform->addElement('header', 'general', get_string('general', 'form'));

        $mform->addElement('text', 'name', get_string('aerolabname', 'aerolab'), ['size' => 64]);
        $mform->setType('name', PARAM_TEXT);
        $mform->addRule('name', null, 'required', null, 'client');

        $this->standard_intro_elements(get_string('description', 'aerolab'));

        // ── Источник тренажёра ─────────────────────────────
        $mform->addElement('header', 'aerolabhdr', get_string('aerolabsettings', 'aerolab'));

        $defaultbaseurl = get_config('mod_aerolab', 'defaultbaseurl');
        if (!$defaultbaseurl) {
            $defaultbaseurl = AEROLAB_DEFAULT_BASEURL;
        }
        $mform->addElement('text', 'baseurl', get_string('baseurl', 'aerolab'), ['size' => 80]);
        $mform->setType('baseurl', PARAM_URL);
        $mform->addHelpButton('baseurl', 'baseurl', 'aerolab');
        $mform->setDefault('baseurl', $defaultbaseurl);

        $mform->addElement('text', 'iframeheight', get_string('iframeheight', 'aerolab'), ['size' => 6]);
        $mform->setType('iframeheight', PARAM_INT);
        $defaultheight = (int)get_config('mod_aerolab', 'defaultheight');
        if ($defaultheight < 200 || $defaultheight > 2000) {
            $defaultheight = 720;
        }
        $mform->setDefault('iframeheight', $defaultheight);
        $mform->addHelpButton('iframeheight', 'iframeheight', 'aerolab');

        $mform->addElement('checkboxgroup', 'required',
            get_string('requiredtasks', 'aerolab'), aerolab_achievements());
        $mform->addHelpButton('required', 'requiredtasks', 'aerolab');
        if (!empty($this->instance) && isset($this->instance->required)) {
            $decoded = json_decode((string)$this->instance->required, true);
            $mform->setDefault('required', is_array($decoded) ? $decoded : []);
        }

        // Оценка (maxgrade) + элементы завершения курса автоматически.
        $this->standard_grading_coursemodule_elements();
        $this->standard_coursemodule_elements();

        $this->add_action_buttons();
    }

    public function validation($data, $files) {
        $errors = parent::validation($data, $files);

        if (empty($data['required'])) {
            $errors['required'] = get_string('requiredatleastone', 'aerolab');
        }
        $height = isset($data['iframeheight']) ? (int)$data['iframeheight'] : 720;
        if ($height < 200 || $height > 2000) {
            $errors['iframeheight'] = get_string('heighterror', 'aerolab');
        }
        return $errors;
    }
}
