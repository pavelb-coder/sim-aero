<?php
// This file is part of Moodle - http://moodle.org/
// АэроЛаб: отчёт для учителя — кто и что выполнил.

require_once(__DIR__ . '/../../config.php');
require_once(__DIR__ . '/lib.php');
require_once($CFG->libdir . '/enrollib.php');

$id = required_param('id', PARAM_INT);          // course module id
$download = optional_param('download', '', PARAM_ALPHA);

$cm = get_coursemodule_from_id('aerolab', $id, 0, false, MUST_EXIST);
$course = $DB->get_record('course', ['id' => $cm->course], '*', MUST_EXIST);
$instance = $DB->get_record('aerolab', ['id' => $cm->instance], '*', MUST_EXIST);

require_login($course, true, $cm);
$context = context_module::instance($cm->id);
require_capability('mod/aerolab:manage', $context);

$known = aerolab_achievements();
$required = aerolab_required_ids($instance);
$users = get_enrolled_users($context, 'mod/aerolab:view', 0, 'u.id, u.firstname, u.lastname, u.email');

$rows = [];
foreach ($users as $user) {
    $map = aerolab_progress_map($instance->id, $user->id);
    $detail = $DB->get_records('aerolab_progress',
        ['aerolabid' => $instance->id, 'userid' => $user->id], '', 'achievement, source, timecreated');
    $donecount = 0;
    $sources = [];
    $lasttime = 0;
    foreach ($required as $achid) {
        if (isset($map[$achid])) {
            $donecount++;
            $src = isset($detail[$achid]) ? $detail[$achid]->source : 'auto';
            $sources[] = $achid . ':' . $src;
            if (isset($detail[$achid]) && $detail[$achid]->timecreated > $lasttime) {
                $lasttime = $detail[$achid]->timecreated;
            } elseif ($map[$achid] > $lasttime) {
                $lasttime = $map[$achid];
            }
        }
    }
    $rows[] = [
        'detail' => $detail,
        'user' => fullname($user),
        'userid' => $user->id,
        'done' => $donecount,
        'total' => count($required),
        'complete' => count($required) > 0 && $donecount === count($required),
        'sources' => implode(' ', $sources),
        'lasttime' => $lasttime,
        'map' => $map,
    ];
}

// ── CSV-выгрузка ─────────────────────────────────────
if ($download === 'csv') {
    $filename = 'aerolab-report-' . $instance->id . '-' . date('Ymd-His') . '.csv';
    header('Content-Type: text/csv; charset=utf-8');
    header('Content-Disposition: attachment; filename="' . $filename . '"');
    $out = fopen('php://output', 'w');
    fwrite($out, "\xEF\xBB\xBF"); // BOM для Excel
    $header = ['Ученик', 'Выполнено', 'Итого'];
    foreach ($required as $achid) {
        $header[] = $known[$achid];
    }
    $header[] = 'Источники';
    $header[] = 'Последнее событие';
    fputcsv($out, $header, ';');
    foreach ($rows as $row) {
        $line = [$row['user'], $row['done'], $row['total']];
        foreach ($required as $achid) {
            $line[] = isset($row['map'][$achid]) ? 'да (' . date('Y-m-d H:i', $row['map'][$achid]) . ')' : 'нет';
        }
        $line[] = $row['sources'];
        $line[] = $row['lasttime'] ? date('Y-m-d H:i', $row['lasttime']) : '—';
        fputcsv($out, $line, ';');
    }
    fclose($out);
    exit;
}

$PAGE->set_url('/mod/aerolab/report.php', ['id' => $id]);
$PAGE->set_context($context);
$PAGE->set_title($course->shortname . ': ' . $instance->name);
$PAGE->set_heading($course->fullname);

echo $OUTPUT->header();
echo $OUTPUT->heading(get_string('reportname', 'aerolab') . ': ' . format_string($instance->name, true, ['context' => $context]), 3);

echo html_writer::div(
    html_writer::link(new moodle_url('/mod/aerolab/report.php', ['id' => $id, 'download' => 'csv']),
        get_string('downloadcsv', 'aerolab'), ['class' => 'btn btn-secondary btn-sm']),
    'mb-3'
);

if (empty($rows)) {
    echo $OUTPUT->notification(get_string('noreusers', 'aerolab'), 'info');
} else {
    $table = new html_table();
    $table->attributes['class'] = 'generaltable aerolab-report-table';
    $head = [get_string('report_student', 'aerolab'), get_string('report_progress', 'aerolab')];
    foreach ($required as $achid) {
        $head[] = s($known[$achid]);
    }
    $head[] = get_string('report_status', 'aerolab');
    $head[] = get_string('report_time', 'aerolab');
    $table->head = $head;

    foreach ($rows as $row) {
        $cells = [s($row['user']), $row['done'] . ' / ' . $row['total']];
        foreach ($required as $achid) {
            if (isset($row['map'][$achid])) {
                $d = isset($row['detail'][$achid]) ? $row['detail'][$achid]->source : 'auto';
                $cells[] = html_writer::span('✓ ' . get_string('source_' . $d, 'aerolab'), 'aerolab-cell-done');
            } else {
                $cells[] = html_writer::span('—', 'aerolab-cell-pending');
            }
        }
        $cells[] = $row['complete']
            ? html_writer::span(get_string('report_complete', 'aerolab'), 'badge badge-success')
            : html_writer::span(get_string('report_pending', 'aerolab'), 'badge badge-warning');
        $cells[] = $row['lasttime'] ? userdate($row['lasttime']) : '—';
        $table->data[] = $cells;
    }
    echo html_writer::table($table);
}

echo $OUTPUT->footer();
