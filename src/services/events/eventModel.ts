import { google } from 'googleapis';
import { ObjectId } from 'mongodb';
import { connectionObj } from '../../db/connection';
import { constructEventObject } from '../../utils/general';
import multer from 'multer';
import fs from 'fs';
import path from 'path';

// Setup OAuth2 client
const oauth2Client = new google.auth.OAuth2(
  process.env.CLIENT_ID,
  process.env.CLIENT_SECRET,
  process.env.REDIRECT_URI
);

// Setup multer for file upload
const upload = multer({ dest: 'temp/' });


const setOauth2ClientCredentials = (accessToken: string, refreshToken?: string) => {
  const credentials:any = { access_token: accessToken };
  if (refreshToken) {
    credentials.refresh_token = refreshToken;
  }
  oauth2Client.setCredentials(credentials);
};

const getDriveClient = (accessToken: string) => {
  setOauth2ClientCredentials(accessToken);
  return google.drive({ version: 'v3', auth: oauth2Client });
};


const getCalendarClient = (accessToken: string) => {
  setOauth2ClientCredentials(accessToken);
  return google.calendar({ version: 'v3', auth: oauth2Client });
};

const uploadFileToDrive = async (file: Express.Multer.File, driveClient: any) => {
  const filePath = path.join(file.destination, file.filename); 

  const fileMetadata = {
    name: file.originalname,
    parents: [process.env.FOLDER_ID]
  };

  const media = {
    mimeType: file.mimetype,
    body: fs.createReadStream(filePath)
  };

  try {
    const res = await driveClient.files.create({
      resource: fileMetadata,
      media: media,
      fields: 'id, webViewLink'
    });

    // Clean up temporary file
    fs.unlinkSync(filePath);

    // Return the attachment details (consider security if applicable)
    return {
      id: res.data.id,
      webViewLink: res.data.webViewLink,
      // Optionally include additional properties for specific use cases (e.g., filename, size)
    };
  } catch (error) {
    // Clean up temporary file on error
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
    throw error;
  }
};

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
      case 'daily':
      return 'RRULE:FREQ=DAILY';
    default:
      return 'None';
  }
};
const insertEventToDb = async (body: any, event: any, file: any) => {
  await connectionObj.db('calendar').collection('events').insertOne({
    eventId: event.id,
    summary: event.summary,
    description: body.description,
    assigneeEmail: body.emailAddresses,
    startDate: body.startDate,
    endDate: body.endDate,
    recurrence: body.recurrence,
    emails: body.emails,
    redirectUrl: body.redirectUrl,
    file: file,
    attachment: body.attachment,
  });
};

