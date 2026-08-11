/* ============================================================
 * app.js — 哈希 & Base64 全能工具主逻辑
 * 依赖: js/hashlib.js (+ hash-wasm CDN 可选)
 * ============================================================ */
(function () {
  'use strict';

  /* ================= 工具函数 ================= */
  function $(id) { return document.getElementById(id); }
  function fmtSize(b) {
    var u = ['B', 'KB', 'MB', 'GB', 'TB'], i = 0;
    while (b >= 1024 && i < u.length - 1) { b /= 1024; i++; }
    return b.toFixed(2) + ' ' + u[i];
  }
  function toast(msg, type) {
    var el = $('toast') || (function () {
      var d = document.createElement('div');
      d.id = 'toast';
      document.body.appendChild(d);
      return d;
    })();
    el.textContent = msg;
    el.className = 'toast show ' + (type || '');
    clearTimeout(el._t);
    el._t = setTimeout(function () { el.className = 'toast'; }, 2600);
  }
  function readFileBytes(file) {
    return new Promise(function (resolve, reject) {
      var r = new FileReader();
      r.onload = function () { resolve(new Uint8Array(r.result)); };
      r.onerror = function () { reject(r.error); };
      r.readAsArrayBuffer(file);
    });
  }
  function downloadBlob(name, blob) {
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = name;
    document.body.appendChild(a);
    a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  }
  // 保存文件：编码时用 <a download>，解码时若浏览器无 File System Access 则下载
  var hasFSA = typeof window.showSaveFilePicker === 'function';
  function saveFile(name, data, isBinary) {
    var blob = isBinary ? new Blob([data]) : new Blob([data], { type: 'text/plain;charset=utf-8' });
    if (hasFSA) {
      return window.showSaveFilePicker({ suggestedName: name }).then(function (h) {
        return h.createWritable().then(function (w) { return w.write(blob).then(function () { return w.close(); }); });
      });
    }
    downloadBlob(name, blob);
    return Promise.resolve();
  }

  /* ================= 哈希相关 ================= */
  var ALGOS = {
    crypto: [
      ['MD5', 'md5'], ['SHA-1', 'sha1'], ['SHA-224', 'sha224'], ['SHA-256', 'sha256'],
      ['SHA-384', 'sha384'], ['SHA-512', 'sha512'], ['SHA3-224', 'sha3_224'],
      ['SHA3-256', 'sha3_256'], ['SHA3-384', 'sha3_384'], ['SHA3-512', 'sha3_512'],
      ['BLAKE2b', 'blake2b'], ['BLAKE2s', 'blake2s']
    ],
    noncrypto: [
      ['xxHash (32位)', 'xxhash32'], ['xxHash (64位)', 'xxhash64'],
      ['MurmurHash3 (32位)', 'murmur32'], ['MurmurHash3 (128位)', 'murmur128']
    ],
    special: [['ssdeep (模糊哈希)', 'ssdeep']]
  };
  var selectedAlgo = 'sha256';
  var lastHash = '';

  function renderAlgos() {
    var cats = { crypto: 'crypto-algos', noncrypto: 'noncrypto-algos', special: 'special-algos' };
    Object.keys(cats).forEach(function (cat) {
      var box = $(cats[cat]);
      box.innerHTML = '';
      ALGOS[cat].forEach(function (a) {
        var label = document.createElement('label');
        label.className = 'algo-item';
        var input = document.createElement('input');
        input.type = 'radio'; input.name = 'algo'; input.value = a[1];
        if (a[1] === selectedAlgo) input.checked = true;
        input.addEventListener('change', function () {
          selectedAlgo = a[1];
          $('hash-current').textContent = '当前算法：' + a[0];
        });
        var span = document.createElement('span');
        span.textContent = a[0];
        label.appendChild(input); label.appendChild(span);
        box.appendChild(label);
      });
    });
  }

  function isOfflineAlgo(algo) {
    return ['md5', 'sha1', 'sha256', 'sha384', 'sha512'].indexOf(algo) >= 0;
  }

  function computeHash(algo, data) {
    return HashLib.compute(algo, data);
  }

  function compareHash(a, b) {
    return String(a).trim().toLowerCase() === String(b).trim().toLowerCase();
  }

  /* ================= 哈希 UI 逻辑 ================= */
  function initHashUI() {
    renderAlgos();
    $('hash-file-info').textContent = HashLib.hasWasm() ? '离线算法：MD5 / SHA-1/256/384/512 ✓' : '⚠️ 未加载到 hash-wasm，部分算法需联网';

    $('hash-browse').addEventListener('click', function () { $('hash-file-input').click(); });
    $('hash-file-input').addEventListener('change', function (e) {
      var f = e.target.files[0];
      if (f) {
        $('hash-file-path').value = f.name;
        $('hash-file-info').textContent = f.name + '（' + fmtSize(f.size) + '）';
      }
    });
    $('hash-calc').addEventListener('click', function () {
      var file = $('hash-file-input').files[0];
      if (!file) { toast('请先选择文件', 'err'); return; }
      $('hash-calc').disabled = true;
      $('hash-calc').textContent = '计算中...';
      readFileBytes(file).then(function (data) {
        return computeHash(selectedAlgo, data);
      }).then(function (hex) {
        lastHash = hex;
        $('hash-result').value = hex;
        toast('计算完成');
      }).catch(function (err) {
        $('hash-result').value = '';
        toast(err.message || '计算失败', 'err');
      }).finally(function () {
        $('hash-calc').disabled = false;
        $('hash-calc').textContent = '计算哈希值';
      });
    });
    $('hash-copy').addEventListener('click', function () {
      if (!$('hash-result').value) { toast('没有可复制的内容', 'err'); return; }
      navigator.clipboard.writeText($('hash-result').value).then(function () { toast('已复制到剪贴板'); });
    });
    $('hash-clear').addEventListener('click', function () { $('hash-result').value = ''; lastHash = ''; });
    $('hash-compare').addEventListener('click', function () {
      var expected = $('hash-expected').value.trim();
      var cur = $('hash-result').value.trim();
      var box = $('hash-compare-result');
      if (!cur) { box.textContent = '请先计算哈希值'; box.className = 'compare-result err'; return; }
      if (!expected) { box.textContent = '请输入期望的哈希值'; box.className = 'compare-result err'; return; }
      if (compareHash(cur, expected)) {
        box.textContent = '✓ 哈希值匹配！文件完整未被修改。';
        box.className = 'compare-result match';
      } else {
        box.textContent = '✗ 哈希值不匹配！文件可能已损坏或被篡改。';
        box.className = 'compare-result nomatch';
      }
    });
    $('hash-clearall').addEventListener('click', function () {
      $('hash-file-input').value = ''; $('hash-file-path').value = '';
      $('hash-result').value = ''; $('hash-expected').value = '';
      $('hash-file-info').textContent = ''; $('hash-compare-result').textContent = '';
      lastHash = '';
    });
  }

  /* ================= Base64 ================= */
  // ---- 单文件 ----
  function initBase64FileUI() {
    var mode = 'encode', format = 'standard';
    document.querySelectorAll('input[name="file-mode"]').forEach(function (r) {
      r.addEventListener('change', function () {
        mode = r.value;
        $('b64file-format-row').style.display = mode === 'encode' ? '' : 'none';
        $('b64file-encode').style.display = mode === 'encode' ? '' : 'none';
        $('b64file-decode').style.display = mode === 'decode' ? '' : 'none';
      });
    });
    document.querySelectorAll('input[name="file-format"]').forEach(function (r) {
      r.addEventListener('change', function () { format = r.value; });
    });
    $('b64file-browse-in').addEventListener('click', function () { $('b64file-input').click(); });
    $('b64file-input').addEventListener('change', function (e) {
      var f = e.target.files[0];
      if (f) {
        $('b64file-in').value = f.name;
        // 自动推断输出名
        if (mode === 'encode') $('b64file-out').value = f.name.replace(/\.[^.]+$/, '') + '.b64';
        else $('b64file-out').value = f.name.replace(/\.b64$/i, '') || f.name + '_decoded';
      }
    });
    $('b64file-browse-out').addEventListener('click', function () {
      var name = mode === 'encode' ? 'output.b64' : 'output';
      saveFile(name, '').catch(function () {});
    });

    $('b64file-encode').addEventListener('click', function () {
      var f = $('b64file-input').files[0];
      if (!f) { toast('请先选择文件', 'err'); return; }
      readFileBytes(f).then(function (data) {
        var out;
        if (format === 'enhanced') {
          var info = { filename: f.name, data: btoa(String.fromCharCode.apply(null, data)), format_version: '1.0', timestamp: new Date().toISOString() };
          out = btoa(unescape(encodeURIComponent(JSON.stringify(info))));
        } else {
          out = btoa(String.fromCharCode.apply(null, data));
        }
        // 增强格式保存为文本
        return saveFile($('b64file-out').value || f.name.replace(/\.[^.]+$/, '') + '.b64', out, false);
      }).then(function () { toast('编码完成'); }).catch(function (e) { toast('编码失败: ' + e.message, 'err'); });
    });

    $('b64file-decode').addEventListener('click', function () {
      var f = $('b64file-input').files[0];
      if (!f) { toast('请先选择文件', 'err'); return; }
      readFileBytes(f).then(function (data) {
        var text = new TextDecoder().decode(data).trim();
        var decoded = null, origName = null, isEnhanced = false;
        try {
          var jsonStr = decodeURIComponent(escape(atob(text)));
          var info = JSON.parse(jsonStr);
          if (info.filename && info.data) {
            isEnhanced = true; origName = info.filename;
            decoded = Uint8Array.from(atob(info.data), function (c) { return c.charCodeAt(0); });
          }
        } catch (e) {}
        if (!decoded) {
          try { decoded = Uint8Array.from(atob(text), function (c) { return c.charCodeAt(0); }); }
          catch (e) { throw new Error('Base64 解码失败，请确认是有效 Base64 文本'); }
        }
        var outName = isEnhanced && origName ? origName : ($('b64file-out').value || 'decoded');
        return saveFile(outName, decoded, true).then(function () {
          toast(isEnhanced ? '解码完成（增强格式，还原文件名 ' + outName + '）' : '解码完成');
        });
      }).catch(function (e) { toast('解码失败: ' + e.message, 'err'); });
    });
  }

  // ---- 文本 ----
  function initBase64TextUI() {
    function run() {
      var mode = document.querySelector('input[name="text-mode"]:checked').value;
      var input = $('b64text-in').value;
      if (!input) { toast('请输入内容', 'err'); return; }
      try {
        if (mode === 'encode') {
          $('b64text-out').value = btoa(unescape(encodeURIComponent(input)));
          $('b64text-status').textContent = '✅ 编码完成，共 ' + input.length + ' 个字符';
        } else {
          var decoded = decodeURIComponent(escape(atob(input.replace(/\s+/g, ''))));
          var formatted = decoded;
          var isJson = false;
          try { JSON.parse(decoded); isJson = true; formatted = JSON.stringify(JSON.parse(decoded), null, 2); } catch (e2) {}
          $('b64text-out').value = formatted;
          $('b64text-status').textContent = isJson ? '✅ 检测到 JSON，已格式化显示' : '✅ 解码完成，共 ' + decoded.length + ' 个字符';
        }
      } catch (e) {
        $('b64text-status').textContent = '❌ ' + (mode === 'decode' ? 'Base64 解码失败，请确认输入有效' : '编码失败');
      }
    }
    $('b64text-run').addEventListener('click', run);
    $('b64text-copy').addEventListener('click', function () {
      if (!$('b64text-out').value) { toast('没有内容可复制', 'err'); return; }
      navigator.clipboard.writeText($('b64text-out').value).then(function () { toast('已复制'); });
    });
    $('b64text-clear').addEventListener('click', function () {
      $('b64text-in').value = ''; $('b64text-out').value = ''; $('b64text-status').textContent = '就绪';
    });
  }

  // ---- 文件夹 ----
  function initBase64FolderUI() {
    var mode = 'encode';
    document.querySelectorAll('input[name="folder-mode"]').forEach(function (r) {
      r.addEventListener('change', function () {
        mode = r.value;
        $('b64folder-in').value = '';
        $('b64folder-input').value = '';
        $('b64folder-file').value = '';
      });
    });
    $('b64folder-browse-in').addEventListener('click', function () {
      if (mode === 'encode') $('b64folder-input').click();
      else $('b64folder-file').click();
    });
    $('b64folder-input').addEventListener('change', function (e) {
      var files = e.target.files;
      if (files.length) {
        var first = files[0];
        // webkitRelativePath 含文件夹路径
        var folderName = first.webkitRelativePath.split('/')[0];
        $('b64folder-in').value = folderName + '（' + files.length + ' 个文件）';
      }
    });
    $('b64folder-file').addEventListener('change', function (e) {
      var f = e.target.files[0];
      if (f) $('b64folder-in').value = f.name;
    });

    $('b64folder-run').addEventListener('click', function () {
      if (mode === 'encode') encodeFolder();
      else decodeFolder();
    });

    function encodeFolder() {
      var files = $('b64folder-input').files;
      if (!files.length) { toast('请先选择文件夹', 'err'); return; }
      $('b64folder-status').textContent = '正在编码 ' + files.length + ' 个文件...';
      var folderData = {
        folder_name: files[0].webkitRelativePath.split('/')[0],
        timestamp: new Date().toISOString(),
        format_version: '2.2',
        total_files: files.length,
        files: {}
      };
      var pending = Array.prototype.slice.call(files);
      var done = 0;
      function next() {
        if (!pending.length) {
          var jsonStr = JSON.stringify(folderData);
          var b64 = btoa(unescape(encodeURIComponent(jsonStr)));
          return saveFile(folderData.folder_name + '.b64', b64, false).then(function () {
            $('b64folder-status').textContent = '✅ 编码完成，共 ' + files.length + ' 个文件';
            toast('文件夹编码完成');
          });
        }
        var f = pending.shift();
        readFileBytes(f).then(function (data) {
          var bytes = data;
          var bin = '';
          for (var i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
          folderData.files[f.webkitRelativePath] = { data: btoa(bin) };
          done++;
          $('b64folder-status').textContent = '正在编码 ' + done + '/' + files.length + '...';
          next();
        }).catch(function (e) { toast('编码失败: ' + e.message, 'err'); });
      }
      next();
    }

    function decodeFolder() {
      var f = $('b64folder-file').files[0];
      if (!f) { toast('请先选择 .b64 文件', 'err'); return; }
      readFileBytes(f).then(function (data) {
        var text = new TextDecoder().decode(data).trim();
        var jsonStr = decodeURIComponent(escape(atob(text)));
        var folderData = JSON.parse(jsonStr);
        if (!folderData.files) throw new Error('不是有效的文件夹编码格式');
        var entries = Object.keys(folderData.files);
        $('b64folder-status').textContent = '正在解码 ' + entries.length + ' 个文件...';
        var done = 0;
        // 优先用 JSZip 打包成 zip 下载，保留完整目录结构
        function buildZip() {
          if (typeof window.JSZip !== 'undefined') {
            var zip = new JSZip();
            entries.forEach(function (rel) {
              var bin = atob(folderData.files[rel].data);
              var bytes = new Uint8Array(bin.length);
              for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
              zip.file(rel, bytes);
              done++;
            });
            $('b64folder-status').textContent = '正在打包 zip...';
            return zip.generateAsync({ type: 'blob' }).then(function (blob) {
              downloadBlob((folderData.folder_name || 'decoded_folder') + '.zip', blob);
              $('b64folder-status').textContent = '✅ 解码完成，共 ' + entries.length + ' 个文件（已保存为 zip）';
              toast('文件夹解码完成，已打包为 zip');
            });
          }
          // 无 JSZip 时逐个下载
          function next() {
            if (!entries.length) {
              $('b64folder-status').textContent = '✅ 解码完成，共 ' + done + ' 个文件（已逐个下载）';
              toast('文件夹解码完成');
              return;
            }
            var rel = entries.shift();
            var bin = atob(folderData.files[rel].data);
            var bytes = new Uint8Array(bin.length);
            for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
            downloadBlob(rel.split('/').pop(), new Blob([bytes]));
            done++;
            $('b64folder-status').textContent = '正在解码 ' + done + '/' + entries.length + '...';
            next();
          }
          next();
        }
        buildZip();
      }).catch(function (e) { toast('解码失败: ' + e.message, 'err'); });
    }
  }

  /* ================= 导航 ================= */
  function initNav() {
    document.querySelectorAll('.nav-btn').forEach(function (b) {
      b.addEventListener('click', function () {
        document.querySelectorAll('.nav-btn').forEach(function (x) { x.classList.remove('active'); });
        b.classList.add('active');
        var tool = b.getAttribute('data-tool');
        document.querySelectorAll('.panel').forEach(function (p) { p.classList.remove('active'); });
        $('tool-' + tool).classList.add('active');
      });
    });
    document.querySelectorAll('.sub-btn').forEach(function (b) {
      b.addEventListener('click', function () {
        document.querySelectorAll('.sub-btn').forEach(function (x) { x.classList.remove('active'); });
        b.classList.add('active');
        document.querySelectorAll('.sub-panel').forEach(function (p) { p.classList.remove('active'); });
        $('sub-' + b.getAttribute('data-sub')).classList.add('active');
      });
    });
  }

  /* ================= 启动 ================= */
  document.addEventListener('DOMContentLoaded', function () {
    initNav();
    initHashUI();
    initBase64FileUI();
    initBase64TextUI();
    initBase64FolderUI();
  });
})();
