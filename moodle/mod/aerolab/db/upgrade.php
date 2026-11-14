<?php

defined('MOODLE_INTERNAL') || die();

/**
 * Ожидаемые миграции БД плагина.
 * При изменении install.xml добавлять шаги здесь с версиями > version.php.
 *
 * @param int $oldversion
 * @return bool
 */
function xmldb_aerolab_upgrade($oldversion) {
    global $DB;
    $dbman = $DB->get_manager();
    // Пример будущего шага:
    // if ($oldversion < 2026111401) {
    //     $table = new xmldb_table('aerolab_progress');
    //     ...
    //     upgrade_mod_savepoint(true, 2026111401, 'aerolab');
    // }
    return true;
}
