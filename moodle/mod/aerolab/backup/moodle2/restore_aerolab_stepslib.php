<?php
// This file is part of Moodle - http://moodle.org/
// АэроЛаб: шаги восстановления.

defined('MOODLE_INTERNAL') || die();

class restore_aerolab_activity_structure_step extends restore_activity_structure_step {

    protected function define_structure() {
        $paths = [];
        $paths[] = new restore_path_element('aerolab', '/aerolab/aerolab');
        return $this->prepare_activity_structure($paths);
    }

    /**
     * Восстановить запись активности. Прогресс учеников намеренно не переносится.
     */
    public function process_aerolab($data) {
        global $DB;

        $data = (object)$data;
        $oldid = $data->id;
        unset($data->id);
        $data->course = $this->get_courseid();
        // required хранится как JSON-строка — восстанавливается как есть.
        $newitemid = $DB->insert_record('aerolab', $data);
        $this->apply_activity_instance($newitemid);
        $this->set_mapping('aerolab', $oldid, $newitemid, true);
    }
}
