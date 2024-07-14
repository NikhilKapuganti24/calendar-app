import { Router, Request, Response, NextFunction } from 'express';

type Wrapper = (router: Router) => void;

export const applyMiddleware = (
  middlewareWrappers: Wrapper[],
  router: Router,
) => {
  for (const wrapper of middlewareWrappers) {
    wrapper(router);
  }
};

type Handler = (
  req: Request,
  res: Response,
  next: NextFunction,
) => Promise<void> | void;

type Route = {
  path: string;
  method: string;
  handler: Handler | Handler[];
};
export const applyRoutes = (routes: Route[], router: Router) => {
  let basePath = process.env.BASE_PATH
  for (const route of routes) {
    let { method, path, handler } = route;
    path = `${path}`;
    console.log('routes',path);
    
    // Check if the handler is an array of functions
    if (Array.isArray(handler)) {
      // If it's an array, apply each handler in the array
      for (const fn of handler) {
        (router as any)[method](path, fn);
      }
    } else {
      // If it's a single function, directly apply it to the route
      (router as any)[method](path, handler);
    }
  }
};

