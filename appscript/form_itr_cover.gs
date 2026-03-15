// ============================================================
//  FORM: ITR Cover Page
//  Sheet name: "cover"
//
//  Expected fields (data object from PWA):
//    itrNo, project, discipline, area,
//    issueDate, dwgNo, itpNo, title,
//    location, confirmedDate,
//    sig_mep, sigDate_mep
// ============================================================

function handleItrCover(fields, ss) {
  var sheet = ss.getSheetByName('cover')
  if (!sheet) throw new Error('Sheet "cover" not found in template')

  fillTags(sheet, fields)
  insertSig(sheet, fields)
}
