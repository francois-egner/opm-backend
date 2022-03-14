import {Exception} from "../Utils/Exception"
import {formatString, isValidB64, NULL} from "../Utils/Shared"
import {userQueries} from "../../db"
import HttpStatus from 'http-status-codes'
import {Group} from "./Group"

const propertyNames = ["email", "password_hash", "role", "forename", "surname", "display_name", "enabled", "profile_picture"]

export class User{

    private readonly _id: number

    private readonly _email: string

    private readonly _username: string

    private readonly _password_hash: string

    private readonly _role: Types.User.Role

    private readonly _forename: string

    private readonly _surname: string

    private readonly _display_name: string

    private readonly _enabled: boolean

    private readonly _creation_date: Date

    private readonly _root_id: number

    private readonly _profile_picture: string

    private readonly _last_login: Date


    constructor(id: number, email: string, username: string, password_hash: string, role: Types.User.Role, forename: string, surname: string, display_name: string, enabled: boolean,
        creation_date: Date, root_id: number, profile_picture: string, last_login: Date){
        this._id = id
        this._email = email
        this._password_hash = password_hash
        this._forename = forename
        this._surname = surname
        this._display_name = display_name
        this._role = role
        this._creation_date = creation_date
        this._root_id = root_id
        this._profile_picture = profile_picture
        this._username = username
        this._enabled = enabled
        this._last_login = last_login
    }

    /**
     * Creates a new user
     * @param email E-mail address of new user
     * @param username Username of new user
     * @param password_hash Hashed password of new user
     * @param forename Forename of new user
     * @param surname Surname of new user
     * @param role Role of new user
     * @param display_name Display name of new user
     * @param enabled If true, user may log in , else not 
     * @param profile_picture Base64 encoded profile picture
     * @param session - Associated session 
     * @returns Instance of newly created user
     */

    static async create(email, username, password_hash, role, forename, surname, display_name, enabled=false, profile_picture, session): Promise<User>{
        if(await User.checkEmailExistence(email, session) || await User.checkUsernameExistence(username, session))
            throw new Exception("User with provided email or username already exists!", Types.ExceptionType.ParameterError, HttpStatus.BAD_REQUEST)

        try{
            const root_group = await Group.create(`${username}_root`, NULL, NULL, NULL,true, session)
                            
            const queryData = [email, username, password_hash, role, forename, surname, display_name, enabled, profile_picture, root_group.id, Date.now() ]
            
            const userData = await session.one(userQueries.create, queryData)
            return new User(userData.id, userData.email, userData.username, userData.password_hash, userData.role, userData.forename, userData.surname, userData.display_name, userData.enabled, new Date(userData.creation_timestamp), 
                            userData.root_id, userData.profile_picture, new Date(userData.last_login))
            
        }catch(err: unknown){
            throw new Exception("Failed to create new user", Types.ExceptionType.SQLError, HttpStatus.INTERNAL_SERVER_ERROR, err as Error)
        }  
    }
    

    /**
     * Fetches user data
     * @param id Unique identifier of user to bef ound
     * @param session
     * @returns User or null, if no user with provided id was found
     */
    static async findById(id, session) : Promise<User|null>{
        try{
            const userData = await session.oneOrNone(userQueries.findById, [id])
            if(userData == null)
                return null
            
                  
            return new User(id, userData.email, userData.username, userData.password_hash, userData.role, userData.forename, userData.surname,
                userData.display_name, userData.enabled, new Date(userData.creation_timestamp), userData.root_id, userData.profile_picture, new Date(userData.last_login))
        
        }catch(err: unknown){
            throw new Exception("Failed to find user!", Types.ExceptionType.SQLError, HttpStatus.INTERNAL_SERVER_ERROR, err as Error)
        }
    }

    /**
     * Find a user identified by its email address and password/password hash
     * @param email
     * @param password_hash
     * @param session
     */
    static async findByEmail(email, password_hash, session) : Promise<User|null>{
        const user_id = await session.oneOrNone(userQueries.findByEmail, [email, password_hash])
        
        if(user_id == null)
            return null

        return await User.findById(user_id.id, session)
    }

    /**
     * Gets the role of a user
     * @param id
     * @param session
     */
    static async getRole(id, session) : Promise<Types.User.Role>{
        return await User.getProperty(id, ["role"], session)
    }

    /**
     * Get any user attribute
     * @param id
     * @param property_name
     * @param session
     */
    static async getProperty(id, property_name, session) : Promise<any[] | any>{
        try{

            let properties = property_name[0]
            for(let i = 1; i < property_name.length; i++)
                properties = `${properties}, ${property_name[i]}`
            
            const queryString = formatString(userQueries.getProperty, properties)
            const propertyData = await session.manyOrNone(queryString, [id])
            
            const returnData = []
            for(let index = 0; index < propertyData.length; index++){
                returnData.push(propertyData[index][property_name[index]])
            }

            return propertyData.length === 1 ? returnData[0] : returnData
        }catch(err: unknown){
            throw new Exception("Failed to fetch property!", Types.ExceptionType.SQLError, HttpStatus.INTERNAL_SERVER_ERROR, err as Error)
        }
    }



    static async getAllData(id, session) : Promise<Group>{
        
        const root_id= await User.getProperty(id, ["root_id"],session)

        return await Group.findById(root_id, -1, true, session)
    }
    

