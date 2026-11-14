<?php
// This file is part of Moodle - http://moodle.org/
// АэроЛаб: список всех активностей «АэроЛаб» в курсе.

require_once(__DIR__ . '/../../config.php');
require_once(__DIR__ . '/lib.php');
require_once($CFG->dirroot . '/course/lib.php');

$id = required_param('id', PARAM_INT); // course id
$course = $DB->get_record('course', ['id' => $id], '*', MUST_EXIST);

require_login($course);
$context = context_course::instance($course->id);

$PAGE->set_url('/mod/aerolab/index.php', ['id' => $id]);
$PAGE->set_title($course->shortname . ': ' . get_string('pluginname', 'aerolab'));
$PAGE->set_heading($course->fullname);

echo $OUTPUT->header();
echo $OUTPUT->heading(get_string('pluginname', 'aerolab'), 2);

$instances = get_all_instances_in_course('aerolab', $course);
if (empty($instances)) {
    notice(get_string('noinstances', 'aerolab'), new moodle_url('/course/view.php', ['id' => $course->id]));
}

$table = new html_table();
$table->attributes['class'] = 'generaltable';
$table->head = [get_string('aerolabname', 'aerolab'), get_string('requiredtasks', 'aerolab')];
$known = aerolab_achievements();
foreach ($instances as $instance) {
    $link = html_writer::link(
        new moodle_url('/mod/aerolab/view.php', ['id' => $instance->coursemodule]),
        format_string($instance->name)
    );
    $required = json_decode((string)$instance->required, true) ?: [];
    $names = [];
    foreach ($required as $achid) {
        if (isset($known[$achid])) {
            $names[] = format_string($known[$achid]);
        }
    }
    $table->data[] = [$link, implode(', ', $names)];
}
echo html_writer::table($table);

echo $OUTPUT->footer();
