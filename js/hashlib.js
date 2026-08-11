/* ============================================================
 * hashlib.js — 哈希计算层
 * - MD5, SHA-1/256/384/512: 内联/Web Crypto (离线可用, 已验证正确)
 * - SHA3, Keccak, BLAKE2b/s, xxHash, Murmur3, ssdeep:
 *   优先用 hash-wasm (CDN, 正确), 无网则提示
 * ============================================================ */
window.HashLib = (function () {
  'use strict';
  var H = {};

  var HEX = '0123456789abcdef';
  function toHex(bytes) {
    var s = '', i;
    for (i = 0; i < bytes.length; i++) s += HEX[(bytes[i] >> 4) & 15] + HEX[bytes[i] & 15];
    return s;
  }
  H.toHex = toHex;
  H.utf8Encode = function (s) { return new TextEncoder().encode(s); };

  /* -------- Web Crypto 哈希 -> Promise<string> -------- */
  H.cryptoHash = function (algo, data) {
    return crypto.subtle.digest(algo, data).then(function (b) { return toHex(new Uint8Array(b)); });
  };

  /* -------- MD5 (内联, 已验证) -------- */
  var MD5_S = [7,12,17,22,7,12,17,22,7,12,17,22,7,12,17,22,
    5,9,14,20,5,9,14,20,5,9,14,20,5,9,14,20,
    4,11,16,23,4,11,16,23,4,11,16,23,4,11,16,23,
    6,10,15,21,6,10,15,21,6,10,15,21,6,10,15,21];
  var MD5_K = [];
  for (var mki = 0; mki < 64; mki++) MD5_K[mki] = Math.floor(Math.abs(Math.sin(mki + 1)) * 4294967296) & 0xffffffff;
  function md5(data) {
    var bytes = (typeof data === 'string') ? new TextEncoder().encode(data) : data;
    var len = bytes.length, bitlen = len * 8;
    var paddedLen = (((len + 1 + 8 + 63) >> 6) << 6);
    var buf = new Uint8Array(paddedLen); buf.set(bytes); buf[len] = 0x80;
    var dv = new DataView(buf.buffer);
    dv.setUint32(paddedLen - 8, bitlen >>> 0, true);
    dv.setUint32(paddedLen - 4, Math.floor(bitlen / 0x100000000), true);
    var a0 = 0x67452301, b0 = 0xefcdab89, c0 = 0x98badcfe, d0 = 0x10325476;
    var words = new Uint32Array(16), i, j, A, B, C, D, F, g;
    for (i = 0; i < paddedLen / 64; i++) {
      for (j = 0; j < 16; j++) words[j] = dv.getUint32(i * 64 + j * 4, true);
      A = a0; B = b0; C = c0; D = d0;
      for (j = 0; j < 64; j++) {
        if (j < 16) { F = (B & C) | (~B & D); g = j; }
        else if (j < 32) { F = (D & B) | (~D & C); g = (5 * j + 1) % 16; }
        else if (j < 48) { F = B ^ C ^ D; g = (3 * j + 5) % 16; }
        else { F = C ^ (B | ~D); g = (7 * j) % 16; }
        F = (F + A + MD5_K[j] + words[g]) >>> 0;
        A = D; D = C; C = B;
        B = (B + ((F << MD5_S[j]) | (F >>> (32 - MD5_S[j])))) >>> 0;
      }
      a0 = (a0 + A) >>> 0; b0 = (b0 + B) >>> 0; c0 = (c0 + C) >>> 0; d0 = (d0 + D) >>> 0;
    }
    var out = new Uint8Array(16), odv = new DataView(out.buffer);
    odv.setUint32(0, a0, true); odv.setUint32(4, b0, true);
    odv.setUint32(8, c0, true); odv.setUint32(12, d0, true);
    return toHex(out);
  }
  H.md5 = md5;

  /* -------- MurmurHash3 (32位, 内联, 已验证) -------- */
  function murmur32(data, seed) {
    seed = (seed === undefined) ? 0 : (seed >>> 0);
    var bytes = (typeof data === 'string') ? new TextEncoder().encode(data) : data;
    var len = bytes.length, h1 = seed, c1 = 0xcc9e2d51, c2 = 0x1b873593;
    var dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength), i = 0;
    while (i + 4 <= len) {
      var k1 = dv.getUint32(i, true);
      k1 = Math.imul(k1, c1) >>> 0; k1 = ((k1 << 15) | (k1 >>> 17)) >>> 0; k1 = Math.imul(k1, c2) >>> 0;
      h1 ^= k1; h1 = ((h1 << 13) | (h1 >>> 19)) >>> 0; h1 = (Math.imul(h1, 5) + 0xe6546b64) >>> 0; i += 4;
    }
    var k1b = 0, rem = len & 3;
    if (rem === 3) k1b ^= bytes[i + 2] << 16;
    if (rem >= 2) k1b ^= bytes[i + 1] << 8;
    if (rem >= 1) { k1b ^= bytes[i]; k1b = Math.imul(k1b, c1) >>> 0; k1b = ((k1b << 15) | (k1b >>> 17)) >>> 0; k1b = Math.imul(k1b, c2) >>> 0; h1 ^= k1b; }
    h1 ^= len; h1 ^= h1 >>> 16; h1 = Math.imul(h1, 0x85ebca6b) >>> 0; h1 ^= h1 >>> 13; h1 = Math.imul(h1, 0xc2b2ae35) >>> 0; h1 ^= h1 >>> 16;
    return (h1 >>> 0).toString(16).padStart(8, '0');
  }
  H.murmur32 = murmur32;

  /* -------- hash-wasm 适配 (异步) -------- */
  H.hasWasm = function () { return typeof window.hashwasm !== 'undefined'; };
  // 统一的算法计算入口: algo(string), data(Uint8Array) -> Promise<string>
  H.compute = function (algo, data) {
    var self = this;
    // 内联/Web Crypto 部分 (离线)
    var cryptoAlgos = {
      'md5': function () { return Promise.resolve(md5(data)); },
      'murmur32': function () { return Promise.resolve(murmur32(data)); },
      'sha1': function () { return self.cryptoHash('SHA-1', data); },
      'sha256': function () { return self.cryptoHash('SHA-256', data); },
      'sha384': function () { return self.cryptoHash('SHA-384', data); },
      'sha512': function () { return self.cryptoHash('SHA-512', data); }
    };
    if (cryptoAlgos[algo]) return cryptoAlgos[algo]();
    // hash-wasm 部分 (需网络)
    if (!window.hashwasm) {
      return Promise.reject(new Error('算法 ' + algo + ' 需要联网加载计算库，请检查网络'));
    }
    var wasm = window.hashwasm;
    var map = {
      'sha224': function () { return wasm.createSHA224().then(function (h){ h.init(); h.update(data); return h.digest('hex'); }); },
      'sha3_224': function () { return wasm.createSHA3(224).then(function (h){ h.init(); h.update(data); return h.digest('hex'); }); },
      'sha3_256': function () { return wasm.createSHA3(256).then(function (h){ h.init(); h.update(data); return h.digest('hex'); }); },
      'sha3_384': function () { return wasm.createSHA3(384).then(function (h){ h.init(); h.update(data); return h.digest('hex'); }); },
      'sha3_512': function () { return wasm.createSHA3(512).then(function (h){ h.init(); h.update(data); return h.digest('hex'); }); },
      'blake2b': function () { return wasm.createBLAKE2b(512).then(function (h){ h.init(); h.update(data); return h.digest('hex'); }); },
      'blake2s': function () { return wasm.createBLAKE2s(256).then(function (h){ h.init(); h.update(data); return h.digest('hex'); }); },
      'xxhash32': function () { return wasm.createXXHash32().then(function (h){ h.init(); h.update(data); return h.digest('hex'); }); },
      'xxhash64': function () { return wasm.createXXHash64().then(function (h){ h.init(); h.update(data); return h.digest('hex'); }); }
    };
    if (!map[algo]) {
      if (algo === 'murmur128') {
        return Promise.reject(new Error('MurmurHash3-128 需第三方库(mmh3)，浏览器暂不支持'));
      }
      if (algo === 'ssdeep') {
        return Promise.reject(new Error('ssdeep 模糊哈希需原生库，浏览器暂不支持'));
      }
      return Promise.reject(new Error('不支持的算法: ' + algo));
    }
    return map[algo]();
  };

  return H;
})();
