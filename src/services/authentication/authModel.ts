import { google } from "googleapis";
import { connectionObj } from "../../db/connection";
import { ObjectId } from "mongodb";

const oauth2Client = new google.auth.OAuth2(
  process.env.CLIENT_ID,
  process.env.CLIENT_SECRET,
  process.env.REDIRECT_URI
);


const SCOPES = ['https://www.googleapis.com/auth/calendar'];

export const checkAuthinDB = () => {
  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
  });
  return authUrl;
};

export const checkValidateUserinDB = async (querycode: any) => {
  const code = querycode;

  try {
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);

    // Retrieve user info from Google API using the access token
    const { data } = await google.oauth2('v2').userinfo.get({ auth: oauth2Client });
    const userData = {
      name: data.name,
      email: data.email,
      picture: data.picture,
      ...tokens,
    };

    // Check if user already exists
    const existingUser = await connectionObj.db('calendar').collection('users').findOne({ email: data.email });

    let userId;

    if (!existingUser) {
      // Insert new user and get the insertedId
      const result = await connectionObj.db('calendar').collection('users').insertOne(userData);
      userId = result.insertedId;
    } else {
      userId = existingUser._id;
    }

    // Insert session details
    const sessionData = {
      userId: userId,
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiryDate:tokens.expiry_date,
      createdAt: new Date(),
    };
    await connectionObj.db('calendar').collection('sessions').insertOne(sessionData);
    return `${process.env.FRONT_END_UI_URL}/token?access_token=${sessionData.accessToken}&refresh_token=${sessionData.accessToken}`
  } catch (error) {
    console.error('Error during OAuth callback:', error);
    return 'Error during user validation';
  }
};

export const checkValidateUser = async (querycode: any) => {

  
    try {
        const authorizationHeader = querycode

        if (!authorizationHeader) {
             return { status: 401, message: "No authorization header provided" };
            
            
             
        }

        const sessionToken = authorizationHeader.split(" ")[1];
        console.log("Session token:", sessionToken);

        if (!sessionToken) {
            console.log("sessionToken token: No session token provided");
            return { status: 401, message: "No Session header provided" };
        }

        const session = await connectionObj.db('calendar').collection('sessions').findOne({ accessToken: sessionToken });
        console.log("Session exists:", !!session);

        if (!session || !session.refreshToken) {
            console.log("Invalid session token");
            return { status: 401, message: "Invalid Session Token" };
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
        } else {
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
        }

        // Set the new credentials in the OAuth2 client
        oauth2Client.setCredentials({ access_token: tokenSet.access_token });

        // Attach user info to the request object
        // req.user = {
        //     id: session.userId,
        //     email: session.email,
        //     accessToken: tokenSet.access_token,
        // };

       
    } catch (error) {
        console.error('Error checking user session:', error);
        return { status: 500, message: "Error" };
    }

}
