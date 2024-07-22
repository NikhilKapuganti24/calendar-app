import { Request, Response, NextFunction } from 'express';
import { check, checkAuth, checkValidate } from './authController';
import { google } from 'googleapis';

interface AuthenticatedRequest extends Request {
    user?: {
        id: string;
        email: string;
        accessToken: string;
    };
}


const oauth2Client = new google.auth.OAuth2(
    process.env.CLIENT_ID,
    process.env.CLIENT_SECRET,
    process.env.REDIRECT_URI
  );
  
 
  
  const SCOPES = [
    'https://www.googleapis.com/auth/calendar',
    'https://www.googleapis.com/auth/drive.file',
  ];
export default [

    {
        path: '/auth',
        method: 'get',
        handler: [
            async (req: Request, res: Response, next: NextFunction) => {
                try {
                    const result = await checkAuth()
                    res.redirect(result)
                } catch (e) {
                    console.log(e)
                }
            },
        ]

    },
    {
        path: '/validate',
        method: 'get',
        handler: [
            async (req: Request, res: Response, next: NextFunction) => {
                try {
                    const result = await checkValidate(req.query.code)
                    res.redirect(result)
                } catch (e) {
                    console.log(e)
                }
            },
        ]

    },
    {
        path: '/verifyToken',
        method: 'get',
        handler: [
            async (req: Request, res: Response, next: NextFunction) => {
                try {
                    const result :any= await check(req.headers.authorization)
                    res.status(result.status).json( result.message );
                } catch (e) {
                    console.log(e)
                }
            }
           
        ],
    }
    
  
]
