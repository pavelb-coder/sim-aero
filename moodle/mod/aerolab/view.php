<?php
// This file is part of Moodle - http://moodle.org/
// АэроЛаб: страница для ученика — встроенный тренажёр + фиксация выполнения.

require_once(__DIR__ . '/../../config.php');
require_once(__DIR__ . '/lib.php');
require_once($CFG->libdir . '/completionlib.php');

$id = required_param('id', PARAM_INT);
$cm = get_coursemodule_from_id('aerolab', $id, 0, false, MUST_EXIST);
$course = $DB->get_record('course', ['id' => $cm->course], '*', MUST_EXIST);
$instance = $DB->get_record('aerolab', ['id' => $cm->instance], '*', MUST_EXIST);

require_login($course, true, $cm);
$context = context_module::instance($cm->id);
require_capability('mod/aerolab:view', $context);

$known = aerolab_achievements();
$required = aerolab_required_ids($instance);
$donemap = aerolab_progress_map($instance->id, $USER->id);
$total = count($required);
$donecount = 0;
foreach ($required as $achid) {
    if (isset($donemap[$achid])) {
        $donecount++;
    }
}
$alldone = $total > 0 && $donecount === $total;
if ($alldone) {
    // Самоисцеление оценки: если все достижения записаны, а балл не проставлен.
    aerolab_update_grades($instance, $USER->id);
}

$completion = new completion_info($course);
$completion->set_module_viewed($cm);

$defaultbaseurl = get_config('mod_aerolab', 'defaultbaseurl') ?: AEROLAB_DEFAULT_BASEURL;
$baseurl = trim((string)$instance->baseurl) !== '' ? trim($instance->baseurl) : $defaultbaseurl;
$height = max(200, min(2000, (int)$instance->iframeheight ?: 720));

$PAGE->set_url('/mod/aerolab/view.php', ['id' => $cm->id]);
$PAGE->set_context($context);
$PAGE->set_title($course->shortname . ': ' . $instance->name);
$PAGE->set_heading($course->fullname);
$PAGE->set_cacheable(false);

echo $OUTPUT->header();

echo $OUTPUT->heading(format_string($instance->name, true, ['context' => $context]), 2);
if (trim(strip_tags((string)$instance->intro)) !== '') {
    echo $OUTPUT->box(
        format_text($instance->intro, $instance->introformat, ['context' => $context, 'overflowdiv' => true]),
        'generalbox mod_introbox'
    );
}

// ── Панель прогресса ─────────────────────────────────
echo html_writer::start_div('', ['class' => 'aerolab-panel']);
echo html_writer::tag('h3',
    get_string('progress', 'aerolab') . ': ' .
    html_writer::tag('span', $donecount . ' / ' . $total, ['id' => 'aerolab-progress-text']));

echo html_writer::start_div('', ['class' => 'aerolab-checklist', 'id' => 'aerolab-checklist']);
foreach ($required as $achid) {
    $isdone = isset($donemap[$achid]);
    $badgeattrs = ['class' => 'aerolab-badge' . ($isdone ? ' done' : ''), 'data-ach' => $achid];
    echo html_writer::start_div('', $badgeattrs);
    echo html_writer::tag('span', $isdone ? '✓' : '·', ['class' => 'aerolab-dot']);
    echo html_writer::tag('span', s($known[$achid]), ['class' => 'aerolab-badge-text']);
    echo html_writer::end_div();
}
echo html_writer::end_div(); // .aerolab-checklist

$statusclass = 'aerolab-status' . ($alldone ? ' done' : '');
echo html_writer::div($alldone ? get_string('alldone', 'aerolab') : get_string('notyetdone', 'aerolab'),
    $statusclass, ['id' => 'aerolab-status']);

if (!$alldone) {
    echo html_writer::tag('button', get_string('manualrecord', 'aerolab'),
        ['class' => 'btn btn-outline-secondary btn-sm mt-2', 'id' => 'aerolab-manual', 'type' => 'button']);
}
echo html_writer::end_div(); // .aerolab-panel

