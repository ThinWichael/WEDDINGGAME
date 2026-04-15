/**
 * Wedding Game — Google Apps Script Web App
 *
 * Deploy:
 *   1. Open script.google.com, create a new project, paste this file as Code.gs.
 *   2. Edit SHEET_ID below to match your Google Sheet.
 *   3. Deploy → New deployment → Web app
 *        - Execute as: Me (host's Google account)
 *        - Who has access: Anyone
 *      Copy the /exec URL into VITE_APPS_SCRIPT_URL in the React .env file.
 *   4. Re-deploy as a new version every time you change this code.
 */

var SHEET_ID = '1pAbdm6Q8DRZjC4bO7FSdDrelKzUcX_UjKz668XcjaZo';

// ---------- Entry points ----------

function doGet(e) {
  return route_(e, null);
}

function doPost(e) {
  var body = {};
  try {
    if (e.postData && e.postData.contents) {
      body = JSON.parse(e.postData.contents);
    }
  } catch (err) {
    return json_({ ok: false, error: 'invalid JSON body' });
  }
  return route_(e, body);
}

function route_(e, body) {
  var action = (e.parameter && e.parameter.action) || (body && body.action) || '';
  try {
    switch (action) {
      case 'registerGuest':
        return json_({ ok: true, data: registerGuest_(body) });
      case 'joinGame':
        return json_({ ok: true, data: joinGame_(body) });
      case 'submitAnswer':
        return json_({ ok: true, data: submitAnswer_(body) });
      case 'advanceState':
        requireHost_(body);
        return json_({ ok: true, data: advanceState_(body) });
      case 'verifyHost':
        requireHost_(body);
        return json_({ ok: true, data: { ok: true } });
      case 'createRoom':
        requireHost_(body);
        return json_({ ok: true, data: createRoom_(body) });
      case 'updateRoom':
        requireHost_(body);
        return json_({ ok: true, data: updateRoom_(body) });
      case 'deleteRoom':
        requireHost_(body);
        return json_({ ok: true, data: deleteRoom_(body) });
      case 'upsertQuestion':
        requireHost_(body);
        return json_({ ok: true, data: upsertQuestion_(body) });
      case 'deleteQuestion':
        requireHost_(body);
        return json_({ ok: true, data: deleteQuestion_(body) });
      case 'createGuest':
        requireHost_(body);
        return json_({ ok: true, data: createGuest_(body) });
      default:
        return json_({ ok: false, error: 'unknown action: ' + action });
    }
  } catch (err) {
    return json_({ ok: false, error: String(err && err.message ? err.message : err) });
  }
}

// ---------- Business logic ----------

function registerGuest_(body) {
  if (!body.roomId) throw new Error('roomId required');
  if (!body.name) throw new Error('name required');

  // Verify room exists
  var rooms = sheet_('Rooms').getDataRange().getValues();
  var roomsHeader = rooms[0];
  var roomsIdxRoomId = roomsHeader.indexOf('roomId');
  var roomExists = false;
  for (var r = 1; r < rooms.length; r++) {
    if (rooms[r][roomsIdxRoomId] === body.roomId) {
      roomExists = true;
      break;
    }
  }
  if (!roomExists) throw new Error('room not found: ' + body.roomId);

  var sheet = sheet_('Guests');
  var header = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];

  var guestId = 'g_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
  var row = new Array(header.length).fill('');
  function setCol(name, value) {
    var idx = header.indexOf(name);
    if (idx >= 0) row[idx] = value;
  }
  setCol('guestId', guestId);
  setCol('roomId', body.roomId);
  setCol('name', body.name);
  setCol('email', body.email || '');
  setCol('maritalStatus', body.maritalStatus || '');
  setCol('joinCeremony', !!body.joinCeremony);
  setCol('joinAfterParty', !!body.joinAfterParty);
  setCol('vegetarian', !!body.vegetarian);
  setCol('message', body.message || '');
  setCol('registeredAt', new Date().toISOString());
  sheet.appendRow(row);

  return { guestId: guestId, roomId: body.roomId, name: body.name };
}

