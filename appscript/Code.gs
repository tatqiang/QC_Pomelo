// ============================================================
//  MAIN ROUTER — Google Apps Script Web App
//  Deploy: Web App | Execute as: Me | Access: Anyone
// ============================================================

var EXPECTED_KEY = 'qcjec-pdf-2026-x7k9m'

function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents)

    if (data.apiKey !== EXPECTED_KEY) {
      return respond({ success: false, error: 'Unauthorized' })
    }

    var templateFile = DriveApp.getFileById(data.sheetId)
    var tempCopy     = templateFile.makeCopy('__TEMP_' + Date.now())
    var ss           = SpreadsheetApp.openById(tempCopy.getId())

    try {
      switch (data.formType) {
        case 'itr_cover':
          handleItrCover(data.data, ss)
          break
        case 'itr_photo':
          handleItrPhoto(data.data, ss)
          break
        case 'itr_checklist':
          handleItrChecklist(data.data, ss)
          break
        default:
          return respond({ success: false, error: 'Unknown formType: ' + data.formType })
      }

      SpreadsheetApp.flush()
      Utilities.sleep(1000)

      var pdfBytes = tempCopy.getAs(MimeType.PDF).getBytes()
      var pdfB64   = Utilities.base64Encode(pdfBytes)
      return respond({ success: true, pdf: pdfB64 })

    } finally {
      DriveApp.getFileById(tempCopy.getId()).setTrashed(true)
    }

  } catch (err) {
    return respond({ success: false, error: err.message })
  }
}

function doGet() {
  return respond({ success: true, message: 'QC PDF Generator running. Supported: itr_cover, itr_photo, itr_checklist' })
}

function respond(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON)
}
