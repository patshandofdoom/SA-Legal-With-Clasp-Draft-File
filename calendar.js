////////////////////////////////////////////////////////////////////////////////////
///////////////// INTERACTIONS BETWEEN SHEET AND SERVICES CALENDAR /////////////////
////////////////////////////////////////////////////////////////////////////////////

/** Adds an event to the "Services" calendar and the eventId to the Scheudle a depo Sheet.
@params {multiple} Received from getNewDepositionData in the sheetManipulation module.
*/
function addEvent(orderedBy, witnessName, caseStyle, depoDate, depoHour, depoMinute, amPm, firm, attorney, firmAddress1, firmAddress2, city, state, zip, locationFirm, locationAddress1, locationAddress2, locationCity, locationState, locationZip, services, courtReporter, videographer, pip, videoPlatform, salsAccount, conferenceDetails) {
  var SACal = CalendarApp.getCalendarById('5i0he4t28duovfl8grl3r6g6d8@group.calendar.google.com');
  Logger.log(SACal.getName());
  var ss = SpreadsheetApp.getActive();
  var depoSheet = ss.getSheetByName('Schedule a depo');
  
  try {
    // Create event title and description
    var title = '(' + services + ')' + ' ' + firm + ' - ' + witnessName;
    var depoTime = depoHour + ':' + depoMinute + ' ' + amPm;
    
    // Builds location and description based on whether it's a video conference or not
    let depoLocation, description;
    if (videoPlatform.length > 2) {
      depoLocation = 'via ' + videoPlatform + ' (' + salsAccount + ')';
      description = 'Witness Name: ' + witnessName + '\nCase Style: ' + caseStyle + '\nOrdered by: ' + orderedBy + '\n\nCSR: ' + courtReporter + '\nVideographer: ' + videographer + '\nPIP: ' + pip + '\n\nVideo Conference Details: ' + '\n' + conferenceDetails + '\n\nOur client:\n' + attorney + '\n' + firm + '\n' + firmAddress1 + ' ' + firmAddress2 + '\n' + city + ' ' + state + ' ' + zip;
    } else {
      depoLocation = locationFirm + ', ' + locationAddress1 + ' ' + locationAddress2 + ', ' + locationCity + ' ' + locationState + ' ' + locationZip;
      description = 'Witness Name: ' + witnessName + '\nCase Style: ' + caseStyle + '\nOrdered by: ' + orderedBy + '\n\nCSR: ' + courtReporter + '\nVideographer: ' + videographer + '\nPIP: ' + pip + '\n\nLocation: ' + '\n' + depoLocation + '\n\nOur client:\n' + attorney + '\n' + firm + '\n' + firmAddress1 + ' ' + firmAddress2 + '\n' + city + ' ' + state + ' ' + zip;
    };
    
    
    // Add the deposition event to the Services calendar
    var formattedDate = toStringDate(depoDate);
    var formattedHours = to24Format(depoHour, depoMinute, amPm, depoDate);
    var formattedDateAndHour = formattedDate + ' ' + formattedHours;
    
    Logger.log(formattedDateAndHour);
    Logger.log(new Date(formattedDateAndHour))

    var event = SACal.createEvent(title, 
                                  new Date(formattedDateAndHour),
                                  new Date(formattedDateAndHour),{
                                    description: description,
                                    location: depoLocation
                                  });
    
    // Add eventId to the Schedule a depo Sheet.
    depoSheet.getRange(2, 37).setValue(event.getId());
    SpreadsheetApp.getActiveSpreadsheet().toast('📅 Deposition added to Services calendar');
  } catch (error) {
    Logger.log(error);
    addToDevLog(error);
    SpreadsheetApp.getActiveSpreadsheet().toast('⚠️ Error adding event to Services calendar. Error logged.');
  };
};

