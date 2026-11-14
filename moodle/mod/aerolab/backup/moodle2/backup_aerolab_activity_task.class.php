<?php
// This file is part of Moodle - http://moodle.org/
// АэроЛаб: задача бэкапа экземпляра активности.

defined('MOODLE_INTERNAL') || die();

require_once($CFG->dirroot . '/mod/aerolab/backup/moodle2/backup_aerolab_stepslib.php');

class backup_aerolab_activity_task extends backup_activity_task {

    protected function define_my_settings() {
        // Для АэроЛаб нет своих настроек бэкапа (прогресс учеников не переносится).
    }

    protected function define_my_steps() {
        $this->add_step(new backup_aerolab_activity_structure_step('aerolab_structure', 'aerolab.xml'));
    }

    public static function encode_content_links($content) {
        // Ссылок на другие активности плагин не хранит.
        return $content;
    }
}
