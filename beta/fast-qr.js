'use strict';

// Route every inherited save/read/delete path, including legacy keys, to this experiment.
var fastQrStorage = {
  getItem: function(key) { return window.localStorage.getItem('pts_fastqr_beta_v122:' + key); },
  setItem: function(key, value) { window.localStorage.setItem('pts_fastqr_beta_v122:' + key, value); },
  removeItem: function(key) { window.localStorage.removeItem('pts_fastqr_beta_v122:' + key); }
};
var shareQrSpeed = 'normal';
var fastQrSeedPayload = null;

function getConnectQrMode() {
  return shareQrSpeed === 'fast'
    ? { label: 'Fast', intervalMs: 500 }
    : { label: 'Normal', intervalMs: 1100 };
}

function updateShareQrCycleEstimate() {
  var el = document.getElementById('share-cycle-estimate');
  var controls = document.getElementById('share-speed-controls');
  var modal = document.getElementById('share-modal');
  if (!el) return;
  if (controls) controls.style.display = qrScannerActive ? 'none' : '';
  if (!modal || modal.style.display !== 'flex' || qrScannerActive || shareQrPreparing || !shareQrValues.length) {
    el.textContent = '';
    el.style.display = 'none';
    return;
  }
  var mode = getConnectQrMode();
  el.style.display = '';
  el.textContent = shareQrValues.length === 1
    ? 'One static QR - no cycling in either mode. Allow time for the camera to focus and decode.'
    : mode.label + ': ' + shareQrValues.length + ' QR parts. Minimum full cycle: ' +
      formatConnectCycle(shareQrValues.length) + ' at ' + (mode.intervalMs / 1000) +
      ' seconds per part. Missed frames need extra cycles; Fast may miss more. This is not instant transfer.';
}

function setShareQrSpeed(value) {
  shareQrSpeed = value === 'fast' ? 'fast' : 'normal';
  var select = document.getElementById('share-speed-select');
  if (select) select.value = shareQrSpeed;
  // Only the outgoing timer changes. Keep payload, frame strings/index and receive progress.
  startShareQrSequence();
}

document.addEventListener('visibilitychange', function() {
  if (document.hidden) stopShareQrSequence();
  else startShareQrSequence();
});

function prepareFastQrStableCopy() {
  try {
    // The only stable-storage access: explicit and read-only; parsing detaches the snapshot.
    var raw = window.localStorage.getItem('pts_saved_state_v1');
    if (!raw) throw new Error('No complete stable flight is saved here. Select Save in stable v1.22, then return to this beta.');
    var payload = JSON.parse(raw);
    if (!payload || !payload.state || typeof payload.state !== 'object' || Array.isArray(payload.state)) {
      throw new Error('The stable saved flight could not be read. Save it again in stable v1.22.');
    }
    payload._replace_state = true;
    cancelShareQrPreparation();
    stopQrScanner();
    stopShareQrSequence();
    fastQrSeedPayload = payload;
    document.getElementById('fast-qr-copy-description').textContent =
      String(payload.state.flight || '(no flight number)') + ' / ' + String(payload.state.date || '(no date)') +
      '\nReplace ALL current beta flight data with this saved copy? Stable v1.22 and the deleted per-tab beta data stay unchanged.';
    document.getElementById('fast-qr-copy-modal').style.display = 'flex';
  } catch (error) {
    showToast(error.message, 'red');
  }
}

function cancelFastQrStableCopy(resume) {
  fastQrSeedPayload = null;
  var modal = document.getElementById('fast-qr-copy-modal');
  if (modal) modal.style.display = 'none';
  if (resume !== false) resumeShareQrSequence();
}

function confirmFastQrStableCopy() {
  if (!fastQrSeedPayload) { showToast('No saved stable copy is awaiting confirmation.', 'red'); return; }
  var payload = fastQrSeedPayload;
  cancelFastQrStableCopy(false);
  applyConnectPayload(payload, 'Complete stable flight copied into Fast QR beta.');
  closeShareModal();
}
