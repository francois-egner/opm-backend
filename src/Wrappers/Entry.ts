import { Types } from "../Types"
import { connection as conn, entryQueries, sectionQueries } from "../Sql"
import { checkForUndefined } from "../Utils/Shared"
import { Exception } from "../Utils/Exception"
import HttpStatus from 'http-status-codes'
import { Section } from '../Wrappers/Section'


export class Entry{

    private _id: number

    private _title: string

    private _tags: string[]

    private _pos_index: number

    private _icon: string

    private _sections: Section[] | number[] = []

    private _category_id: number

    constructor(id: number, title: string, tags: string[], pos_index: number, icon: string,  category_id: number, sections?: Section[] | number[]){
        this._id = id
        this._title = title
        this._tags = tags
        this._pos_index = pos_index
        this._category_id = category_id
        if(sections)
            this._sections = sections
        this._icon = icon
    }


    
    static async create({title, tags, pos_index, category_id, icon, transaction} : Types.Entry.Params.create): Promise<Entry>{
        if (!checkForUndefined({title, tags})) throw new Exception("Failed to create new entry. At least one argument is undefined!", Types.ExceptionType.ParameterError, HttpStatus.BAD_REQUEST)

        const queryObject = transaction ? transaction : conn

        try{
            const queryData = [title, tags, pos_index, icon,category_id]
            const entryData = await queryObject.one(entryQueries.create, queryData)

            return new Entry(entryData.id, entryData.title, entryData.tags, entryData.pos_index, entryData.icon, entryData.category_id)
        }
        catch(err: unknown){
            throw new Exception("Failed to create new Entry!", Types.ExceptionType.SQLError, HttpStatus.INTERNAL_SERVER_ERROR, err as Error)
        }
    }

    static async exists({id} : Types.Entry.Params.exists): Promise<boolean>{
        
        try{
            const existsData = await conn.one(entryQueries.exists, [id]);
            return existsData.exists;
        }catch(err: unknown){
            throw new Exception("Failed to check for existence of entry!", Types.ExceptionType.SQLError, HttpStatus.INTERNAL_SERVER_ERROR, err as Error)
        }
    }


    //#region Getters & Setters
    get id(): number{
        return this._id
    }

    get title(): string{
        return this._title
    }

    get tags(): string[]{
        return this._tags
    }

    get pos_index(): number{
        return this._pos_index
    }

    get sections(): Section[] | number[]{
        return this._sections
    }

    get icon(): string{
        return this._icon
    }

    get category_id(): number{
        return this._category_id
    }
    //#endregion



}