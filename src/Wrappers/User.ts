import { Exception } from "../Utils/Exception"
import {  checkForUndefined, formatString, isValidB64, isValidEmail } from "../Utils/Shared"
import { connection as conn, connection, groupQueries, userQueries} from "../../db"
import HttpStatus from 'http-status-codes'
import { Group } from "./Group"

const propertyNames = ["email", "password_hash", "role", "forename", "surname", "display_name", "enabled", "profile_picture"]

export class User{

    private readonly _id: number

    private _email: string

    private readonly _username: string

    private _password_hash: string

    private _role: Types.User.Role

    private _forename: string

    private _surname: string

    private _display_name: string

    private _enabled: boolean

    private readonly _creation_date: Date

    private readonly _root_id: number

    private _profile_picture: string

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
     * @param transaction Transaction object for querying 
     * @returns Instance of newly created user
     */
    static async create({email, username, password_hash, role, forename, surname, display_name, enabled=false, profile_picture, transaction} : Params.User.create): Promise<User>{
        
        return transaction
        ? await User.create_private({email: email, username: username, password_hash: password_hash, role: role, forename: forename, 
                                    surname: surname, display_name: display_name, enabled: enabled, profile_picture: profile_picture, transaction: transaction})
        : await conn.tx(async (tx)=>{return await User.create_private({email: email, username: username, password_hash: password_hash, role: role, forename: forename, 
                                    surname: surname, display_name: display_name, enabled: enabled, profile_picture: profile_picture, transaction: tx})})
    }

    private static async create_private({email, username, password_hash, role, forename, surname, display_name, enabled=false, profile_picture, transaction} : Params.User.create): Promise<User>{
        try{
            const root_group = await Group.create({name: `${username}_root`, root: true, transaction: transaction})
                
            const queryData = [email, username, password_hash, role, forename, surname, display_name, enabled, profile_picture, root_group.id, Date.now() ]

            const userData = await transaction.one(userQueries.create, queryData)
            return new User(userData.id, userData.email, userData.username, userData.password_hash, userData.role, userData.forename, userData.surname, userData.display_name, userData.enabled, new Date(userData.creation_timestamp), 
                            userData.root_id, userData.profile_picture, new Date(userData.last_login))
            
        }catch(err: unknown){
            throw new Exception("Failed to create new user", Types.ExceptionType.SQLError, HttpStatus.INTERNAL_SERVER_ERROR, err as Error)
        }  
    }



    /**
     * Fetches user data
     * @param id Unique identifier of user to bef ound 
     * @returns User or null, if no user with provided id was found
     */
    static async findById({id, connection=conn} : Params.User.findById) : Promise<User|null>{
        try{
            const userData = await connection.oneOrNone(userQueries.findById, [id])
            if(userData == null)
                return null
            
                  
            return new User(id, userData.email, userData.username, userData.password_hash, userData.role, userData.forename, userData.surname,
                userData.display_name, userData.enabled, new Date(userData.creation_timestamp), userData.root_id, userData.profile_picture, new Date(userData.last_login))
        
        }catch(err: unknown){
            throw new Exception("Failed to find user!", Types.ExceptionType.SQLError, HttpStatus.INTERNAL_SERVER_ERROR, err as Error)
        }
    }

    static async findByEmail({email, password_hash, connection} :  Params.User.findByEmail) : Promise<User|null>{
        const user_id = await connection.oneOrNone(userQueries.findByEmail, [email, password_hash])
        
        if(user_id == null)
            return null

        return await User.findById({id: user_id.id, connection: connection})
    }

    static async getRole({id}: Params.User.getRole) : Promise<Types.User.Role>{
        return await User.getProperty({id: id, property_name: "role"})
    }

    static async getProperty({id, property_name} : Params.User.getProperty) : Promise<any>{
        try{
            const queryString = formatString(userQueries.getProperty, property_name)
            const propertyData = await conn.one(queryString, [id])
            console.log(propertyData[property_name])
        }catch(err: unknown){
            throw new Exception("Failed to fetch property!", Types.ExceptionType.SQLError, HttpStatus.INTERNAL_SERVER_ERROR, err as Error)
        }
    }

    

    /**
     * Deletes a user with provided id
     * @param id Unique identifier of user to be deleted
     * @param [transaction] Transaction object for querying
     */
    static async deleteById({id, transaction} : Params.User.deleteById) : Promise<void>{
       return await transaction 
       ? await User.deleteById_user({id: id, transaction: transaction})
       : conn.tx(async (tx)=>{ return await User.deleteById_user({id: id, transaction: tx})})

    }

    private static async deleteById_user({id, transaction} : Params.User.deleteById) : Promise<void>{
        const user = await User.findById({id: id, connection: transaction})
        if(user == null)
            throw new Exception("User to be deleted not found!", Types.ExceptionType.ParameterError, HttpStatus.NOT_FOUND)
        
        try{    
            await Group.deleteById({id: user.root_id, transaction: transaction})
            await transaction.none('DELETE FROM "User".users WHERE id=$1;', [id])
            
        }catch(err: unknown){
            throw new Exception("Failed to delete user!", Types.ExceptionType.SQLError, HttpStatus.INTERNAL_SERVER_ERROR, err as Error)
        }
    }



    static async exists({id, connection=conn} : Params.User.exists) : Promise<boolean>{
        try{
            const existsData = await connection.oneOrNone(userQueries.exists, [id])
            return existsData.exists
        }catch(err: unknown){
            throw new Exception("Failed to check user existence!", Types.ExceptionType.SQLError, HttpStatus.INTERNAL_SERVER_ERROR, err as Error)
        }
    }



