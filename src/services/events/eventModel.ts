import { google } from "googleapis";
import { ObjectId } from "mongodb";
import { connectionObj } from "../../db/connection";
import { constructEventObject } from "../../utils/general";

const oauth2Client = new google.auth.OAuth2(
  process.env.CLIENT_ID,
  process.env.CLIENT_SECRET,
  process.env.REDIRECT_URI
);


const SCOPES = ['https://www.googleapis.com/auth/calendar'];

const getRecurrenceRule = (recurrence: string) => {
  switch (recurrence) {
    case 'weekly':
      return 'RRULE:FREQ=WEEKLY';
    case 'bi-weekly':
      return 'RRULE:FREQ=DAILY;INTERVAL=15;BYDAY=MO,TU,WE,TH,FR';
    case 'monthly':
      return 'RRULE:FREQ=MONTHLY';
    case 'yearly':
      return 'RRULE:FREQ=YEARLY';
    case 'not-repeat':
    default:
      return 'None';
  }
};

const setOauth2ClientCredentials = (accessToken: string) => {
  oauth2Client.setCredentials({ access_token: accessToken });
};

const getCalendarClient = (accessToken: string) => {
  setOauth2ClientCredentials(accessToken);
  return google.calendar({ version: 'v3', auth: oauth2Client });
};

const insertEventToDb = async (body: any,event:any) => {
  await connectionObj.db('calendar').collection('events').insertOne({
    eventId: event.id,
    summary: event.summary,
    description: body.description,
    assigneeEmail: body.emailAddresses,
    startDate: body.startDate,
    endDate: body.endDate,
    recurrence:body.recurrence,
    emails:body.emails,
    redirectUrl:body.redirectUrl
  });
};

const deleteEventFromDb = async (eventId: string) => {
  console.log("dsjhufshdj")
  const result = await connectionObj.db('calendar').collection('events').deleteOne({ _id: new ObjectId(eventId) });
  if (result.deletedCount === 0) {
    throw new Error('Failed to delete event from database. No document found.');
  }
};

export const createEventInDB = async (body: {
  redirectUrl: any; description: any, name: any, summary: any, startDate: string | number | Date, endDate: string | number | Date, emails: any[], recurrence: any 
}, accessToken: string) => {
  try {
    const eventData = {
      summary: body.summary,
      description: body.description,
      startDate: new Date(body.startDate),
      endDate: new Date(body.endDate),
      
    };
    const emailAddresses = body.emails.map((emailObj: { address: any }) => emailObj.address);
    const recurrenceRule = getRecurrenceRule(body.recurrence);

    const calendar = getCalendarClient(accessToken);
    const event = constructEventObject(eventData, emailAddresses, recurrenceRule, body.redirectUrl);

    const result = await calendar.events.insert({
      calendarId: 'primary',
      requestBody: event,
    });

    //console.log("eeeee",result)

    await insertEventToDb(body,result.data);

    return 'Event created successfully';
  } catch (error: any) {
    console.error('Error creating event:', error.response?.data || error.message || error);
    return 'Error creating event';
  }
};

export const getAllEventsFromDB = async () => {
  try {
    const events = await connectionObj.db('calendar').collection('events').find({}).toArray();
    return events;
  } catch (error: any) {
    console.error('Error fetching events:', error.response?.data || error.message || error);
    return error;
  }
};

export const getEventFromDB = async (id: any) => {
  try {
    const event = await connectionObj.db('calendar').collection('events').findOne({ _id: new ObjectId(id) });
    return event;
  } catch (error: any) {
    console.error('Error fetching event:', error.response?.data || error.message || error);
    return error;
  }
};

export const deleteEventFromDB = async (Id: string, accessToken: string) => {
  try {
    console.log("Deleting event with ID:", Id);

    let event=await getEventFromDB(Id)
    console.log("wee",event)
    let eventId=event.eventId
    const calendar = getCalendarClient(accessToken);

    const deleteResponse = await calendar.events.delete({
      calendarId: 'primary',
      eventId,
    });
    console.log("deleteResponse",deleteResponse)
    if (deleteResponse.status !== 204) {
      throw new Error(`Failed to delete event from Google Calendar. Status: ${deleteResponse.status}`);
    }

    await deleteEventFromDb(Id);

    return 'Event deleted successfully';
  } catch (error: any) {
    console.error('Error deleting event:', error.response?.data || error.message || error);
    return 'Error deleting event';
  }
};

export const updateEventInDB = async (Id:any,body: {
  redirectUrl: any; description: any, name: any, summary: any, startDate: string | number | Date, endDate: string | number | Date, emails: any[], recurrence: any 
}, accessToken: string) => {

  let event=await getEventFromDB(Id)
  let eventId=event.eventId
  console.log("Eventyssss",eventId)
  try {
    const eventData = {
      summary: body.summary,
      description: body.description,
      startDate: new Date(body.startDate),
      endDate: new Date(body.endDate),
      
    };
    const emailAddresses = body.emails.map((emailObj: { address: any }) => emailObj.address);
    const recurrenceRule = getRecurrenceRule(body.recurrence);
    const calendar = getCalendarClient(accessToken);
    const event = constructEventObject(eventData, emailAddresses, recurrenceRule, body.redirectUrl);

    await calendar.events.update({
      calendarId: 'primary',
      eventId,
      requestBody: event,
    });

    await connectionObj.db('calendar').collection('events').updateOne({ _id: new ObjectId(Id) }, {
      $set: {
        eventId,
        summary: body.summary,
        description: body.description,
        assigneeEmail: body.emails,
        startDate: body.startDate,
        endDate: body.endDate,
        recurrence:body.recurrence,
        emails:body.emails,
        redirectUrl:body.redirectUrl
      },
    });

    return 'Event updated successfully';
  } catch (error: any) {
    console.error('Error updating event:', error.response?.data || error.message || error);
    return 'Error updating event';
  }
};

