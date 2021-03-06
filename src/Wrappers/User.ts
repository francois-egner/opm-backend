import {Exception} from "../Utils/Exception"
import {formatString, isValidB64, NULL, Sleep} from "../Utils/Shared"
import HttpStatus from 'http-status-codes'
import {Group} from "./Group"
import crypto from "crypto"

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
    
    private readonly _public_key: string


    constructor(id: number, email: string, username: string, password_hash: string, role: Types.User.Role, forename: string, surname: string, display_name: string, enabled: boolean,
        creation_date: Date, root_id: number, profile_picture: string, last_login: Date, public_key: string){
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
        this._public_key = public_key
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

    static async create(email: string, username: string, password_hash: string, role: Types.User.Role, forename: string, surname: string, display_name: string, enabled=true, profile_picture: string, session: PrismaConnection): Promise<any>{
        if(await User.checkEmailExistence(email, session) || await User.checkUsernameExistence(username, session))
            throw new Exception("User with provided email or username already exists!", Types.ExceptionType.ParameterError, HttpStatus.BAD_REQUEST)
        try{
            const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', {
                modulusLength: 2048,
                publicKeyEncoding: {
                    type: 'spki',
                    format: 'pem'
                },
                privateKeyEncoding: {
                    type: 'pkcs8',
                    format: 'pem'
                }
            })
                        
            const root_group = await Group.create(`${username}_root`, NULL, NULL, NULL,true, session)
            
            const user_data = await session.users.create({
                data:{
                    email: email,
                    username: username,
                    password_hash: password_hash,
                    role: role,
                    forename: forename,
                    surname: surname,
                    display_name: display_name,
                    enabled: enabled,
                    profile_picture: profile_picture,
                    root_id: root_group.id,
                    creation_timestamp: Date.now(),
                    public_key: publicKey
                }
            })
            
            const user = new User(user_data.id, user_data.email, user_data.username, user_data.password_hash, user_data.role, user_data.forename, user_data.surname, user_data.display_name, user_data.enabled, new Date(Number(user_data.creation_timestamp)), 
                            user_data.root_id, user_data.profile_picture, new Date(Number(user_data.last_login)), publicKey)
            return {
                user_data: user,
                private_key: privateKey
            }
            
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
    static async findById(id: number, session: PrismaConnection) : Promise<User|null>{
        
        try{
            const user_data = await session.users.findUnique({
                where:{
                    id: id
                }
            })
            
            if(user_data == null)
                return null
            
            
            return new User(id, user_data.email, user_data.username, user_data.password_hash, user_data.role, user_data.forename, user_data.surname,
                user_data.display_name, user_data.enabled, new Date(Number(user_data.creation_timestamp)), user_data.root_id, user_data.profile_picture, new Date(Number(user_data.last_login)), user_data.public_key)
        
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
    static async findByEmail(email: string, password_hash: string, session: PrismaConnection) : Promise<User|null>{
        const user_id = await session.users.findFirst({
            where:{
                email: email,
                password_hash: password_hash
            },
            select:{
                id: true
            }
        })
        
        if(user_id == null)
            return null

        return await User.findById(user_id.id, session)
    }

    /**
     * Gets the role of a user
     * @param id
     * @param session
     */
    static async getRole(id: number, session: PrismaConnection) : Promise<Types.User.Role>{
        return await User.getProperty(id, ["role"], session)
    }
    
   /* static async deleteById(id: number, session: PrismaConnection): Promise<void> {
        try {
            const root_id = await User.getProperty(id, ["root_id"], session)
            await Group.deleteById(root_id, session)
            await session.users.delete({
                where: {
                    id: id
                }
            })
        } catch (err: unknown) {
            console.log(err)
            throw new Exception("Failed to delete user!", Types.ExceptionType.SQLError, HttpStatus.INTERNAL_SERVER_ERROR, err as Error)
        }
    }*/

    /**
     * Get any user attribute
     * @param id
     * @param property_names
     * @param session
     */
    static async getProperty(id: number, property_names: string[], session: PrismaConnection) : Promise<any[] | any>{
        try{
            const select_object = {}
            for(const property_name of property_names){
                Object.defineProperty(select_object, property_name, {value: true, writable: true, enumerable: true,
                    configurable: true})
            }
            
            const propertyData = await session.users.findMany({
                where:{
                    id: id
                },
                select:select_object
            })
            
            const return_data = []
            for(let index = 0; index < propertyData.length; index++){
                return_data.push(propertyData[index][property_names[index]])
            }
            return propertyData.length === 1 ? return_data[0] : return_data
        }catch(err: unknown){
            throw new Exception("Failed to fetch property!", Types.ExceptionType.SQLError, HttpStatus.INTERNAL_SERVER_ERROR, err as Error)
        }
    }



    static async getAllData(id: number, session: PrismaConnection) : Promise<Group>{
        
        const root_id= await User.getProperty(id, ["root_id"],session)

        return await Group.findById(root_id, -1, true, session)
    }
    

    /**
     * Deletes a user with provided id
     * @param id Unique identifier of user to be deleted
     * @param session Transaction object for querying
     */
    public static async deleteById(id: number, session: PrismaConnection) : Promise<void>{
        const root_id = await User.getProperty(id, ["root_id"], session)
        if(root_id == null)
            throw new Exception("User to be deleted not found!", Types.ExceptionType.ParameterError, HttpStatus.NOT_FOUND)
        
        try{    
            await Group.deleteById(root_id, session)
            await session.users.delete({
                where:{
                    id: id
                }
            })
            
        }catch(err: unknown){
            throw new Exception("Failed to delete user!", Types.ExceptionType.SQLError, HttpStatus.INTERNAL_SERVER_ERROR, err as Error)
        }
    }



    static async exists(id: number, session: PrismaConnection) : Promise<boolean>{
        try{
            const existsData = await session.users.findUnique({
                where:{
                    id: id
                }
            })
            return existsData != null
        }catch(err: unknown){
            throw new Exception("Failed to check user existence!", Types.ExceptionType.SQLError, HttpStatus.INTERNAL_SERVER_ERROR, err as Error)
        }
    }



    /**
     * Checks if a user with the provided email address exists
     * @param email E-mail address to be checked for
     * @param session
     */
    static async checkEmailExistence(email: string, session: PrismaConnection) : Promise<boolean>{
        try{
            const exists_data = await session.users.aggregate({
                _count:{
                    id: true
                },
                where:{
                    email: email
                }
            })
            
            return exists_data._count.id != 0
        }catch(err: unknown){
            throw new Exception("Failed to check for email existence!", Types.ExceptionType.SQLError, HttpStatus.INTERNAL_SERVER_ERROR, err as Error)
        }
    }



    /**
     * Check if a user with the provided username exists
     * @param username Username to be checked for
     * @param session
     */
    static async checkUsernameExistence(username: string, session: PrismaConnection) : Promise<boolean>{
        try{
            const exists_data = await session.users.aggregate({
                _count:{
                    id: true
                },
                where:{
                    username: username
                }
            })

            return exists_data._count.id != 0
        }catch(err: unknown){
            throw new Exception("Failed to check for username existence!", Types.ExceptionType.SQLError, HttpStatus.INTERNAL_SERVER_ERROR, err as Error)
        }
    }



    /**
     * Disabled users account
     * @param id Unique identifier of user to be disabled
     * @param session Transaction for querying
    */
    static async disable(id: number, session: PrismaConnection) : Promise<void>{
        await User.setProperty(id, "enabled", false, session)
    }



    /**
     * Enabled users account
     * @param id Unique identifier user to be enabled
     * @param session Transaction for querying
    */
    static async enable(id: number, session: PrismaConnection) : Promise<void>{
        await User.setProperty(id, "enabled", true,session)
    }


    static async changeProfilePicture(id: number, new_profile_picture: string, session: PrismaConnection) : Promise<void>{
        const exists = await User.exists(id, session)
        
        if(!exists)
            throw new Exception("User to change profile picture of not found!", Types.ExceptionType.ParameterError, HttpStatus.NOT_FOUND)
        
        if(!isValidB64(new_profile_picture))
            throw new Exception("Profile picture not a valid Base64 string!", Types.ExceptionType.ParameterError, HttpStatus.BAD_REQUEST)
        
        try{
            /*const queryData = [id, new_profile_picture]
            await session.none('UPDATE "User".users SET profile_picture=$2 WHERE id=$1;', queryData)*/
            await session.users.update({
                where:{
                    id: id
                },
                data:{
                    profile_picture: new_profile_picture
                }
            })
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
     * @param session
     */
    private static async setProperty(id: number, property_name: string, new_value: any, session: PrismaConnection) : Promise<void>{
        if(!propertyNames.includes(property_name))
            throw new Exception("Invalid property name provided!", Types.ExceptionType.ParameterError, HttpStatus.BAD_REQUEST)
        
        const exists = await User.exists(id, session)
        if(!exists)
            throw new Exception("Unable to find entry to change porperty of!", Types.ExceptionType.ParameterError, HttpStatus.NOT_FOUND)
        
        try{
            const update_data = {}
            Object.defineProperty(update_data, property_name, {value: new_value, writable: true, enumerable: true,
                configurable: true})

            await session.users.update({
                where:{
                    id: id
                },
                data: update_data
            })
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
    
    get public_key(): string{
        return this._public_key
    }
    //#endregion
}