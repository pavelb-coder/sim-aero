<?php
// This file is part of Moodle - http://moodle.org/
// АэроЛаб: провайдер приватности (GDPR). Хранит только факт достижений ученика.

namespace mod_aerolab\privacy;

use context;
use core_privacy\local\metadata\collection;
use core_privacy\local\metadata\provider as metadata_provider;
use core_privacy\local\request\approved_contextlist;
use core_privacy\local\request\approved_userlist;
use core_privacy\local\request\contextlist;
use core_privacy\local\request\core_contextlist_provider;
use core_privacy\local\request\core_userlist_provider;
use core_privacy\local\request\plugin\provider as plugin_provider;
use core_privacy\local\request\transform;
use core_privacy\local\request\userlist;
use core_privacy\local\request\writer;

class provider implements metadata_provider, core_contextlist_provider, core_userlist_provider, plugin_provider {

    /** @return collection */
    public static function get_metadata(collection $collection): collection {
        return $collection->add_database_table('aerolab_progress', [
            'aerolabid' => 'privacy:metadata:aerolab_progress:aerolabid',
            'userid' => 'privacy:metadata:aerolab_progress:userid',
            'achievement' => 'privacy:metadata:aerolab_progress:achievement',
            'source' => 'privacy:metadata:aerolab_progress:source',
            'timecreated' => 'privacy:metadata:aerolab_progress:timecreated',
        ], 'privacy:metadata:aerolab_progress');
    }

    /** @return contextlist */
    public static function get_contexts_for_userid(int $userid): contextlist {
        $sql = "SELECT c.id
                  FROM {context} c
                  JOIN {course_modules} cm ON cm.id = c.instanceid AND c.contextlevel = :cmlevel
                  JOIN {modules} m ON m.id = cm.module AND m.name = 'aerolab'
                  JOIN {aerolab} a ON a.id = cm.instance
                  JOIN {aerolab_progress} p ON p.aerolabid = a.id
                 WHERE p.userid = :userid";
        $contextlist = new contextlist();
        $contextlist->add_from_sql($sql, ['cmlevel' => CONTEXT_MODULE, 'userid' => $userid]);
        return $contextlist;
    }

    /** @param userlist $userlist */
    public static function get_users_in_context(userlist $userlist) {
        $context = $userlist->get_context();
        if ($context->contextlevel !== CONTEXT_MODULE) {
            return;
        }
        $sql = "SELECT p.userid
                  FROM {aerolab_progress} p
                  JOIN {course_modules} cm ON cm.instance = p.aerolabid
                  JOIN {modules} m ON m.id = cm.module AND m.name = 'aerolab'
                 WHERE cm.id = :cmid";
        $userlist->add_from_sql('userid', $sql, ['cmid' => $context->instanceid]);
    }

    /** Экспорт пользовательских данных. */
    public static function export_user_data(approved_contextlist $contextlist) {
        global $DB;
        $user = $contextlist->get_user();
        foreach ($contextlist->get_contexts() as $context) {
            if ($context->contextlevel !== CONTEXT_MODULE) {
                continue;
            }
            $records = $DB->get_records_sql(
                "SELECT p.achievement, p.source, p.timecreated
                   FROM {aerolab_progress} p
                   JOIN {course_modules} cm ON cm.instance = p.aerolabid
                   JOIN {modules} m ON m.id = cm.module AND m.name = 'aerolab'
                  WHERE cm.id = :cmid AND p.userid = :userid",
                ['cmid' => $context->instanceid, 'userid' => $user->id]);
            if (!$records) {
                continue;
            }
            $payload = ['progress' => []];
            foreach ($records as $r) {
                $payload['progress'][] = [
                    'achievement' => $r->achievement,
                    'source' => $r->source,
                    'timecreated' => transform::datetime($r->timecreated),
                ];
            }
            writer::with_context($context)->export_data(
                [get_string('pluginname', 'mod_aerolab')],
                (object)$payload
            );
        }
    }

    /** Удалить данные всех пользователей в контексте. */
    public static function delete_data_for_all_users_in_context(context $context) {
        global $DB;
        $cm = self::cm_for_context($context);
        if (!$cm) {
            return;
        }
        $DB->delete_records('aerolab_progress', ['aerolabid' => $cm->instance]);
    }

    /** Удалить данные пользователя в выбранных контекстах. */
    public static function delete_data_for_user(approved_contextlist $contextlist) {
        global $DB;
        $user = $contextlist->get_user();
        foreach ($contextlist->get_contexts() as $context) {
            $cm = self::cm_for_context($context);
            if ($cm) {
                $DB->delete_records('aerolab_progress', ['aerolabid' => $cm->instance, 'userid' => $user->id]);
            }
        }
    }

    /** Удалить данные нескольких пользователей в контексте. */
    public static function delete_data_for_users(approved_userlist $userlist) {
        global $DB;
        $cm = self::cm_for_context($userlist->get_context());
        if (!$cm) {
            return;
        }
        foreach ($userlist->get_userids() as $userid) {
            $DB->delete_records('aerolab_progress', ['aerolabid' => $cm->instance, 'userid' => $userid]);
        }
    }

    /** @return \stdClass|null course module для контекста модуля */
    private static function cm_for_context(context $context) {
        global $DB;
        if ($context->contextlevel !== CONTEXT_MODULE) {
            return null;
        }
        return $DB->get_record('course_modules', ['id' => $context->instanceid]);
    }
}
