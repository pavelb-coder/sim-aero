<?php
// This file is part of Moodle - http://moodle.org/
// АэроЛаб: JSON endpoint для фиксации достижений (вызывается из view.php через fetch).

define('AJAX_SCRIPT', true);

require_once(__DIR__ . '/../../config.php');
require_once(__DIR__ . '/lib.php');

$cmid = required_param('id', PARAM_INT);
$action = required_param('action', PARAM_ALPHA);

$cm = get_coursemodule_from_id('aerolab', $cmid, 0, false, MUST_EXIST);
$course = $DB->get_record('course', ['id' => $cm->course], '*', MUST_EXIST);
$instance = $DB->get_record('aerolab', ['id' => $cm->instance], '*', MUST_EXIST);

require_login($course, false, $cm);
$context = context_module::instance($cm->id);
require_capability('mod/aerolab:view', $context);
require_sesskey();

$known = aerolab_achievements();
$required = aerolab_required_ids($instance);

$response = ['status' => 'error'];

if ($action === 'record') {
    $achievement = required_param('achievement', PARAM_ALPHANUMEXT);
    $source = optional_param('source', 'auto', PARAM_ALPHA);
    if (isset($known[$achievement])) {
        aerolab_record_progress($instance, $USER->id, $achievement, $source);
        $response = ['status' => 'ok'] + aerolab_ajax_payload($instance, $USER->id, $required);
    }
} else if ($action === 'sync') {
    $achievements = optional_param_array('achievements', [], PARAM_ALPHANUMEXT);
    foreach ($achievements as $achievement) {
        if (isset($known[$achievement])) {
            aerolab_record_progress($instance, $USER->id, $achievement, 'auto');
        }
    }
    $response = ['status' => 'ok'] + aerolab_ajax_payload($instance, $USER->id, $required);
} else if ($action === 'manual_all') {
    // Самозачёт: фиксируем все требуемые достижения с пометкой manual (видно учителю в отчёте).
    foreach ($required as $achievement) {
        aerolab_record_progress($instance, $USER->id, $achievement, 'manual');
    }
    $response = ['status' => 'ok'] + aerolab_ajax_payload($instance, $USER->id, $required);
}

// Проставить оценку, если всё выполнено (никогда не снижает существующую).
aerolab_update_grades($instance, $USER->id);

header('Content-Type: application/json; charset=utf-8');
echo json_encode($response, JSON_UNESCAPED_UNICODE);

/**
 * Срез состояния для клиента.
 */
function aerolab_ajax_payload($instance, $userid, array $required) {
    $map = aerolab_progress_map($instance->id, $userid);
    $done = [];
    foreach ($required as $achid) {
        if (isset($map[$achid])) {
            $done[] = $achid;
        }
    }
    return [
        'done' => $done,
        'total' => count($required),
        'donecount' => count($done),
        'alldone' => count($required) > 0 && count($done) === count($required),
    ];
}
