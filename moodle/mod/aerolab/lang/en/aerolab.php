<?php
// This file is part of Moodle - http://moodle.org/
// AeroLab for Moodle: strings (English).

defined('MOODLE_INTERNAL') || die();

$string['pluginname'] = 'AeroLab: flight bench';
$string['modulename'] = 'AeroLab';
$string['modulenameplural'] = 'AeroLab';

$string['aerolabname'] = 'Activity name';
$string['aerolabname_help'] = '';
$string['description'] = 'Task description';
$string['aerolabsettings'] = 'Simulator settings';

$string['baseurl'] = 'AeroLab URL';
$string['baseurl_help'] = 'URL at which students will open AeroLab. Defaults to the public demo site. For closed installations point to an internal mirror.';

$string['iframeheight'] = 'Simulator window height, px';
$string['iframeheight_help'] = 'Height of the AeroLab iframe. Recommended 640–900. Minimum 200, maximum 2000.';

$string['requiredtasks'] = 'Required AeroLab achievements';
$string['requiredtasks_help'] = 'Tick the AeroLab achievements the student must earn. When all ticked achievements are recorded, the activity is complete and the grade is posted automatically.';

$string['requiredatleastone'] = 'Pick at least one achievement — there must be something to grade.';
$string['heighterror'] = 'Height must be between 200 and 2000 pixels.';

$string['adminheading'] = 'AeroLab settings';
$string['adminheading_desc'] = 'Global settings for the AeroLab activity plugin.';

$string['defaultbaseurl'] = 'Default AeroLab URL';
$string['defaultbaseurl_desc'] = 'Pre-filled in newly created activities. Public bench: https://pavelb-coder.github.io/sim-aero/';
$string['defaultheight'] = 'Default iframe height, px';
$string['defaultheight_desc'] = 'Pre-filled in newly created activities (can be overridden per activity).';

$string['progress'] = 'Progress';
$string['alldone'] = 'Excellent! All required achievements recorded — task complete.';
$string['notyetdone'] = 'Complete the ticked items in the simulator — they will be recorded automatically.';
$string['manualrecord'] = 'Mark as complete manually';
$string['framenote'] = 'The simulator opens inside this page. Completion is recorded automatically via the built-in AeroLab signal; if the signal is missing, use the manual button.';

$string['reportname'] = 'Completion report';
$string['report_student'] = 'Student';
$string['report_progress'] = 'Progress';
$string['report_status'] = 'Status';
$string['report_time'] = 'Last event';
$string['report_complete'] = 'Passed';
$string['report_pending'] = 'In progress';
$string['source_auto'] = 'auto';
$string['source_manual'] = 'manual';
$string['downloadcsv'] = 'Download CSV (Excel)';
$string['noreusers'] = 'No users with the required role are enrolled in this course yet.';
$string['noinstances'] = 'There are no AeroLab activities in this course yet.';

$string['aerolab:addinstance'] = 'Add AeroLab activities to a course';
$string['aerolab:view'] = 'View AeroLab activities';
$string['aerolab:manage'] = 'View AeroLab completion reports';

$string['privacy:metadata:aerolab_progress'] = 'Stores the fact that a student has earned AeroLab achievements (required for grading).';
$string['privacy:metadata:aerolab_progress:aerolabid'] = 'Activity identifier';
$string['privacy:metadata:aerolab_progress:userid'] = 'Student identifier';
$string['privacy:metadata:aerolab_progress:achievement'] = 'AeroLab achievement identifier';
$string['privacy:metadata:aerolab_progress:source'] = 'Recording source: auto (simulator signal) or manual (student self-report)';
$string['privacy:metadata:aerolab_progress:timecreated'] = 'Recording time';
