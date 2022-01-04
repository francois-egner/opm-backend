import { Types } from "../Types"
import { connection as conn, entryQueries, sectionQueries } from "../Sql"
import { checkForUndefined, formatString } from "../Utils/Shared"
import { Exception } from "../Utils/Exception"
import HttpStatus from 'http-status-codes'
import { Section } from '../Wrappers/Section'
import { Group } from "./Group"

const propertyNames = ["name", "tags", "pos_index", "icon", "group_id"]
     
export class Entry{

    private _id: number

    private _name: string

    private _tags: string[]

    private _pos_index: number

    private _icon: string

    private _sections: Section[] | number[] = []

    private _group_id: number

    constructor(id: number, title: string, tags: string[], pos_index: number, icon: string,  group_id: number, sections?: Section[] | number[]){
        this._id = id
        this._name = title
        this._tags = tags
        this._pos_index = pos_index
        this._group_id = group_id
        if(sections)
            this._sections = sections
        this._icon = icon
    }


    
    static async create({title, tags, icon, transaction} : Types.Entry.Params.create): Promise<Entry>{
        if (!checkForUndefined({title, tags})) throw new Exception("Failed to create new entry. At least one argument is undefined!", Types.ExceptionType.ParameterError, HttpStatus.BAD_REQUEST)

        const queryObject = transaction ? transaction : conn

        try{
            const queryData = [title, tags, icon]
            const entryData = await queryObject.one(entryQueries.create, queryData)

            return new Entry(entryData.id, entryData.name, entryData.tags, entryData.pos_index, entryData.icon, entryData.group_id)
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
            
            return new Entry(id, entryData.name, entryData.tags, entryData.pos_index, entryData.icon, entryData.group_id, sections == null ? undefined : sections)
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
        // const exists = await Entry.exists({id: id})
        const entry = await Entry.findById({id: id})
        if(entry == null) 
            throw new Exception("No entry with provided id found!", Types.ExceptionType.ParameterError, HttpStatus.NOT_FOUND)

        //Atomicity needed here
        await conn.tx(async (tx)=>{
            transaction = transaction ? transaction : tx

            await Group.removeEntry({id: entry.group_id, entry_id: id, transaction: transaction})

            const sections_id = await Entry.getSections({id: id}) as number[]

            for(const section_id of sections_id)
                await Section.deleteById({id: section_id, transaction: transaction})
            
            await transaction!.none(entryQueries.deleteById, [id])
        })
    }
    
    
    static async addSection({id, section, pos_index, transaction} : Types.Entry.Params.addSection) : Promise<void>{
        const entry = await Entry.findById({id: id})

        if(entry == null)
            throw new Exception("Entry to add section to was not found!", Types.ExceptionType.ParameterError, HttpStatus.BAD_REQUEST)

        const sections_count = entry!.sections.length

        if(!pos_index)
            pos_index = sections_count

        if(pos_index < 0 || pos_index > sections_count) 
            throw new Exception("Target position invalid!", Types.ExceptionType.ParameterError, HttpStatus.BAD_REQUEST)

        await conn.tx(async (tx)=>{
            transaction = transaction ? transaction : tx
                
            for (const section of entry!.sections as Section[]){
                if(section.pos_index >= pos_index!)
                    await Section.setProperty({id: section.id, property_name:"pos_index", new_value:section.pos_index+1, transaction: transaction})
                
                    //await Section.setPosition({id: section.id, new_pos: section.pos_index+1, transaction: transaction})
            }
            
            await Section.setProperty({id: section.id, property_name: "entry_id", new_value: id, transaction: transaction})
            await Section.setProperty({id: section.id, property_name:"pos_index", new_value:pos_index!, transaction:transaction})
            // await Section.setEntry({id: section.id, new_entry_id: id, transaction: transaction})
            // await Section.setPosition({id: section.id, new_pos: pos_index!, transaction: transaction})
        })
    }

    static async removeSection({id, section_id, del=false, transaction} : Types.Entry.Params.removeSection) : Promise<void>{
        const sections = await Entry.getSections({id: id, flat: false}) as Section[]
        const section_to_remove = await Section.findById({id: section_id})

        if(section_to_remove == null)
            throw new Exception("Unable to find Section with provided id!", Types.ExceptionType.ParameterError, HttpStatus.NOT_FOUND)
        
        const found_element = sections.filter((element)=> element.id === section_id)
        if(found_element.length == 0)
            throw new Exception("Could not find section in given section!", Types.ExceptionType.ParameterError, HttpStatus.NOT_FOUND)
        
        
        await conn.tx(async (tx)=>{
            transaction = transaction ? transaction : tx

            for(const section of sections){
                if(section.pos_index > section_to_remove.pos_index)
                    await Section.setProperty({id: section.id, property_name: "pos_index", new_value: section.pos_index-1, transaction: transaction})   
                
            }

            if(del)
                await Section.deleteById({id: section_id, transaction: transaction})
        })
    }

    static async repositionSection({id, section_id, new_pos, transaction} : Types.Entry.Params.repositionSection) : Promise<void>{
        const sections = await Entry.getSections({id: id, flat: false}) as Section[]
        const section_to_reposition = await Section.findById({id: section_id})

        if(new_pos < 0 || new_pos >= sections.length)
            throw new Exception("Target position invalid!", Types.ExceptionType.ParameterError, HttpStatus.BAD_REQUEST)

        
        if(section_to_reposition == null)
            throw new Exception("Element to be moved not found!", Types.ExceptionType.ParameterError, HttpStatus.NOT_FOUND)
        
        await conn.tx(async (tx)=>{
            transaction = transaction ? transaction : tx

            for (const section of sections){
                if((section.pos_index <= new_pos) && (section.pos_index > section_to_reposition.pos_index)){
                    await Section.setProperty({id: section.id, property_name:"pos_index", new_value:section.pos_index-1, transaction: transaction})
                    // await Section.setPosition({id: section.id, new_pos: section.pos_index-1, transaction: transaction})
                }
            }
            await Section.setProperty({id: section_id, property_name:"pos_index", new_value:new_pos, transaction: transaction})
                    
            //await Section.setPosition({id: section_id, new_pos: new_pos, transaction: transaction})
        })
    }

    static async moveSection({id, section_id, new_entry_id, new_pos, transaction} : Types.Entry.Params.moveSection) : Promise<void>{
        const sections = await Entry.getSections({id: id, flat: false}) as Section[]
        const section_to_move = await Section.findById({id: section_id})

        if(section_to_move == null)
            throw new Exception("Could not find section with provided id!", Types.ExceptionType.ParameterError, HttpStatus.NOT_FOUND)

        const exists = await Entry.exists({id: new_entry_id})
        if(!exists)
            throw new Exception("Entry to move section to does not exist!", Types.ExceptionType.ParameterError, HttpStatus.NOT_FOUND)
        
        const found_section = sections.filter((element)=> element.id === section_id)
        if(found_section.length == 0)
                throw new Exception("Section to be moved is not part of provided entry!", Types.ExceptionType.ParameterError, HttpStatus.NOT_FOUND)
        
        
        await conn.tx(async (tx)=>{

            transaction = transaction ? transaction : tx
            if(id === new_entry_id){
                if(!new_pos)
                    throw new Exception("New position must be defined when moving inside an entry!", Types.ExceptionType.ParameterError, HttpStatus.BAD_REQUEST)
                await Entry.repositionSection({id: id, section_id: section_id, new_pos: new_pos, transaction: transaction})
                return
            }
                
            await Entry.removeSection({id: id, section_id: section_id, transaction: transaction})
            await Entry.addSection({id: new_entry_id, section: section_to_move, pos_index: new_pos, transaction: transaction})
            
        })
    }


    //#region Getters & Setters


    static async setProperty({id, property_name, new_value, transaction}: Types.Params.setProperty):Promise<void>{
        if(!propertyNames.includes(property_name))
            throw new Exception("Invalid property name provided!", Types.ExceptionType.ParameterError, HttpStatus.BAD_REQUEST)
        
        const exists = await Entry.exists({id: id})
        if(!exists)
            throw new Exception("Unable to find entry to change porperty of!", Types.ExceptionType.ParameterError, HttpStatus.NOT_FOUND)
        
        try{

            const queryObject = transaction ? transaction : conn

            const queryString = formatString(entryQueries.setProperty as string, property_name)
            const queryData = [id,  new_value]

            await queryObject.none(queryString, queryData)
        }catch(err: unknown){
            throw new Exception("Failed to change property of entry!", Types.ExceptionType.SQLError, HttpStatus.INTERNAL_SERVER_ERROR, err as Error)
        }
    }

    get id(): number{
        return this._id
    }

    get name(): string{
        return this._name
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

    get group_id(): number{
        return this._group_id
    }

    //#endregion



}