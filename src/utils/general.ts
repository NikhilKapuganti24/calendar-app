import { google } from "googleapis";
import { connectionObj } from '../db/connection'
import { ObjectId } from "mongodb";

const oauth2Client = new google.auth.OAuth2(
  process.env.CLIENT_ID,
  process.env.CLIENT_SECRET,
  process.env.REDIRECT_URI
);

const SCOPES = [ 'https://www.googleapis.com/auth/calendar', 'https://www.googleapis.com/auth/drive' ,'https://www.googleapis.com/auth/drive.file' ]


export const checkUserSession = async (req: any, res: any, next: any) => {
  try {
    const authorizationHeader = req.headers.authorization;

    if (!authorizationHeader) {
      return res.status(401).send("No authorization header provided")
    }

    const sessionToken = authorizationHeader.split(" ")[1];
    console.log("Session token:", sessionToken);

    if (!sessionToken) {
      console.log("sessionToken token: No session token provided");
      return res.status(401).send( "No session token provided" );
    }

    const session = await connectionObj.db('calendar').collection('sessions').findOne({ accessToken: sessionToken });
    console.log("Ssssss",!session)
    if (!session || !session.refreshToken) {
      console.log("sessionToken token: No session token provided");
      return res.status(401).send( "Invalid session token");
    }

    // Initialize the token set
    let tokenSet = {
      access_token: session.accessToken,
      refresh_token: session.refreshToken,
      expires_at: session.expiresAt,
    };

    // Check if the token is expired
    const currentTime = Math.floor(Date.now() / 1000);
    if (session.expiresAt && session.expiresAt < currentTime) {
      console.log('Token expired, attempting to refresh');

      // Refresh the access token using the refresh token
      oauth2Client.setCredentials({ refresh_token: session.refreshToken });
      const { credentials } = await oauth2Client.refreshAccessToken();
      tokenSet = {
        access_token: credentials.access_token!,
        refresh_token: session.refreshToken, // Normally you should get a new refresh token, if provided
        expires_at: Math.floor((credentials.expiry_date! / 1000) || (currentTime + 3600)), // Default expiry time set to 1 hour from now
      };
    }
else{
      // Update the session in the database with the new access token and expiry date
      await connectionObj.db('calendar').collection('sessions').updateOne(
        { _id: session._id },
        {
          $set: {
            accessToken: tokenSet.access_token,
            expiresAt: tokenSet.expires_at,
          },
        }
      );

      console.log('Token refresh successful');
    

    // Set the new credentials in the OAuth2 client
    oauth2Client.setCredentials({ access_token: tokenSet.access_token });

    // Attach user info to the request object
    req.user = {
      id: session.userId,
      email: session.email,
      accessToken: tokenSet.access_token,
    };

    next();
  }
   // Move this inside the try block to ensure it is called only on success
  } catch (error) {
    console.error('Error checking user session:', error);
    res.status(500).json({ message: "Error checking user session" });
  }
};
// export const constructEventObject = (
//   data: {
//     description: any;
//     summary: any;
//     startDate: { toISOString: () => any };
//     endDate: { toISOString: () => any };
//   },
//   emailAddresses: any[],
//   recurrenceRule: string,
//   redirectUrl: any,
//   file?: Express.Multer.File
// ) => {
//   const event: any = {
//     summary: data.summary,
//     //description: `<a href="${redirectUrl}">${data.description}</a>`,
//     colorId: '6',
//     start: {
//       dateTime: data.startDate.toISOString(),
//       timeZone: 'Asia/Kolkata'
//     },
//     end: {
//       dateTime: data.endDate.toISOString(),
//       timeZone: 'Asia/Kolkata'
//     },
//     attendees: emailAddresses.map((email: any) => ({ email }))
//   };

//   if (file) {
//     console.log("sdbhjcnmgklsdf",file)
//     // Attach file as an attachment with base64-encoded content
//     const attachmentData = {
//       fileUrl: `data:${file.mimetype};base64,${file.buffer.toString('base64')}`,
//       title: file.originalname,
//       mimeType: file.mimetype,
//       iconLink: 'path_to_icon', // Optional: specify an icon link if needed
//     };
//     console.log("sdbhjcnmgklsdf",attachmentData)
//     event.attachments = [attachmentData];
//   }

//   if (recurrenceRule && recurrenceRule !== 'None') {
//     event.recurrence = [recurrenceRule];
//   }

//   return event;
// };

// export const constructEventObject = (
//   data: {
//     description: any;
//     summary: any;
//     startDate: { toISOString: () => any };
//     endDate: { toISOString: () => any };
//   },
//   emailAddresses: any[],
//   recurrenceRule: string,
//   redirectUrl: any,
//   fileLink?: string // Updated to receive a file link instead of the file itself
// ) => {
//   const event: any = {
//     summary: data.summary,
//     description: `<a href="${redirectUrl}">${data.description}</a>`, // Ensure this is properly formatted
//     colorId: '6',
//     start: {
//       dateTime: data.startDate.toISOString(),
//       timeZone: 'Asia/Kolkata'
//     },
//     end: {
//       dateTime: data.endDate.toISOString(),
//       timeZone: 'Asia/Kolkata'
//     },
//     attendees: emailAddresses.map((email: any) => ({ email }))
//   };

