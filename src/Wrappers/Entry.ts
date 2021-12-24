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

    static async findById({id} : Types.Entry.Params.findById) : Promise<Entry | null>{

        try{
            const entryData = await conn.oneOrNone(entryQueries.findById, [id])
            if(entryData == null)
                return null
            
            const sections = await Entry.getSections({id: id, flat: false})
            
            return new Entry(id, entryData.title, entryData.tags, entryData.pos_index, entryData.icon, entryData.category_id, sections == null ? undefined : sections)
        }catch(err: unknown){
            throw new Exception("Failed to find entry!", Types.ExceptionType.SQLError, HttpStatus.INTERNAL_SERVER_ERROR, err as Error)
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

    static async getSections({id, flat=true} : Types.Entry.Params.getSections): Promise<Section[] | number[] | null>{
        const exists = await Entry.exists({id: id})
        if(!exists) 
            throw new Exception("No entry with provided id found!", Types.ExceptionType.ParameterError, HttpStatus.NOT_FOUND)
        
        try{
            const queryData = [id]
            const sections_data = await conn.manyOrNone(entryQueries.getSections, queryData)

            if (sections_data == null)
                return null

            const sections: Section[] | number[] = []
            for (const section_data of sections_data){
                sections.push(flat? section_data.id : await Section.findById({id: section_data.id}))
            }
            
            return sections

        }catch(err: unknown){
            throw new Exception("Failed to get sections of entry!", Types.ExceptionType.ParameterError, HttpStatus.INTERNAL_SERVER_ERROR)
        }
    }

    static async deleteById({id, transaction} : Types.Entry.Params.deleteById) : Promise<void>{
        const exists = await Entry.exists({id: id})
        if(!exists) 
            throw new Exception("No entry with provided id found!", Types.ExceptionType.ParameterError, HttpStatus.NOT_FOUND)

        //Atomicity needed here
        await conn.tx(async (tx)=>{
            transaction = transaction ? transaction : tx
            const sections_id = await Entry.getSections({id: id}) as number[]

            for(const section_id of sections_id)
                await Section.deleteById({id: section_id, transaction: transaction})
            
            await transaction!.none(entryQueries.deleteById, [id])
        })
    }

    //TODO: addSection()
    //TODO: removeSection()
    //TODO: repositionSection()
    //TODO: moveSection()


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