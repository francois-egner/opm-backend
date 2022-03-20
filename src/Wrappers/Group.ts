
import {formatString, NULL} from "../Utils/Shared"
import { Exception } from "../Utils/Exception"
import HttpStatus from 'http-status-codes'
import { Entry } from "./Entry"
import { User } from "./User"
import {ITask} from "pg-promise";

/**
 * Property names that may be changed by calling setProperty()
 */
 const propertyNames = ["name", "pos_index", "icon", "supergroup_id"]


/**
 * A group is a collection of entries that are associated to a specific topic. It is possible to create subgroups to further
 * group subinformation
 */
export class Group{
    /**
     * Unique identifier of group
     */
    private readonly _id: number

    /**
     * Name/title of group
     */
    private readonly _name: string

    /**
     * Position (index) of group in a supergroup
     */
    private readonly _pos_index: number

    /**
     * Base64 encoded icon of group
     */
    private readonly _icon: string

    /**
     * Unique identifier of supergroup. If not set, the group is a root group
     */
    private readonly _supergroup_id: number

    /**
     * Entries that are associated to the group
     */
    private readonly _entries: Entry[] | number[] | null = []

    /**
     * All subgroups associated to the group
     */
    private readonly _subGroups: Group[] | number[] | null = []


    constructor(id: number, name: string, pos_index: number, icon: string, supergroup_id: number, subGroups?: Group[] | number[] | null, entries?: Entry[] | number[] | null){
        this._id = id
        this._name = name
        this._pos_index = pos_index
        this._icon = icon
        this._supergroup_id = supergroup_id
        if(subGroups)
            this._subGroups = subGroups
        
        if(entries)
            this._entries = entries
    }


    /**
     * Creates a new group
     * @param name Name of new group
     * @param [icon] Base64 encoded icon
     * @param supergroup_id Unique identifier of group that will be the supergroup of this group
     * @param pos_index
     * @param root
     * @param session Transaction object for querying
     * @returns Newly created group
     */
    static async create(name: string, icon: string, supergroup_id: number, pos_index: number, root: boolean, session: PrismaConnection){
        if(!root){
            
            const supergroup = await Group.findById(supergroup_id, NULL, NULL, session)

            if(supergroup == null)
                throw new Exception("Group to add subgroup to not found!", Types.ExceptionType.ParameterError, HttpStatus.BAD_REQUEST)

            const subgroups = await Group.getSubGroups(supergroup_id, false, NULL, session)
            

            if(pos_index === undefined){
                pos_index = subgroups.length
            }
                

            if(pos_index < 0 || pos_index > subgroups.length) 
                throw new Exception("Target position invalid!", Types.ExceptionType.ParameterError, HttpStatus.BAD_REQUEST)

            
            for (const subgroup of subgroups as Group[]){
                if(subgroup.pos_index >= pos_index!)
                    await Group.setProperty(subgroup.id,"pos_index", subgroup.pos_index+1, session)   
            }
        }
        

        
        const groupData = await session.groups.create({
            data:{
                name: name,
                icon: icon,
                supergroup_id: root ? -1 : supergroup_id,
                pos_index: root ? -1 : pos_index
            }
        })
        return new Group(groupData.id, groupData.name, groupData.pos_index, groupData.icon, groupData.supergroup_id)
    
    }

   

    /**
     * Checks if a group with provided id does exist
     * @param id Unique identifier of group to check existence for
     * @param session
     * @returns True if group with provided id exists, else false
     */
    static async exists(id: number, session: PrismaConnection) : Promise<boolean>{
        try{
            const exists_data = await session.groups.findUnique({
                where:{
                    id: id
                }
            })
            
            return exists_data != null
        }catch(err: unknown){
            throw new Exception("Failed to check for existence!", Types.ExceptionType.SQLError, HttpStatus.INTERNAL_SERVER_ERROR, err as Error)
        }
    }

    