function joinGame_(body) {
  if (!body.roomId) throw new Error('roomId required');
  if (!body.nickname) throw new Error('nickname required');
  var nickname = String(body.nickname).trim();
  if (!nickname) throw new Error('nickname required');
  var confirmExisting = body.confirmExisting === true;

  var lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    // Verify room exists
    var rooms = sheet_('Rooms').getDataRange().getValues();
    var roomsHeader = rooms[0];
    var roomsIdxRoomId = roomsHeader.indexOf('roomId');
    var roomExists = false;
    for (var r = 1; r < rooms.length; r++) {
      if (rooms[r][roomsIdxRoomId] === body.roomId) {
        roomExists = true;
        break;
      }
    }
    if (!roomExists) throw new Error('room not found: ' + body.roomId);

    var sheet = sheet_('GamePlayers');
    var rows = sheet.getDataRange().getValues();
    var header = rows[0];
    var idxGpId = header.indexOf('gamePlayerId');
    var idxRoomId = header.indexOf('roomId');
    var idxNickname = header.indexOf('nickname');
    var idxCreatedAt = header.indexOf('createdAt');
    var idxLastSeenAt = header.indexOf('lastSeenAt');
    if (idxGpId < 0 || idxRoomId < 0 || idxNickname < 0) {
      throw new Error('GamePlayers sheet missing required columns');
    }

    var target = nickname.toLowerCase();
    var now = new Date().toISOString();
    for (var i = 1; i < rows.length; i++) {
      if (rows[i][idxRoomId] !== body.roomId) continue;
      var existing = String(rows[i][idxNickname] || '').trim().toLowerCase();
      if (existing !== target) continue;
      // Nickname collision
      if (!confirmExisting) {
        return { conflict: true, nickname: String(rows[i][idxNickname]) };
      }
      if (idxLastSeenAt >= 0) {
        sheet.getRange(i + 1, idxLastSeenAt + 1).setValue(now);
      }
      return {
        conflict: false,
        reused: true,
        gamePlayerId: String(rows[i][idxGpId]),
        roomId: String(rows[i][idxRoomId]),
        nickname: String(rows[i][idxNickname]),
      };
    }

    // Create new player
    var gamePlayerId = 'gp_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
    var newRow = new Array(header.length).fill('');
    newRow[idxGpId] = gamePlayerId;
    newRow[idxRoomId] = body.roomId;
    newRow[idxNickname] = nickname;
    if (idxCreatedAt >= 0) newRow[idxCreatedAt] = now;
    if (idxLastSeenAt >= 0) newRow[idxLastSeenAt] = now;
    sheet.appendRow(newRow);

    return {
      conflict: false,
      reused: false,
      gamePlayerId: gamePlayerId,
      roomId: body.roomId,
      nickname: nickname,
    };
  } finally {
    lock.releaseLock();
  }
}

