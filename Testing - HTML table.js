function myFunction() {
  let ss = SpreadsheetApp.getActive();
  let depoSheet = ss.getSheetByName("Schedule a depo");

  let depoData = depoSheet.getDataRange().getValues();

  Logger.log(depoData)
  let depoObject = {};
  depoObject.appointments = []

  var i=0
  while(depoData[i]){
    var j=0
    depoObject.appointments["appointment" +i] = {};
    Logger.log(JSON.stringify(depoObject));
    while(depoData[i][j]){
      let currentTitle = depoData[0][j];
      depoObject.appointments[i+1] [currentTitle] = depoData[i][j];
      j++;
    }
    i++
  }
  Logger.log(JSON.stringify(depoObject));
}
