import { Request, Response, NextFunction } from "express";
import { createUser, getUsers, getSingleUser, updateUser } from "./userController";

export default [
    {
        path: '/user/signup',
        method: 'post',
        handler: [
            async (req: Request, res: Response, next: NextFunction) => {
                try {
                    const result = await createUser(req.body);
                    res.status(result.status).json(result.message); // Set HTTP response status based on the result
                } catch (error) {
                    next(error);
                }
            },
        ],
    },
    {

        path: '/users/getall',
        method: 'get',
        handler: [

            async (req: Request, res: Response, next: NextFunction) => {
                try {
                    const result = await getUsers();
                    res.status(result.status).json(result.message); // Set HTTP response status based on the result
                } catch (error) {
                    next(error);
                }
            },
        ],
    },
    {
        path: '/user/:userId/get',
        method: 'get',
        handler: [

            async (req: Request, res: Response, next: NextFunction) => {
                try {
                    const result = await getSingleUser(req.params.userId);
                    res.status(result.status).json(result.message); // Set HTTP response status based on the result
                } catch (error) {
                    next(error);
                }
            },
        ],
    },
    {
        path: '/user/:userId/update',
        method: 'post',
        handler: [
            async (req: Request, res: Response, next: NextFunction) => {
                try {
                    const result = await updateUser(req.params.userId, req.body);
                    res.status(result.status).json(result.message); // Set HTTP response status based on the result
                } catch (error) {
                    next(error);
                }
            },
        ],
    }
]