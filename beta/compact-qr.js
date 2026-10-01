'use strict';

var shareQrFormat = 'compact';
var shareQrUseOriginalAttachments = false;

function setShareQrFormat(value) {
  if (value !== 'compact' && value !== 'compatible') throw new Error('Unknown QR format');
  shareQrFormat = value;
  var select = document.getElementById('share-format-select');
  if (select) select.value = value;
  generateShareCode(shareQrUseOriginalAttachments);
}

document.addEventListener('DOMContentLoaded', function() {
  var note = document.getElementById('compact-receiver-note');
  if (note) note.textContent = typeof DecompressionStream === 'function'
    ? 'This browser can receive both Compact compression formats.'
    : 'This browser cannot receive Compact gzip. Select Compatible on the sending device before scanning.';
});

var compactQr = (function() {
  var alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  var chunkSize = 1100;
  var maxBytes = 128 * 1024 * 1024;
  var transfers = Object.create(null);
  var generation = 0;

  function encodeBase32(bytes) {
    var parts = [], block = '', bits = 0, buffer = 0;
    for (var i = 0; i < bytes.length; i++) {
      buffer = (buffer << 8) | bytes[i];
      bits += 8;
      while (bits >= 5) {
        bits -= 5;
        block += alphabet[(buffer >>> bits) & 31];
      }
      if (block.length >= 8192) { parts.push(block); block = ''; }
    }
    if (bits) block += alphabet[(buffer << (5 - bits)) & 31];
    parts.push(block);
    return parts.join('');
  }

  function decodeBase32(text) {
    if (!text || !/^[A-Z2-7]+$/.test(text)) throw new Error('Invalid compact QR encoding');
    var bytes = new Uint8Array(Math.floor(text.length * 5 / 8));
    var bits = 0, buffer = 0, offset = 0;
    for (var i = 0; i < text.length; i++) {
      buffer = (buffer << 5) | alphabet.indexOf(text[i]);
      bits += 5;
      if (bits >= 8) {
        bits -= 8;
        bytes[offset++] = (buffer >>> bits) & 255;
      }
    }
    if (encodeBase32(bytes) !== text) throw new Error('Incomplete compact QR bytes');
    return bytes;
  }

  async function readBytes(stream, check) {
    var reader = stream.getReader(), chunks = [], size = 0;
    try {
      while (true) {
        check();
        var result = await reader.read();
        check();
        if (result.done) break;
        size += result.value.length;
        if (size > maxBytes) throw new Error('Complete QR payload exceeds the 128 MB decoding limit');
        chunks.push(result.value);
      }
    } catch (error) {
      await reader.cancel(error);
      throw error;
    } finally {
      reader.releaseLock();
    }
    var bytes = new Uint8Array(size), offset = 0;
    chunks.forEach(function(chunk) { bytes.set(chunk, offset); offset += chunk.length; });
    return bytes;
  }

  async function encode(json, check) {
    check();
    if (new Blob([json]).size > maxBytes) throw new Error('Complete QR payload exceeds the 128 MB decoding limit');
    var bytes = LZString.compressToUint8Array(json);
    var codec = 'L';
    if (typeof CompressionStream === 'function') {
      var gzip = await readBytes(new Blob([json]).stream().pipeThrough(new CompressionStream('gzip')), check);
      if (gzip.length < bytes.length) { bytes = gzip; codec = 'G'; }
    }
    check();
    var text = encodeBase32(bytes);
    var total = Math.ceil(text.length / chunkSize);
    if (total > CONNECT_QR_MAX_PARTS) throw new Error('This complete transfer needs ' + total + ' compact QR parts (limit ' + CONNECT_QR_MAX_PARTS + '). No data was omitted.');
    var id = connectPayloadId(codec + text).toUpperCase();
    var frames = [];
    for (var i = 0; i < total; i++) {
      frames.push('PTS3/' + codec + '/' + id + '/' + (i + 1).toString(36).toUpperCase() +
        '/' + total.toString(36).toUpperCase() + '/' + text.slice(i * chunkSize, (i + 1) * chunkSize));
    }
    return { frames: frames, codec: codec, bytes: bytes.length };
  }

  function parse(value) {
    var text = String(value || '').trim();
    var match = /^PTS3\/([GL])\/([A-Z0-9]+-[A-Z0-9]+)\/([A-Z0-9]+)\/([A-Z0-9]+)\/([A-Z2-7]+)$/.exec(text);
    if (!match) return null;
    var index = parseInt(match[3], 36), total = parseInt(match[4], 36);
    var length = parseInt(match[2].split('-')[1], 36) - 1;
    if (!Number.isSafeInteger(length) || length < 1 || length > chunkSize * CONNECT_QR_MAX_PARTS ||
        total !== Math.ceil(length / chunkSize) || index < 1 || index > total ||
        match[5].length !== Math.min(chunkSize, length - (index - 1) * chunkSize)) return null;
    return { codec: match[1], id: match[2], index: index, total: total, data: match[5] };
  }

  async function decode(codec, text, check) {
    var bytes = decodeBase32(text);
    check();
    var json;
    if (codec === 'G') {
      if (typeof DecompressionStream !== 'function') {
        throw new Error('This browser cannot read compact gzip QR codes. Select Compatible on the sending device, then scan again.');
      }
      var unpacked = await readBytes(new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip')), check);
      json = new TextDecoder('utf-8', { fatal: true }).decode(unpacked);
    } else if (codec === 'L') {
      if (bytes.length % 2) throw new Error('Invalid compact LZ bytes');
      json = LZString.decompressFromUint8Array(bytes);
    } else {
      throw new Error('Unknown compact QR compression');
    }
    check();
    if (!json) throw new Error('Compact QR decompression failed');
    if (new Blob([json]).size > maxBytes) throw new Error('Complete QR payload exceeds the 128 MB decoding limit');
    return JSON.parse(json);
  }

  function showError(message) {
    var error = document.getElementById('share-qr-error');
    var status = document.getElementById('share-scanner-status');
    if (error) { error.textContent = message; error.style.display = 'block'; }
    if (status) status.textContent = message;
  }

  function cancel() {
    generation++;
    Object.keys(transfers).forEach(function(id) { transfers[id].processing = false; });
  }

  function reset() {
    cancel();
    transfers = Object.create(null);
  }

  function collect(value) {
    if (String(value || '').trim().indexOf('PTS3/') !== 0) return { handled: false, complete: false };
    var part = parse(value);
    if (!part) {
      showError('Invalid compact QR part. Keep scanning a clear, complete QR code.');
      return { handled: true, complete: false };
    }
    var transfer = transfers[part.id];
    if (!transfer) {
      if (Object.keys(transfers).length >= 3) {
        showError('Too many different QR transfers. Close Connect and reopen it to start a fresh scan.');
        return { handled: true, complete: false };
      }
      transfer = { codec: part.codec, count: 0, total: part.total, parts: new Array(part.total), processing: false, failed: false };
      transfers[part.id] = transfer;
    }
    if (transfer.processing || transfer.failed) return { handled: true, complete: false };
    if (transfer.codec !== part.codec || transfer.total !== part.total) {
      showError('Compact QR transfer metadata does not match. Close Connect and scan the sequence again.');
      return { handled: true, complete: false };
    }
    if (!transfer.parts[part.index - 1]) {
      transfer.parts[part.index - 1] = part.data;
      transfer.count++;
    }
    var status = document.getElementById('share-scanner-status');
    if (status) status.textContent = 'Receiving complete flight: ' + transfer.count + ' of ' + transfer.total + ' compact QR parts. All text, images and PDFs are included.';
    if (transfer.count !== transfer.total) return { handled: true, complete: false };
    var text = transfer.parts.join('');
    if (connectPayloadId(transfer.codec + text).toUpperCase() !== part.id) {
      delete transfers[part.id];
      showError('A compact QR part was corrupted. Keep scanning the next cycle; no flight data was imported.');
      return { handled: true, complete: false };
    }
    transfer.processing = true;
    var request = generation;
    function check() {
      if (request !== generation || transfers[part.id] !== transfer) throw new Error('Compact QR import cancelled');
    }
    if (status) status.textContent = 'All compact QR parts received. Unpacking the complete flight...';
    decode(transfer.codec, text, check).then(function(payload) {
      check();
      applyConnectPayload(payload, '', true);
      closeShareModal();
    }).catch(function(error) {
      if (request !== generation || transfers[part.id] !== transfer) return;
      transfer.processing = false;
      transfer.failed = true;
      showError('Unable to retrieve the complete flight: ' + error.message);
    });
    return { handled: true, complete: false };
  }

  return { encode: encode, decode: decode, parse: parse, collect: collect, cancel: cancel, reset: reset };
})();
