import { google } from "googleapis";
import { connectionObj } from '../db/connection'
import { ObjectId } from "mongodb";

const oauth2Client = new google.auth.OAuth2(
  process.env.CLIENT_ID,
  process.env.CLIENT_SECRET,
  process.env.REDIRECT_URI
);

const SCOPES = ['https://www.googleapis.com/auth/calendar'];


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
export const constructEventObject = (data: {
  description: any; summary: any; startDate: { toISOString: () => any; }; endDate: { toISOString: () => any; }; 
}, emailAddresses: any[], recurrenceRule: string, redirectUrl: any) => {
  const event:any = {
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

  if (recurrenceRule && recurrenceRule !== 'None') {
    event.recurrence = [recurrenceRule];
  }

  return event;
};