/** Checks for manual edits to deposition times / dates, updates the calendar event if necessary
@param {Event} e Event object created when an edit is made.
@dev Called by onEdit(e) trigger
*/
function manuallyUpdateCalendar(e) {
  
  try {
    // Sets a mutual-exclusion lock to prevent code collisions if user is making multiple quick edits.
    var lock = LockService.getDocumentLock();
    lock.waitLock(6000);
    
    var SACal = CalendarApp.getCalendarById('5i0he4t28duovfl8grl3r6g6d8@group.calendar.google.com');
    var ss = SpreadsheetApp.getActive();
    var depoSheet = ss.getSheetByName('Schedule a depo');
    
    // Check to see if the edit was made on the "Schedule a depo" sheet
    var sheetName = e.source.getSheetName();
    if (sheetName === 'Schedule a depo') {
      
      // If yes, get information about the edit made
      var editRow = e.range.getRow();
      Logger.log("row "+editRow+" was edited");
      var editColumn = e.range.getColumn();
      Logger.log("column "+editColumn+" was edited");

      /////////////////////////////////////////////////
      // ROUTING BASED ON THE COLUMN THAT WAS EDITED //
      /////////////////////////////////////////////////
      
      switch(editColumn) {
          // Routing if it was made to Status Column.
        case (1):
          if (depoSheet.getRange(editRow, 1).getValue() === '🔴 Cancelled') {
            var eventId = depoSheet.getRange(editRow, 37).getValue();
            cancelDepo(eventId, editRow);
          };
          break;
          
          // Routing if it was made to event date. 2 because Date is in Column B.
        case (2):
          editDepoDate(e, ss, SACal, depoSheet, editColumn, editRow);
          updateSheetsOnTimeOrDateEdit(editRow);
          break;
          
          // Routing the edit if it was made to the event time. 7 because Start Time is in Column G.
        case (7):
          editDepoTime(e, ss, SACal, depoSheet, editColumn, editRow);
          break;
          
          // Routing if the edit is made to Columns recorded in Calendar events.
        case (3):
        case (4):
        case (6):
        case (8):
        case (9):
        case (10):
        case (11):
        case (12):
        case (13):
        case (14):
        case (17):
        case (18):
        case (19):
        case (20):
        case (21):
        case (22):
        case (24):
        case (25):
        case (26):
        case (27):
        case (41):
          editDepoGeneral(e, ss, SACal, depoSheet, editColumn, editRow);
          break;
          
          // NEXT: services information and the Services Calendar
          
        default:
          Logger.log('There are no more cases currently supported.');
      };
    };
    
    // Releases the mutual exclusion lock.
    lock.releaseLock();
  } catch (error) {
    addToDevLog('Error in manuallyUpdateCalendar: ' + error);
  }
};


////////////////////////////////////////////////////////////////////////////////////
/////// INDIVIDUAL FUNCTIONS TO HANDLE MANUAL EDITS AND SYNC WITH CALENDAR /////////
////////////////////////////////////////////////////////////////////////////////////

/** Deletes old calendar event, adds a new one with the updated date
@params {multiple} Event object, spreadsheet data, calendar data, and event edit data passed from manuallyUpdateCalendar() function.
*/
function editDepoDate(e, ss, SACal, depoSheet, editColumn, editRow) {
  var newValue = e.value;
  var newUnformattedDate = floatToCSTDate(newValue);
  var eventId = depoSheet.getRange(editRow, 37).getValue();
  
  var newTime = new Date(dateFromDate(newUnformattedDate, editRow));
  
  // Tries to update Services calendar, alerts user with result.
  try {

    //#####################################
    //calls a function which builds all the strings for the event. returns [title,location,description]
    //@param {editRow} number Row in Schedule a depo Sheet that's been edited.
    var eventstrings = buildEventStrings(editRow);

    // Deletes old event and adds a new one at the correct date.
    var title = eventstrings[0];
    var location = eventstrings[1];
    var description = eventstrings[2];

    SACal.getEventById(eventId).deleteEvent();
    var event = SACal.createEvent(title, newTime, newTime,{ description: description, location: location });
    
    // Add new eventId to the Schedule a depo Sheet.
    depoSheet.getRange(editRow, 37).setValue(event.getId());
    ss.toast('✅ Services Calendar Updated Successfully');
    
  } catch (error) {
    SpreadsheetApp.getUi().alert('⚠️ Unable to update Services calendar with this change. The updated deposition date you entered in row ' + editRow + ', column ' + editColumn + ' is NOT reflected on the Services calendar. Please update it manually.');
    addToDevLog('In event date onEdit function: ' + error);
  };
  
  // Updates the date of the event in the Current List Sheet.
  modifyDepoDateInCurrentList(e, newTime, editRow);
  
};

