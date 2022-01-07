import { connection as conn, entryQueries } from "../../db"
import { checkForUndefined, formatString } from "../Utils/Shared"
import { Exception } from "../Utils/Exception"
import HttpStatus from 'http-status-codes'
import { Section } from '../Wrappers/Section'
import { Group } from "./Group"
import { User } from "./User"

/**
 * Property names that may be changed by calling setProperty()
 */
const propertyNames = ["name", "tags", "pos_index", "icon", "group_id"]

/**
 * An entry is part of a group. It represents a group of sections, furthermore an object to store information about.
 */
export class Entry{

    /**
     * Unique identifier of entry
     */
    private _id: number

    /**
     * Name of entry
     */
    private _name: string

    /**
     * Array of tags of entry
     */
    private _tags: string[]

    /**
     * Position (index) of entry inside associated group
     */
    private _pos_index: number

    /**
     * Base64 encoded icon of entry
     */
    private _icon: string

    /**
     * Array of section instances/ids that are part of the entry
     */
    private _sections: Section[] | number[] = []

    /**
     * Unique identifier of the group the entry is part of
     */
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


    /**
      * Creates a new entry
      * @param name Name of the new entry
      * @param tags Array of tags of the new entry
      * @param icon Base64 encoded icon of the new entry
      * @param [transaction] Transaction object for querying
      * @returns Instance of the newly created entry
     */
    static async create({name, tags, icon, group_id, pos_index, transaction} : Params.Entry.create) : Promise<Entry>{
        
        const group = await Group.findById({id: group_id})

        if(group == null)
            throw new Exception("Group to add entry to not found!", Types.ExceptionType.ParameterError, HttpStatus.BAD_REQUEST)

        const entries_count = group!.entries.length

        if(!pos_index)
            pos_index = entries_count

        if(pos_index < 0 || pos_index > entries_count) 
            throw new Exception("Target position invalid!", Types.ExceptionType.ParameterError, HttpStatus.BAD_REQUEST)

        return await conn.tx(async (tx)=>{
            transaction = transaction ? transaction : tx
                
            for (const entry of group!.entries as Entry[]){
                if(entry.pos_index >= pos_index!)
                    await Entry.setProperty({id: entry.id, property_name:"pos_index", new_value:entry.pos_index+1, transaction: transaction})   
            }

            const queryData = [name, tags, icon, group_id, pos_index]
            const entryData = await transaction.one(entryQueries.create, queryData)

            return new Entry(entryData.id, entryData.name, entryData.tags, entryData.pos_index, entryData.icon, entryData.group_id)
        })

        
    }

    /**
     * Fetches entry data of the entry with the provided id 
     * @param id Unique identifier of entry to be found
     * @returns Instance of a found entry or null if no entry with provided id was found
    */
    static async findById({id} : Params.Entry.findById) : Promise<Entry | null>{

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

    /**
     * Checks if an entry with provided id does exist
     * @param id Unique identifier of entry to check existence of
     * @returns true if an entry with the provided id was found, else false
    */
    static async exists({id} : Params.Entry.exists) : Promise<boolean>{
        
        try{
            const existsData = await conn.one(entryQueries.exists, [id]);
            return existsData.exists;
        }catch(err: unknown){
            throw new Exception("Failed to check for existence of entry!", Types.ExceptionType.SQLError, HttpStatus.INTERNAL_SERVER_ERROR, err as Error)
        }
    }

    /**
     * Fetches data of all sections associated to entry with provided id
     * @param id Unique identifier of entry to fetch sections from
     * @param flat If true, only ids of associated entries will be returne
     * @returns Array of Entry instances, ids of associated entries or null if no entry was founds  
    */
    static async getSections({id, flat=true} : Params.Entry.getSections) : Promise<Section[] | number[] | null>{
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

    /**
     * Deletes an entry and all of its associated sections
     * @param id Unique identifier of entry to be deleted
     * @param [transaction] Transaction object for querying
    */
    static async deleteById({id, transaction} : Params.Entry.deleteById) : Promise<void>{
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

    /**
     * Fetches the id or full objecct of user that owns the entry
     * @param id Unique identifier of entry to get owner of
     * @param [flat] If true, only id will be returned
     * @returns User object or user id
    */
     static async getOwner({id, flat=true} : Params.Group.getOwner) : Promise<User|number>{
        const entry = await Entry.findById({id: id})

        if(entry == null)
            throw new Exception("No entry with provided id found!", Types.ExceptionType.ParameterError, HttpStatus.NOT_FOUND)
        
        return await Group.getOwner({id: entry.group_id, flat: flat})
    }
    

    //#region Section management

    /**
     * Adds a section to an entry 
     * @param id Unique identifier of entry to add a section to
     * @param section Section to be added to entry
     * @param pos_index Position (index) to place new section to
     * @param [transaction] Transaction object for querying
    */
    static async addSection({id, section, pos_index, transaction} : Params.Entry.addSection) : Promise<void>{
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
            }
            
            await Section.setProperty({id: section.id, property_name: "entry_id", new_value: id, transaction: transaction})
            await Section.setProperty({id: section.id, property_name:"pos_index", new_value:pos_index!, transaction:transaction})
        })
    }

