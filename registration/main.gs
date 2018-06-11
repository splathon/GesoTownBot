function doPost(e) {
  var request = parseRequest(e);
  var res;
  switch(true) {
    case /^yoyaku/.test(request.text):
      res = doYoyaku(request);
      break;
    case /^del/.test(request.text):
      res = doDel(request);
      break;
    case /^list/.test(request.text):
      res = doList(request);
      break;
    case /^help/.test(request.text):
      res = doHelp(request);
      break;
    case /^h/.test(request.text):
      res = doHelp(request);
      break;
    default:
      res = createSimpleRes("パラメータおかしくね？\n text=" + request.text);
  }

  return encode2Json(res);
}

function doHelp(request) {
  var msg = '*[コマンド説明]*\n\n'
  msg += "【 *yoyaku <アタマ/フク/クツ> <ギアパワー名> <ブランド名 or any>* 】 \n";
  msg += "ゲソタウンの予約を行います。具体例は以下の通り\n";
  msg += "例1) `/geso yoyaku フク イカニンジャ クラーゲス`\n";
  msg += "例2) `/geso yoyaku アタマ ラストスパート any`\n";
  msg += "_注意事項_ \n";
  msg += "・各項目は半角スペースで区切ってください\n";
  msg += "・anyをセットすると全てのブランドを対象にチェックする\n";
  msg += "・ギアパワー名、ブランド名は完全一致でチェックしているので、以下の一覧からコピペを推奨します\n\n";
  msg += "ギアパワー名 = "
  for each(var val in getGearList()) {
    msg += "`" + val + "`, ";
  }
  msg += "\n";
  msg += "ブランド名 = ";
  for each(var val in getBrandList()) {
    msg += "`" + val + "`, ";
  }
  msg += "\n\n";
  msg += "【 *list* 】 \n";
  msg += "自分が登録した予約を一覧表示します\n";
  msg += "例) `/geso list`\n";

  msg += "\n\n";
  msg += "【 *del <注文Id>* 】 \n";
  msg += "自分が登録した予約を削除します。削除には注文Idが必要です。注文Idの確認は `/geso list` コマンドで行ってください\n"
  msg += "例) `/geso del D704FC50`";

  return createSimpleRes(msg);
}

function doYoyaku(request) {
  // 予約する
  /*例） /geso yoyaku フク イカニンジャ クラーゲス */
  var msg = '';
  var user = request.user
  var strs = request.text.split(" ");
//  var strs = "yoyaku はげ ああ もげ".split(" ");
  var category = strs[1];
  var gear = strs[2];
  var brand = strs[3];
  var orderId = generateOrderId();
  var categoryEnable = isContainsTarget(category, getCategoryList());
  var gearEnable = isContainsTarget(gear, getGearList());
  var brandEnable = isContainsTarget(brand, getBrandList());

  if (categoryEnable && gearEnable && brandEnable) {
    // バリデーションOK
    saveOrder(category, gear, brand, user, orderId);
    msg = "イカの条件で予約したよ\n" + "カテゴリ = *" + category + "* \nメインギア = *" + gear + "* \nブランド = *" + brand + "*\n注文Id = *" + orderId + "*";
  } else {
    // バリデーションNG
    msg = "記載されたパラメータに誤りが見つかりました\n";
    if (categoryEnable) {
      msg += "〇カテゴリ = *" + category + "*\n";
    } else {
      msg += "×カテゴリ = *" + category + "* ←カテゴリは( `アタマ` / `フク` / `クツ` ) のいずれかを指定してください\n";
    }

    if (gearEnable) {
      msg += "〇メインギア = *" + gear+ "*\n";
    } else {
      msg += "×メインギア = *" + gear + "* ←メインギア名は `/geso help` で確認し、略さず正しく指定してください\n";
    }

    if (brandEnable) {
      msg += "〇ブランド = *" + brand+ "*\n";
    } else {
      msg += "×ブランド = *" + brand + "* ←ブランド名は `/geso help` で確認し、略さず正しく指定してください\n";
    }
  }
  return createSimpleRes(msg);
}

function isContainsTarget(target, list) {
  if (list.indexOf(target) >= 0) {
    return true;
  } else {
    return false;
  }
}