/** Deletes old calendar event, adds a new one with the updated time.
@params {multiple} Event object, spreadsheet data, calendar data, and event edit data passed from manuallyUpdateCalendar() function.
*/
function editDepoTime(e, ss, SACal, depoSheet, editColumn, editRow) {
  var oldValue = e.oldValue;
  var newValue = e.value;
  var eventId = depoSheet.getRange(editRow, 37).getValue();
  
  // See if the newly-added time is in HH:MM AM format. If not, reject the change.
  var lastThreeCharacters = newValue.slice(-3);
  var validationCheck = false;
  if (lastThreeCharacters === ' PM' || lastThreeCharacters === ' AM') {
    validationCheck = true;
  };
  if (validationCheck !== true) {
    SpreadsheetApp.getUi().alert('⚠️ Incorrect Format. Please add the new time in Hour:Minute AM/PM format. Note that AM or PM must be capitalized. Your edit to row ' + editRow + ', column ' + editColumn + ' was not saved.')
    depoSheet.getRange(editRow, editColumn).setValue(oldValue);
  } else {
    // Constructs the new time (date obj).
    var newTime = new Date(dateFromHour(newValue, editRow));
    
    // Tries to update Services calendar, alerts user with result.
    try {

      //#####################################
      //calls a function which builds all the strings for the event. returns [title,location,description]
      //@param {editRow} number Row in Schedule a depo Sheet that's been edited.
      var eventstrings = buildEventStrings(editRow);

      // Deletes old event and adds a new one at the correct time.
      var title = eventstrings[0];
      var location = eventstrings[1];
      var description= eventstrings[2];

      SACal.getEventById(eventId).deleteEvent();
      var event = SACal.createEvent(title, newTime, newTime,{ description: description, location: location });
      
      // Add new eventId to the Schedule a depo Sheet.
      depoSheet.getRange(editRow, 37).setValue(event.getId());
      ss.toast('✅ Services Calendar Updated Successfully');
    } catch (error) {
      SpreadsheetApp.getUi().alert('⚠️ Unable to update Services calendar with this change. The updated deposition time you entered in row ' + editRow + ', column ' + editColumn + ' is NOT reflected on the Services calendar. Please update it manually.');
      addToDevLog('In event time onEdit function: ' + error);
    };
  };
};

/** Deletes old calendar event, adds a new one with the updated deposition information. For general use.
@params {multiple} Event object, spreadsheet data, calendar data, and event edit data passed from manuallyUpdateCalendar() function.
*/
function editDepoGeneral(e, ss, SACal, depoSheet, editColumn, editRow) {
  var oldValue = e.oldValue;
  var newValue = e.value;
  var eventId = depoSheet.getRange(editRow, 37).getValue();
  
  // Tries to update Services calendar, alerts user with result.
  try {
    
    /** Stores new event data and formats it. */
    // Grabs the event date, checks whether it's after daylight savings time, adjusts if yes.
    var rawDepoDate = depoSheet.getRange(editRow, 2).getValue().toString();
    var intDayNumber = parseInt(rawDepoDate.substring(8, 10), 10);
    if (rawDepoDate.substring(16, 18) == "23") {
      intDayNumber++;
    };
    
    //###################################
    //calls a function which builds all the strings for the event. returns [title,location,description]
    //@param {editRow} number Row in Schedule a depo Sheet that's been edited.
    var eventstrings = buildEventStrings(editRow);
    var title = eventstrings[0];
    var depoLocation= eventstrings[1];
    var description = eventstrings[2];

    //building the date from gathered data
    var monthNumber = monthToMm(rawDepoDate.substring(4, 7));
    var dayNumber = intDayNumber.toString();
    var yearNumber = rawDepoDate.substring(11, 15);
    var dashDate = yearNumber + '-' + monthNumber + '-' + dayNumber;
    var formattedDate = toStringDate(dashDate);
    var depoTime = amPmTo24(depoSheet.getRange(editRow, 7).getValue());

    var formattedDateAndHour = formattedDate + ' ' + depoTime;

    // Adds the newly-updated deposition event to the Services calendar.
    var event = SACal.createEvent(title, 
       new Date(formattedDateAndHour),
       new Date(formattedDateAndHour),{
         description: description,
         location: depoLocation
         });
    
    // Deletes the old event in the Services Calendar.
    SACal.getEventById(eventId).deleteEvent();
    
    // Sets the value of the new event ID in column 37 of Schedule a depo. 
    depoSheet.getRange(editRow, 37).setValue(event.getId());
    
    // Alerts the user that the change was successful.
    ss.toast('✅ Services Calendar Updated Successfully');

  // Catches any errors and adds them to the developer logs.
  } catch (error) {
    SpreadsheetApp.getUi().alert('⚠️ Unable to update Services calendar with this change. The updated deposition location information you entered in row ' + editRow + ', column ' + editColumn + ' is NOT reflected on the Services calendar. Please update it manually.');
    addToDevLog('In event time onEdit function: ' + error);
  };
};