// ── Встроенный АэроЛаб ───────────────────────────────
echo html_writer::tag('iframe', '', [
    'src' => $baseurl,
    'class' => 'aerolab-frame',
    'id' => 'aerolab-frame',
    'height' => $height,
    'title' => format_string($instance->name, true, ['context' => $context]),
    'loading' => 'lazy',
    'allowfullscreen' => 'allowfullscreen',
]);
echo html_writer::div(get_string('framenote', 'aerolab'), 'aerolab-note text-muted small');

$jsoptions = [
    'ajax' => (new moodle_url('/mod/aerolab/ajax.php'))->out(false),
    'baseurl' => $baseurl,
    'cmid' => $cm->id,
    'sesskey' => sesskey(),
    'alldone' => $alldone ? 1 : 0,
    'str' => [
        'alldone' => get_string('alldone', 'aerolab'),
        'notyetdone' => get_string('notyetdone', 'aerolab'),
    ],
];
echo html_writer::tag('script', 'window.AEROLAB_MOODLE = ' .
    json_encode($jsoptions, JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT) . ';');

$script = <<<'JS'
(function () {
  'use strict';
  var cfg = window.AEROLAB_MOODLE;
  if (!cfg) { return; }

  var expectedOrigin = null;
  try { expectedOrigin = new URL(cfg.baseurl, window.location.href).origin; } catch (e) { expectedOrigin = null; }

  function applyPayload(p) {
    if (!p || p.status !== 'ok') { return; }
    var badges = document.querySelectorAll('#aerolab-checklist .aerolab-badge');
    badges.forEach(function (el) {
      if (p.done.indexOf(el.dataset.ach) !== -1) {
        el.classList.add('done');
        var dot = el.querySelector('.aerolab-dot');
        if (dot) { dot.textContent = '✓'; }
      }
    });
    var text = document.getElementById('aerolab-progress-text');
    if (text) { text.textContent = p.donecount + ' / ' + p.total; }
    var status = document.getElementById('aerolab-status');
    if (status) {
      status.textContent = p.alldone ? cfg.str.alldone : cfg.str.notyetdone;
      status.classList.toggle('done', !!p.alldone);
    }
    if (p.alldone) {
      var manual = document.getElementById('aerolab-manual');
      if (manual) { manual.style.display = 'none'; }
    }
  }

  function post(bodyObj) {
    var params = new URLSearchParams();
    Object.keys(bodyObj).forEach(function (k) {
      var v = bodyObj[k];
      if (Array.isArray(v)) {
        v.forEach(function (item) { params.append(k + '[]', item); });
      } else {
        params.append(k, v);
      }
    });
    params.append('sesskey', cfg.sesskey);
    return fetch(cfg.ajax, {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8' },
      body: params.toString()
    }).then(function (r) { return r.json(); })
     .then(applyPayload)
     .catch(function () { /* сеть/JSON: тихо */ });
  }

  window.addEventListener('message', function (e) {
    if (expectedOrigin && e.origin !== expectedOrigin) { return; }
    var d = e.data;
    if (!d || d.source !== 'aerolab') { return; }
    if (d.type === 'ready' && Array.isArray(d.achievements)) {
      // АэроЛаб сообщил, какие достижения уже есть в браузере ученика
      post({ id: cfg.cmid, action: 'sync', achievements: d.achievements });
    } else if (d.type === 'achievement' && d.id) {
      post({ id: cfg.cmid, action: 'record', achievement: d.id });
    }
  });

  var manual = document.getElementById('aerolab-manual');
  if (manual) {
    manual.addEventListener('click', function () {
      manual.disabled = true;
      post({ id: cfg.cmid, action: 'manual_all' });
    });
  }
})();
JS;
echo html_writer::tag('script', $script);

echo $OUTPUT->footer();
