<?php
// This file is part of Moodle - http://moodle.org/
// АэроЛаб: задача восстановления активности.

defined('MOODLE_INTERNAL') || die();

require_once($CFG->dirroot . '/mod/aerolab/backup/moodle2/restore_aerolab_stepslib.php');

class restore_aerolab_activity_task extends restore_activity_task {

    protected function define_my_settings() {
        // Нет своих настроек восстановления.
    }

    protected function define_my_steps() {
        $this->add_step(new restore_aerolab_activity_structure_step('aerolab_structure', 'aerolab.xml'));
    }

    public static function define_decode_contents() {
        return [];
    }

    public static function define_decode_rules() {
        return [];
    }

    public static function define_restore_log_rules() {
        return [];
    }

    public static function define_restore_log_rules_for_course() {
        return [];
    }

    public function after_execute() {
        $this->add_related_files('mod_aerolab', 'intro', null);
    }
}
