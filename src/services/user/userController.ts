import { createUserInDB, getSingleUserFromDb, getUserFromDb, updateUserDb } from "./userModel"

export const createUser = async  (req:any)=>{
    return await createUserInDB(req)
}

export const getUsers= async  ()=>{
    return await getUserFromDb()
}

export const getSingleUser= async  (id:any)=>{
    return await getSingleUserFromDb(id)
}

export const updateUser= async  (id:any,payload:any)=>{
    return await updateUserDb(id,payload)
}