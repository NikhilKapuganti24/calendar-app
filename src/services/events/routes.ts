
import { Request, Response, NextFunction } from 'express';
import { createEvent, deleteEvent, getAllEvents, getEvent, updateEvent } from "./eventController";
import { checkUserSession } from '../../utils/general';
import multer from 'multer';
import fs from 'fs';
import path from 'path';


interface AuthenticatedRequest extends Request {
    user?: {
        id: string;
        email: string;
        accessToken: string;
    };
}
// Ensure the temporary directory exists
const tempDir = path.join(__dirname, 'temp');
if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir);
}

// Configure multer to save files to the temporary directory
const upload = multer({ dest: tempDir });
const uploadMultiple = upload.array('files', 20)


export default [
    {
        path: '/create/event',
        method: 'post',
        handler: [
            checkUserSession,
            uploadMultiple,
            async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
                try {
                    const { name, summary, startDate, endDate, description, redirectUrl, recurrence, emails, } = req.body;
                    //const parsedEmails = JSON.parse(emails);
                    const files = req.files;
                    const driveFileIds = Array.isArray(req.body.driveFileId) ? req.body.driveFileId : [req.body.driveFileId].filter(Boolean);

    console.log("Received data:", req.body);
    console.log("Received files:", files);
    console.log("Received Drive file IDs:", driveFileIds);
                    const body = {
                      redirectUrl,
                      description,
                      summary,
                      startDate,
                      endDate,
                      emails: emails, // Assuming emails are sent as a JSON string
                      recurrence,
                      driveFileIds,
                      files, // Pass the array of files
                    };
                
                    const result = await createEvent(body, req.user?.accessToken);
                    res.status(200).json(result);
                } catch (error) {
                    console.error(error);
                    res.status(500).json({ message: 'Error creating event' });
                }
            },
        ],
    },
    {
        path: '/events/getall',
        method: 'get',
        handler: [
            checkUserSession,
            async (req: Request, res: Response, next: NextFunction) => {
                try {
                    const result = await getAllEvents()
                    res.status(200).json(result);
                } catch (e) {
                    console.log(e)
                }
            },
        ]

    },
    {
        path: '/event/:eventId/get',
        method: 'get',
        handler: [
            checkUserSession,
            async (req: Request, res: Response, next: NextFunction) => {
                try {
                    const result = await getEvent(req.params.eventId)
                    res.status(200).json(result);
                } catch (e) {
                    console.log(e)
                }
            },
        ]

    },
    {
        path: '/event/:eventId/delete',
        method: 'delete',
        handler: [
            checkUserSession,
            async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
                try {
                    const result = await deleteEvent(req.params.eventId, req.user?.accessToken)
                    res.status(200).json(result);
                } catch (e) {
                    console.log(e)
                }
            },
        ]

    },
    {
        path: '/event/:eventId/update',
        method: 'post',
        handler: [
            checkUserSession,
            async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
                try {
                    const result = await updateEvent(req.params.eventId, req.body, req.user?.accessToken)
                    res.status(200).json(result);
                } catch (e) {
                    console.log(e)
                }
            },
        ]

    }

]