/** Modifies the date of a deposition in the Current List Sheet on edit made to date column of Schedule a depo Sheet.
@param {e} object Event object created by onEdit(e) triggered event.
@param {newDate} object Date object constructed inside editDepoDate representing the new deposition date.
@param {editRow} number Row in Schedule a depo Sheet that's been edited.
*/
function modifyDepoDateInCurrentList(e, newDate, editRow) {
  var ss = SpreadsheetApp.getActive();
  var currentListSheet = ss.getSheetByName('Current List');
  var scheduleSheet = ss.getSheetByName('Schedule a depo');
  
  // Builds the old date object to enable search in Current List Sheet.
  var unformattedOldDate = floatToCSTDate(e.oldValue);
  var oldDate = new Date(dateFromDate(unformattedOldDate, editRow));
  var oldDateString = oldDate.toString();
  
  // Formats event time so that it can be searched for in the Current List Sheet.
  var month = monthToMm(oldDateString.substring(4, 7));
  var day = oldDateString.substring(8, 10);
  var currentListSearchDate = month + '-' + day;
  
  // Creates an array of row numbers in the Current List matching the currentListSearchDate.
  var currentListData = currentListSheet.getRange(2, 1, currentListSheet.getLastRow(), currentListSheet.getLastColumn()).getValues();
  var matchingDateRows = [];
  for (var i = 0; i < currentListData.length; i++ ) {
    if (currentListData[i][0] === currentListSearchDate) {
      matchingDateRows.push(i + 2);
    };
  };
  
  var rowToModify;
  
  // If there's more than one matching row from the Current List, cycle through and look for witness match.
  if (matchingDateRows.length === 0) {
    SpreadsheetApp.getActiveSpreadsheet().toast('❌ Matching depo not found in Current List. Nothing modified in Current List Sheet.');
  } else if (matchingDateRows.length === 1) {
    rowToModify = matchingDateRows[0];
  } else {
    var witness = scheduleSheet.getRange(editRow, 3).getValue();
    matchingDateRows.forEach(function(matchingRow) {
      if (currentListSheet.getRange(matchingRow, 2).getValue() === witness) {
        rowToModify = matchingRow;
      };
    });
  };
  
  // Builds the new date string that will be overwritten to Current List Sheet.
  var newDateString = newDate.toString();
  var month = monthToMm(newDateString.substring(4, 7));
  var day = newDateString.substring(8, 10);
  var updatedDate = month + '-' + day;
  
  // Writes updated date value to the deposition in Current List Sheet.
  currentListSheet.getRange(rowToModify, 1).setValue(updatedDate);
  ss.toast('✅ Depo information in Current List Sheet updated successfully');
};

/** Mirrors changes made to non-time/date columns in Schedule a depo on Current List. Triggered from manuallyUpdateCalendar(e).
// date, location, services, and time
@param {editRow} number Row in Schedule a depo Sheet that's been edited.
!!! @dev This function was built as part of the 1.1 app requirements, but is unfinished because the initial requests (time, location, services)
aren't included on the Current List as of writing this. If this changes, this function will be useful.
*/
function syncWithCurrentList(editRow, editColumn) {
  var editRow = 7;
  var ss = SpreadsheetApp.getActive();
  var currentListSheet = ss.getSheetByName('Current List');
  var scheduleSheet = ss.getSheetByName('Schedule a depo');
  
  // Builds the date object to enable search in Current List Sheet.
  var rawDate = scheduleSheet.getRange(editRow, 2).getValue().toString();
  var month = monthToMm(rawDate.substring(4, 7));
  var day = rawDate.substring(8, 10);
  var currentListSearchDate = month + '-' + day;
  
  // Creates an array of row numbers in the Current List matching the currentListSearchDate.
  var currentListData = currentListSheet.getRange(2, 1, currentListSheet.getLastRow(), currentListSheet.getLastColumn()).getValues();
  var matchingDateRows = [];
  for (var i = 0; i < currentListData.length; i++ ) {
    if (currentListData[i][0] === currentListSearchDate) {
      matchingDateRows.push(i + 2);
    };
  };
  
  var rowToModify;
  
  // If there's more than one matching row from the Current List, cycle through and look for witness match.
  if (matchingDateRows.length === 0) {
    SpreadsheetApp.getActiveSpreadsheet().toast('❌ Matching depo not found in Current List. Nothing modified in Current List Sheet.');
  } else if (matchingDateRows.length === 1) {
    rowToModify = matchingDateRows[0];
  } else {
    var witness = scheduleSheet.getRange(editRow, 3).getValue();
    matchingDateRows.forEach(function(matchingRow) {
      if (currentListSheet.getRange(matchingRow, 2).getValue() === witness) {
        rowToModify = matchingRow;
      };
    });
  };
  
  Logger.log(rowToModify) // Works
 
};