function submitAnswer_(body) {
  if (!body.gamePlayerId || !body.roomId || !body.questionId || body.answer == null) {
    throw new Error('missing fields');
  }
  var lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    // Reject duplicate submissions: if this game player has already answered
    // this question in this room, return the previous answer without
    // appending or bumping LiveCounts.
    var answers = sheet_('Answers');
    var aRows = answers.getDataRange().getValues();
    var aHeader = aRows[0];
    var aIdxRoom = aHeader.indexOf('roomId');
    var aIdxQ = aHeader.indexOf('questionId');
    var aIdxGp = aHeader.indexOf('gamePlayerId');
    var aIdxAns = aHeader.indexOf('answer');
    var aIdxAnsId = aHeader.indexOf('answerId');
    var aIdxAnsweredAt = aHeader.indexOf('answeredAt');
    if (aIdxGp < 0) {
      throw new Error('Answers sheet missing gamePlayerId column');
    }
    for (var ai = 1; ai < aRows.length; ai++) {
      if (
        aRows[ai][aIdxRoom] === body.roomId &&
        aRows[ai][aIdxQ] === body.questionId &&
        aRows[ai][aIdxGp] === body.gamePlayerId
      ) {
        return {
          ok: true,
          alreadyAnswered: true,
          previousAnswer: String(aRows[ai][aIdxAns]),
        };
      }
    }

    // Append to Answers (use header indexes so column order is flexible)
    var answerId = 'a_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
    var newAnswerRow = new Array(aHeader.length).fill('');
    if (aIdxAnsId >= 0) newAnswerRow[aIdxAnsId] = answerId;
    newAnswerRow[aIdxRoom] = body.roomId;
    newAnswerRow[aIdxQ] = body.questionId;
    newAnswerRow[aIdxGp] = body.gamePlayerId;
    if (aIdxAns >= 0) newAnswerRow[aIdxAns] = body.answer;
    if (aIdxAnsweredAt >= 0) newAnswerRow[aIdxAnsweredAt] = new Date().toISOString();
    answers.appendRow(newAnswerRow);

    // Update LiveCounts
    var counts = sheet_('LiveCounts');
    var rows = counts.getDataRange().getValues();
    var header = rows[0];
    var colMap = {};
    for (var i = 0; i < header.length; i++) colMap[header[i]] = i;

    var rowIndex = -1;
    for (var j = 1; j < rows.length; j++) {
      if (rows[j][colMap.roomId] === body.roomId && rows[j][colMap.questionId] === body.questionId) {
        rowIndex = j;
        break;
      }
    }
    if (rowIndex === -1) {
      var newRow = new Array(header.length);
      for (var k = 0; k < header.length; k++) newRow[k] = 0;
      newRow[colMap.roomId] = body.roomId;
      newRow[colMap.questionId] = body.questionId;
      counts.appendRow(newRow);
      rowIndex = counts.getLastRow() - 1;
      rows = counts.getDataRange().getValues();
    }

    var targetCol = null;
    var ans = String(body.answer).toLowerCase();
    if (ans === 'yes') targetCol = 'yesCount';
    else if (ans === 'no') targetCol = 'noCount';
    else if (ans === 'a') targetCol = 'optionACount';
    else if (ans === 'b') targetCol = 'optionBCount';
    else if (ans === 'c') targetCol = 'optionCCount';
    else if (ans === 'd') targetCol = 'optionDCount';
    if (targetCol == null) throw new Error('unknown answer: ' + body.answer);

    var cell = counts.getRange(rowIndex + 1, colMap[targetCol] + 1);
    cell.setValue((Number(cell.getValue()) || 0) + 1);
    return { ok: true, alreadyAnswered: false };
  } finally {
    lock.releaseLock();
  }
}

function advanceState_(body) {
  if (!body.roomId) throw new Error('roomId required');
  var sheet = sheet_('State');
  var rows = sheet.getDataRange().getValues();
  var header = rows[0];
  var idxRoomId = header.indexOf('roomId');
  var idxQid = header.indexOf('currentQuestionId');
  var idxPhase = header.indexOf('phase');
  var idxRevealedAt = header.indexOf('revealedAt');
  var idxUpdatedAt = header.indexOf('updatedAt');

  var now = new Date().toISOString();
  for (var i = 1; i < rows.length; i++) {
    if (rows[i][idxRoomId] === body.roomId) {
      sheet.getRange(i + 1, idxQid + 1).setValue(body.currentQuestionId || '');
      sheet.getRange(i + 1, idxPhase + 1).setValue(body.phase || 'waiting');
      if (body.phase === 'revealed') {
        sheet.getRange(i + 1, idxRevealedAt + 1).setValue(now);
      }
      sheet.getRange(i + 1, idxUpdatedAt + 1).setValue(now);
      return { ok: true };
    }
  }
  // No row yet — append
  var newRow = new Array(header.length).fill('');
  newRow[idxRoomId] = body.roomId;
  newRow[idxQid] = body.currentQuestionId || '';
  newRow[idxPhase] = body.phase || 'waiting';
  newRow[idxRevealedAt] = body.phase === 'revealed' ? now : '';
  newRow[idxUpdatedAt] = now;
  sheet.appendRow(newRow);
  return { ok: true };
}

