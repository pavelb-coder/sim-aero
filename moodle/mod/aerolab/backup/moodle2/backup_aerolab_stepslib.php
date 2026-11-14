<?php
// This file is part of Moodle - http://moodle.org/
// АэроЛаб: шаги бэкапа.

defined('MOODLE_INTERNAL') || die();

class backup_aerolab_activity_structure_step extends backup_activity_structure_step {

    protected function define_structure() {
        $aerolab = new backup_nested_element('aerolab', ['id'], [
            'name', 'intro', 'introformat', 'grade',
            'required', 'baseurl', 'iframeheight',
            'timecreated', 'timemodified',
        ]);

        $aerolab->set_source_table('aerolab', ['id' => backup::VAR_ACTIVITYID]);
        // Файлы, прикрепленные к описанию активности.
        $aerolab->annotate_files('mod_aerolab', 'intro', 'id');

        return $this->prepare_activity_structure($aerolab);
    }
}
