/* 朝ブリーフ 共通スクリプト
   1) 体調3項目 → 最優先タスクの本数を切り替える
   2) 入力値はブラウザのlocalStorageに日付キーで残す（サーバーには送らない）
   3) 現在時刻より前のタイムライン項目を淡く落とす
   ※ 判定ロジックは data-integrity-analyst 準拠。入力のない項目は評価に使わない。 */
(function () {
  'use strict';

  var $ = function (id) { return document.getElementById(id); };
  var sleep = $('v-sleep'), hr = $('v-hr'), fat = $('v-fat');
  var box = $('verdict'), vt = $('v-title'), vb = $('v-body'), saved = $('v-saved');
  var list = $('prio-list'), dropNote = $('drop-note');
  var pageDate = document.body.getAttribute('data-date') || '';
  var KEY = 'luce.brief.vitals.' + pageDate;

  /* ---------- 最優先タスクの表示切替 ---------- */
  function setLoad(tired) {
    if (!list) return;
    var items = list.querySelectorAll('li');
    for (var i = 0; i < items.length; i++) {
      if (tired && items[i].getAttribute('data-tired') === 'drop') items[i].classList.add('drop');
      else items[i].classList.remove('drop');
    }
    if (dropNote) {
      dropNote.textContent = tired
        ? '※ グレーの項目は今日の一覧から外しました。翌営業日へ送ってください。'
        : '';
    }
  }

  /* ---------- 体調の判定 ---------- */
  function render() {
    if (!box) return;
    var s = parseFloat(sleep.value), h = parseFloat(hr.value), f = fat.value;

    if (isNaN(s) && isNaN(h) && f === '') {
      box.className = 'verdict';
      vt.textContent = '体調データ未入力です';
      vb.textContent = '睡眠スコア・心拍数・疲労感を入れていただくと、今日の負荷配分を確定します。数値は推測で埋めません。入力があるまでは通常時の本数で表示します。';
      setLoad(false);
      return;
    }

    // 実測された項目だけを評価する
    var flags = [];
    if (!isNaN(s) && s < 70) flags.push('睡眠スコア' + s + '（70未満）');
    if (!isNaN(h) && h >= 65) flags.push('安静時心拍' + h + 'bpm（65以上）');
    if (f === 'tired') flags.push('自己申告が「疲れ気味」');

    var tired = flags.length >= 1 && (f === 'tired' || flags.length >= 2);

    if (tired) {
      box.className = 'verdict on-tired';
      vt.textContent = '疲れ気味と判定しました — 今日は本数を絞ります';
      vb.textContent = '検出したサイン：' + flags.join(' ／ ')
        + '。会議で消耗する日に長時間の集中作業を積むのは無理があります。判断と会議発言だけで前に進むものに絞りました。';
      setLoad(true);
    } else {
      box.className = 'verdict on-normal';
      var msg = '今日は通常の本数で進めて問題ありません。';
      if (flags.length === 1) {
        msg = 'サインが1つあります（' + flags[0] + '）。ただし単独では判定を変えません。'
            + '通常の本数のまま、途中で無理を感じたら1番を翌営業日へ送ってください。';
      }
      vt.textContent = '通常どおりで問題ありません';
      vb.textContent = msg + '会議の合間に西村ボールを片づけ、まとまった作業時間を1番に充ててください。';
      setLoad(false);
    }
  }

  /* ---------- 入力値の保存・復元（ブラウザ内のみ） ---------- */
  function save() {
    try {
      localStorage.setItem(KEY, JSON.stringify({ s: sleep.value, h: hr.value, f: fat.value }));
      if (saved) {
        saved.textContent = 'この端末に記録しました（サーバーには送っていません）';
        clearTimeout(save._t);
        save._t = setTimeout(function () { saved.textContent = ''; }, 2600);
      }
    } catch (e) { /* プライベートモード等では保存しない */ }
  }

  function restore() {
    try {
      var raw = localStorage.getItem(KEY);
      if (!raw) return;
      var v = JSON.parse(raw);
      if (v.s) sleep.value = v.s;
      if (v.h) hr.value = v.h;
      if (v.f) fat.value = v.f;
    } catch (e) { /* 壊れていたら無視して未入力から始める */ }
  }

  /* ---------- 現在時刻より前の予定を落とす ---------- */
  function dimPast() {
    var items = document.querySelectorAll('.tl li[data-end]');
    if (!items.length) return;
    var now = new Date();
    var today = now.getFullYear() + '-'
      + String(now.getMonth() + 1).padStart(2, '0') + '-'
      + String(now.getDate()).padStart(2, '0');
    if (today !== pageDate) return; // 過去日のアーカイブでは何も落とさない
    var mins = now.getHours() * 60 + now.getMinutes();
    for (var i = 0; i < items.length; i++) {
      var e = items[i].getAttribute('data-end').split(':');
      if (mins > (parseInt(e[0], 10) * 60 + parseInt(e[1], 10))) items[i].classList.add('is-past');
    }
  }

  if (sleep && hr && fat) {
    restore();
    [sleep, hr, fat].forEach(function (el) {
      el.addEventListener('input', function () { render(); save(); });
      el.addEventListener('change', function () { render(); save(); });
    });
    render();
  }
  dimPast();
  setInterval(dimPast, 60000);
})();
