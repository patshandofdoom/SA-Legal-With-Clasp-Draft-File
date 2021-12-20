function overarchingTest() {
  Logger.log(testMeetingWithNew())
  Logger.log(testMeetingWithRepeat())
}


//A function to run the getRepeatDepositionData function with dummy data. It will send an email to me
function testMeetingWithNew(){
  var formattedDate=formatDateForTests()
  try{
    getNewDepositionData('orderedBy','prichardson0874@gmail.com','#witnessName','caseStyle',formattedDate,10,30,'AM','firm','attorney','attorneyEmail','1234567','firmAddress1','firmAddress2','city','state','zip','locationFirm','locationAddress1','locationAddress2','locationCity','locationState','locationZip','locationPhone','services','courtReporter','videographer',false,'copyAttorney','copyFirm','copyAddress1','copyAddress2','copyCity','copyState','copyZip','copyPhone','copyEmail',true,'confirmationCC','videoPlatform','salsAccount','conferenceDetails\n conference details');
    return "getNewDepositionData worked without error";
  }
  catch (error) {
    Logger.log(error);
    return "getNewDepositionData experienced an issue"+error;
  }
}

//does not work properly for some reason. variable line up with the function but it will no write data properly
function testMeetingWithRepeat(){
  var formattedDate=formatDateForTests()
  try{
   getRepeatDepositionData('orderedBy','#witnessName','caseStyle', formattedDate, 10,30,'AM','firm','locationAddress1','locationAddress2','locationCity','locationState','locationZip','locationPhone','services','courtReporter','videographer',false,'copyAttorney','copyFirm','copyAddress1','copyAddress2','copyCity','copyState','copyZip','copyPhone','copyEmail', true,'confirmationCC','videoPlatform','salsAccount','conferenceDetails\n conference details');
   Logger.log("getRepeatDepositionData worked without error");
    return "getRepeatDepositionData worked without error";
  }
  catch(error){
    Logger.log(error);
    return "getRepeatDepositionData experienced an issue"+error;
  }
}

///////////////////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////////////////
///////////////////////////////////  UTILITIES  ///////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////////////////

function formatDateForTests(){
  //format as 2020-01-30
  const date = new Date();
  Logger.log(date)
  
  var formattedDate = date.getFullYear()+"-"+("0"+(date.getMonth()+1)).slice(-2)+"-"+("0"+(date.getDate()+1)).slice(-2);
  return formattedDate;
}
