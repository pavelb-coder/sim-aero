<?php
// This file is part of Moodle - http://moodle.org/
// АэроЛаб · mod_aerolab · базовые функции плагина (обязательный файл lib.php).

defined('MOODLE_INTERNAL') || die();

require_once($CFG->libdir . '/gradelib.php');

/** Адрес АэроЛаб по умолчанию (переопределяется в админке и в каждой активности). */
const AEROLAB_DEFAULT_BASEURL = 'https://pavelb-coder.github.io/sim-aero/';

/**
 * Реестр достижений АэроЛаб. ЗЕРКАЛО js/main.js → ACHIEVEMENTS.
 * При добавлении нового достижения в АэроЛаб — добавить сюда же.
 *
 * @return array id => читаемое название
 */
function aerolab_achievements() {
    return [
        'stall_hunter' => 'Укротитель срыва',
        'polar_master' => 'Полярная эксперт',
        'venturi_ace'  => 'Мастер Бернулли',
        'prop_master'  => 'Винтомоторник',
        'builder_ok'   => 'Сборщик',
        'pid_zone'     => 'PID-шепотун',
        'pixhawk_ok'   => 'Настройщик Pixhawk',
        'wiring_ok'    => 'Сборщик БПЛА',
        'quiz_ace'     => 'Аэро-Эрудит',
        'clearance'    => 'Допуск к полётам',
    ];
}

/**
 * id достижений, требуемых для зачёта этой активности.
 *
 * @param stdClass $instance запись таблицы aerolab
 * @return string[]
 */
function aerolab_required_ids($instance) {
    $ids = json_decode((string)$instance->required, true);
    if (!is_array($ids)) {
        return [];
    }
    $known = aerolab_achievements();
    return array_values(array_filter($ids, function ($id) use ($known) {
        return isset($known[$id]);
    }));
}

/**
 * Карта прогресса ученика: achievement => timecreated.
 *
 * @return array<string,int>
 */
function aerolab_progress_map($aerolabid, $userid) {
    global $DB;
    return $DB->get_records_menu('aerolab_progress',
        ['aerolabid' => $aerolabid, 'userid' => $userid],
        '', 'achievement, timecreated');
}

/** Всё ли требуемое выполнено? */
function aerolab_is_complete($instance, $userid) {
    $required = aerolab_required_ids($instance);
    if (!$required) {
        return false;
    }
    $done = aerolab_progress_map($instance->id, $userid);
    foreach ($required as $id) {
        if (!isset($done[$id])) {
            return false;
        }
    }
    return true;
}

/**
 * Записать достижение (идемпотентно).
 *
 * @param string $source auto|manual
 * @return bool true, если запись вставлена только что
 */
function aerolab_record_progress($instance, $userid, $achievement, $source = 'auto') {
    global $DB;
    $known = aerolab_achievements();
    if (!isset($known[$achievement])) {
        return false;
    }
    $exists = $DB->record_exists('aerolab_progress', [
        'aerolabid' => $instance->id,
        'userid' => $userid,
        'achievement' => $achievement,
    ]);
    if ($exists) {
        return false;
    }
    try {
        $DB->insert_record('aerolab_progress', (object)[
            'aerolabid' => $instance->id,
            'userid' => $userid,
            'achievement' => $achievement,
            'source' => in_array($source, ['auto', 'manual'], true) ? $source : 'auto',
            'timecreated' => time(),
        ]);
    } catch (Exception $e) {
        // Уникальный индекс: две вкладки одновременно → дубль игнорируем.
        return false;
    }
    return true;
}

/** Возможности модуля (API Moodle). */
function aerolab_supports($feature) {
    switch ($feature) {
        case FEATURE_GROUPS:
            return false;
        case FEATURE_GROUPINGS:
            return false;
        case FEATURE_MOD_INTRO:
            return true;
        case FEATURE_GRADE_HAS_GRADE:
            return true;
        case FEATURE_GRADE_OUTCOMES:
            return false;
        case FEATURE_BACKUP_MOODLE2_ACTIVITY:
            return true;
        case FEATURE_SHOW_DESCRIPTION:
            return true;
        case FEATURE_COMPLETION_TRACKS_VIEWS:
            return true;
        case FEATURE_MOD_PURPOSE:
            return MOD_PURPOSE_ASSESSMENT;
        default:
            return null;
    }
}

