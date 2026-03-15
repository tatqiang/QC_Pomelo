// ============================================================
//  FORM: ITR Photo Report
//  Sheet name: "photo"
//
//  Expected fields (data object from PWA):
//    itrNo, title, area, reportDate,
//    photo_1 .. photo_N  (public R2 image URLs)
//    caption_1 .. caption_N
//    sig_mep, sigDate_mep
// ============================================================

function handleItrPhoto(fields, ss) {
  var sheet = ss.getSheetByName('photo')
  if (!sheet) throw new Error('Sheet "photo" not found in template')

  fillTags(sheet, fields)
  insertPhotoUrl(sheet, fields)
  insertSig(sheet, fields)
}
