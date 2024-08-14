import { ObjectId } from "mongodb";
import { connectionObj } from "../../db/connection";

export const createUserInDB = async (body: any) => {
    try {
        await connectionObj.db('calendar').collection('user-signup').insertOne(body);
        return { status: 200, message: 'User created successfully' }; 
    } catch (error:any) {
        console.error("Signup Error:", error);
        return { status: 500, message: error.message }; 
    }
}




export const getUserFromDb = async () => {

    try {
      const existingStudent = await connectionObj.db('calendar').collection('user-signup').find({});
      return { status: 200, message: existingStudent };
    } catch (error: any) {
      console.error("Signup Error:", error);
      return { status: 500, message: error.message };
    }
  }


  export const getSingleUserFromDb = async (id:any) => {

    console.log("ss",id)
    try {
        const existingEmployee = await connectionObj.db('calendar').collection('user-signup').findOne({ _id: id });
      return { status: 200, message: existingEmployee };
    } catch (error: any) {
      console.error("Signup Error:", error);
      return { status: 500, message: error.message };
    }
  
  }
  export const updateUserDb = async (id:any,updatepayload:any) => {

    try {
      const filter = { _id: new ObjectId(id) }; 
      const update = updatepayload 
      const options = { new: true };
  
      const updatedStudent = await await connectionObj.db('calendar').collection('user-signup').findByIdAndUpdate(filter, update, options);
  
      if (!updatedStudent) {
        return { status: 404, message: 'Student not found' };
      }
      return { status: 200, message: 'Student updated successfully', data: updatedStudent };
    } catch (error: any) {
      console.error("Update Error:", error);
      return { status: 500, message: error.message }; 
    }
  
  }
  