    /**
     * Fetches all groups (subgroups) associated with the group identified by provided id
     * @param id Unique identifier of group to fetch subgroups from
     * @param [flat] If true, only group ids will be returned
     * @param full
     * @param session
     * @returns Array of group instances, ids of associated groups or null if no group was founds
     */
    private static async getSubGroups(id: number, flat = true, full=false, session: PrismaConnection) : Promise<Group[]|number[] | null>{
        const exists = await Group.exists(id, session)

        if(!exists)
                throw new Exception("Group to find subgroups from not found!", Types.ExceptionType.ParameterError, HttpStatus.NOT_FOUND)
        
        try{
            const groups_data = await session.groups.findMany({
                where:{
                    supergroup_id: id
                },
                select:{
                    id: true
                }
            })

            if(groups_data == null)
                return null
            
            const subGroups: Group[] | number[] = []
            for(const groupData of groups_data){
                const push_data = flat ? groupData.id : await Group.findById(groupData.id, null, full, session)
                subGroups.push(push_data as number & Group)
                
            }

            return subGroups
        }catch(err: unknown){
            throw new Exception("Failed to find subgroups!", Types.ExceptionType.SQLError, HttpStatus.INTERNAL_SERVER_ERROR, err as Error)
        }
    }



    /**
     * Fetches all entries associated with the group identified by provided provided id
     * @param id Unique identifier of group to fetch entries from
     * @param [flat] If true, only ids of entries will be returned
     * @param session
     * @returns Array of entry instances, ids of associated entries or null if no entry was founds
     */
    private static async getEntries(id: number, flat: boolean, session: PrismaConnection) : Promise<Entry[] | number[] | null>{
        const exists = await Group.exists(id, session)
            if(!exists)
            throw new Exception("Group to find entries of not found!", Types.ExceptionType.ParameterError, HttpStatus.NOT_FOUND)
        
            try{
                const entries_data = await session.entries.findMany({
                    where:{
                        group_id: id
                    },
                    select:{
                        id: true
                    }
                })

                if(entries_data == null)
                    return null
            
                const entries: Entry[] | number[] = []
                for(const entryData of entries_data){
                    const push_data = flat ? entryData.id : await Entry.findById(entryData.id,session)
                    entries.push(push_data as number & Entry) //Weird bug again, typecasting is necessary here for whatever reason
                    
                }

                return entries
            }catch(err: unknown){
                throw new Exception("Failed to find entries!", Types.ExceptionType.SQLError, HttpStatus.INTERNAL_SERVER_ERROR, err as Error)
            }
    }



    /**
     * Fetches group data of the group identified by provided id
     * @param id Unique identifier of group to be found
     * @param depth
     * @param full
     * @param session
     * @returns Group instance or null if no group with provided id was found
     */
    static async findById(id: number, depth=1, full=false, session: PrismaConnection) : Promise<Group|null>{
        try{
            const group_data = await session.groups.findUnique({
                where:{
                    id: id
                }
            })
            if(group_data == null)
                return null

            const subgroups = []
            
            if(depth > 0 || depth === -1){
                const subGroups_ids = await Group.getSubGroups(id, NULL, NULL, session) as number[]
                if(subGroups_ids != null){
                    for(const subgroup_id of subGroups_ids){
                        subgroups.push(await Group.findById(subgroup_id, depth === -1 ? -1 :depth-1, full, session))
                    }
                }

                
            }

            const entries = await Group.getEntries(id, !full, session)


            return new Group(id, group_data.name, group_data.pos_index, group_data.icon, group_data.supergroup_id, subgroups, entries)
                

        }catch(err: unknown){
            throw new Exception("Failed to fetch group data!", Types.ExceptionType.SQLError, HttpStatus.INTERNAL_SERVER_ERROR, err as Error)
        }
    }

    static async getSubCount(id: number, session: PrismaConnection) : Promise<number>{
        const exists = await Group.exists(id, session)

        if(!exists)
            throw new Exception("Group not found to get subgroup count from", Types.ExceptionType.ParameterError, HttpStatus.NOT_FOUND)
        
        try{
            const count_data = await session.groups.aggregate({
                _count:{
                    id: true
                }
            })
            
            return count_data._count.id
        }catch(err: unknown){
            throw new Exception("Failed to get subgroup count!", Types.ExceptionType.SQLError, HttpStatus.INTERNAL_SERVER_ERROR, err as Error)
        }
    }



