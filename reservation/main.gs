Const = {
  spreadSheetId: "XXXXXXXXXXXXXXXXXXX",
  token: "xoxp-XXXXXXXXXXXXXXXXXXX", //Splathon
  channelId: "C0GS8L8GN", // development
  IkakuroURL: "https://www.ikaclo.jp/2/gears/",
  IkakuroDomainURL : "https://www.ikaclo.jp",
  RES_TYPE_CHANNEL:"in_channel",
  RES_TYPE_EPHEMERAL:"ephemeral"
}

ConstSheet = {
  sheetName: "const",
  Category: 1,
  Gear: 2,
  GearIcon: 3,
  Brand: 4,
  BrandIcon: 5
}

YoyakuSheet = {
  sheetName: "yoyaku",
  Category: 1,
  Gear: 2,
  Brand: 3,
  UserId: 4,
  OrderId: 5,
}

function doPost(e) {
  var body = e.postData.getDataAsString();
//  var body = getDummyPost();
  var gear = parseFindNotifyGear(body);
  checkYoyakuList(gear);
}

function parseFindNotifyGear(body) {
  var strs = body.split("\n");
  var gearName = Parser.data(strs[0]).from('').to('(').build();
  var specialMainGear = strs[1].substring('特別ギアパワー：'.length, strs[1].length);
  var gear = findGearByGearName(gearName, specialMainGear);
  return gear;
}

function getDummyPost() {
  var sheet = getConstSheet();
  var data = sheet.getDataRange().getValues();
  var dummy = data[9][0];
  return dummy;
}

function findGearByGearName(gearName, specialMainGear) {
//  gearName = "イカンカン";
//  specialMainGear = 'ラストスパート';
  var gear = [];

  var html = UrlFetchApp.fetch(Const.IkakuroURL).getContentText();
  var tbody = Parser.data(html).from('<tbody>').to('</tbody>').build();
  var trTags = Parser.data(tbody).from('<tr>').to('</tr>').iterate();

  for each(var tr in trTags) {
    if (tr.indexOf(gearName) > -1) {
      gear.name = gearName;
      gear.specialMainGear = specialMainGear;
      parseGearIcon(tr, gear);
      parseCategory(tr, gear);
      parseNormalGear(tr, gear);
      parseBrand(tr, gear);
      gear.specialMainGearIcon = getGearIconByName(specialMainGear);
      gear.normalGearIcon = getGearIconByName(gear.normalGearName);
      gear.brandIcon = getBrandIconByName(gear.brandName);
      break;
    }
  }
  return gear;
}

function checkYoyakuList(gear) {
  var sheet = getYoyakuSheet();
  var data = sheet.getDataRange().getValues();
  for each(var order in data) {
    if (order[YoyakuSheet.Category - 1] == gear.category &&
        order[YoyakuSheet.Gear - 1] == gear.specialMainGear) {
      if (order[YoyakuSheet.Brand - 1] == 'any' || order[YoyakuSheet.Brand - 1] == gear.brandName) {
        //目的のギアなので対象者に通知する
        notify2Slack(createNotifyMsg(order, gear), createNotifyAttachments(gear), order[YoyakuSheet.UserId - 1]);
      }
    }
  }
}

function createNotifyMsg(order, gear) {
  var user = order[YoyakuSheet.UserId - 1];
  var orderId = order[YoyakuSheet.OrderId - 1];
  var msg = "<@" + user + ">" + " 【ご希望の商品が入荷されました】\n注文Id = *" + orderId + " *\n予約を削除する場合は *`/geso del " + orderId + "`* で行ってください";
  return msg;
}

function createNotifyAttachments(gear) {
  var attachments = '';
  attachments += '[';
  attachments += '{ "color" : "#3AA3E3", "title": "'+ gear.category + '","author_name" : "カテゴリ"},';
  attachments += '{ "color" : "#36a64f", "title": "'+ gear.name + '", "author_name" : "ギア名", "image_url" : "' + gear.gearIcon + '"},';
  attachments += '{ "color" : "#3AA3E3", "title": "'+ gear.specialMainGear + '(' + gear.normalGearName + ')", "author_name" : "特別ギアパワー(通常ギアパワー)", "author_icon" : "' + gear.specialMainGearIcon + '"},';
  attachments += '{ "color" : "#36a64f", "title": "'+ gear.brandName + '", "author_name" : "ブランド","author_icon" : "' + gear.brandIcon + '"}';
  attachments += ']';
  return attachments;
}

function parseGearIcon(tr, gear) {
  var gearTag = Parser.data(tr).from('<td class="tGear">').to('</td>').build();
  var imgTag = Parser.data(gearTag).from('<img').to('>').build();
  var src = Parser.data(imgTag).from('data-src="').to('"').build();
  gear.gearIcon = Const.IkakuroDomainURL + src;
  return gear;
}

function parseCategory(tr, gear) {
  var category = Parser.data(tr).from('<td class="tCategory tNowrap">').to('</td>').build();
  gear.category = category;
  return gear;
}

function parseNormalGear(tr, gear) {
  var gearPower = Parser.data(tr).from('<td class="tGearPower">').to('</td>').build();
  var imgTag = Parser.data(gearPower).from('<img').to('>').build();
  var gearName = Parser.data(imgTag).from('alt="').to('"').build();
  gear.normalGearName = gearName;
  return gear;
}

function parseBrand(tr, gear) {
  var brand = Parser.data(tr).from('<td class="tBrand">').to('</td>').build();
  var imgTag = Parser.data(brand).from('<img').to('>').build();
  var brandName = Parser.data(imgTag).from('alt="').to('"').build();
  gear.brandName = brandName;
  return gear;
}


function getCategoryList() {
  return getConstList(ConstSheet.Category - 1);
}

function getGearList() {
  return getConstList(ConstSheet.Gear - 1);
}

function getGearIconHashMap() {
  var gearList = getGearList();
  var iconList = getConstList(ConstSheet.GearIcon - 1);
  var hash = {};
  for(var i = 0; i< gearList.length; i++) {
    hash[gearList[i]] = Const.IkakuroDomainURL + iconList[i];
  }
  return hash;
}

function getGearIconByName(gearName) {
  return getGearIconHashMap()[gearName];
}

function getBrandList() {
  return getConstList(ConstSheet.Brand - 1);
}

function getBrandIconHashMap() {
  var brandList = getBrandList();
  var iconList = getConstList(ConstSheet.BrandIcon - 1);
  var hash = {};
  for(var i = 0; i< brandList.length; i++) {
    hash[brandList[i]] = Const.IkakuroDomainURL + iconList[i];
  }
  return hash;
}

function getBrandIconByName(brandName) {
  return getBrandIconHashMap()[brandName];
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

function notify2Slack(msg, attachments, userId) {
  var slackApp = SlackApp.create(Const.token);
  slackApp.postMessage(userId, msg, {
    username : "ゲソタウン通知BOT",
    response_type : Const.RES_TYPE_EPHEMERAL,
    icon_emoji : ":octopus:",
    attachments : attachments
  });
}
