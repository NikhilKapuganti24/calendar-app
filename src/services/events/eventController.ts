import { createEventInDB, deleteEventFromDB, getAllEventsFromDB,  getEventFromDB,  updateEventInDB } from "./eventModel"


export const createEvent = async  (req:any,accessToke:any)=>{
    return await createEventInDB(req,accessToke)
}
export const getAllEvents = async  ()=>{
    return await getAllEventsFromDB()
}
export const getEvent = async  (id:any)=>{
    return await getEventFromDB(id)
}

export const deleteEvent = async  (id:any,token:any)=>{
    return await deleteEventFromDB(id,token)
}
export const updateEvent= async  (id:any,payload:any,token:any)=>{
    return await updateEventInDB(id,payload,token)
}