function saveOrder(Category, gear, brand, user, orderId) {
  var sheet = getYoyakuSheet();
  var lastLow = sheet.getLastRow();
  sheet.getRange(lastLow + 1, YoyakuSheet.Category).setValue(Category);
  sheet.getRange(lastLow + 1, YoyakuSheet.Gear).setValue(gear);
  sheet.getRange(lastLow + 1, YoyakuSheet.Brand).setValue(brand);
  sheet.getRange(lastLow + 1, YoyakuSheet.UserId).setValue(user);
  sheet.getRange(lastLow + 1, YoyakuSheet.OrderId).setValue(orderId);
}

function generateOrderId(user) {
 var time =  Moment.moment().valueOf();
 var id = MD5(user + time, false);
 id = id.substring(0, 8);
 return id;
}

function createSimpleRes(msg) {
    var res = {
       "response_type" : Const.RES_TYPE_EPHEMERAL,
       "text": msg,
     }
  return res;
}

function encode2Json(res) {
  var json = JSON.stringify(res);
  return ContentService.createTextOutput(json).setMimeType(ContentService.MimeType.JSON);
}

function doDel(request) {
  var msg = '';
  var orderId = request.text.split(" ")[1];
  var user = request.user;
  var sheet = getYoyakuSheet();
  var data = sheet.getDataRange().getValues();
  var deletedData;
  var isDeleted = false;
  for (var i = 0; i < data.length; i++) {
    var val = data[i];
    if (val[YoyakuSheet.UserId - 1] == user && val[YoyakuSheet.OrderId - 1] == orderId) {
      isDeleted = true;
      deletedData = val;
      sheet.deleteRow(i + 1);
      break;
    }
  }

  if (isDeleted) {
    //削除した旨を通知
    msg = "イカの予約を削除したよ\n" + "カテゴリ = *" + deletedData[0] + "* \nメインギア = *" + deletedData[1] + "* \nブランド = *" + deletedData[2] + "*\n注文Id = *" + deletedData[4] + "*";
  } else {
    //該当項目がなかった旨を通知
    msg = "注文Id = " + orderId + "に該当する予約が見つかりませんでした。\n `/geso list` コマンドで注文Idが間違っていないか確認してください";
  }
  return createSimpleRes(msg);
}

function doList(request) {
  var user = request.user;
  var userName = request.user_name;
  var data = getOrderData(user);
  var msg = '`' + userName + "` の予約一覧だよ\n";
  // 同一Userのオーダー情報を表示する
  for each(var val in data) {
    msg += "カテゴリ = *" + val[0] + "* , メインギア = *" + val[1] + "* , ブランド = *" + val[2] + "* , 注文Id = *" + val[4] + "*\n";
  }
  return createSimpleRes(msg);
}

function getOrderData(user) {
  var data = [];
  var allData = getYoyakuSheet().getDataRange().getValues();
  for each(var val in allData) {
    if (val[YoyakuSheet.UserId - 1] == user) {
      data.push(val);
    }
  }
  return data;
}

function parseRequest(e) {
  var request = {};
  request.text = e.parameters["text"][0];
  request.user = e.parameters["user_id"][0];
  request.user_name = e.parameters["user_name"][0]
  return request;
}

function notifyError2Slack(errorMsg) {
  var msg = "【エラーやで】\n" + errorMsg;
  return msg;
}

function notify2Slack(msg, attachments) {
  var slackApp = SlackApp.create(Const.token);
  slackApp.postMessage(Const.channelId, msg, {
    username : "ゲソタウン予約BOT",
    icon_emoji : ":octopus:",
    attachments: attachments
  });
}

function getCategoryList() {
  return getConstList(ConstSheet.Category - 1);
}

function getGearList() {
  return getConstList(ConstSheet.Gear - 1);
}

function getBrandList() {
  return getConstList(ConstSheet.Brand - 1);
}

function getConstList(index) {
  var data = [];
  var allData = getConstSheet().getDataRange().getValues();
  for each(var val in allData[index]) {
    if(val == '') {
      break;
    }
    data.push(val);
  }
  return data;
}

/* Constシートを取得する */
function getConstSheet() {
  if (getConstSheet.instance) { return getConstSheet.instance; }
  var sheet = SpreadsheetApp.openById(Const.spreadSheetId).getSheetByName(ConstSheet.sheetName);
  return sheet;
}

/* Yoyakuシートを取得する */
function getYoyakuSheet() {
  if (getYoyakuSheet.instance) { return getYoyakuSheet.instance; }
  var sheet = SpreadsheetApp.openById(Const.spreadSheetId).getSheetByName(YoyakuSheet.sheetName);
  return sheet;
}
