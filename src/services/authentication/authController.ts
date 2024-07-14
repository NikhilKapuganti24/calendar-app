import { checkAuthinDB, checkValidateUser, checkValidateUserinDB } from "./authModel"

export const checkAuth = async () => {
    return await checkAuthinDB()
}

export const checkValidate = async (code: any) => {
    return await checkValidateUserinDB(code)
}


export const check = async (code: any) => {
    return await checkValidateUser(code)
}