// ---------- Room CRUD ----------

function createRoom_(body) {
  if (!body.name) throw new Error('name required');
  var sheet = sheet_('Rooms');
  var roomId = 'r_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
  var now = new Date().toISOString();
  var header = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  var row = new Array(header.length).fill('');
  row[header.indexOf('roomId')] = roomId;
  row[header.indexOf('name')] = body.name;
  row[header.indexOf('status')] = body.status || 'draft';
  row[header.indexOf('createdAt')] = now;
  sheet.appendRow(row);

  // Seed State row
  var state = sheet_('State');
  var sHeader = state.getRange(1, 1, 1, state.getLastColumn()).getValues()[0];
  var sRow = new Array(sHeader.length).fill('');
  sRow[sHeader.indexOf('roomId')] = roomId;
  sRow[sHeader.indexOf('phase')] = 'waiting';
  sRow[sHeader.indexOf('updatedAt')] = now;
  state.appendRow(sRow);

  return { roomId: roomId };
}

function updateRoom_(body) {
  if (!body.roomId) throw new Error('roomId required');
  var sheet = sheet_('Rooms');
  var rows = sheet.getDataRange().getValues();
  var header = rows[0];
  var idxRoomId = header.indexOf('roomId');
  var idxName = header.indexOf('name');
  var idxStatus = header.indexOf('status');
  for (var i = 1; i < rows.length; i++) {
    if (rows[i][idxRoomId] === body.roomId) {
      if (body.name != null) sheet.getRange(i + 1, idxName + 1).setValue(body.name);
      if (body.status != null) sheet.getRange(i + 1, idxStatus + 1).setValue(body.status);
      return { ok: true };
    }
  }
  throw new Error('room not found');
}

function deleteRoom_(body) {
  if (!body.roomId) throw new Error('roomId required');
  deleteRowsWhere_('Rooms', 'roomId', body.roomId);
  deleteRowsWhere_('Questions', 'roomId', body.roomId);
  deleteRowsWhere_('Guests', 'roomId', body.roomId);
  deleteRowsWhere_('GamePlayers', 'roomId', body.roomId);
  deleteRowsWhere_('Answers', 'roomId', body.roomId);
  deleteRowsWhere_('State', 'roomId', body.roomId);
  deleteRowsWhere_('LiveCounts', 'roomId', body.roomId);
  return { ok: true };
}

// ---------- Question CRUD ----------

function upsertQuestion_(body) {
  if (!body.roomId) throw new Error('roomId required');
  if (!body.text) throw new Error('text required');
  if (!body.type) throw new Error('type required');
  var sheet = sheet_('Questions');
  var rows = sheet.getDataRange().getValues();
  var header = rows[0];
  var idxQid = header.indexOf('questionId');
  var idxRoomId = header.indexOf('roomId');
  var idxOrder = header.indexOf('order');
  var idxType = header.indexOf('type');
  var idxText = header.indexOf('text');
  var idxImageKey = header.indexOf('imageKey');
  var idxOptions = header.indexOf('optionsJson');
  var idxCorrect = header.indexOf('correctAnswer');

  var questionId = body.questionId;
  if (questionId) {
    for (var i = 1; i < rows.length; i++) {
      if (rows[i][idxQid] === questionId) {
        sheet.getRange(i + 1, idxOrder + 1).setValue(body.order != null ? body.order : rows[i][idxOrder]);
        sheet.getRange(i + 1, idxType + 1).setValue(body.type);
        sheet.getRange(i + 1, idxText + 1).setValue(body.text);
        sheet.getRange(i + 1, idxImageKey + 1).setValue(body.imageKey || '');
        sheet.getRange(i + 1, idxOptions + 1).setValue(body.optionsJson || '');
        sheet.getRange(i + 1, idxCorrect + 1).setValue(body.correctAnswer || '');
        return { questionId: questionId };
      }
    }
    throw new Error('question not found: ' + questionId);
  }

  questionId = 'q_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
  var newRow = new Array(header.length).fill('');
  newRow[idxQid] = questionId;
  newRow[idxRoomId] = body.roomId;
  newRow[idxOrder] = body.order != null ? body.order : rows.length;
  newRow[idxType] = body.type;
  newRow[idxText] = body.text;
  newRow[idxImageKey] = body.imageKey || '';
  newRow[idxOptions] = body.optionsJson || '';
  newRow[idxCorrect] = body.correctAnswer || '';
  sheet.appendRow(newRow);
  return { questionId: questionId };
}

