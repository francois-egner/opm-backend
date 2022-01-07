import { Exception } from "../Utils/Exception"
import {  checkForUndefined, isValidEmail } from "../Utils/Shared"
import { connection as conn, userQueries} from "../../db"
import HttpStatus from 'http-status-codes'
import { Group } from "./Group"


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


    constructor(id: number, email: string, username: string, password_hash: string, role: Types.User.Role, forename: string, surname: string, display_name: string, enabled: boolean,
        creation_date: Date, root_id: number, profile_picture: string){
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
                
        try{              
            return await conn.tx(async (tx)=>{
                transaction = transaction ? transaction : tx

                const root_group = await Group.create({name: `${username}_root`, root: true, transaction: transaction})
                
                const queryData = [email, username, password_hash, role, forename, surname, display_name, enabled, profile_picture, root_group.id, Date.now() ]

                const userData = await transaction.one(userQueries.create, queryData)
                return new User(userData.id, userData.email, userData.username, userData.password_hash, userData.role, userData.forename, userData.surname, userData.display_name, userData.enabled, new Date(userData.creation_timestamp), userData.root_id, userData.profile_picture)
            })
        }catch(err: unknown){
            throw new Exception("Failed to create new user", Types.ExceptionType.SQLError, HttpStatus.INTERNAL_SERVER_ERROR, err as Error)
        }    
    }

    /**
     * Fetches user data
     * @param id Unique identifier of user to bef ound 
     * @returns User or null, if no user with provided id was found
     */
    static async findById({id} : Params.User.findById) : Promise<User|null>{
        try{
            const userData = await conn.oneOrNone(userQueries.findById, [id])
            if(userData == null)
                return null
            
                     
            return new User(id, userData.email, userData.username, userData.password_hash, userData.role, userData.forename, userData.surname,
                userData.display_name, userData.enabled, new Date(userData.creation_timestamp), userData.root_id, userData.profile_picture)
        
        }catch(err: unknown){
            throw new Exception("Failed to find user!", Types.ExceptionType.SQLError, HttpStatus.INTERNAL_SERVER_ERROR, err as Error)
        }
    }

    /**
     * Checks if a user with the provided email address exists
     * @param email E-mail address to be checked for
    */
    static async checkEmailExistence({email} : Params.User.checkEmailExistence) : Promise<boolean>{
        try{
            const queryData = [email]
            const existsData = await conn.one(userQueries.checkEmailExistence, queryData)
            return existsData.exists
        }catch(err: unknown){
            throw new Exception("Failed to check for email existence!", Types.ExceptionType.SQLError, HttpStatus.INTERNAL_SERVER_ERROR, err as Error)
        }
    }

    /**
     * Check if a user with the provided username exists
     * @param username Username to be checked for
    */
    static async checkUsernameExistence({username} : Params.User.checkUsernameExistence) : Promise<boolean>{
        try{
            const queryData = [username]
            const existsData = await conn.one(userQueries.checkUsernamExistence, queryData)
            return existsData.exists
        }catch(err: unknown){
            throw new Exception("Failed to check for username existence!", Types.ExceptionType.SQLError, HttpStatus.INTERNAL_SERVER_ERROR, err as Error)
        }
    }
    

    //#region Getters & Setters
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
    //#endregion
}