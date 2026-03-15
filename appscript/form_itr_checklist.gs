// ============================================================
//  FORM: ITR Checklist / Inspection Report
//  Sheet name: "checklist"
//
//  Expected fields (data object from PWA):
//    itrNo, title, area, discipline,
//    itpNo, inspectionDate,
//    item_1_desc .. item_N_desc   (checklist row descriptions)
//    item_1_pass .. item_N_pass   ("YES" / "NO" / "NA")
//    item_1_remark .. item_N_remark
//    sig_mep, sigDate_mep,
//    sig_qc,  sigDate_qc,
//    sig_owner, sigDate_owner
// ============================================================

function handleItrChecklist(fields, ss) {
  var sheet = ss.getSheetByName('checklist')
  if (!sheet) throw new Error('Sheet "checklist" not found in template')

  fillTags(sheet, fields)
  insertSig(sheet, fields)
}
