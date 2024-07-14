import { Router } from 'express';
import cors from 'cors';

export const handleCors = (router: Router) => {
    let { CORS_DOMAIN } = process.env;
    let corsArray = CORS_DOMAIN?.split(",");
    console.log('corsArray',corsArray);
    router.use(cors({ credentials: true, origin: corsArray }));
  }