    /**
     * Deletes a group and all of its associated groups and entries
     * @param id Unique identifier of group to be deleted
     * @param session - Associated session
     */
    static async deleteById(id: number, session: PrismaConnection) : Promise<void>{
        
        const group = await Group.findById(id, NULL, NULL, session)
        if(group == null)
            throw new Exception("Group to be deleted does not exist!", Types.ExceptionType.ParameterError, HttpStatus.NOT_FOUND)
        
        try{

            if(group.supergroup_id !== -1)
                await Group.removeGroup(group.supergroup_id, id, NULL, session)
                
            const entries_id = await Group.getEntries(id,true, session)

            for(const entry_id of entries_id as number[])
                await Entry.deleteById(entry_id, session)

            
            const subgroups_id = await Group.getSubGroups(id, NULL, NULL, session) as number[]
            

            for(const subgroup_id of subgroups_id)
                await Group.deleteById(subgroup_id, session)
            
                    
                
                
            await session.groups.delete({
                where:{
                    id: id
                }
            })

            
        }catch(err: unknown){
            throw new Exception("Failed to delete group!", Types.ExceptionType.SQLError, HttpStatus.INTERNAL_SERVER_ERROR, err as Error)
        }
    }
    

    //#region Entry management

    /**
     * Adds an entry to a group
     * @param id Unique identifier of group to add entry to
     * @param entry Entry to be added to group
     * @param pos_index Position (index) the entry should be place to. Default: Last position
     * @param session - Associated session
     */
    private static async addEntry (id: number, entry: Entry, pos_index: number, session: PrismaConnection) : Promise<void>{
        const group = await Group.findById(id, NULL, NULL, session)

        if(group == null)
            throw new Exception("Group to add entry to was not found!", Types.ExceptionType.ParameterError, HttpStatus.BAD_REQUEST)

        const entries_count = group.entries.length

        if(!pos_index)
            pos_index = entries_count

        if(pos_index < 0 || pos_index > entries_count) 
            throw new Exception("Target position invalid!", Types.ExceptionType.ParameterError, HttpStatus.BAD_REQUEST)

                
        for (const entry of group!.entries as Entry[]){
            if(entry.pos_index >= pos_index!)
                await Entry.setProperty(entry.id, "pos_index", entry.pos_index+1, session)   
        }
            
        await Entry.setProperty(entry.id, "group_id", id, session)
        await Entry.setProperty(entry.id, "pos_index", pos_index!, session)
        
    }



    /**
     * Removes an entry from a group
     * @param id Unique identifier of group to remove entry from
     * @param entry_id Unique identifier of entry to be removed from group
     * @param [del] If true, entry will be deleted completely
     * @param session
     */
    static async removeEntry(id: number, entry_id: number, del: boolean, session: PrismaConnection) : Promise<void>{
        const entries = await Group.getEntries(id, false, session) as Entry[]
        const entry_to_remove = await Entry.findById(entry_id, session)

        if(entry_to_remove == null)
            throw new Exception("Unable to find Entry with provided id!", Types.ExceptionType.ParameterError, HttpStatus.NOT_FOUND)
        
        const found_entry = entries.filter((element)=> element.id === entry_id)
        if(found_entry.length == 0)
            throw new Exception("Could not find entry in given group!", Types.ExceptionType.ParameterError, HttpStatus.NOT_FOUND)
        
        
        for(const entry of entries){
            if(entry.pos_index > entry_to_remove.pos_index)
                await Entry.setProperty(entry.id, "pos_index", entry.pos_index-1, session)   
        }

        if(del)
            await Entry.deleteById(entry_id, session)
         
    }



