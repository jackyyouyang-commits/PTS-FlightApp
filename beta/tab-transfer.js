'use strict';

// All inherited storage paths (including legacy keys) go through this namespace.
var betaStorage = {
  getItem: function(key) { return window.localStorage.getItem('pts_beta_v122:' + key); },
  setItem: function(key, value) { window.localStorage.setItem('pts_beta_v122:' + key, value); },
  removeItem: function(key) { window.localStorage.removeItem('pts_beta_v122:' + key); }
};
var betaPreserveImportedState = false;
var betaPendingImport = null;
var betaQrTransfer = null;
var betaMonths = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
var betaFlightFields = (
  'flight date regn config sta eta ata gate carousel weather delayCode arr_cn arr_ism ' +
  'arr_pax_j arr_pax_w arr_pax_y arr_pax_inf arr_wchr_s arr_wchr_s_details arr_wchc arr_maas arr_meda arr_umnr arr_svip arr_deaf arr_blnd ' +
  'intl_cnx us_cnx ws_cnx ws_wch ac_wch arr_doorside F19 arr_total_bags arr_first_bag arr_last_bag ' +
  'dep_std dep_etd dep_board_time dep_dct dep_gate_close dep_blk dep_eta_hkg dep_sta_hkg dep_delay dep_px_dt dep_cn dep_ism dep_crew_fig dep_ft ' +
  'dep_cat_j dep_cat_w dep_cat_y dep_cargo_type dep_cargo_kg dep_pre_fuel dep_total_fuel dep_actual_fuel dep_mzfw dep_ezfw Q31 dep_azfw ' +
  'cap_j cap_w cap_y avail_j avail_w avail_y est_j est_w est_y ' +
  'load_j load_w load_y load_inf sublo_j sublo_w sublo_y sublo_inf net_j net_w net_y net_inf total_j total_w total_y total_inf ' +
  'final_j final_w final_y final_inf final_rev1_j final_rev1_w final_rev1_y final_rev1_inf final_rev2_j final_rev2_w final_rev2_y final_rev2_inf ' +
  'dep_in_dmp dep_hkg dep_inf dep_join dep_dm_e dep_go_s dep_sl_r dep_cis dep_ic dep_oc dep_total_bags dep_crew_bags dep_strl dep_wch dep_carry_on ' +
  'dep_inf_occ dep_wchr_s dep_wchc dep_maas dep_umnr dep_svip dep_meda dep_deaf dep_blnd dep_chd defects remarks _flightCancelled'
).split(' ');
var betaPtsFields = ['_noticesAcked', '_notocReminderAcked'];
var betaSections = {
  'pts': { label: 'Flight Info (arrival, departure and loading)', fields: betaFlightFields },
  'pts-schedule': { label: 'PTS Schedule (arrival and departure actuals)', fields: betaPtsFields },
  'staff-acceptance': { label: 'Staff Acceptance', id: 'staff-acc-textarea', field: '_staff_acc', badge: 'staff-acc-lock-badge' },
  'arr-ptm': { label: 'Arrival PTM', id: 'arr-ptm-textarea', field: '_arr_ptm', badge: 'arr-ptm-lock-badge' },
  'arr-bnl': { label: 'Arrival BNL', id: 'arr-bnl-textarea', field: '_arr_bnl', badge: 'arr-bnl-lock-badge' },
  'arr-disruption-ppm': { label: 'Arrival Disruption PPM', id: 'arr-disruption-ppm-textarea', field: '_arr_disruption_ppm', badge: 'arr-disruption-ppm-lock-badge' },
  'itd-tag-card': { label: 'ITD Tag Card', id: 'itd-tag-card-textarea', field: '_itd_tag_card', badge: 'itd-tag-card-lock-badge' },
  'arr-offload': { label: 'Arrival Offload', id: 'oir-textarea', field: '_oir', badge: 'oir-lock-badge' },
  'dep-onload': { label: 'Departure Onload', id: 'dep-lir-textarea', field: '_dep_lir', badge: 'dep-lir-lock-badge' },
  'arr-crew': { label: 'Arrival Crew List', id: 'crew-textarea', field: '_crew', badge: 'crew-lock-badge' },
  'dep-gen-dec': { label: 'Departure Gen Dec', id: 'dep-gen-dec-textarea', field: '_dep_gen_dec', badge: 'dep-gen-dec-lock-badge', pdf: '_dep_gen_dec_pdf', slot: 'depGenDec' },
  'agent-positions': { label: 'Agent Positions', id: 'agent-pos-textarea', field: '_agent_pos', badge: 'agent-pos-lock-badge', pdf: '_agent_pos_pdf', slot: 'agent' },
  'ramp-roster': { label: 'Ramp Roster', id: 'ramp-roster-textarea', field: '_ramp_roster', badge: 'ramp-roster-lock-badge', pdf: '_ramp_roster_pdf', slot: 'rampRoster' }
};

