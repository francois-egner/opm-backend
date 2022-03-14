import { entryQueries } from "../../db"
import {formatString, NULL} from "../Utils/Shared"
import { Exception } from "../Utils/Exception"
import HttpStatus from 'http-status-codes'
import { Section } from './Section'
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
    private readonly _id: number

    /**
     * Name of entry
     */
    private readonly _name: string

    /**
     * Array of tags of entry
     */
    private readonly _tags: string[]

    /**
     * Position (index) of entry inside associated group
     */
    private readonly _pos_index: number

    /**
     * Base64 encoded icon of entry
     */
    private readonly _icon: string

    /**
     * Array of section instances/ids that are part of the entry
     */
    private readonly _sections: Section[] | number[] = []

    /**
     * Unique identifier of the group the entry is part of
     */
    private readonly _group_id: number


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
     * @param group_id
     * @param pos_index
     * @param session - Associated session
     * @returns Instance of the newly created entry
     */

    public static async create(name, tags, icon, group_id, pos_index, session) : Promise<Entry>{
        
        const group = await Group.findById(group_id, NULL, NULL, session)

        if(group == null)
            throw new Exception("Group to add entry to not found!", Types.ExceptionType.ParameterError, HttpStatus.BAD_REQUEST)

        const entries_count = group!.entries.length

        if(!pos_index)
            pos_index = entries_count

        if(pos_index < 0 || pos_index > entries_count) 
            throw new Exception("Target position invalid!", Types.ExceptionType.ParameterError, HttpStatus.BAD_REQUEST)
                
        for (const entry of group!.entries as Entry[]){
            if(entry.pos_index >= pos_index!)
                await Entry.setProperty(entry.id, "pos_index", entry.pos_index+1, session)   
        }

        const queryData = [name, tags, icon, group_id, pos_index]
        const entryData = await session.one(entryQueries.create, queryData)

        return new Entry(entryData.m_id, entryData.name, entryData.tags, entryData.pos_index, entryData.icon, entryData.group_id)
        
    }



    /**
     * Fetches entry data of the entry with the provided id
     * @param id Unique identifier of entry to be found
     * @param session
     * @returns Instance of a found entry or null if no entry with provided id was found
     */

    public static async findById(id, session) : Promise<Entry | null>{
        try{
            const entryData = await session.oneOrNone(entryQueries.findById, [id])
            if(entryData == null)
                return null
            
            const sections = await Entry.getSections(id, false, session)
            
            return new Entry(id, entryData.name, entryData.tags, entryData.pos_index, entryData.icon, entryData.group_id, sections == null ? undefined : sections)
        }catch(err: unknown){
            throw new Exception("Failed to find entry!", Types.ExceptionType.SQLError, HttpStatus.INTERNAL_SERVER_ERROR, err as Error)
        }
    }

    

    /**
     * Checks if an entry with provided id does exist
     * @param id Unique identifier of entry to check existence of
     * @param session
     * @returns true if an entry with the provided id was found, else false
     */
    public static async exists(id, session) : Promise<boolean>{
        
        try{
            const existsData = await session.one(entryQueries.exists, [id]);
            return existsData.exists;
        }catch(err: unknown){
            throw new Exception("Failed to check for existence of entry!", Types.ExceptionType.SQLError, HttpStatus.INTERNAL_SERVER_ERROR, err as Error)
        }
    }



    /**
     * Fetches data of all sections associated to entry with provided id
     * @param id Unique identifier of entry to fetch sections from
     * @param flat If true, only ids of associated entries will be returne
     * @param session
     * @returns Array of Entry instances, ids of associated entries or null if no entry was founds
     */
    public static async getSections(id, flat=true, session) : Promise<Section[] | number[] | null>{
        const exists = await Entry.exists(id, session)
        if(!exists) 
            throw new Exception("No entry with provided id found!", Types.ExceptionType.ParameterError, HttpStatus.NOT_FOUND)
        
        try{
            const queryData = [id]
            const sections_data = await session.manyOrNone(entryQueries.getSections, queryData)

            if (sections_data == null)
                return null

            const sections: Section[] | number[] = []
            for (const section_data of sections_data){
                sections.push(flat? section_data.m_id : await Section.findById(section_data.m_id, session))
            }
            
            return sections

        }catch(err: unknown){
            throw new Exception("Failed to get sections of entry!", Types.ExceptionType.ParameterError, HttpStatus.INTERNAL_SERVER_ERROR)
        }
    }



    /**
     * Deletes an entry and all of its associated sections
     * @param id Unique identifier of entry to be deleted
     * @param session
     */

    public static async deleteById(id, session) : Promise<void>{
        const entry = await Entry.findById(id, session)
        if(entry == null) 
            throw new Exception("No entry with provided id found!", Types.ExceptionType.ParameterError, HttpStatus.NOT_FOUND)

        //Atomicity needed here
        
        await Group.removeEntry(entry.group_id, id, false, session)

        const sections_id = await Entry.getSections(id, NULL, session) as number[]
            
        for(const section_id of sections_id)
            await Section.deleteById(section_id, session)
            
            await session.none(entryQueries.deleteById, [id])
    }



    /**
     * Fetches the id or full objecct of user that owns the entry
     * @param id Unique identifier of entry to get owner of
     * @param [flat] If true, only id will be returned
     * @param session
     * @returns User object or user id
     */
    public static async getOwner(id, flat=true, session) : Promise<User|number>{
        const entry = await Entry.findById(id, session)

        if(entry == null)
            throw new Exception("No entry with provided id found!", Types.ExceptionType.ParameterError, HttpStatus.NOT_FOUND)
        
        return await Group.getOwner(entry.group_id, flat, session)
    }

    //#region Section management

    /**
     * Adds a section to an entry 
     * @param id Unique identifier of entry to add a section to
     * @param section Section to be added to entry
     * @param pos_index Position (index) to place new section to
     * @param [transaction] Transaction object for querying
    */
    public static async addSection(id, section, pos_index, session) : Promise<void>{
        const entry = await Entry.findById(id,session)

        if(entry == null)
            throw new Exception("Entry to add section to was not found!", Types.ExceptionType.ParameterError, HttpStatus.BAD_REQUEST)

        const sections_count = entry!.sections.length

        if(!pos_index)
            pos_index = sections_count

        if(pos_index < 0 || pos_index > sections_count) 
            throw new Exception("Target position invalid!", Types.ExceptionType.ParameterError, HttpStatus.BAD_REQUEST)

        for (const section of entry!.sections as Section[]){
            if(section.pos_index >= pos_index!)
                await Section.setProperty(section.id, "pos_index",section.pos_index+1,session)
        }
            
        await Section.setProperty(section.id, "entry_id",id, session)
        await Section.setProperty(section.id, "pos_index", pos_index!, session)

    }



    /**
     * Removes a section from an entry
     * @param id Unique identifier of entry to remove section from
     * @param section_id Unique identifier of section to be removed from entry
     * @param del if true, removed section will be deleted completly
     * @param session
     */
    public static async removeSection(id, section_id, del, session) : Promise<void>{
        const sections = await Entry.getSections(id, false, session) as Section[]
        const section_to_remove = await Section.findById(section_id, session)

        if(section_to_remove == null)
            throw new Exception("Unable to find Section with provided id!", Types.ExceptionType.ParameterError, HttpStatus.NOT_FOUND)
        
        const found_element = sections.filter((element)=> element.id === section_id)
        if(found_element.length == 0)
            throw new Exception("Could not find section in given section!", Types.ExceptionType.ParameterError, HttpStatus.NOT_FOUND)
        
        
        for(const section of sections){
            if(section.pos_index > section_to_remove.pos_index)
                await Section.setProperty(section.id, "pos_index", section.pos_index-1, session)   
        }

        if(del)
            await Section.deleteById(section_id, session)
        
    }



    /**
     * Repositions a section inside an entry
     * @param id Unique identifier of entry to reposition section of
     * @param section_id Unique identifier of section to reposition
     * @param new_pos_index Position (index) the section should be placed to
     * @param session
     */
    public static async repositionSection(id, section_id, new_pos_index, session) : Promise<void>{
        const sections = await Entry.getSections(id, false, session) as Section[]
        const section_to_reposition = await Section.findById(section_id, session)

        if(new_pos_index < 0 || new_pos_index >= sections.length)
            throw new Exception("Target position invalid!", Types.ExceptionType.ParameterError, HttpStatus.BAD_REQUEST)

        
        if(section_to_reposition == null)
            throw new Exception("Element to be moved not found!", Types.ExceptionType.ParameterError, HttpStatus.NOT_FOUND)
        
        for (const section of sections){
            if(section_to_reposition.pos_index < new_pos_index){
                if(section.pos_index > section_to_reposition.pos_index && section.pos_index <= new_pos_index)
                    await Section.setProperty(section.id, "pos_index", section.pos_index-1, session)    
            }else{
                if(section.pos_index >= new_pos_index && section.pos_index < section_to_reposition.pos_index)
                    await Section.setProperty(section.id, "pos_index", section.pos_index+1, session)     
            }
        }
        
        await Section.setProperty(section_id, "pos_index", new_pos_index, session)
        
    }



    /**
     * @param id Unique identifier of entry to move section FROM
     * @param section_id Unique identifier of section to move
     * @param new_entry_id Unique identifier of entry to move section TO
     * @param [new_pos_index] Position (index) the section should be placed to in the new entry. Default: Last position
     * @param session
     */
    public static async moveSection(id, section_id, new_entry_id, new_pos_index, session) : Promise<void>{
        const sections = await Entry.getSections(id, false, session) as Section[]
        const section_to_move = await Section.findById(section_id, session)

        if(section_to_move == null)
            throw new Exception("Could not find section with provided id!", Types.ExceptionType.ParameterError, HttpStatus.NOT_FOUND)

        const exists = await Entry.exists(new_entry_id, session)
        if(!exists)
            throw new Exception("Entry to move section to does not exist!", Types.ExceptionType.ParameterError, HttpStatus.NOT_FOUND)
        
        const found_section = sections.filter((element)=> element.id === section_id)
        
        if(found_section.length == 0)
                throw new Exception("Section to be moved is not part of provided entry!", Types.ExceptionType.ParameterError, HttpStatus.NOT_FOUND)
        
        
        if(id === new_entry_id){
            if(!new_pos_index)
                throw new Exception("New position must be defined when moving inside an entry!", Types.ExceptionType.ParameterError, HttpStatus.BAD_REQUEST)
            
                await Entry.repositionSection(id, section_id, new_pos_index, session)
            return
        }
                
        await Entry.removeSection(id, section_id, NULL, session)
        await Entry.addSection(new_entry_id, section_to_move, new_pos_index, session)
            
        
    }

    //#endregion
    

    //#region Getters & Setters

    /**
     * Sets a new value for a object specific property.
     * @param id Unique identifier of entry to change a property from
     * @param property_name Name of property to change value of
     * @param new_value New value for provided property
     * @param session
     */
    public static async setProperty(id, property_name, new_value, session) : Promise<void>{
        if(!propertyNames.includes(property_name))
            throw new Exception("Invalid property name provided!", Types.ExceptionType.ParameterError, HttpStatus.BAD_REQUEST)
        
        const exists = await Entry.exists(id, session)
        if(!exists)
            throw new Exception("Unable to find entry to change property of!", Types.ExceptionType.ParameterError, HttpStatus.NOT_FOUND)
        
        try{


            const queryString = formatString(entryQueries.setProperty as string, property_name)
            const queryData = [id,  new_value]

            await session.none(queryString, queryData)
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