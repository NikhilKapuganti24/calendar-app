import { Request, Response, NextFunction } from 'express';
import { check, checkAuth, checkValidate } from './authController';
import { google } from 'googleapis';
export default [

    {
        path: '/auth',
        method: 'get',
        handler: [
            async (req: Request, res: Response, next: NextFunction) => {
                try {
                    const result = await checkAuth();
                    res.redirect(result);
                } catch (e) {
                    res.status(500).send('Error during authentication');
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
                    const result = await checkValidate(req.query.code);
                    res.redirect(result);
                } catch (e) {
                    res.status(500).send('Error during validation');
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
                    const result: any = await check(req.headers.authorization)
                    res.status(result.status).json(result.message);
                } catch (e) {
                }
            }

        ],
    }


]
