// Google Apps Script — recebe os leads do site e grava na planilha.
// Veja docs/google-sheets-setup.md para o passo a passo.
var ABA = 'Leads';

function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    var d = JSON.parse(e.postData.contents);
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sh = ss.getSheetByName(ABA) || ss.insertSheet(ABA);
    if (sh.getLastRow() === 0) sh.appendRow(['Data/Hora', 'Nome', 'WhatsApp', 'Página', 'Origem', 'Referência']);
    var row = sh.getLastRow() + 1;
    sh.getRange(row, 3).setNumberFormat('@'); // texto: preserva "(85) 9..." sem conversão
    sh.getRange(row, 1, 1, 6).setValues([[
      new Date(),
      String(d.nome || '').slice(0, 80),
      String(d.whatsapp || '').slice(0, 20),
      String(d.pagina || '').slice(0, 300),
      String(d.origem || '').slice(0, 100),
      String(d.referencia || '').slice(0, 300)
    ]]);
    return ContentService.createTextOutput('ok');
  } finally {
    lock.releaseLock();
  }
}
