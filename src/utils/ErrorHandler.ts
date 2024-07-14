import { Response, NextFunction } from 'express';
import { HTTPClientError, HTTP404Error } from '../utils/httpErrors';

export const notFoundError = () => {
  throw new HTTP404Error('Method not found.');
};

export const clientError = (err: Error, res: Response, next: NextFunction) => {
  if (err instanceof HTTPClientError) {
    let { message, statusCode } = err;
    console.log({
      message,
    });
    res.status(statusCode).send(message);
  } else {
    next(err);
  }
};

export const serverError = (err: Error, res: Response, next: NextFunction) => {
  if (process.env.NODE_ENV === 'production') {
    res.status(500).send('Internal Server Error');
  } else {
    console.log({
      err,
    });
    res.status(500).send(err.stack);
  }
};