function betaRecord(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value) &&
    (Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null);
}

function betaExactKeys(value, keys, label) {
  if (!betaRecord(value) || Object.keys(value).length !== keys.length ||
      keys.some(function(key) { return !Object.prototype.hasOwnProperty.call(value, key); })) {
    throw new Error('Invalid or incomplete ' + label + '. No data was changed.');
  }
}

function betaIdentity(flight, date) {
  if (typeof flight !== 'string' || typeof date !== 'string') throw new Error('Flight number and date are required.');
  var numbers = flight.toUpperCase().replace(/\s+/g, '').split('/');
  var airline = '';
  if (numbers.length > 2) throw new Error('Enter a flight number such as CX888 or CX888/865 before transferring.');
  var number = numbers.map(function(part, index) {
    if (index && /^\d+[A-Z]?$/.test(part)) part = airline + part;
    var match = /^([A-Z0-9]{2,3}?)(0*[1-9]\d{0,3})([A-Z]?)$/.exec(part);
    if (!match) throw new Error('Enter a flight number such as CX888 or CX888/865 before transferring.');
    airline = match[1];
    return airline + String(Number(match[2])) + match[3];
  }).join('/');
  var text = date.trim(), match, day, month, year;
  if ((match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text))) {
    year = +match[1]; month = +match[2] - 1; day = +match[3];
  } else if ((match = /^(\d{1,2})[\s/-]*([A-Za-z]{3,9})[\s/-]*(\d{4})$/.exec(text))) {
    day = +match[1]; year = +match[3];
    month = betaMonths.map(function(m) { return m.toLowerCase(); }).indexOf(match[2].slice(0, 3).toLowerCase());
  } else if ((match = /^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/.exec(text))) {
    day = +match[1]; month = +match[2] - 1; year = +match[3];
  } else {
    throw new Error('Use a full flight date with year (10 Sep 2026, 10/09/2026 or 2026-09-10).');
  }
  // Feed an unambiguous form to the app's date helper, then reject its rollover defaults.
  var parsed = month >= 0 && month < 12 ? parseFlightDateStr(day + ' ' + betaMonths[month] + ' ' + year) : null;
  if (!parsed || year < 2000 || year > 2199 || parsed.getFullYear() !== year ||
      parsed.getMonth() !== month || parsed.getDate() !== day) throw new Error('Invalid flight date.');
  return { number: number, date: year + '-' + pad(month + 1) + '-' + pad(day) };
}

function betaSameFlight(a, b) { return a.number === b.number && a.date === b.date; }

function betaHasFlightContent() {
  return Object.keys(state).some(function(key) {
    return key !== '_locked' && key !== '_badgeVisible' && !!state[key];
  }) || Object.keys(arrActual).length > 0 || Object.keys(depActual).length > 0 ||
    PASTE_IMAGE_IDS.some(function(id) {
      return !!((document.getElementById(id) || {}).value || contentRichHtml[id] ||
        (pastedImages[id] && pastedImages[id].length));
    }) || !!agentPosPdfData || !!contentPdfImports.depGenDec.data || !!contentPdfImports.rampRoster.data;
}

function betaCheckReceiver(identity) {
  if (!betaHasFlightContent()) return;
  var current;
  try { current = betaIdentity(state.flight, state.date); }
  catch (e) { throw new Error('This beta already has content but lacks a valid flight number/date. Set its identity first; nothing was changed.'); }
  if (!betaSameFlight(current, identity)) {
    throw new Error('Wrong flight: receiving ' + identity.number + ' / ' + identity.date +
      ', but this beta contains ' + current.number + ' / ' + current.date + '. Nothing was changed.');
  }
}

function betaValidateState(value, keys) {
  betaExactKeys(value, keys, 'section fields');
  keys.forEach(function(key) {
    if (key.charAt(0) === '_') {
      if (typeof value[key] !== 'boolean') throw new Error('Invalid flag: ' + key);
    } else if (typeof value[key] !== 'string') throw new Error('Invalid field: ' + key);
  });
}