//###################
/**Builds the event description 
@param {editrow} number Row in Schedule a depo Sheet that's been edited.
returns a string description 
*/
function testEventStrings(){
  buildEventStrings(2);
}

function buildEventStrings(editRow){
  var ss = SpreadsheetApp.getActive();
  var depoSheet = ss.getSheetByName('Schedule a depo');
  var depoArray = depoSheet.getRange(editRow,1,1,depoSheet.getLastColumn()).getValues();
  Logger.log(depoArray);

  //General information from the deposition that is used to build the description
  var services = depoArray[0][23];
  var firm = depoArray[0][7];
  var witnessName = depoArray[0][2];
  var orderedBy =  depoArray[0][3];
  var caseStyle = depoArray[0][5];
  var courtReporter =  depoArray[0][24];
  var videographer =  depoArray[0][25];
  var pip = depoArray[0][26];
  var eventID = depoArray[0][36];
  var conferenceDetails = depoArray[0][40];

  //grabs attourney info to place into the description
  var attorney = depoArray[0][8];
  var firmAddress1 = depoArray[0][9];
  var firmAddress2 = depoArray[0][10];
  var city = depoArray[0][11];
  var state = depoArray[0][12];
  var zip = depoArray[0][13];

  //grabs info for the location of the deposition. this is placed in the location of the event
  var locationFirm = depoArray[0][16];
  var locationAddress1 = depoArray[0][17];
  var locationAddress2 = depoArray[0][18];
  var locationCity = depoArray[0][19];
  var locationState = depoArray[0][20];
  var locationZip = depoArray[0][21];

  // Queries the existing event description and location and gathers info that we need to re-build them for the new event
  // @param {eventID} string, grabbed from "Schedule a Depo" sheet
  // returns [Location data, Video Conference Details]
  var eventDetails = getVideoEventDescription(eventID);

  var currentEventDetails = eventDetails[1];

  // Creates event title and description.
  var title = '(' + services + ')' + ' ' + firm + ' - ' + witnessName;
  
  // Builds location and description based on whether it's a video conference or not
  let depoLocation, description;

  if (locationAddress1=="" &&locationAddress2=="") {
    Logger.log("online meeting");
    
    if(currentEventDetails=="Videoconference details missing"){
     
      Browser.msgBox('Videoconference details missing', 'Since "Location Address 1"	and "Location Address 2" are blank and the current meeting does not have "Video Conference Details", it appears that you are trying to change this event from an in-person meeting to a videoconference. Please add the Videoconference Details to the sheet in column AO once the current change is complete.', Browser.Buttons.OK);

      Logger.log("meeting changed from in person to online");
    }
      depoLocation = locationFirm + ' ( )';
      description = 'Witness Name: ' + witnessName + '\nCase Style: ' + caseStyle + '\nOrdered by: ' + orderedBy + '\n\nCSR: ' + courtReporter + '\nVideographer: ' + videographer + '\nPIP: ' + pip + '\n\nVideo Conference Details: ' + '\n' + conferenceDetails + '\n\nOur client:\n' + attorney + '\n' + firm + '\n' + firmAddress1 + ' ' + firmAddress2 + '\n' + city + ' ' + state + ' ' + zip;
    
  } else {
    Logger.log("in person meeting");
    depoLocation = locationFirm + ', ' + locationAddress1 + ' ' + locationAddress2 + ', ' + locationCity + ' ' + locationState + ' ' + locationZip;
    description = 'Witness Name: ' + witnessName + '\nCase Style: ' + caseStyle + '\nOrdered by: ' + orderedBy + '\n\nCSR: ' + courtReporter + '\nVideographer: ' + videographer + '\nPIP: ' + pip + '\n\nLocation: ' + '\n' + depoLocation + '\n\nOur client:\n' + attorney + '\n' + firm + '\n' + firmAddress1 + ' ' + firmAddress2 + '\n' + city + ' ' + state + ' ' + zip;
  };


  var returnvariable = [title, depoLocation, description];
  return returnvariable;
};