//   if (fileLink) {
//     event.attachments= [
//       {
//           "fileUrl":`<a href="${fileLink}">Attached File</a>`
          
//       }
//   ]
//   }
//     //event.attachments += `<br/><a href="${fileLink}">Attached File</a>`;
  

//   if (recurrenceRule && recurrenceRule !== 'None') {
//     event.recurrence = [recurrenceRule];
//   }

//   return event;
// };
// export const constructEventObject = (
//   data: {
//     description: any;
//     summary: any;
//     startDate: { toISOString: () => any };
//     endDate: { toISOString: () => any };
//   },
//   emailAddresses: any[],
//   recurrenceRule: string,
//   redirectUrl: any,
//   fileLink?: string // Optional file link
// ) => {
//   const event: any = {
//     summary: data.summary,
//     description: `<a href="${redirectUrl}">${data.description}</a>`,
//     colorId: '6',
//     start: {
//       dateTime: data.startDate.toISOString(),
//       timeZone: 'Asia/Kolkata'
//     },
//     end: {
//       dateTime: data.endDate.toISOString(),
//       timeZone: 'Asia/Kolkata'
//     },
//     attendees: emailAddresses.map((email: any) => ({ email }))
//   };

//   if (fileLink) {
//     event.attachments = [
//       {
//         fileData: fileContent,
//         mimeType: 'application/pdf', // Adjust based on your file type
//       }
//     ];
//   }

//   if (recurrenceRule && recurrenceRule !== 'None') {
//     event.recurrence = [recurrenceRule];
//   }

//   return event;
// };

// export const constructEventObject = (
//   data: {
//     description: any;
//     summary: any;
//     startDate: { toISOString: () => any };
//     endDate: { toISOString: () => any };
//   },
//   emailAddresses: any[],
//   recurrenceRule: string,
//   redirectUrl: any,
//   fileLink?: string // Optional file link
// ) => {
//   const event: any = {
//     summary: data.summary,
//     description: `<a href="${redirectUrl}">${data.description}</a>`,
//     colorId: '6',
//     start: {
//       dateTime: data.startDate.toISOString(),
//       timeZone: 'Asia/Kolkata'
//     },
//     end: {
//       dateTime: data.endDate.toISOString(),
//       timeZone: 'Asia/Kolkata'
//     },
//     attendees: emailAddresses.map((email: any) => ({ email }))
//   };

//   if (fileLink) {
//     event.attachments = [
//       {
//         fileUrl: fileLink, // Use fileUrl directly for attachments from Drive
//       }
//     ];
//   }

//   if (recurrenceRule && recurrenceRule !== 'None') {
//     event.recurrence = [recurrenceRule];
//   }

//   return event;
// };
// export const constructEventObject = (
//   data: {
//     description: any;
//     summary: any;
//     startDate: { toISOString: () => any };
//     endDate: { toISOString: () => any };
//   },
//   emailAddresses: any[],
//   recurrenceRule: string,
//   redirectUrl: any,
//   fileLink?: string // Optional file link
// ) => {
//   const event: any = {
//     summary: data.summary,
//     description: `<a href="${redirectUrl}">${data.description}</a>`,
//     colorId: '6',
//     start: {
//       dateTime: data.startDate.toISOString(),
//       timeZone: 'Asia/Kolkata'
//     },
//     end: {
//       dateTime: data.endDate.toISOString(),
//       timeZone: 'Asia/Kolkata'
//     },
//     attendees: emailAddresses.map((email: any) => ({ email }))
//   };

//   if (fileLink) {
//     event.attachments = [
//       {
//         fileUrl: fileLink,
//         title: "sjjj",
//          // Use fileUrl directly for attachments from Drive
//       }
//     ];
//   }

//   if (recurrenceRule && recurrenceRule !== 'None') {
//     event.recurrence = [recurrenceRule];
//   }

//   return event;
// };
export const constructEventObject = (
  data: {
    description: any;
    summary: any;
    startDate: { toISOString: () => any };
    endDate: { toISOString: () => any };
  },
  emailAddresses: any[],
  recurrenceRule: string,
  redirectUrl: any,
  fileLinks?: { fileUrl: string, title: string }[] // Array of file links
) => {
  const event: any = {
    summary: data.summary,
    description: `<a href="${redirectUrl}">${data.description}</a>`,
    colorId: '6',
    start: {
      dateTime: data.startDate.toISOString(),
      timeZone: 'Asia/Kolkata'
    },
    end: {
      dateTime: data.endDate.toISOString(),
      timeZone: 'Asia/Kolkata'
    },
    attendees: emailAddresses.map((email: any) => ({ email }))
  };
 
  if (fileLinks && fileLinks.length > 0) {
    event.attachments = fileLinks.map(fileLink => ({
      fileUrl: fileLink.fileUrl,
      title: fileLink.title,
    }));
  }

  if (recurrenceRule && recurrenceRule !== 'None') {
    event.recurrence = [recurrenceRule];
  }

  return event;
};