const deleteEventFromDb = async (eventId: string) => {
  const result = await connectionObj.db('calendar').collection('events').deleteOne({ _id: new ObjectId(eventId) });
  if (result.deletedCount === 0) {
    throw new Error('Failed to delete event from database. No document found.');
  }
};
export const createEventInDB = async (
  body: {
    redirectUrl: any;
    description: any;
    summary: any;
    startDate: string | number | Date;
    endDate: string | number | Date;
    emails: any[];
    recurrence: any;
    driveFileIds?: string;
    files?: Express.Multer.File[]; // Array of files
  },
  accessToken: string
) => {
  try {
    console.log("Request body:", body);
    console.log("Files received:", body.files);

    const eventData = {
      summary: body.summary,
      description: body.description,
      startDate: new Date(body.startDate),
      endDate: new Date(body.endDate),
    };

    const emailAddresses = body.emails.map((emailObj: { address: any }) => emailObj.address);
    const recurrenceRule = getRecurrenceRule(body.recurrence);

    const calendar = getCalendarClient(accessToken);
    const drive = getDriveClient(accessToken);

    let fileLinks:any = [];

    if (body.files && body.files.length > 0) {
      for (const file of body.files) {
        console.log("sadasknm,.wdsaghzxbjnkm,qwhbsz,ewhjbm")
        const uploadedFile = await uploadFileToDrive(file, drive);
        fileLinks.push({
          fileUrl: uploadedFile.webViewLink,
        title: file.originalname,
        });
      }
    }

    // Check if a file is selected from Google Drive
    // if (body.driveFileId) {
    //   const fileResponse = await drive.files.get({
    //     fileId: body.driveFileId,
    //     fields: 'webViewLink'
    //   });
    //   fileLinks.push({
    //     fileUrl: fileResponse.data.webViewLink,
    //     title: 'Google Drive File',
    //   });
    // }
    if (body.driveFileIds) {
      // If it's a string, convert it to an array
      const driveFileIds = Array.isArray(body.driveFileIds) ? body.driveFileIds : [body.driveFileIds];
      
      for (const fileId of driveFileIds) {
        const fileResponse = await drive.files.get({
          fileId: fileId,
          fields: 'webViewLink,name'
        });
        fileLinks.push({
          fileUrl: fileResponse.data.webViewLink,
          title: fileResponse.data.name,
        });
      }
    }

    const event = constructEventObject(eventData, emailAddresses, recurrenceRule, body.redirectUrl, fileLinks);

    console.log("Event to be inserted:", event);

    const result = await calendar.events.insert({
      calendarId: 'primary',
      requestBody: event,
      supportsAttachments: true 
    });

    await insertEventToDb(body, result.data, fileLinks);

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
    console.log('Deleting event with ID:', Id);

    const event = await getEventFromDB(Id);
    const eventId = event.eventId;
    const calendar = getCalendarClient(accessToken);

    const deleteResponse = await calendar.events.delete({
      calendarId: 'primary',
      eventId,
    });

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


export const updateEventInDB = async (
  Id: string,
  body: Partial<{
    redirectUrl: string;
    description: string;
    summary: string;
    startDate: string | number | Date;
    endDate: string | number | Date;
    emails: any[];
    recurrence: string;
    driveFileIds?: string[];
    files?: Express.Multer.File[];
  }>,
  accessToken: string
) => {
  try {
    const event = await getEventFromDB(Id);
    const eventId = event.eventId;

    const calendar = getCalendarClient(accessToken);
    const drive = getDriveClient(accessToken);

    // Fetch the existing event from Google Calendar
    const existingEvent = await calendar.events.get({
      calendarId: 'primary',
      eventId
    });

    // Collect existing attachments if any
    let existingAttachments = existingEvent.data.attachments || [];

    // Handle new file uploads
    if (body.files && body.files.length > 0) {
      for (const file of body.files) {
        const uploadedFile:any = await uploadFileToDrive(file, drive);
        existingAttachments.push({
          fileUrl: uploadedFile.webViewLink,
          title: file.originalname,
          mimeType: file.mimetype,
          iconLink: uploadedFile.iconLink,
        });
      }
    }

    // Handle new Google Drive file ids
    if (body.driveFileIds && body.driveFileIds.length > 0) {
      for (const fileId of body.driveFileIds) {
        const fileResponse = await drive.files.get({
          fileId: fileId,
          fields: 'webViewLink,name,mimeType,iconLink'
        });
        existingAttachments.push({
          fileUrl: fileResponse.data.webViewLink,
          title: fileResponse.data.name,
          mimeType: fileResponse.data.mimeType,
          iconLink: fileResponse.data.iconLink,
        });
      }
    }

    // Prepare update object for Google Calendar
    const eventUpdateObject: any = {
      summary: body.summary || event.summary,
      description: body.description || event.description,
      start: { dateTime: new Date(body.startDate || event.startDate)},
      end: { dateTime: new Date(body.endDate || event.endDate) },
      attendees: body.emails ? body.emails.map((emailObj: { address: any }) => emailObj.address) : event.attendees,
      recurrence: body.recurrence ? [getRecurrenceRule(body.recurrence)] : event.recurrence,
      attachments: existingAttachments,
    };
    console.log("eventUpdateObject",eventUpdateObject)

    // Ensure start and end dates are included
    if (!eventUpdateObject.start || !eventUpdateObject.end) {
      throw new Error('Start and End dates must be provided.');
    }


   let  data= {
      description: eventUpdateObject.description,
      summary: eventUpdateObject.summary,
      startDate: eventUpdateObject.start.dateTime,
      endDate: eventUpdateObject.end.dateTime
    }
  

    const emailAddresses = eventUpdateObject.attendees.map((emailObj: { address: any }) => emailObj);
    const eventData = constructEventObject(data,  emailAddresses,eventUpdateObject.recurrenceRule, body.redirectUrl, eventUpdateObject.attachments);

    console.log("eventData",eventData)
    // Update Google Calendar event
    await calendar.events.update({
      calendarId: 'primary',
      eventId,
      requestBody: eventData,
      supportsAttachments: true
    });

    // Prepare update object for database
    const dbUpdateObject: any = {
      ...event, // Copy existing event data
      ...body, // Override with new data from the request
      //fileLinks: existingAttachments.map(att => ({ fileUrl: att.fileUrl, title: att.title })),
    };

    console.log("dbUpdateObject",dbUpdateObject)

    // Update database
    await connectionObj.db('calendar').collection('events').updateOne(
      { _id: new ObjectId(Id) },
      { $set: dbUpdateObject }
    );

    return 'Event updated successfully';
  } catch (error: any) {
    console.error('Error updating event:', error.response?.data || error.message || error);
    return 'Error updating event';
  }
};
