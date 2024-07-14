import { connectDB } from "./connection";


const initDependencies = async () => {
    await connectDB();
  
  };

  export { initDependencies };