    /**
     * Deletes a user with provided id
     * @param id Unique identifier of user to be deleted
     * @param session Transaction object for querying
     */
    private static async deleteById_user(id, session) : Promise<void>{
        const user = await User.findById(id, session)
        if(user == null)
            throw new Exception("User to be deleted not found!", Types.ExceptionType.ParameterError, HttpStatus.NOT_FOUND)
        
        try{    
            await Group.deleteById(user.root_id, session)
            await session.none('DELETE FROM "User".users WHERE id=$1;', [id])
            
        }catch(err: unknown){
            throw new Exception("Failed to delete user!", Types.ExceptionType.SQLError, HttpStatus.INTERNAL_SERVER_ERROR, err as Error)
        }
    }



    static async exists(id, session) : Promise<boolean>{
        try{
            const existsData = await session.oneOrNone(userQueries.exists, [id])
            return existsData.exists
        }catch(err: unknown){
            throw new Exception("Failed to check user existence!", Types.ExceptionType.SQLError, HttpStatus.INTERNAL_SERVER_ERROR, err as Error)
        }
    }



    /**
     * Checks if a user with the provided email address exists
     * @param email E-mail address to be checked for
     * @param session
     */
    static async checkEmailExistence(email, session) : Promise<boolean>{
        try{
            const queryData = [email]
            const existsData = await session.one(userQueries.checkEmailExistence, queryData)
            
            return existsData.exists
        }catch(err: unknown){
            throw new Exception("Failed to check for email existence!", Types.ExceptionType.SQLError, HttpStatus.INTERNAL_SERVER_ERROR, err as Error)
        }
    }



    /**
     * Check if a user with the provided username exists
     * @param username Username to be checked for
     * @param session
     */
    static async checkUsernameExistence(username, session) : Promise<boolean>{
        try{
            const queryData = [username]
            const existsData = await session.one(userQueries.checkUsernameExistence, queryData)
            
            return existsData.exists
        }catch(err: unknown){
            throw new Exception("Failed to check for username existence!", Types.ExceptionType.SQLError, HttpStatus.INTERNAL_SERVER_ERROR, err as Error)
        }
    }



    /**
     * Disabled users account
     * @param id Unique identifier of user to be disabled
     * @param session Transaction for querying
    */
    static async disable(id, session) : Promise<void>{
        await User.setProperty(id, "enabled", false, session)
    }



    /**
     * Enabled users account
     * @param id Unique identifier user to be enabled
     * @param session Transaction for querying
    */
    static async enable(id, session) : Promise<void>{
        await User.setProperty(id, "enabled", true,session)
    }


    static async changeProfilePicture(id, new_profile_picture, session) : Promise<void>{
        const exists = await User.exists(id, session)
        
        if(!exists)
            throw new Exception("User to change profile picture of not found!", Types.ExceptionType.ParameterError, HttpStatus.NOT_FOUND)
        
        if(!isValidB64(new_profile_picture))
            throw new Exception("Profile picture not a valid Base64 string!", Types.ExceptionType.ParameterError, HttpStatus.BAD_REQUEST)
        
        try{
            const queryData = [id, new_profile_picture]
            await session.none('UPDATE "User".users SET profile_picture=$2 WHERE id=$1;', queryData)
        }catch(err: unknown){
            throw new Exception("Failed to change profile picture!", Types.ExceptionType.SQLError, HttpStatus.INTERNAL_SERVER_ERROR, err as Error)
        }
    }

   

    //#region Getters & Setters

    /**
     * Sets a new value for a object specific property.
     * @param id Unique identifier of entry to change a property from
     * @param property_name Name of property to change value of
     * @param new_value New value for provided property
     * @param [transaction] Transaction object for querying
     */
    private static async setProperty(id, property_name, new_value, session) : Promise<void>{
        if(!propertyNames.includes(property_name))
            throw new Exception("Invalid property name provided!", Types.ExceptionType.ParameterError, HttpStatus.BAD_REQUEST)
        
        const exists = await User.exists(id, session)
        if(!exists)
            throw new Exception("Unable to find entry to change porperty of!", Types.ExceptionType.ParameterError, HttpStatus.NOT_FOUND)
        
        try{


            const queryString = formatString(userQueries.setProperty as string, property_name)
            const queryData = [id, new_value]

            await session.none(queryString, queryData)
        }catch(err: unknown){
            throw new Exception("Failed to change property of entry!", Types.ExceptionType.SQLError, HttpStatus.INTERNAL_SERVER_ERROR, err as Error)
        }
    }



    get id(): number{
        return this._id
    }

    get email(): string{
        return this._email
    }

    get password_hash(): string{
        return this._password_hash
    }

    get role(): Types.User.Role{
        return this._role
    }

    get forename(): string{
        return this._forename
    }

    get surname(): string{
        return this._surname
    }

    get display_name(): string{
        return this._display_name
    }

    get creation_date(): Date{
        return this._creation_date
    }

    get enabled(): boolean{
        return this._enabled
    }

    get root_id(): number{
        return this._root_id
    }

    get profile_picture(): string{
        return this._profile_picture
    }

    get username(): string{
        return this._username
    }

    get last_login(): Date{
        return this._last_login
    }
    //#endregion
}