// --- CONFIGURATION ---
var MASTER_SHEET_ID = "17oC_6PhSd7Flgw58vOt-5i-v3xIL74qUL-Fw4p-2VEc";
var COMPANY_WA = "919718531983";

// --- CORE FUNCTIONS ---

function doGet(e) {
  return HtmlService.createHtmlOutput("10haath API Active")
            .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

/**
 * Saves alert data from Savior
 * @param {Object} data { gadi, phone, reason }
 */
function saveAlertPro(data) {
  try {
    var ss = SpreadsheetApp.openById(MASTER_SHEET_ID);
    var timestamp = new Date();
    
    // 1. Save to All_Alerts
    var masterSheet = ss.getSheetByName("All_Alerts") || ss.insertSheet("All_Alerts");
    if (masterSheet.getLastRow() === 0) {
      masterSheet.appendRow(["Timestamp", "Vehicle", "Scanner Phone", "Reason", "Status"]);
    }
    masterSheet.appendRow([timestamp, data.gadi, data.phone, data.reason, "VERIFIED"]);
    
    // 2. Save to Customer specific sheet
    var customerSheetName = "Alerts_" + data.gadi;
    var customerSheet = ss.getSheetByName(customerSheetName) || ss.insertSheet(customerSheetName);
    if (customerSheet.getLastRow() === 0) {
      customerSheet.appendRow(["Timestamp", "Problem", "Scanner Phone"]);
    }
    customerSheet.appendRow([timestamp, data.reason, data.phone]);

    // 3. Get Owner Emails from Registration
    var regSheet = ss.getSheetByName("Registration");
    var regData = regSheet.getDataRange().getValues();
    var inputGadi = data.gadi.toString().toUpperCase().replace(/\s/g, "");
    
    var email1 = "";
    var email2 = "";

    for (var i = 1; i < regData.length; i++) {
      var sheetGadi = regData[i][3] ? regData[i][3].toString().toUpperCase().replace(/\s/g, "") : ""; 
      if (sheetGadi === inputGadi) {
        email1 = regData[i][4]; // Column E (Email1) - Adjusting based on index.html fields
        email2 = regData[i][5]; // Column F (Email2)
        break; 
      }
    }

    return {
      status: "SUCCESS", 
      email1: email1, 
      email2: email2
    };

  } catch (e) {
    return {status: "ERROR", message: e.toString()};
  }
}

/**
 * Process new registration or update
 * @param {Object} data { name, phone, gadi, email1, email2, emergency }
 */
function processRegistration(data) {
  try {
    var ss = SpreadsheetApp.openById(MASTER_SHEET_ID);
    var master = ss.getSheetByName("Registration") || ss.insertSheet("Registration");
    
    if (master.getLastRow() === 0) {
      master.appendRow(["Date", "Name", "Phone", "Gadi", "Email1", "Email2", "Emergency"]);
    }

    // Check if gadi already exists to update or append
    var regData = master.getDataRange().getValues();
    var inputGadi = data.gadi.toString().toUpperCase().replace(/\s/g, "");
    var foundRow = -1;
    for (var i = 1; i < regData.length; i++) {
      if (regData[i][3] && regData[i][3].toString().toUpperCase().replace(/\s/g, "") === inputGadi) {
        foundRow = i + 1;
        break;
      }
    }

    var rowData = [new Date(), data.name, data.phone, data.gadi, data.email1, data.email2, data.emergency];
    
    if (foundRow !== -1) {
      master.getRange(foundRow, 1, 1, rowData.length).setValues([rowData]);
    } else {
      master.appendRow(rowData);
    }
    
    return { status: "SUCCESS", message: "Registration Complete" };
  } catch (err) {
    return { status: "ERROR", message: err.toString() };
  }
}

/**
 * Update Doc Vault / QR Doctor data
 */
function updateQRDoctorData(data) {
  try {
    var ss = SpreadsheetApp.openById(MASTER_SHEET_ID);
    var regSheet = ss.getSheetByName("Registration");
    var regData = regSheet.getDataRange().getValues();
    var inputGadi = data.gadi.toString().toUpperCase().replace(/\s/g, "");
    var foundRow = -1;

    for (var i = 1; i < regData.length; i++) {
      var sheetGadi = regData[i][3] ? regData[i][3].toString().toUpperCase().replace(/\s/g, "") : "";
      if (sheetGadi === inputGadi) { foundRow = i + 1; break; }
    }

    if (foundRow !== -1) {
      // Columns for Drive Link, Drive Pass, Free PDF
      regSheet.getRange(foundRow, 9).setValue(data.driveLink); 
      regSheet.getRange(foundRow, 10).setValue(data.drivePass);
      regSheet.getRange(foundRow, 11).setValue(data.freePdf);
      return {status: "SUCCESS", message: "Data updated successfully."};
    } else {
      return {status: "ERROR", message: "Vehicle not found."};
    }
  } catch (e) {
    return {status: "ERROR", message: e.toString()};
  }
}

function doPost(e) {
  var data = JSON.parse(e.postData.contents);
  var result = { status: "ERROR", message: "Invalid Action" };
  
  if (data.action === "saveAlertPro") {
    result = saveAlertPro(data);
  } else if (data.action === "processRegistration") {
    result = processRegistration(data);
  } else if (data.action === "updateQRDoctorData") {
    result = updateQRDoctorData(data);
  }
  
  return ContentService.createTextOutput(JSON.stringify(result))
         .setMimeType(ContentService.MimeType.JSON);
}