//A function where you pass in the event ID for a calendar event and it returns the video conference details as an array []
//@param {eventID} string passed in from the function calling it. Grabbed from the sheet
//returns [Location data, Video Conference Details]
function getVideoEventDescription(eventID){
  if(eventID==""){
    return ["Event Location Missing","Videoconference details missing"];
  } else {
    var SACal = CalendarApp.getCalendarById('5i0he4t28duovfl8grl3r6g6d8@group.calendar.google.com');
    var eventDescription = SACal.getEventById(eventID).getDescription();
    var eventLocation = SACal.getEventById(eventID).getLocation();

    if(eventDescription.lastIndexOf("Video Conference Details:")<0){
      var newDescription="Videoconference details missing";
    }else{
      var newDescription = eventDescription.substring(
        eventDescription.lastIndexOf("Video Conference Details:") + 26, 
        eventDescription.lastIndexOf("Our client:")
      );
    }
    return [eventLocation, newDescription];
  }
}


////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////// UTILITIES /////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////

/** Converts hour and am/pm into 24-hour formatted time 
@param {depoHour} string Integer from 1-12 entered by SA Legal Solutions from sidebar.
@param {depoMinute} string Integer from 0-60 entered by SA Legal Solutions from sidebar.
@param (amPm} string AM or PM as entered by SA Legal Solutions from sidebar.
@param {date} string dat in format '2021-06-18' entered by SA Legal Solutions from sidebar.
@return Hour in 24-hour format plus correct timezone (e.g. 16:30:00 GMT-5).
*/
function to24Format (depoHour, depoMinute, amPm,date) {
  var hour = parseInt(depoHour, 10);
  if (amPm === 'PM' && hour !== 12) {
    hour += 12;
  };
  //var timezone = "CST";
  var timezone = daylightTest(date);

  var formattedTime = hour + ':' + depoMinute + ':00 '+timezone;
  return formattedTime;
};

/*date of meeting is compared to daylight savings time
@param {date} string in the form of "MM-DD-YYYY"
@return string representign the correct itmezone based on daylight savings time
*/
function daylightSavingsTime(date){
  var response = UrlFetchApp.fetch('http://worldtimeapi.org/api/timezone/america/north_dakota/center');
  var responseJSON = JSON.parse(response.getContentText());
  var dstStart = new Date(responseJSON.dst_from);
  var dstEnd = new Date(responseJSON.dst_until);
  var eventDate = new Date(date)
  var compare = eventDate<dstEnd&&eventDate>dstStart;
  if(compare == true){
    var daylightTime = 'CDT';
  }else{
    var daylightTime = 'CST';
  }
  Logger.log(daylightTime);
  return daylightTime;
}


/** Converts YYYY-MM-DD into string date format
@param {depoDate} Date in YYYY-MM-DD format.
@return string Date formatted in full string format (e.g. January 2, 2020).
*/
function toStringDate (depoDate) {
  // Note: incoming format 2020-01-30
  
  // Seperate YYYY, MM, and DD into variables
  var year = depoDate.substring(0, 4);
  var month = depoDate.substring(5, 7);
  var day = depoDate.substring(8, 10);
  
  // Convert month from a two-digit intiger into a full month string
  switch (month) {
    case '01':
      month = 'January';
      break;
    case '02':
      month = 'February';
      break;    
    case '03':
      month = 'March';
      break;    
    case '04':
      month = 'April';
      break;    
    case '05':
      month = 'May';
      break;    
    case '06':
      month = 'June';
      break;    
    case '07':
      month = 'July';
      break;    
    case '08':
      month = 'August';
      break;    
    case '09':
      month = 'September';
      break;    
    case '10':
      month = 'October';
      break;    
    case '11':
      month = 'November';
      break;    
    case '12':
      month = 'December';
      break;
    default:
      Logger.log('Sorry, we are out of months.');
  };
  
  return month + ' ' + day + ', ' + year;
};