    /**
     * Removes a section from an entry 
     * @param id Unique identifier of entry to remove section from
     * @param section_id Unique identifier of section to be removed from entry
     * @param del if true, removed section will be deleted completly
     * @param [transaction] Transaction object for querying
    */
    static async removeSection({id, section_id, del=false, transaction} : Params.Entry.removeSection) : Promise<void>{
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

    /**
     * Repositions a section inside an entry
     * @param id Unique identifier of entry to reposition section of
     * @param section_id Unique identifier of section to reposition
     * @param new_pos_index Position (index) the section should be placed to
     * @param [transaction] Transaction object for querying
    */
    static async repositionSection({id, section_id, new_pos_index, transaction} : Params.Entry.repositionSection) : Promise<void>{
        const sections = await Entry.getSections({id: id, flat: false}) as Section[]
        const section_to_reposition = await Section.findById({id: section_id})

        if(new_pos_index < 0 || new_pos_index >= sections.length)
            throw new Exception("Target position invalid!", Types.ExceptionType.ParameterError, HttpStatus.BAD_REQUEST)

        
        if(section_to_reposition == null)
            throw new Exception("Element to be moved not found!", Types.ExceptionType.ParameterError, HttpStatus.NOT_FOUND)
        
        await conn.tx(async (tx)=>{
            transaction = transaction ? transaction : tx

            for (const section of sections){
                if((section.pos_index <= new_pos_index) && (section.pos_index > section_to_reposition.pos_index)){
                    await Section.setProperty({id: section.id, property_name:"pos_index", new_value:section.pos_index-1, transaction: transaction})
                }
            }
            await Section.setProperty({id: section_id, property_name:"pos_index", new_value:new_pos_index, transaction: transaction})
        })
    }

    /**
     * @param id Unique identifier of entry to move section FROM
     * @param section_id Unique identifier of section to move
     * @param new_entry_id Unique identifier of entry to move section TO
     * @param [new_pos_index] Position (index) the section should be placed to in the new entry. Default: Last position
     * @param [transaction] Transaction object for querying
    */
    static async moveSection({id, section_id, new_entry_id, new_pos_index, transaction} : Params.Entry.moveSection) : Promise<void>{
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
                if(!new_pos_index)
                    throw new Exception("New position must be defined when moving inside an entry!", Types.ExceptionType.ParameterError, HttpStatus.BAD_REQUEST)
                await Entry.repositionSection({id: id, section_id: section_id, new_pos_index, transaction: transaction})
                return
            }
                
            await Entry.removeSection({id: id, section_id: section_id, transaction: transaction})
            await Entry.addSection({id: new_entry_id, section: section_to_move, pos_index: new_pos_index, transaction: transaction})
            
        })
    }

    //#endregion
    

    //#region Getters & Setters

    /**
     * Sets a new value for a object specific property.
     * @param id Unique identifier of entry to change a property from
     * @param property_name Name of property to change value of
     * @param new_value New value for provided property
     * @param [transaction] Transaction object for querying
     */
    static async setProperty({id, property_name, new_value, transaction} : Params.setProperty) : Promise<void>{
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