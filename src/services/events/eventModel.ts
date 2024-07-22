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

/**
 * Sets the OAuth2 client credentials.
 * @param accessToken - The access token to set.
 */
const setOauth2ClientCredentials = (accessToken: string) => {
  oauth2Client.setCredentials({ access_token: accessToken });
};

/**
 * Returns an authenticated Google Drive client.
 * @param accessToken - The access token to authenticate the client.
 * @returns The Google Drive client.
 */
const getDriveClient = (accessToken: string) => {
  setOauth2ClientCredentials(accessToken);
  return google.drive({ version: 'v3', auth: oauth2Client });
};

/**
 * Returns an authenticated Google Calendar client.
 * @param accessToken - The access token to authenticate the client.
 * @returns The Google Calendar client.
 */
const getCalendarClient = (accessToken: string) => {
  setOauth2ClientCredentials(accessToken);
  return google.calendar({ version: 'v3', auth: oauth2Client });
};

/**
 * Uploads a file to Google Drive.
 * @param file - The file to upload.
 * @param driveClient - The Google Drive client.
 * @returns The response data from Drive API.
 */
// const uploadFileToDrive = async (file: Express.Multer.File, driveClient: any) => {
//   const filePath = path.join(file.destination, file.filename); // Correct file path

//   const fileMetadata = {
//     name: file.originalname,
//     parents: [process.env.FOLDER_ID] // Use the environment variable for the folder ID
//   };

//   const media = {
//     mimeType: file.mimetype,
//     body: fs.createReadStream(filePath)
//   };

//   try {
//     const res = await driveClient.files.create({
//       resource: fileMetadata,
//       media: media,
//       fields: 'id, webViewLink'
//     });

//     // Clean up temporary file
//     fs.unlinkSync(filePath);

//     return res.data;
//   } catch (error) {
//     // Clean up temporary file on error
//     if (fs.existsSync(filePath)) {
//       fs.unlinkSync(filePath);
//     }
//     throw error;
//   }
// };
const uploadFileToDrive = async (file: Express.Multer.File, driveClient: any) => {
  const filePath = path.join(file.destination, file.filename); // Correct file path

  const fileMetadata = {
    name: file.originalname,
    parents: [process.env.FOLDER_ID] // Use the environment variable for the folder ID
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

/**
 * Returns the recurrence rule for an event.
 * @param recurrence - The recurrence type.
 * @returns The recurrence rule.
 */
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

/**
 * Inserts an event into the database.
 * @param body - The event details.
 * @param event - The event data from Google Calendar.
 * @param file - The file metadata.
 */
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
    imageUrl: file ? `/uploads/${file.filename}` : null,
    attachment: body.attachment,
  });
};

/**
 * Deletes an event from the database.
 * @param eventId - The event ID.
 * @throws Error if deletion fails.
 */
const deleteEventFromDb = async (eventId: string) => {
  const result = await connectionObj.db('calendar').collection('events').deleteOne({ _id: new ObjectId(eventId) });
  if (result.deletedCount === 0) {
    throw new Error('Failed to delete event from database. No document found.');
  }
};

/**
 * Creates an event in Google Calendar and database.
 * @param body - The event details.
 * @param accessToken - The OAuth2 access token.
 * @param file - The file to be attached to the event.
 * @returns Success or error message.
 */

export const createEventInDB = async (
  body: {
    redirectUrl: any;
    description: any;
    summary: any;
    startDate: string | number | Date;
    endDate: string | number | Date;
    emails: any[];
    recurrence: any;
    driveFileId?: string;
    fileLink?: string;
  },
  accessToken: string,
  file?: Express.Multer.File
) => {
  try {
    console.log("Request body:", body);
    console.log("File received:", file);

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

    let fileLink:any;

    if (file) {
      // Handle desktop file upload
      const uploadedFile = await uploadFileToDrive(file, drive);
      fileLink = uploadedFile.webViewLink;
    } 
       // Check if a file is selected from Google Drive
       if (body.driveFileId) {
        const fileResponse = await drive.files.get({
          fileId: body.driveFileId,
          fields: 'webViewLink'
        });
        fileLink = fileResponse.data.webViewLink;
      }

    const event = constructEventObject(eventData, emailAddresses, recurrenceRule, body.redirectUrl, fileLink);

    console.log("Event to be inserted:", event);

    const result = await calendar.events.insert({
      calendarId: 'primary',
      requestBody: event,
      supportsAttachments: true 
    });

    await insertEventToDb(body, result.data, file);

    return 'Event created successfully';
  } catch (error: any) {
    console.error('Error creating event:', error.response?.data || error.message || error);
    return 'Error creating event';
  }
};
// export const createEventInDB = async (
//   body: {
//     redirectUrl: any;
//     description: any;
//     summary: any;
//     startDate: string | number | Date;
//     endDate: string | number | Date;
//     emails: any[];
//     recurrence: any;
//     attachment?: Express.Multer.File;
//   },
//   accessToken: string,
//   file: Express.Multer.File
// ) => {
//   try {
//     console.log("Request body:", body);
//     console.log("File received:", file);

//     const eventData = {
//       summary: body.summary,
//       description: body.description,
//       startDate: new Date(body.startDate),
//       endDate: new Date(body.endDate),
//     };