/** Converts value from float number to UTC date format.
@param {floatValue} number The integer created when Google Sheets returns the value of a cell with a date or time in it.
See more: https://stackoverflow.com/questions/38815858/google-apps-script-convert-float-to-date
*/
function floatToCSTDate (floatValue) {
  // Converts float value into UTC date (+6 in the 4th argument because Google defaults this Script to CST, and we need GMT for the correct result).
  var rawValue = new Date(Date.UTC(1899, 11, 30, 6, 0, floatValue * 86400)).toString();
  
  return rawValue;
};

/** Generates date obj from hour and onEdit(e) info 
@param {hour} string Hour data formatted HH:MM AM.
@param {editRow} number The row a user has just edited.
@return {date} object A date object reprsenting the new deposition time.
*/
function dateFromHour(hour, editRow) {
  var ss = SpreadsheetApp.getActive();
  var depoSheet = ss.getSheetByName('Schedule a depo');
  
  // Needed Format: 1995-12-17T03:24:00
  var formattedHour = amPmTo24(hour);
  var unformattedDate = depoSheet.getRange(editRow, 2).getValue().toString();
  
  // Destructures and formats date. Incoming format: Mon Jan 06 2020 00:00:00 GMT-0600 (CST)
  var unformattedMonth = unformattedDate.substring(4, 7);
  var formattedMonth = monthToMm(unformattedMonth);
  var day = unformattedDate.substring(8, 10);
  // If daylight savings time is setting the date to the date prior (due to daylight savings), adjust.
  if (unformattedDate.substring(16, 18) === "23") {
    day = parseInt(day, 10);
    day++;
    day = day.toString();
  }
  var year = unformattedDate.substring(11, 15);
  
  // Creates date in Needed Format.
  var formattedDate = year + '-' + formattedMonth + '-' + day + 'T' + formattedHour + ':00';
  
  return formattedDate;
};

/** Generates date obj from date and onEdit(e) info 
@param {date} string Stringified date object.
@param {editRow} number The row a user has just edited.
@return {date} object A date object reprsenting the new deposition time.
*/
function dateFromDate (unformattedDate, editRow) {
  var ss = SpreadsheetApp.getActive();
  var depoSheet = ss.getSheetByName('Schedule a depo');

  // Gets hour info and converts it to 24 hour format.
  var hour = depoSheet.getRange(editRow, 7).getValue();
  var formattedHour = amPmTo24(hour);
  
  // Destructures and formats date. Incoming format: Mon Jan 06 2020 00:00:00 GMT-0600 (CST)
  var unformattedMonth = unformattedDate.substring(4, 7);
  var formattedMonth = monthToMm(unformattedMonth);
  var day = unformattedDate.substring(8, 10);
  var year = unformattedDate.substring(11, 15);
  
  // Creates date in Needed Format.
  var formattedDate = year + '-' + formattedMonth + '-' + day + 'T' + formattedHour + ':00';
  
  return formattedDate;
};

/** Converts Hour:Minute AM/PM into 24-hour format 
@param {originalFormat} string Time represented in Hour:Minute AM/PM (e.g. 2:30 PM).
@return {newFormat} string Time represented in 24 hour format (14:30).
*/
function amPmTo24 (originalFormat) {
  
  // Identify the length of the string to determine parsing details.
  var stringLength = originalFormat.length;
  
  // Parse elements of the Hour:Minute AM/PM format.
  switch (stringLength) {
    case 8:
      var hour = parseInt(originalFormat.substring(0, 2));
      var minute = originalFormat.substring(3, 5);
      var amPm = originalFormat.slice(-2);
      break;
    case 7:
      var hour = parseInt(originalFormat.substring(0, 1));
      var minute = originalFormat.substring(2, 4);
      var amPm = originalFormat.slice(-2);
      break;
    default:
      Logger.log('There are no more acceptible lengths');
  };
  
  // Adds 12 hours only for PM times.
  if (amPm === 'PM') {
    hour += 12;
  };
  
  // Adds a zero for integers 1-9.
  hour = hour.toString();
  if (hour.length < 2) {
    hour = '0' + hour;
  }
  
  // Constructs 24-hour format.
  var newFormat = hour + ':' + minute;

  return newFormat;
};