    /**
     * Repositions an element inside a group
     * @param id Unique identifier of group to reposition entry of
     * @param entry_id Unique identifier of entry to be repositioned
     * @param new_pos_index Position (index) the entry should be repositioned to
     * @param session
     */
    private static async repositionEntry(id: number, entry_id: number, new_pos_index: number, session: PrismaConnection) : Promise<void>{
        const entries = await Group.getEntries(id, false, session) as Entry[]
        const entry_to_move = await Entry.findById(entry_id, session)

        if(new_pos_index < 0 || new_pos_index >= entries.length)
            throw new Exception("Target position invalid!", Types.ExceptionType.ParameterError, HttpStatus.BAD_REQUEST)

        
        if(entry_to_move == null)
            throw new Exception("Entry to be moved not found!", Types.ExceptionType.ParameterError, HttpStatus.NOT_FOUND)
        
        

        for (const entry of entries){
            if(entry_to_move.pos_index < new_pos_index){
                if(entry.pos_index > entry_to_move.pos_index && entry.pos_index <= new_pos_index)
                    await Entry.setProperty(entry.id, "pos_index", entry.pos_index-1, session)    
            }else{
                
                if(entry.pos_index >= new_pos_index && entry.pos_index < entry_to_move.pos_index)
                    await Entry.setProperty(entry.id, "pos_index", entry.pos_index+1, session)     
            }
        }

        await Entry.setProperty(entry_id,"pos_index", new_pos_index,session)
        
    }    


    
    /**
     * Moves an entry from one group to another
     * @param id Unique identifier of group to move entry FROM
     * @param entry_id Unique identifier of entry to move
     * @param new_group_id Unique identifier of group to move entry TO
     * @param new_pos_index Position (index) to move entry to
     * @param session
     */
    private static async moveEntry(id: number, entry_id: number, new_group_id: number, new_pos_index: number, session: PrismaConnection) : Promise<void>{
        const entries = await Group.getEntries(id, false, session) as Entry[]
        const entry_to_move = await Entry.findById(entry_id, session)

        if(entry_to_move == null)
            throw new Exception("Could not find entry with provided id!", Types.ExceptionType.ParameterError, HttpStatus.NOT_FOUND)

        const exists = await Entry.exists(new_group_id, session)
        if(!exists)
            throw new Exception("Group to move entry to does not exist!", Types.ExceptionType.ParameterError, HttpStatus.NOT_FOUND)
        
        const found_entry = entries.filter((element)=> element.id === entry_id)
        if(found_entry.length == 0)
                throw new Exception("Entry to be moved is not part of provided group!", Types.ExceptionType.ParameterError, HttpStatus.NOT_FOUND)
        
        
        if(id === new_group_id){
            if(!new_pos_index)
                throw new Exception("New position must be defined when moving inside a group!", Types.ExceptionType.ParameterError, HttpStatus.BAD_REQUEST)
        
            await Group.repositionEntry(id, entry_id, new_pos_index, session)
            return
        }
                
        await Group.removeEntry(id, entry_id, false, session)
        await Group.addEntry(new_group_id, entry_to_move, new_pos_index, session)
            
    }
    //#endregion


    //#region Subgroup management

    /**
     * Adds a group (subgroup) to another one (supergroup)
     * @param id Unique identifier of group another group should be added to
     * @param group Group to be added to the supergroup
     * @param [pos_index] Position (index) the new subgroup should be positioned to
     * @param session
     */
    private static async addGroup(id: number, group: Group, pos_index: number, session: PrismaConnection) : Promise<void>{
        const supergroup = await Group.findById(id, NULL, NULL, session)

        if(supergroup == null)
            throw new Exception("Group to add subgroup to not found!", Types.ExceptionType.ParameterError, HttpStatus.BAD_REQUEST)

        const subgroups_count = supergroup!.subgroups.length

        if(pos_index === undefined)
            pos_index = subgroups_count

        if(pos_index < 0 || pos_index > subgroups_count) 
            throw new Exception("Target position invalid!", Types.ExceptionType.ParameterError, HttpStatus.BAD_REQUEST)

        
        for (const subgroup_id of supergroup!.subgroups as number[]){
            const subgroup_pos_index = await Group.getProperty(subgroup_id, ["pos_index"], session)
            
            if(subgroup_pos_index >= pos_index!)
                await Group.setProperty(subgroup_id, "pos_index", subgroup_pos_index+1, session)   
        }
            
        await Group.setProperty(group.id, "supergroup_id", id, session)
        await Group.setProperty(group.id, "pos_index", pos_index!, session)
        
    }
    


