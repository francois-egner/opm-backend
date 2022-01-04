import { Exception } from "../Utils/Exception"
import {  checkForUndefined, isValidEmail } from "../Utils/Shared"
import { connection as conn, userQueries} from "../../Sql"
import HttpStatus from 'http-status-codes'


export class User{

    private _id: number

    private _email: string

    private _password_hash: string

    private _role: Types.User.Role

    private _forename: string

    private _surname: string

    private _display_name: string;


    constructor(id: number, email: string, password_hash: string, role: Types.User.Role, forename: string, surname: string, display_name: string){
        this._id = id
        this._email = email
        this._password_hash = password_hash
        this._forename = forename
        this._surname = surname
        this._display_name = display_name
        this._role = role
    }

    /**
     * Creates a new user
     * @param email E-mail address of the new user
     * @param password_hash Hashed password of new user
     * @param forename Forename of new user
     * @param surname Surname of new user
     * @param role Role of new user
     * @param display_name Displayed name
     * @param connection Task/Transaction for querying 
     * @returns Instance of newly created user
     */
    static async create({email, password_hash, role, forename, surname, display_name, connection = conn}:Types.User.Params.create): Promise<User>{
        //TODO: Add additional param validations
        if(!checkForUndefined({email, password_hash, role, forename, surname, display_name}) || !isValidEmail(email)){
            throw new Exception("One or many parameters are not valid!", Types.ExceptionType.ParameterError, HttpStatus.BAD_REQUEST)
        }
        
        try{              
            const queryData = [email,password_hash, role, forename, surname, display_name]
            const userData = await connection.one(userQueries.create, queryData)
            return new User(userData.id, userData.email, userData.password_hash, userData.role, userData.forename, userData.surname, userData.display_name)
        }catch(err: unknown){
            throw new Exception("Failed to create new user", Types.ExceptionType.SQLError, HttpStatus.INTERNAL_SERVER_ERROR, err as Error)
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
    //#endregion
}