/** Gives developer visibility into accessible Google Calendars */
function seeCalendars () {
  var allCalendars = CalendarApp.getAllCalendars();
  allCalendars.forEach(function(calendar) {
    var id = calendar.getId();
    var name = calendar.getName();
    Logger.log(name + ': ' + id);
  });
};

/** Adds each event's eventId to column AK in the "Schedule a depo" Sheet by matching the event's automatically-generated title
Note: This can usually execute ~400 rows per run before exceeding maximum allowable execution time.
*/
function addIds() {
  var SACal = CalendarApp.getCalendarById('5i0he4t28duovfl8grl3r6g6d8@group.calendar.google.com');
  var ss = SpreadsheetApp.getActive();
  var depoSheet = ss.getSheetByName('Schedule a depo');
  
  // Calibrate returned Google Calendar date range and get events.
  var endTime = new Date('2022-12-01');
  var startTime = new Date ('2018-12-01');
  var events = SACal.getEvents(startTime, endTime);
  
  /** Iterate all rows in Schedule a depo Sheet, search for title matches, and add eventIds.
  Note: change starting value of i to start iteration at a different row.
  */
  for (var i = 2; i < 3; i++) {
    var eventTitle = createTitleString(i);
    events.forEach(function(event) {
      if (event.getTitle() == eventTitle) {
        var eventId = event.getId();
        depoSheet.getRange(i, 37).setValue(eventId);
      };
    });
  };
};

/** Returns a Title string that should match a Calendar Event Title
@param {row} number A row number generated from an iterator in the addIds function.
@return {eventTitle} string The title of an event that would have been automatically generated and added to a specific Google Calendar event.
*/
function createTitleString(row) {
  var ss = SpreadsheetApp.getActive();
  var depoSheet = ss.getSheetByName('Schedule a depo');
  var services = depoSheet.getRange(row, 24).getValue();
  var firmName = depoSheet.getRange(row, 8).getValue();
  var witness = depoSheet.getRange(row, 3).getValue();
  var eventTitle = '(' + services + ')' + firmName + ' - ' + witness;
  return eventTitle;
};

//small function to run tests on teh daylightTest function
function testDaylightTest(){
  var today = new Date(12-4-2021);
  var isTodayDaylightSavings = daylightTest(today);
  Logger.log(isTodayDaylightSavings)
}


/** Takes in a the calendar date for a meeting and, 
 * using the stored daylight savings start and end times,
 * returns the GMT timezone if the date falls within daylight savings time
 *this allows the script to properly schedule timing
 */
function daylightTest(date){
  date = new Date(date);
  Logger.log("date is "+date);
  var compare = isDST(date);

  /*
  var dstStart = new Date(PropertiesService.getDocumentProperties().getProperty('daylightStart'));
  var dstEnd = new Date(PropertiesService.getDocumentProperties().getProperty('daylightEnd'));
  var compare = date<dstEnd&&date>dstStart;
  Logger.log('daylight savings is '+dstStart+" until "+dstEnd)
  */

  //return CDT (daylight time) if the date falls during daylight savings, and CST if it does not
  if(compare == true){
    var daylightTime = 'GMT-05:00';
  }else{
    var daylightTime = 'GMT-06:00';
  }

  return daylightTime;
}

//returns true if the date matches the offset of daylight savings time and false if it does not match
function isDST(d) {
    let jan = new Date(d.getFullYear(), 0, 1).getTimezoneOffset();
    let jul = new Date(d.getFullYear(), 6, 1).getTimezoneOffset();
    return Math.max(jan, jul) != d.getTimezoneOffset(); 
}

/**designed to run once per week, 
 * this function will get the daylight savings dates from worldtimeapi.com
 * stores the start and stop dates as DOCUMENT properties
 * cannot use script properties as those are used for customer logs
 */

function daylightSavingsWeeklyUpdate(){
  date = new Date();
  Logger.log(date);

  var response = UrlFetchApp.fetch('http://worldtimeapi.org/api/timezone/america/north_dakota/center');
  var responseJSON = JSON.parse(response.getContentText());
  var dstStart = new Date(responseJSON.dst_from);
  var dstEnd = new Date(responseJSON.dst_until);

  properties = PropertiesService.getDocumentProperties();

  properties.setProperties({
  'daylightStart': dstStart,
  'daylightEnd': dstEnd,
  });
  Logger.log(properties.getProperty('daylightEnd'))
}

