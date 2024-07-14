import * as mongo from 'mongodb';
import dotenv from 'dotenv';


dotenv.config();

const { DATABASE_URL } = process.env;

let mongoDbCLient = mongo.MongoClient;
let connectionObj:any;

const handle = (promise:any) => {
    return promise
      .then((data:mongo.MongoClient) => ([data, undefined]))
      .catch((error:any) => Promise.resolve([undefined, error]));
}

const connectDB = async () => {
    console.log('connecting to DB')
    let [connection, connectionErr] = await handle(mongoDbCLient.connect(`${DATABASE_URL}`));
    if(connectionErr){
        console.log(`Could not connect to MONGODB`);
    } else{
        connectionObj = connection;
        console.log(`MONGODB Client Connected`);
    }
};

export { connectDB, connectionObj  };