    /**
     * Removes a subgroup from its supergroup
     * @param id Unique identifier of group a subgroup should be removed from
     * @param subgroup_id Unique identifier of subgroup that should be removed
     * @param [del] If true, removed group will be deleted completely
     * @param session - Associated session
     */
    private static async removeGroup(id: number, subgroup_id: number, del: boolean, session: PrismaConnection) : Promise<void>{
        const subgroups = await Group.getSubGroups(id, false, NULL, session) as Group[]
        const group_to_remove = await Group.findById(subgroup_id, NULL, NULL, session)

        if(group_to_remove == null)
            throw new Exception("Unable to find subgroup with provided id!", Types.ExceptionType.ParameterError, HttpStatus.NOT_FOUND)
        
        const found_group = subgroups.filter((element)=> element.id === subgroup_id)
        if(found_group.length == 0)
            throw new Exception("Could not find subgroup in given group!", Types.ExceptionType.ParameterError, HttpStatus.NOT_FOUND)
        
        
        
        for(const subgroup of subgroups){
            if(subgroup.pos_index > group_to_remove.pos_index)
                await Group.setProperty(subgroup.id, "pos_index", subgroup.pos_index-1, session)   
        }

        if(del)
            await Group.deleteById(subgroup_id, session)
             
    }
    


    /**
     * Repositions a subgroup inside its supergroup
     * @param id Unique identifier of group a subgroup should be reposition of
     * @param subgroup_id Unique identifier of subgroup that should be repositioned
     * @param new_pos_index Position (index) the subgroup should be positioned to
     * @param session
     */

    private static async repositionGroup(id: number, subgroup_id: number, new_pos_index: number, session: PrismaConnection) : Promise<void>{
        const group_to_move = await Group.findById(subgroup_id, NULL, NULL, session)
        if(group_to_move == null)
            throw new Exception("Group to be moved not found!", Types.ExceptionType.ParameterError, HttpStatus.NOT_FOUND)
        
        const subgroups = await Group.getSubGroups(id, false, NULL, session) as Group[]
        
        if(new_pos_index < 0 || new_pos_index >= subgroups.length)
            throw new Exception("Target position invalid!", Types.ExceptionType.ParameterError, HttpStatus.BAD_REQUEST)

        
        for (const subgroup of subgroups){
            if(group_to_move.pos_index < new_pos_index){
                if(subgroup.pos_index > group_to_move.pos_index && subgroup.pos_index <= new_pos_index)
                    await Group.setProperty(subgroup.id, "pos_index", subgroup.pos_index-1, session)    
            }else{
                if(subgroup.pos_index >= new_pos_index && subgroup.pos_index < group_to_move.pos_index)
                    await Group.setProperty(subgroup.id, "pos_index", subgroup.pos_index+1, session)     
            }
        }
        
        await Group.setProperty(subgroup_id, "pos_index", new_pos_index, session)
        
    }