/**
 * Создать экземпляр: запись в таблице + элемент оценки.
 *
 * @return int id новой записи aerolab
 */
function aerolab_add_instance($data, $mform = null) {
    global $DB;
    $data->timecreated = time();
    $data->timemodified = $data->timecreated;
    if (is_array($data->required)) {
        $data->required = json_encode(array_values($data->required), JSON_UNESCAPED_UNICODE);
    }
    if (!empty($data->grade) && $data->grade > 0) {
        $data->grade = (int) $data->grade;
    } else {
        $data->grade = 100;
    }
    $data->id = $DB->insert_record('aerolab', $data);
    aerolab_grade_item_update($data);
    return $data->id;
}

/** Обновить экземпляр. */
function aerolab_update_instance($data, $mform = null) {
    global $DB;
    $data->timemodified = time();
    $data->id = $data->instance;
    if (is_array($data->required)) {
        $data->required = json_encode(array_values($data->required), JSON_UNESCAPED_UNICODE);
    }
    if (!empty($data->grade) && $data->grade > 0) {
        $data->grade = (int) $data->grade;
    } else {
        $data->grade = 100;
    }
    $DB->update_record('aerolab', $data);
    aerolab_grade_item_update($data);
    return true;
}

/** Удалить экземпляр, прогресс и элемент оценки. */
function aerolab_delete_instance($id) {
    global $DB;
    $instance = $DB->get_record('aerolab', ['id' => $id]);
    if (!$instance) {
        return false;
    }
    $DB->delete_records('aerolab_progress', ['aerolabid' => $id]);
    aerolab_grade_item_update($instance, null, true);
    $DB->delete_records('aerolab', ['id' => $id]);
    return true;
}

/** Данные для кэша модуля («динамические названия видов деятельности»). */
function aerolab_get_coursemodule_info($coursemodule) {
    global $DB;
    $info = new cached_cm_info();
    $instance = $DB->get_record('aerolab', ['id' => $coursemodule->instance],
        'id, name, intro, introformat, baseurl');
    if (!$instance) {
        return $info;
    }
    $info->name = $instance->name;
    if ($coursemodule->showdescription && trim((string)$instance->intro) !== '') {
        $info->content = format_text($instance->intro, $instance->introformat, [
            'context' => context_module::instance($coursemodule->id),
            'overflowdiv' => true,
        ]);
    }
    return $info;
}

/**
 * Создать/обновить элемент оценки (или удалить его).
 *
 * @param bool $delete true — удалить элемент
 */
function aerolab_grade_item_update($aerolab, $grades = null, $delete = false) {
    if (!isset($aerolab->grade)) {
        $aerolab->grade = 100;
    }
    $params = [
        'itemname'  => $aerolab->name,
        'gradetype' => GRADE_TYPE_VALUE,
        'grademin'  => 0,
        'grademax'  => (int) $aerolab->grade,
    ];
    if ($delete) {
        $params['deleted'] = 1;
    }
    grade_update('mod/aerolab', $aerolab->course, 'mod', 'aerolab',
        $aerolab->id, 0, $grades, $params);
}

/**
 * Проставить максимальный балл, если всё требуемое выполнено.
 * Существующую оценку не снижает.
 *
 * @param int $userid 0 = все пользователи с хотя бы одной записью прогресса
 */
function aerolab_update_grades($aerolab, $userid = 0) {
    global $DB;
    $required = aerolab_required_ids($aerolab);
    if (!$required) {
        return;
    }
    $maxgrade = (int) $aerolab->grade;

    if ($userid) {
        if (!aerolab_is_complete($aerolab, $userid)) {
            return;
        }
        $grades = [$userid => (object)['userid' => $userid, 'rawgrade' => $maxgrade]];
        aerolab_grade_item_update($aerolab, $grades);
        return;
    }
    // Все пользователи с хотя бы одной записью прогресса.
    $userids = $DB->get_fieldset_sql(
        'SELECT DISTINCT userid FROM {aerolab_progress} WHERE aerolabid = ?', [$aerolab->id]);
    $grades = [];
    foreach ($userids as $uid) {
        if (aerolab_is_complete($aerolab, (int)$uid)) {
            $grades[(int)$uid] = (object)['userid' => (int)$uid, 'rawgrade' => $maxgrade];
        }
    }
    if ($grades) {
        aerolab_grade_item_update($aerolab, $grades);
    }
}
