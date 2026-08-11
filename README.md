================================================================
  哈希 & Base64 全能工具 / Hash & Base64 Toolkit
================================================================

  「哈希 & Base64 全能工具」
  「Hash & Base64 Toolkit」

----------------------------------------------------------------
  项目简介 / Project Introduction
----------------------------------------------------------------

  本项目简介：
  一个多功能的本地网页工具，合并了 hash.py 与 base.pyw 的全部
  功能。支持 20+ 种哈希算法（MD5 / SHA-1 / SHA-2 / SHA3 /
  BLAKE2 / xxHash / MurmurHash 等），以及三种 Base64 编解码
  模式（单文件 / 文本 / 文件夹）。哈希计算支持期望值对比以
  校验文件完整性；Base64 支持普通格式与增强格式（可保存原始
  文件名），文件夹模式可批量编码为单个 .b64 并还原完整目录
  结构。深色主题响应式界面，无需安装，浏览器打开即用。

  (A feature-rich local web toolkit combining hash.py and
   base.pyw into one tool. Supports 20+ hash algorithms (MD5 /
   SHA-1 / SHA-2 / SHA3 / BLAKE2 / xxHash / MurmurHash, etc.)
   plus three Base64 encode/decode modes (single-file / text /
   folder). Hash comparison against an expected value verifies
   file integrity; Base64 supports both standard format and an
   enhanced format that preserves original filenames, and the
   folder mode batch-encodes a whole folder into a single .b64
   file with full directory structure restoration. Dark
   responsive UI, no installation required - just open it in
   your browser.)


----------------------------------------------------------------
  在线访问 / Online Access
----------------------------------------------------------------

  在线直链 / Online URL:
  https://hash-and-base64.pages.dev/

  本地使用（浏览器直接打开 index.html 即可）：
  Local usage (just open index.html in your browser):
  D:\Desktop\哈希与Base64工具\index.html

  注意：MD5 / SHA-1/256/384/512 / MurmurHash3 可离线使用；
  SHA3 / BLAKE2 / xxHash 及文件夹 zip 打包需联网加载计算库。

  (Note: MD5 / SHA-1/256/384/512 / MurmurHash3 work offline;
   SHA3 / BLAKE2 / xxHash and folder zip packing require an
   internet connection to load the compute library.)


----------------------------------------------------------------
  使用说明 / Usage
----------------------------------------------------------------

  使用步骤说明：
  顶部导航栏可在「哈希计算」与「Base64 编解码」两大工具间切换。

  【哈希计算】
  · 选择要计算哈希的文件 → 选择算法（加密型 / 非加密型 / 特殊）
  · 点击「计算哈希值」→ 显示结果，可一键复制
  · 输入期望的哈希值可对比，判断文件是否完整/被篡改

  【Base64 编解码】
  · 单文件模式：编码（文件→Base64）或解码（Base64→文件），
    可选普通格式或增强格式（保存原始文件名）
  · 文本模式：编码/解码文本，自动检测并格式化 JSON
  · 文件夹模式：批量编码整个文件夹为 .b64；解码打包为 zip
    下载，保留完整目录结构

  (Use the top navigation to switch between "Hash" and "Base64".

  [Hash Calculation]
  - Pick a file, choose an algorithm (crypto / non-crypto /
    special), click "Calculate" to get the hash, one-click copy.
  - Enter an expected hash to compare and verify file integrity.

  [Base64 Encode/Decode]
  - Single-file: encode (file→Base64) or decode (Base64→file),
    with standard or enhanced format (preserves filename).
  - Text mode: encode/decode text with automatic JSON detection.
  - Folder mode: batch-encode a folder into one .b64; decode
    packs into a zip preserving the directory structure.)


----------------------------------------------------------------
  技术栈 / Tech Stack
----------------------------------------------------------------

  本工具使用技术：
  原生 HTML5 + CSS3 + JavaScript，无框架。MD5 与 MurmurHash3
  为内置纯 JS 实现；SHA-1/2 使用浏览器原生 Web Crypto；
  SHA3 / BLAKE2 / xxHash 通过 hash-wasm (WebAssembly) 计算，
  文件夹解码通过 JSZip 打包。全部支持多文件选择与文件夹上传。

  (Vanilla HTML5 + CSS3 + JavaScript, no framework. MD5 and
   MurmurHash3 are built-in pure JS; SHA-1/2 use the browser's
   native Web Crypto; SHA3 / BLAKE2 / xxHash run via hash-wasm
   (WebAssembly); folder decoding packs with JSZip. Supports
   multi-file selection and folder upload.)


----------------------------------------------------------------
  本项目由 AI 协助创建。
  This project was created with AI assistance.
----------------------------------------------------------------