    /**
     * Moves a subgroup from one supergroup to another
     * @param id Unique identifier of group a subgroup should be moved FROM
     * @param subgroup_id Unique identifier of subgroupt that should be moved
     * @param new_supergroup_id Unique identifier of group a subgroup should be moved TO
     * @param new_pos_index Position (index) the subgroup should be positioned to in the new supergroup
     * @param session
     */
    private static async moveGroup(id: number, subgroup_id: number, new_supergroup_id: number, new_pos_index: number, session: PrismaConnection) : Promise<void>{
        const subgroups = await Group.getSubGroups(id, false, NULL, session) as Group[]
        const subgroup_to_move = await Group.findById(subgroup_id, NULL, NULL, session)

        if(subgroup_to_move == null)
            throw new Exception("Could not find subgroup with provided id!", Types.ExceptionType.ParameterError, HttpStatus.NOT_FOUND)

        const exists = await Group.exists(new_supergroup_id, session)
        if(!exists)
            throw new Exception("Supergroup to move subgroup to does not exist!", Types.ExceptionType.ParameterError, HttpStatus.NOT_FOUND)
        
        const found_subgroup = subgroups.filter((element)=> element.id === subgroup_id)
        if(found_subgroup.length == 0)
                throw new Exception("Group to be moved is not part of provided group!", Types.ExceptionType.ParameterError, HttpStatus.NOT_FOUND)
        
        
        if(id === new_supergroup_id){
            if(!new_pos_index)
                throw new Exception("New position must be defined when moving inside a group!", Types.ExceptionType.ParameterError, HttpStatus.BAD_REQUEST)
            await Group.repositionGroup(id, subgroup_id, new_pos_index,session)
            return
        }
                
        await Group.removeGroup(id, subgroup_id, NULL, session)
        await Group.addGroup(new_supergroup_id,subgroup_to_move, new_pos_index, session)
    }



    /**
     * Fetches the id or full objecct of user that owns the group
     * @param id Unique identifier of group to get owner of
     * @param [flat] If true, only id will be returned
     * @param session - Associated session
     * @returns User object or user id
     */
    static async getOwner(id: number, flat=true, session: PrismaConnection) : Promise<User|number>{
        const group = await Group.findById(id, NULL, NULL, session)
        if(group == null)
            throw new Exception("No group with provided id found!", Types.ExceptionType.ParameterError, HttpStatus.NOT_FOUND)
        
        let supergroup = await Group.findById(group.supergroup_id, NULL, NULL, session)

        while(supergroup.supergroup_id !== -1){
            supergroup = await Group.findById(supergroup.supergroup_id, NULL, NULL, session)
        }

        const user_data = await session.users.findFirst({
            where:{
                root_id: supergroup.id
            },
            select:{
                id: true
            }   
        
        })
        
        return flat ? user_data.id : await User.findById(user_data.id, session)
    }

    //#endregion

    //#region Getters & Setter

    /**
     * Sets a new value for a object specific property.
     * @param id Unique identifier of group to change a property from
     * @param property_name Name of property to change value of
     * @param new_value New value for provided property
     * @param session - Associated session
     */
    private static async setProperty(id: number, property_name: string, new_value: any, session: PrismaConnection) : Promise<void>{
        if(!propertyNames.includes(property_name))
            throw new Exception("Invalid property name provided!", Types.ExceptionType.ParameterError, HttpStatus.BAD_REQUEST)
        
        const exists = await Group.exists(id, session)
        if(!exists)
            throw new Exception("Group to change property of not found!", Types.ExceptionType.ParameterError, HttpStatus.NOT_FOUND)

        try{
            let update_data = {}
            Object.defineProperty(update_data, property_name, {value: new_value, writable: true, enumerable: true,
                configurable: true})

            await session.sections.update({
                where:{
                    id: id
                },
                data: update_data
            })

        }catch(err: unknown){
            throw new Exception("Failed to change property of group!", Types.ExceptionType.SQLError, HttpStatus.INTERNAL_SERVER_ERROR, err as Error)
        }
    }

    static async getProperty(id: number, property_names: string[], session: PrismaConnection) : Promise<any>{
        try{
            let select_object = {}
            for(const property_name of property_names){
                Object.defineProperty(select_object, property_name, {value: true, writable: true, enumerable: true,
                    configurable: true})
            }

            const propertyData = await session.groups.findMany({
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


    get id(): number{
        return this._id
    }

    get subgroups(): Group[] | number[]{
        return this._subGroups as Group[]
    }

    get entries(): Entry[]{
        return this._entries as Entry[]
    }

    get pos_index(): number{
        return this._pos_index
    }

    get supergroup_id(): number{
        return this._supergroup_id
    }

    get icon(): string{
        return this._icon
    }

    get name(): string{
        return this._name
    }

    //#endregion 
}