function betaValidateActuals(actuals, count) {
  if (!betaRecord(actuals)) throw new Error('Invalid actual times.');
  Object.keys(actuals).forEach(function(key) {
    if (!/^(0|[1-9]\d*)$/.test(key) || +key >= count || typeof actuals[key] !== 'string' ||
        !/^(?:[01]?\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/.test(actuals[key])) {
      throw new Error('Invalid actual time at ' + key);
    }
  });
}

function betaValidateImage(value) {
  if (typeof value !== 'string' || !/^data:image\/[a-z0-9.+-]+(?:;[a-z0-9=.+-]+)*,/i.test(value) ||
      /["<>\r\n]/.test(value)) throw new Error('Invalid image data. No attachment was omitted.');
  var comma = value.indexOf(','), body = value.slice(comma + 1);
  if (!body || (/;base64$/i.test(value.slice(0, comma)) && !/^[A-Za-z0-9+/]+={0,2}$/.test(body))) {
    throw new Error('Invalid image encoding. No attachment was omitted.');
  }
}

function betaValidatePdf(value) {
  if (typeof value !== 'string' || (value !== '' && !/^data:application\/pdf(?:;filename=[^;,\r\n]+)?;base64,JVBERi0[A-Za-z0-9+/]*={0,2}$/.test(value))) {
    throw new Error('Invalid PDF data. No attachment was omitted.');
  }
}

function validateBetaTabPayload(data, checkReceiver) {
  betaExactKeys(data, ['format', 'version', 'section', 'flight', 'content'], 'tab envelope');
  if (data.format !== 'pts-tab' || data.version !== 1 || !Object.prototype.hasOwnProperty.call(betaSections, data.section)) {
    throw new Error('Unsupported beta tab or protocol version.');
  }
  betaExactKeys(data.flight, ['number', 'date'], 'flight identity');
  var identity = betaIdentity(data.flight.number, data.flight.date);
  if (!betaSameFlight(identity, data.flight)) throw new Error('Non-canonical flight identity.');
  var section = betaSections[data.section], content = data.content;
  if (section.fields) {
    betaExactKeys(content, data.section === 'pts' ? ['state'] : ['state', 'arrActual', 'depActual'], 'tab content');
    betaValidateState(content.state, section.fields);
    if (data.section === 'pts') {
      if (!betaSameFlight(betaIdentity(content.state.flight, content.state.date), identity)) throw new Error('Flight Info identity does not match its envelope.');
    } else {
      betaValidateActuals(content.arrActual, arrActivities.length);
      betaValidateActuals(content.depActual, depActivities.length);
    }
  } else {
    var keys = [section.field, '_rich_html', '_images'];
    if (section.pdf) keys.push(section.pdf);
    betaExactKeys(content, keys, 'operational tab');
    if (typeof content[section.field] !== 'string') throw new Error('Invalid tab text.');
    betaExactKeys(content._rich_html, [section.id], 'rich formatting');
    betaExactKeys(content._images, [section.id], 'tab images');
    if (typeof content._rich_html[section.id] !== 'string' || !Array.isArray(content._images[section.id])) {
      throw new Error('Invalid rich formatting or image list.');
    }
    content._images[section.id].forEach(betaValidateImage);
    if (section.pdf) betaValidatePdf(content[section.pdf]);
  }
  if (checkReceiver) betaCheckReceiver(identity);
  return section;
}

function buildBetaTabPayload(sectionId) {
  var section = betaSections[sectionId];
  if (!section) throw new Error('Select a data tab. Summary is a derived view.');
  var content = {};
  if (section.fields) {
    content.state = {};
    section.fields.forEach(function(key) { content.state[key] = key.charAt(0) === '_' ? !!state[key] : state[key]; });
    if (sectionId === 'pts-schedule') { content.arrActual = arrActual; content.depActual = depActual; }
  } else {
    content[section.field] = document.getElementById(section.id).value;
    content._rich_html = {}; content._rich_html[section.id] = contentRichHtml[section.id] || '';
    content._images = {}; content._images[section.id] = pastedImages[section.id] || [];
    if (section.pdf) content[section.pdf] = section.slot === 'agent' ? agentPosPdfData || '' : contentPdfImports[section.slot].data || '';
  }
  var payload = JSON.parse(JSON.stringify({
    format: 'pts-tab', version: 1, section: sectionId, flight: betaIdentity(state.flight, state.date), content: content
  }));
  validateBetaTabPayload(payload, false);
  return payload;
}

function betaSelectedSection() { return document.getElementById('beta-share-section').value; }

function openBetaConnect() {
  var active = document.querySelector('.tab-content.active');
  var id = active ? active.id.replace(/^tab-/, '') : 'pts';
  document.getElementById('beta-share-section').value = betaSections[id] ? id : 'pts';
  generateShareCode();
}

function updateBetaShareSummary(payload) {
  document.getElementById('share-content-summary').textContent = betaSections[payload.section].label +
    ' only - ' + payload.flight.number + ' / ' + payload.flight.date + '. Other tabs are not included.';
}

function buildBetaQrFrames(compressed, sectionId) {
  var total = Math.ceil(compressed.length / CONNECT_QR_CHUNK_SIZE);
  if (!total || total > CONNECT_QR_MAX_PARTS) throw new Error('This tab needs ' + total + ' QR parts (limit ' + CONNECT_QR_MAX_PARTS + '). Nothing was omitted.');
  var base = 'https://jackyyouyang-commits.github.io/PTS-FlightApp/beta/PTS_FlightApp.html';
  var id = connectPayloadId(compressed), frames = [];
  for (var i = 0; i < total; i++) {
    frames.push(base + '#ptsb=1.' + sectionId + '.' + id + '.' + (i + 1).toString(36) + '.' +
      total.toString(36) + '.' + compressed.slice(i * CONNECT_QR_CHUNK_SIZE, (i + 1) * CONNECT_QR_CHUNK_SIZE));
  }
  return frames;
}

function betaImportError(error) {
  var el = document.getElementById('share-qr-error');
  el.textContent = error.message; el.style.display = 'block';
  document.getElementById('share-scanner-status').textContent = error.message;
  showToast(error.message, 'red');
}

function collectBetaQrPart(value) {
  var hash;
  try { hash = String(value).charAt(0) === '#' ? String(value) : new URL(value, location.href).hash; }
  catch (e) { return { handled: false, complete: false }; }
  if (hash.indexOf('#ptsb=') !== 0) return { handled: false, complete: false };
  try {
    var fields = hash.slice(6).split('.');
    if (fields.length !== 6 || fields[0] !== '1' || !Object.prototype.hasOwnProperty.call(betaSections, fields[1]) ||
        !/^[a-z0-9]+-[a-z0-9]+$/.test(fields[2]) || !/^[a-z0-9]+$/.test(fields[3]) ||
        !/^[a-z0-9]+$/.test(fields[4]) || !/^[A-Za-z0-9+-]+$/.test(fields[5])) throw new Error('Malformed or unsupported beta QR frame.');
    var index = parseInt(fields[3], 36), total = parseInt(fields[4], 36), id = fields[2], sectionId = fields[1];
    var expectedLength = parseInt(id.split('-')[1], 36);
    if (!Number.isSafeInteger(index) || !Number.isSafeInteger(total) || index < 1 || index > total ||
        total > CONNECT_QR_MAX_PARTS || Math.ceil(expectedLength / CONNECT_QR_CHUNK_SIZE) !== total ||
        fields[5].length !== (index < total ? CONNECT_QR_CHUNK_SIZE : expectedLength - (total - 1) * CONNECT_QR_CHUNK_SIZE)) {
      throw new Error('Invalid beta QR part count or length.');
    }
    if (betaPendingImport) return { handled: true, complete: true };
    if (!betaQrTransfer) betaQrTransfer = { id: id, section: sectionId, total: total, parts: new Array(total), count: 0 };
    var transfer = betaQrTransfer;
    if (transfer.id !== id || transfer.section !== sectionId || transfer.total !== total) {
      throw new Error('A different tab transfer is in progress. Close Connect to discard its parts before starting another.');
    }
    if (transfer.parts[index - 1] && transfer.parts[index - 1] !== fields[5]) {
      betaQrTransfer = null;
      throw new Error('Conflicting QR part. Transfer discarded; scan the sequence again.');
    }
    if (!transfer.parts[index - 1]) { transfer.parts[index - 1] = fields[5]; transfer.count++; }
    document.getElementById('share-scanner-status').textContent = 'Receiving ' + betaSections[sectionId].label + ': ' +
      transfer.count + ' of ' + total + ' parts. Minimum full cycle: ' + formatConnectCycle(total) +
      ' at 1.1 seconds per part; missed parts need another cycle. Nothing changes until all parts arrive and you confirm.';
    if (transfer.count < total) return { handled: true, complete: false };
    betaQrTransfer = null;
    var compressed = transfer.parts.join('');
    if (connectPayloadId(compressed) !== id) throw new Error('Corrupt QR transfer. Nothing changed; scan the sequence again.');
    var json = LZString.decompressFromEncodedURIComponent(compressed);
    if (!json) throw new Error('Invalid compressed beta payload.');
    var payload = JSON.parse(json);
    if (payload.section !== sectionId) throw new Error('QR section does not match payload.');
    validateBetaTabPayload(payload, true);
    stageBetaImport({ kind: 'tab', data: payload }, betaSections[sectionId].label + '\n' + payload.flight.number + ' / ' + payload.flight.date +
      '\nReplace this tab only, including its empty fields and attachments? Other tabs remain unchanged.');
    return { handled: true, complete: true };
  } catch (e) {
    betaImportError(e);
    return { handled: true, complete: false };
  }
}

function stageBetaImport(pending, description) {
  cancelShareQrPreparation();
  stopQrScanner(); stopShareQrSequence();
  betaPendingImport = pending;
  document.getElementById('beta-import-description').textContent = description;
  document.getElementById('beta-import-modal').style.display = 'flex';
}

function cancelBetaImport(resume) {
  betaPendingImport = null;
  var modal = document.getElementById('beta-import-modal');
  if (modal) modal.style.display = 'none';
  if (resume !== false) resumeShareQrSequence();
}

function applyBetaTabPayload(data) {
  var section = validateBetaTabPayload(data, true);
  var next = JSON.parse(JSON.stringify(buildLocalSavePayload()));
  var content = JSON.parse(JSON.stringify(data.content));
  if (!betaHasFlightContent()) {
    next.state.flight = data.flight.number;
    var date = data.flight.date.split('-');
    next.state.date = date[2] + ' ' + betaMonths[Number(date[1]) - 1] + ' ' + date[0];
  }
  if (section.fields) {
    section.fields.forEach(function(key) { next.state[key] = content.state[key]; });
    if (data.section === 'pts') { next.state._locked = true; next.state._badgeVisible = true; }
    else { next.arrActual = content.arrActual; next.depActual = content.depActual; }
  } else {
    next[section.field] = content[section.field];
    next._rich_html[section.id] = sanitizePastedHtml(content._rich_html[section.id]);
    next._images[section.id] = content._images[section.id];
    if (section.pdf) next[section.pdf] = content[section.pdf];
  }
  next._beta_isolated_restore = true;
  // Validate and durably write the detached merge before touching live state or the DOM.
  betaStorage.setItem(PTS_SAVE_KEY, JSON.stringify(next));
  betaPreserveImportedState = true;
  state = next.state;
  if (data.section === 'pts-schedule') { arrActual = next.arrActual; depActual = next.depActual; }
  if (section.id) {
    var ta = document.getElementById(section.id);
    ta.value = next[section.field];
    contentRichHtml[section.id] = next._rich_html[section.id];
    pastedImages[section.id] = next._images[section.id];
    renderRichContent(section.id);
    renderPastedImageGallery(section.id);
    if (section.pdf) {
      if (section.slot === 'agent') {
        removeAgentPosPdf();
        if (next[section.pdf]) showAgentPosPdf(next[section.pdf]);
      } else {
        removeContentPdf(section.slot);
        if (next[section.pdf]) showContentPdf(section.slot, next[section.pdf]);
      }
    }
    setSimpleContentLock(section.id, section.badge, true);
  }
  if (section.fields || !document.getElementById('f-flight').value) {
    syncInputsFromState();
    renderActivities(true);
    renderPaxLoadTable(); updateArrPaxTotal(); renderSummary();
    if (data.section === 'pts') unlockFields();
    if (data.section === 'pts' || state._locked) lockFields();
  }
  syncCancelFlightButton(); updateHeaderFlightNum(); updateETDCountdown();
  refreshSummarySpans(); refreshFinalLoading(); updateLastUpdatedDisplay(next.savedAt);
  return true;
}

function confirmBetaImport() {
  if (!betaPendingImport) { betaImportError(new Error('No completed transfer is waiting for confirmation.')); return; }
  var pending = betaPendingImport;
  try {
    if (pending.kind === 'tab') applyBetaTabPayload(pending.data);
    else {
      betaPreserveImportedState = false;
      if (!applyConnectPayload(pending.data, 'Complete flight copied into beta.')) {
        throw new Error('Complete beta flight loaded but not saved. Keep this page open and retry Save.');
      }
    }
    var label = pending.kind === 'tab' ? betaSections[pending.data.section].label : 'Complete beta flight';
    closeShareModal();
    showToast(label + ' received and saved', 'green');
  } catch (e) {
    cancelBetaImport();
    betaImportError(e);
  }
}

function stageBetaFullImport(data) {
  if (!betaRecord(data) || !betaRecord(data.state) || (data.v !== undefined && data.v !== 2) ||
      data.format || data.section || data.content) throw new Error('Not a supported complete-flight seed.');
  var copy = JSON.parse(JSON.stringify(data));
  var allowed = betaFlightFields.concat(betaPtsFields, ['_locked', '_badgeVisible']);
  Object.keys(copy.state).forEach(function(key) {
    if (allowed.indexOf(key) < 0 || (typeof copy.state[key] !== 'string' && typeof copy.state[key] !== 'boolean')) throw new Error('Invalid full-flight field: ' + key);
  });
  betaValidateActuals(copy.arrActual || {}, arrActivities.length);
  betaValidateActuals(copy.depActual || {}, depActivities.length);
  if (copy._dep_crew || (copy._rich_html && copy._rich_html['dep-crew-textarea']) ||
      (copy._images && copy._images['dep-crew-textarea'] && copy._images['dep-crew-textarea'].length)) {
    throw new Error('This legacy flight has departure-crew content with no visible beta tab. Import cancelled rather than omitting it. Move that content into a visible stable tab and save a new complete snapshot first.');
  }
  if (copy._rich_html !== undefined && !betaRecord(copy._rich_html)) throw new Error('Invalid full-flight rich content.');
  if (copy._images !== undefined && !betaRecord(copy._images)) throw new Error('Invalid full-flight images.');
  Object.keys(OPERATIONAL_TEXT_FIELDS).forEach(function(id) {
    var key = OPERATIONAL_TEXT_FIELDS[id];
    if (copy[key] !== undefined && typeof copy[key] !== 'string') throw new Error('Invalid full-flight tab text.');
    if (copy._rich_html && copy._rich_html[id] !== undefined && typeof copy._rich_html[id] !== 'string') throw new Error('Invalid rich content.');
    var images = copy._images && copy._images[id];
    if (images !== undefined) {
      if (!Array.isArray(images)) throw new Error('Invalid image list.');
      images.forEach(betaValidateImage);
    }
  });
  ['_agent_pos_pdf', '_dep_gen_dec_pdf', '_ramp_roster_pdf'].forEach(function(key) { betaValidatePdf(copy[key] || ''); });
  copy._replace_state = true;
  stageBetaImport({ kind: 'full', data: copy }, 'Replace the ENTIRE beta flight with this local complete-flight seed?\n' +
    String(copy.state.flight || '(no flight)') + ' / ' + String(copy.state.date || '(no date)') +
    '\nThis is not a per-tab transfer. All existing beta tabs will be replaced. Stable v1.22 remains untouched.');
  return true;
}

function copyStableFlightToBeta() {
  try {
    // The sole stable-storage access is explicit, read-only, and detached by parsing.
    var raw = window.localStorage.getItem('pts_saved_state_v1');
    if (!raw) throw new Error('No complete stable flight is saved in this browser. Open stable v1.22, select Save, then return here.');
    stageBetaFullImport(JSON.parse(raw));
  } catch (e) { betaImportError(e); }
}

function initBetaTransfer() {
  var select = document.getElementById('beta-share-section');
  Object.keys(betaSections).forEach(function(id) {
    var option = document.createElement('option');
    option.value = id; option.textContent = betaSections[id].label; select.appendChild(option);
  });
  var hash = location.hash;
  if (hash.indexOf('#ptsb=') === 0 || shareCodeFromScannedValue(hash)) {
    document.getElementById('share-modal').style.display = 'flex';
    importDecodedQrValue(hash);
    history.replaceState(null, '', location.pathname + location.search);
  }
}