function deleteQuestion_(body) {
  if (!body.questionId) throw new Error('questionId required');
  deleteRowsWhere_('Questions', 'questionId', body.questionId);
  deleteRowsWhere_('Answers', 'questionId', body.questionId);
  deleteRowsWhere_('LiveCounts', 'questionId', body.questionId);
  return { ok: true };
}

// ---------- Guest CRUD (host-side) ----------

function createGuest_(body) {
  if (!body.roomId) throw new Error('roomId required');
  if (!body.inviteToken) throw new Error('inviteToken required');
  var sheet = sheet_('Guests');
  var header = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  var guestId = 'g_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
  var row = new Array(header.length).fill('');
  row[header.indexOf('guestId')] = guestId;
  row[header.indexOf('roomId')] = body.roomId;
  row[header.indexOf('inviteToken')] = body.inviteToken;
  sheet.appendRow(row);
  return { guestId: guestId };
}

// ---------- Helpers ----------

function deleteRowsWhere_(sheetName, columnName, value) {
  var sheet = sheet_(sheetName);
  var rows = sheet.getDataRange().getValues();
  if (rows.length <= 1) return;
  var header = rows[0];
  var col = header.indexOf(columnName);
  if (col < 0) return;
  // Iterate bottom-up so deletions don't shift indexes
  for (var i = rows.length - 1; i >= 1; i--) {
    if (rows[i][col] === value) {
      sheet.deleteRow(i + 1);
    }
  }
}


function requireHost_(body) {
  var config = sheet_('Config');
  var rows = config.getDataRange().getValues();
  var expectedHash = '';
  for (var i = 0; i < rows.length; i++) {
    if (rows[i][0] === 'hostPasswordHash') expectedHash = String(rows[i][1] || '').trim().toLowerCase();
  }
  if (!expectedHash) throw new Error('hostPasswordHash not set in Config sheet');
  if (!body.hostPassword) throw new Error('invalid host password');
  var actualHash = sha256Hex_(String(body.hostPassword));
  if (actualHash !== expectedHash) {
    throw new Error('invalid host password');
  }
}

function sha256Hex_(text) {
  var bytes = Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256,
    text,
    Utilities.Charset.UTF_8
  );
  var hex = '';
  for (var i = 0; i < bytes.length; i++) {
    var b = bytes[i];
    if (b < 0) b += 256;
    var h = b.toString(16);
    if (h.length === 1) h = '0' + h;
    hex += h;
  }
  return hex;
}

/**
 * 產生密碼 hash 的輔助函式。在 Apps Script 編輯器內手動執行它，
 * 然後去「執行記錄」查看 hash，貼到 Config 分頁 B2。
 *
 * 使用方式：
 *   1. 修改下面的 PASSWORD 變數為你想要的密碼
 *   2. 上方工具列選擇 generateHostPasswordHash → 執行
 *   3. 下方執行記錄會印出 hash，複製到 Config!B2
 */
function generateHostPasswordHash() {
  var PASSWORD = 'lilymic3645';
  var hash = sha256Hex_(PASSWORD);
  Logger.log('Password: ' + PASSWORD);
  Logger.log('SHA-256:  ' + hash);
  Logger.log('→ 複製上面那串 SHA-256 貼到 Config 分頁的 hostPasswordHash 列');
}

function sheet_(name) {
  var ss = SpreadsheetApp.openById(SHEET_ID);
  var s = ss.getSheetByName(name);
  if (!s) throw new Error('sheet not found: ' + name);
  return s;
}

function json_(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
