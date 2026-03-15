// ============================================================
//  SHARED LIBRARY — tag replacement + signature insertion
// ============================================================

/**
 * Scan all cells in a sheet and replace {{tag}} placeholders with values.
 * Signature keys (sig_*) are skipped here — handled by insertSig().
 */
function fillTags(sheet, fields) {
  var range    = sheet.getDataRange()
  var values   = range.getValues()
  var formulas = range.getFormulas()

  for (var r = 0; r < values.length; r++) {
    for (var c = 0; c < values[r].length; c++) {
      var src = formulas[r][c] !== '' ? formulas[r][c] : String(values[r][c])
      if (src.indexOf('{{') === -1) continue

      // Skip signature tags — handled separately
      if (/\{\{sig_/.test(src)) continue

      var newVal = src
      for (var key in fields) {
        if (key.indexOf('sig_') === 0) continue
        newVal = newVal.split('{{' + key + '}}').join(
          fields[key] !== null && fields[key] !== undefined ? String(fields[key]) : ''
        )
      }
      if (newVal !== src) {
        sheet.getRange(r + 1, c + 1).setValue(newVal)
      }
    }
  }
}

/**
 * Insert base64 PNG signatures into cells tagged {{sig_*}}.
 * The tag must be the only content of the cell.
 */
function insertSig(sheet, fields) {
  var range    = sheet.getDataRange()
  var values   = range.getValues()
  var formulas = range.getFormulas()

  for (var r = 0; r < values.length; r++) {
    for (var c = 0; c < values[r].length; c++) {
      var src = formulas[r][c] !== '' ? formulas[r][c] : String(values[r][c])
      var match = src.match(/\{\{(sig_[^}]+)\}\}/)
      if (!match) continue

      var sigKey = match[1]          // e.g. "sig_mep"
      var b64    = fields[sigKey]
      if (!b64) continue

      var cell = sheet.getRange(r + 1, c + 1)
      cell.clearContent()

      var blob = Utilities.newBlob(
        Utilities.base64Decode(b64),
        'image/png',
        sigKey + '.png'
      )

      var cellW = cell.getWidth()
      var cellH = cell.getHeight()
      var img   = sheet.insertImage(blob, c + 1, r + 1)
      img.setWidth(Math.max(Math.min(cellW - 4, 200), 40))
      img.setHeight(Math.max(Math.min(cellH - 4, 60), 20))
    }
  }
}

/**
 * Insert an image from a public URL into the cell tagged {{photo_N}}.
 */
function insertPhotoUrl(sheet, fields) {
  var range    = sheet.getDataRange()
  var values   = range.getValues()
  var formulas = range.getFormulas()

  for (var r = 0; r < values.length; r++) {
    for (var c = 0; c < values[r].length; c++) {
      var src   = formulas[r][c] !== '' ? formulas[r][c] : String(values[r][c])
      var match = src.match(/\{\{(photo_[^}]+)\}\}/)
      if (!match) continue

      var key = match[1]         // e.g. "photo_1"
      var url = fields[key]
      if (!url) continue

      var cell = sheet.getRange(r + 1, c + 1)
      cell.clearContent()

      try {
        var blob = UrlFetchApp.fetch(url).getBlob()
        var cellW = cell.getWidth()
        var cellH = cell.getHeight()
        var img   = sheet.insertImage(blob, c + 1, r + 1)
        img.setWidth(cellW - 4)
        img.setHeight(cellH - 4)
      } catch (fetchErr) {
        cell.setValue('[Photo unavailable]')
      }
    }
  }
}