//     const emailAddresses = body.emails.map((emailObj: { address: any }) => emailObj.address);
//     const recurrenceRule = getRecurrenceRule(body.recurrence);

//     const calendar = getCalendarClient(accessToken);
//     const drive = getDriveClient(accessToken);

//     let fileLink: string | undefined;
//     if (file) {
//       const uploadedFile = await uploadFileToDrive(file, drive);
//       fileLink = uploadedFile.webViewLink;
//     }

//     const event = constructEventObject(eventData, emailAddresses, recurrenceRule, body.redirectUrl, fileLink);

//     console.log("Event to be inserted:", event);

//     const result = await calendar.events.insert({
//       calendarId: 'primary',
//       requestBody: event,
//       supportsAttachments: true 
//     });

//     await insertEventToDb(body, result.data, file);

//     return 'Event created successfully';
//   } catch (error: any) {
//     console.error('Error creating event:', error.response?.data || error.message || error);
//     return 'Error creating event';
//   }
// };
// export const createEventInDB = async (
//   body: {
//     redirectUrl: any;
//     description: any;
//     summary: any;
//     startDate: string | number | Date;
//     endDate: string | number | Date;
//     emails: any[];
//     recurrence: any;
//     attachment?: Express.Multer.File; // Optional file link
//   },
//   accessToken: string,file:any
// ) => {
//   try {
//     console.log("Request body:", body);
//     console.log("File received:", body.attachment); // Log for debugging

//     const eventData = {
//       summary: body.summary,
//       description: body.description,
//       startDate: new Date(body.startDate),
//       endDate: new Date(body.endDate),
//     };

//     const emailAddresses = body.emails.map((emailObj: { address: any }) => emailObj.address);
//     const recurrenceRule = getRecurrenceRule(body.recurrence);

//     const calendar = getCalendarClient(accessToken);
//     const drive = getDriveClient(accessToken);

//     let fileLink: string | undefined;
//     if (file) {
//       const uploadedFile = await uploadFileToDrive(file, drive);
//       fileLink = uploadedFile.webViewLink;
//     }

//     const event = constructEventObject(eventData, emailAddresses, recurrenceRule, body.redirectUrl, fileLink);

//     console.log("Event to be inserted:", event);

//     const result = await calendar.events.insert({
//       calendarId: 'primary',
//       requestBody: event,
//       supportsAttachments: true // Set supportsAttachments for attachments
//     });
//   }
//   catch (error: any) {
//         console.error('Error creating event:', error.response?.data || error.message || error);
//         return 'Error creating event';
//       }
// }

/**
 * Fetches all events from the database.
 * @returns The list of events or error.
 */
export const getAllEventsFromDB = async () => {
  try {
    const events = await connectionObj.db('calendar').collection('events').find({}).toArray();
    return events;
  } catch (error: any) {
    console.error('Error fetching events:', error.response?.data || error.message || error);
    return error;
  }
};

/**
 * Fetches a single event from the database.
 * @param id - The event ID.
 * @returns The event or error.
 */
export const getEventFromDB = async (id: any) => {
  try {
    const event = await connectionObj.db('calendar').collection('events').findOne({ _id: new ObjectId(id) });
    return event;
  } catch (error: any) {
    console.error('Error fetching event:', error.response?.data || error.message || error);
    return error;
  }
};

/**
 * Deletes an event from Google Calendar and the database.
 * @param Id - The event ID.
 * @param accessToken - The OAuth2 access token.
 * @returns Success or error message.
 */
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

/**
 * Updates an event in Google Calendar and the database.
 * @param Id - The event ID.
 * @param body - The updated event details.
 * @param accessToken - The OAuth2 access token.
 * @returns Success or error message.
 */
export const updateEventInDB = async (Id: any, body: {
  redirectUrl: any;
  description: any;
  summary: any;
  startDate: string | number | Date;
  endDate: string | number | Date;
  emails: any[];
  recurrence: any;
}, accessToken: string) => {
  try {
    const event = await getEventFromDB(Id);
    const eventId = event.eventId;

    const eventData = {
      summary: body.summary,
      description: body.description,
      startDate: new Date(body.startDate),
      endDate: new Date(body.endDate),
    };

    const emailAddresses = body.emails.map((emailObj: { address: any }) => emailObj.address);
    const recurrenceRule = getRecurrenceRule(body.recurrence);
    const calendar = getCalendarClient(accessToken);
    const eventObject = constructEventObject(eventData, emailAddresses, recurrenceRule, body.redirectUrl);

    await calendar.events.update({
      calendarId: 'primary',
      eventId,
      requestBody: eventObject,
    });

    await connectionObj.db('calendar').collection('events').updateOne({ _id: new ObjectId(Id) }, {
      $set: {
        eventId,
        summary: body.summary,
        description: body.description,
        assigneeEmail: body.emails,
        startDate: body.startDate,
        endDate: body.endDate,
        recurrence: body.recurrence,
        emails: body.emails,
        redirectUrl: body.redirectUrl,
      },
    });

    return 'Event updated successfully';
  } catch (error: any) {
    console.error('Error updating event:', error.response?.data || error.message || error);
    return 'Error updating event';
  }
};
