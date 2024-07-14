import express from 'express'
import dotenv from 'dotenv';
import { initDependencies } from './db';
import { applyMiddleware, applyRoutes } from './utils';
import routes from './services';
import middleware from './middleware';



dotenv.config();



const app =express();
app.use(express.json());

applyMiddleware(middleware, app);
applyRoutes(routes, app);



const PORT=process.env.PORT


app.listen(PORT,async ()=>{
    await initDependencies()
console.log(`server started ${PORT}`)
})

