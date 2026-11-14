<?php
// This file is part of Moodle - http://moodle.org/
// АэроЛаб · mod_aerolab · русская языковая упаковка.

defined('MOODLE_INTERNAL') || die();

$string['pluginname'] = 'АэроЛаб: аэробенч';
$string['modulename'] = 'АэроЛаб';
$string['modulenameplural'] = 'АэроЛаб';

$string['aerolabname'] = 'Название активности';
$string['aerolabname_help'] = '';
$string['description'] = 'Описание задания';
$string['aerolabsettings'] = 'Настройки тренажёра';

$string['baseurl'] = 'Адрес АэроЛаб';
$string['baseurl_help'] = 'URL, по которому ученики открывают АэроЛаб. По умолчанию публичный сайт проекта (DEMO). Для закрытой установки укажите внутренний адрес/зеркало.';

$string['iframeheight'] = 'Высота окна тренажёра, px';
$string['iframeheight_help'] = 'Высота iframe с АэроЛаб. Рекомендуется 640–900. Минимум 200, максимум 2000.';

$string['requiredtasks'] = 'Что нужно выполнить для зачёта';
$string['requiredtasks_help'] = 'Отметьте достижения АэроЛаб, которые ученик должен получить. Когда все отмеченные будут зафиксированы, активность считается выполненной: оценка проставляется автоматически.';

$string['requiredatleastone'] = 'Выберите хотя бы одно достижение — иначе нечего оценивать.';
$string['heighterror'] = 'Высота должна быть от 200 до 2000 пикселей.';

$string['adminheading'] = 'Настройки АэроЛаб';
$string['adminheading_desc'] = 'Глобальные параметры плагина «АэроЛаб: аэробенч».';

$string['defaultbaseurl'] = 'АэроЛаб по умолчанию (URL)';
$string['defaultbaseurl_desc'] = 'Адрес, который будет подставляться в новые активности. Публичный стенд: https://pavelb-coder.github.io/sim-aero/';
$string['defaultheight'] = 'Высота iframe по умолчанию, px';
$string['defaultheight_desc'] = 'Подставляется в новые активности (их можно переопределить в самой активности).';

$string['progress'] = 'Прогресс';
$string['alldone'] = 'Отлично! Все требуемые достижения получены — задание зачтено.';
$string['notyetdone'] = 'Выполните отмеченные пункты в тренажёре — они засчитаются автоматически.';
$string['manualrecord'] = 'Отметить выполненным вручную';
$string['framenote'] = 'Тренажёр открывается внутри этой страницы. Выполнение фиксируется автоматически через встроенный сигнал АэроЛаб; при отсутствии сигнала используйте кнопку ручной отметки.';

$string['reportname'] = 'Отчёт по выполнению';
$string['report_student'] = 'Ученик';
$string['report_progress'] = 'Прогресс';
$string['report_status'] = 'Статус';
$string['report_time'] = 'Последнее событие';
$string['report_complete'] = 'Зачёт';
$string['report_pending'] = 'В работе';
$string['source_auto'] = 'авто';
$string['source_manual'] = 'вручную';
$string['downloadcsv'] = 'Скачать CSV (Excel)';
$string['noreusers'] = 'На курс пока не записан ни один ученик с нужной ролью.';
$string['noinstances'] = 'В этом курсе ещё нет активностей «АэроЛаб».';

// Возможности.
$string['aerolab:addinstance'] = 'Добавлять активность «АэроЛаб» в курс';
$string['aerolab:view'] = 'Просматривать активность «АэроЛаб»';
$string['aerolab:manage'] = 'Просматривать отчёт по активности «АэроЛаб»';

// Приватность.
$string['privacy:metadata:aerolab_progress'] = 'Хранит факт получения учеником достижений АэроЛаб (для зачёта активности).';
$string['privacy:metadata:aerolab_progress:aerolabid'] = 'Идентификатор активности';
$string['privacy:metadata:aerolab_progress:userid'] = 'Идентификатор ученика';
$string['privacy:metadata:aerolab_progress:achievement'] = 'Идентификатор достижения АэроЛаб';
$string['privacy:metadata:aerolab_progress:source'] = 'Способ фиксации: auto (сигнал из тренажёра) или manual (самозачёт)';
$string['privacy:metadata:aerolab_progress:timecreated'] = 'Время фиксации';