    /**
     * Checks if a user with the provided email address exists
     * @param email E-mail address to be checked for
    */
    static async checkEmailExistence({email, connection=conn} : Params.User.checkEmailExistence) : Promise<boolean>{
        try{
            const queryData = [email]
            const existsData = await connection.one(userQueries.checkEmailExistence, queryData)
            return existsData.exists
        }catch(err: unknown){
            throw new Exception("Failed to check for email existence!", Types.ExceptionType.SQLError, HttpStatus.INTERNAL_SERVER_ERROR, err as Error)
        }
    }



    /**
     * Check if a user with the provided username exists
     * @param username Username to be checked for
    */
    static async checkUsernameExistence({username, connection= conn} : Params.User.checkUsernameExistence) : Promise<boolean>{
        try{
            const queryData = [username]
            const existsData = await connection.one(userQueries.checkUsernamExistence, queryData)
            return existsData.exists
        }catch(err: unknown){
            throw new Exception("Failed to check for username existence!", Types.ExceptionType.SQLError, HttpStatus.INTERNAL_SERVER_ERROR, err as Error)
        }
    }



    /**
     * Disabled users account
     * @param id Unique identifier of user to be disabled
     * @param [transaction] Transaction for querying
    */
    static async disable({id, transaction} : Params.User.disable) : Promise<void>{
        return transaction
        ? await User.disable_private({id: id, transaction: transaction})
        : await conn.tx(async (tx)=>{return await User.disable_private({id: id, transaction: tx})})
    }

    static async disable_private({id, transaction} : Params.User.disable) : Promise<void>{
        await User.setProperty({id: id, property_name:"enabled", new_value:false, connection: transaction})
    }



    /**
     * Enbaled users account
     * @param id Unique identifier user to be enabled
     * @param [transaction] Transaction for querying
    */
    static async enable({id, transaction} : Params.User.disable) : Promise<void>{
        return transaction
        ? await User.enable_private({id: id, transaction: transaction})
        : await conn.tx(async (tx)=>{return await User.enable_private({id: id , transaction: tx})})
    }

    static async enable_private({id, transaction} : Params.User.disable) : Promise<void>{
        await User.setProperty({id: id, property_name:"enabled", new_value:true, connection: transaction})
    }



    static async changeProfilePicture({id, new_profile_picture, transaction}: Params.User.changeProfilePicture) : Promise<void>{
        return transaction
        ? await User.changeProfilePicture_private({id: id, new_profile_picture: new_profile_picture, transaction: transaction})
        : await conn.task(async (task)=>{return await User.changeProfilePicture_private({id: id, new_profile_picture: new_profile_picture, transaction: task})})
    }

    static async changeProfilePicture_private({id, new_profile_picture, transaction}: Params.User.changeProfilePicture) : Promise<void>{
        const exists = await User.exists({id: id})
        
        if(!exists)
            throw new Exception("User to change profile picture of not found!", Types.ExceptionType.ParameterError, HttpStatus.NOT_FOUND)
        
        if(!isValidB64(new_profile_picture))
            throw new Exception("Profile picture not a valid Base64 string!", Types.ExceptionType.ParameterError, HttpStatus.BAD_REQUEST)
        
        try{
            const queryData = [id, new_profile_picture]
            await transaction.none('UPDATE "User".users SET profile_picture=$2 WHERE id=$1;', queryData)
        }catch(err: unknown){
            throw new Exception("Failed to change profile picture!", Types.ExceptionType.SQLError, HttpStatus.INTERNAL_SERVER_ERROR, err as Error)
        }
    }

    static async login({id, connection} : Params.User.login) : Promise<void>{
        const user = await User.findById({id: id, connection})

        if(user == null)
            throw new Exception("Failed to find user to be logged in!", Types.ExceptionType.ParameterError, HttpStatus.NOT_FOUND)
        
        if (!user.enabled)
            throw new Exception("User not permitted to login!", Types.ExceptionType.ParameterError, HttpStatus.FORBIDDEN)
        
        //Generate JWT
        
    }

    //#region Getters & Setters

    /**
     * Sets a new value for a object specific property.
     * @param id Unique identifier of entry to change a property from
     * @param property_name Name of property to change value of
     * @param new_value New value for provided property
     * @param [transaction] Transaction object for querying
     */
    static async setProperty({id, property_name, new_value, connection} : Params.setProperty) : Promise<void>{
        return connection
        ? await User.setProperty_private({id: id, property_name: property_name, new_value: new_value, connection: connection})
        : await conn.tx(async (tx)=>{return await User.setProperty_private({id: id, property_name: property_name, new_value: new_value, connection: tx})})
    }

    private static async setProperty_private({id, property_name, new_value, connection} : Params.setProperty) : Promise<void>{
        if(!propertyNames.includes(property_name))
            throw new Exception("Invalid property name provided!", Types.ExceptionType.ParameterError, HttpStatus.BAD_REQUEST)
        
        const exists = await User.exists({id: id, connection: connection})
        if(!exists)
            throw new Exception("Unable to find entry to change porperty of!", Types.ExceptionType.ParameterError, HttpStatus.NOT_FOUND)
        
        try{


            const queryString = formatString(userQueries.setProperty as string, property_name)
            const queryData = [id,  new_value]

            await connection.none(queryString, queryData)
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