
import { Request, Response, NextFunction } from 'express';
import { createEvent, deleteEvent, getAllEvents, getEvent, updateEvent } from "./eventController";
import { checkUserSession } from '../../utils/general';

interface AuthenticatedRequest extends Request {
    user?: {
        id: string;
        email: string;
        accessToken: string;
    };
}


export default [
    {
        path: '/create/event',
        method: 'post',
        handler: [
            checkUserSession,
            async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
                try {
                    const result = await createEvent(req.body, req.user?.accessToken);
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
                    const result = await deleteEvent(req.params.eventId,req.user?.accessToken)
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
                    const result = await updateEvent(req.params.eventId, req.body,req.user?.accessToken)
                    res.status(200).json(result);
                } catch (e) {
                    console.log(e)
                }
            },
        ]

    }

]
