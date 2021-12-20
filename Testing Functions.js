//Runs all sub-tests
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

function testMeetingWithRepeat(){
  var formattedDate=formatDateForTests()
  try{
   getRepeatDepositionData('prichardson0874@gmail.com','#witnessName','caseStyle', formattedDate, 10,30,'AM','firm','attorney', 'locationAddress1','locationAddress2','locationCity','locationState','locationZip','locationPhone','services','courtReporter','videographer',false,'copyAttorney','copyFirm','copyAddress1','copyAddress2','copyCity','copyState','copyZip','copyPhone','copyEmail', true,'confirmationCC','videoPlatform','salsAccount','conferenceDetails\n conference details');
    return "getRepeatDepositionData worked without error";
  }
  catch(error){
    Logger.log(error);
    return "getRepeatDepositionData experienced an issue"+error;
  }
}

function formatDateForTests(){
  //format as 2020-01-30
  const date = new Date(2022, 06, 01);
  
  var formattedDate = date.getFullYear()+"-"+("0"+(date.getMonth()+1)).slice(-2)+"-"+("0"+(date.getDate()+1)).slice(-2);
  return formattedDate;
}
