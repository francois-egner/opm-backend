
import { connection as conn, groupQueries } from "../../db"
import {  formatString } from "../Utils/Shared"
import { Exception } from "../Utils/Exception"
import HttpStatus from 'http-status-codes'
import { Entry } from "./Entry"
import { User } from "./User"

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
    private _name: string

    /**
     * Position (index) of group in a supergroup
     */
    private _pos_index: number

    /**
     * Base64 encoded icon of group
     */
    private _icon: string

    /**
     * Unique identifier of supergroup. If not set, the group is a root group
     */
    private _supergroup_id: number

    /**
     * Entries that are associated to the group
     */
    private _entries: Entry[] | number[] | null = []

    /**
     * All subgroups associated to the group
     */
    private _subGroups: Group[] | number[] | null = []


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
     * @param owner_id Unique identifier of user that owns this group. Only set if the new group is a root group
     * @param [transaction] Transaction object for querying
     * @returns Newly created group
    */
    static async create({name, icon, supergroup_id, pos_index, root, transaction} : Params.Group.create){
        return transaction
        ? await Group.create_private({name: name, icon: icon, supergroup_id: supergroup_id, pos_index: pos_index, root: root, transaction: transaction})
        : await conn.tx(async (tx)=>{return await Group.create_private({name: name, icon: icon, supergroup_id: supergroup_id, pos_index: pos_index, root: root, transaction: tx})})
        
    }

    private static async create_private({name, icon, supergroup_id, pos_index, root, transaction} : Params.Group.create){
        if(!root){
            //TODO: Parameter validation (owner_id)
            //FIXME: Only retrieve id using getProperty to reduce overload
            const supergroup = await Group.findById({id: supergroup_id, connection: transaction})

            if(supergroup == null)
                throw new Exception("Group to add subgroup to not found!", Types.ExceptionType.ParameterError, HttpStatus.BAD_REQUEST)

            const subgroups = await Group.getSubGroups({id: supergroup_id, flat: false, connection: transaction})
            

            if(pos_index === undefined){
                pos_index = subgroups.length
            }
                

            if(pos_index < 0 || pos_index > subgroups.length) 
                throw new Exception("Target position invalid!", Types.ExceptionType.ParameterError, HttpStatus.BAD_REQUEST)

            
            for (const subgroup of subgroups as Group[]){
                if(subgroup.pos_index >= pos_index!)
                    await Group.setProperty({id: subgroup.id, property_name:"pos_index", new_value:subgroup.pos_index+1, connection: transaction})   
            }
        }
        

        const queryData = [name, icon, root ? -1 : supergroup_id, root ? -1 : pos_index]
        const groupData = await transaction.one(groupQueries.create, queryData)
        return new Group(groupData.id, groupData.name, groupData.pos_index, groupData.icon, groupData.supergroup_id)
    
    }

   

    /**
     * Checks if a group with provided id does exist
     * @param id Unique identifier of group to check existence for
     * @returns True if group with provided id exists, else false
    */
    static async exists({id, connection=conn} : Params.Group.exists) : Promise<boolean>{
        try{
            const queryData = [id]
            const existsData = await connection.one(groupQueries.exists, queryData);
            return existsData.exists;
        }catch(err: unknown){
            throw new Exception("Failed to check for existence!", Types.ExceptionType.SQLError, HttpStatus.INTERNAL_SERVER_ERROR, err as Error)
        }
    }

    

    /**
     * Fetches all groups (subgroups) associated with the group identified by provided id
     * @param id Unique identifier of group to fetch subgroups from
     * @param [flat] If true, only group ids will be returned
     * @returns Array of group instances, ids of associated groups or null if no group was founds  
    */
    static async getSubGroups({id, flat=true, full, connection} : Params.Group.getSubGroups) : Promise<Group[]|number[] | null>{
        return connection
        ? await this.getSubGroups_private({id: id, flat: flat, full:full, connection: connection})
        : await conn.task(async (task)=>{return await Group.getSubGroups_private({id: id, flat: flat, full:full, connection: task})})
    }

    private static async getSubGroups_private({id, flat, full, connection} : Params.Group.getSubGroups) : Promise<Group[]|number[] | null>{
        const exists = await Group.exists({id: id, connection: connection})

            if(!exists)
                throw new Exception("Group to find subgroups from not found!", Types.ExceptionType.ParameterError, HttpStatus.NOT_FOUND)
        
            try{
                const queryData = [id]
                const groupsData = await connection.manyOrNone(groupQueries.getSubGroups, queryData)

                if(groupsData == null)
                    return null
            
                const subGroups: Group[] | number[] = []
                for(const groupData of groupsData)
                    subGroups.push(flat ? groupData.id : await Group.findById({id: groupData.id, full: full, connection: connection}))

                return subGroups
            }catch(err: unknown){
                throw new Exception("Failed to find subgroups!", Types.ExceptionType.SQLError, HttpStatus.INTERNAL_SERVER_ERROR, err as Error)
            }
    }



    /**
     * Fetches all entries associated with the group identified by provided provided id
     * @param id Unique identifier of group to fetch entries from
     * @param [flat] If true, only ids of entries will be returned
     * @returns Array of entry instances, ids of associated entries or null if no entry was founds  
    */
    static async getEntries({id, flat=true, connection} : Params.Group.getEntries) : Promise<Entry[] | number[] | null>{
        
        return connection
        ? await Group.getEntries_private({id: id, flat: flat, connection: connection})
        : await conn.task(async (task)=>{return await this.getEntries_private({id: id, flat: flat, connection: task})})
        
        
    }

    private static async getEntries_private({id, flat, connection} : Params.Group.getEntries) : Promise<Entry[] | number[] | null>{
        const exists = await Group.exists({id: id, connection: connection})
            if(!exists)
            throw new Exception("Group to find entries of not found!", Types.ExceptionType.ParameterError, HttpStatus.NOT_FOUND)
        
            try{
                const queryData = [id]
                const entriesData = await connection.manyOrNone(groupQueries.getEntries, queryData)

                if(entriesData == null)
                    return null
            
                const entries: Entry[] | number[] = []
                for(const entryData of entriesData)
                    entries.push(flat ? entryData.id : await Entry.findById({id: entryData.id,connection: connection}))

                return entries
            }catch(err: unknown){
                throw new Exception("Failed to find entries!", Types.ExceptionType.SQLError, HttpStatus.INTERNAL_SERVER_ERROR, err as Error)
            }
    }



    /**
     * Fetches group data of the group identified by provided id 
     * @param id Unique identifier of group to be found
     * @returns Group instance or null if no group with provided id was found
    */
    static async findById({id, depth=1, full=false, connection} : Params.Group.findById) : Promise<Group|null>{
        return connection
        ? await Group.findById_private({id: id, depth: depth, full:full, connection: connection})
        : await conn.task(async (task)=>{return await Group.findById_private({id: id,depth: depth, full:full,  connection: task})})
       
    }

    private static async findById_private({id, depth,full, connection} : Params.Group.findById) : Promise<Group|null>{
        try{
            const queryData = [id]
            const groupData= await connection.oneOrNone(groupQueries.findById, queryData)
            if(groupData == null)
                return null

            const subgroups = []
            
            if(depth > 0 || depth === -1){
                const subGroups_ids = await Group.getSubGroups({id: id, connection: connection}) as number[]
                if(subGroups_ids != null){
                    for(const subgroup_id of subGroups_ids){
                        subgroups.push(await Group.findById({id: subgroup_id, depth: depth === -1 ? -1 :depth-1, full: full, connection: connection}))
                    }
                }

                
            }

            const entries = await Group.getEntries({id: id, flat: !full, connection: connection})


            return new Group(id, groupData.name, groupData.pos_index, groupData.icon, groupData.supergroup_id, subgroups, entries)
                

        }catch(err: unknown){
            throw new Exception("Failed to fetch group data!", Types.ExceptionType.SQLError, HttpStatus.INTERNAL_SERVER_ERROR, err as Error)
        }
    }

    static async getSubCount({id, connection=conn} : Params.Group.getSubCount) : Promise<number>{
        const exists = await Group.exists({id: id, connection: connection})

        if(!exists)
            throw new Exception("Group not found to get subgroup count from", Types.ExceptionType.ParameterError, HttpStatus.NOT_FOUND)
        
        try{
            const countData = await connection.one('SELECT COUNT(id) FROM "Category".groups WHERE supergroup_id = $1;', [id])
            return countData.count
        }catch(err: unknown){
            throw new Exception("Failed to get subgroup count!", Types.ExceptionType.SQLError, HttpStatus.INTERNAL_SERVER_ERROR, err as Error)
        }
    }



    /**
     * Deletes a group and all of its associated groups and entries
     * @param id Unique identifier of group to be deleted
     * @param [transaction] Transaction object for querying
    */
    static async deleteById({id, transaction} : Params.Group.deleteById) : Promise<void>{
        return transaction
        ? await Group.deleteById_private({id: id, transaction: transaction})
        : await conn.tx(async (tx)=>{return await Group.deleteById({id: id, transaction: tx}) })
    }

    private static async deleteById_private({id, transaction} : Params.Group.deleteById) : Promise<void>{
        const group = await Group.findById({id: id, connection: transaction})
        if(group == null)
            throw new Exception("Group to be deleted does not exist!", Types.ExceptionType.ParameterError, HttpStatus.NOT_FOUND)
        
        try{

            if(group.supergroup_id !== -1)
                await Group.removeGroup({id: group.supergroup_id, subgroup_id: id, transaction: transaction})
                
            const entries_id = await Group.getEntries({id: id, flat: true, connection: transaction})

            for(const entry_id of entries_id as number[])
                await Entry.deleteById({id: entry_id, transaction: transaction})

            
            const subgroups_id = await Group.getSubGroups({id: id, connection: transaction}) as number[]
            

            for(const subgroup_id of subgroups_id){
                await Group.deleteById({id: subgroup_id, transaction: transaction})
            }
                    
                
                
            await transaction!.none(groupQueries.deleteById, [id])

            
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
     * @param [transaction] Transaction object for querying
     */
    static async addEntry({id, entry, pos_index, transaction} : Params.Group.addEntry) : Promise<void>{
        return transaction
        ? await Group.addEntry_private({id: id, entry: entry, pos_index: pos_index, transaction: transaction})
        : await conn.tx(async (tx)=>{return await Group.addEntry_private({id: id, entry: entry, pos_index: pos_index, transaction: tx})})
    }

    private static async addEntry_private({id, entry, pos_index, transaction} : Params.Group.addEntry) : Promise<void>{
        const group = await Group.findById({id: id, connection: transaction})

        if(group == null)
            throw new Exception("Group to add entry to not found!", Types.ExceptionType.ParameterError, HttpStatus.BAD_REQUEST)

        const entries_count = group!.entries.length

        if(!pos_index)
            pos_index = entries_count

        if(pos_index < 0 || pos_index > entries_count) 
            throw new Exception("Target position invalid!", Types.ExceptionType.ParameterError, HttpStatus.BAD_REQUEST)

                
        for (const entry of group!.entries as Entry[]){
            if(entry.pos_index >= pos_index!)
                await Entry.setProperty({id: entry.id, property_name:"pos_index", new_value:entry.pos_index+1, connection: transaction})   
        }
            
        await Entry.setProperty({id: entry.id, property_name: "group_id", new_value: id, connection: transaction})
        await Entry.setProperty({id: entry.id, property_name:"pos_index", new_value:pos_index!, connection:transaction})
        
    }



    /**
     * Removes an entry from a group
     * @param id Unique identifier of group to remove entry from
     * @param entry_id Unique identifier of entry to be removed from group
     * @param [del] If true, entry will be deleted completely
     * @param [transaction] Transaction object for querying
    */
    static async removeEntry({id, entry_id, del=false, transaction} : Params.Group.removeEntry) : Promise<void>{
        return transaction
        ? await Group.removeEntry_private({id: id, entry_id: entry_id, del: del, transaction: transaction})
        : await conn.tx(async (tx)=>{return await Group.removeEntry_private({id: id, entry_id: entry_id, del: del, transaction: tx})})
    }

    private static async removeEntry_private({id, entry_id, del, transaction} : Params.Group.removeEntry) : Promise<void>{
        const entries = await Group.getEntries({id: id, flat: false, connection: transaction}) as Entry[]
        const entry_to_remove = await Entry.findById({id: entry_id, connection: transaction})

        if(entry_to_remove == null)
            throw new Exception("Unable to find Entry with provided id!", Types.ExceptionType.ParameterError, HttpStatus.NOT_FOUND)
        
        const found_entry = entries.filter((element)=> element.id === entry_id)
        if(found_entry.length == 0)
            throw new Exception("Could not find entry in given group!", Types.ExceptionType.ParameterError, HttpStatus.NOT_FOUND)
        
        
        for(const entry of entries){
            if(entry.pos_index > entry_to_remove.pos_index)
                await Entry.setProperty({id: entry.id, property_name: "pos_index", new_value: entry.pos_index-1, connection: transaction})   
        }

        if(del)
            await Entry.deleteById({id: entry_id, transaction: transaction})
         
    }



    /**
     * Repositions an element inside a group
     * @param id Unique identifier of group to reposition entry of
     * @param entry_id Unique identifier of entry to be repositioned
     * @param new_pos_index Position (index) the entry should be repositioned to
     * @param [transaction] Transaction object for querying
    */
    static async repositionEntry({id, entry_id, new_pos_index, transaction} : Params.Group.repositionEntry) : Promise<void>{
        return transaction
        ? await Group.repositionEntry_private({id: id, entry_id: entry_id, new_pos_index: new_pos_index, transaction: transaction})
        : await conn.tx(async (tx)=>{return await Group.repositionEntry_private({id: id, entry_id: entry_id, new_pos_index: new_pos_index, transaction: tx})})
    }

    private static async repositionEntry_private({id, entry_id, new_pos_index, transaction} : Params.Group.repositionEntry) : Promise<void>{
        const entries = await Group.getEntries({id: id, flat: false, connection: transaction}) as Entry[]
        const entry_to_move = await Entry.findById({id: entry_id, connection: transaction})

        if(new_pos_index < 0 || new_pos_index >= entries.length)
            throw new Exception("Target position invalid!", Types.ExceptionType.ParameterError, HttpStatus.BAD_REQUEST)

        
        if(entry_to_move == null)
            throw new Exception("Entry to be moved not found!", Types.ExceptionType.ParameterError, HttpStatus.NOT_FOUND)
        
        

        for (const entry of entries){
            if(entry_to_move.pos_index < new_pos_index){
                if(entry.pos_index > entry_to_move.pos_index && entry.pos_index <= new_pos_index)
                    await Entry.setProperty({id: entry.id, property_name:"pos_index", new_value:entry.pos_index-1, connection: transaction})    
            }else{
                
                if(entry.pos_index >= new_pos_index && entry.pos_index < entry_to_move.pos_index)
                    await Entry.setProperty({id: entry.id, property_name:"pos_index", new_value:entry.pos_index+1, connection: transaction})     
            }
        }

        await Entry.setProperty({id: entry_id, property_name:"pos_index", new_value:new_pos_index, connection: transaction})
        
    }    


    
    /**
     * Moves an entry from one group to another
     * @param id Unique identifier of group to move entry FROM
     * @param entry_id Unique identifier of entry to move
     * @param new_group_id Unique identifier of group to move entry TO
     * @param new_pos_index Position (index) to move entry to
     * @param [transaction] Transaction object for querying
    */
    static async moveEntry({id, entry_id, new_group_id, new_pos_index, transaction} : Params.Group.moveEntry) : Promise<void>{
        return transaction
        ? await Group.moveEntry_private({id: id, entry_id: entry_id, new_group_id: new_group_id, new_pos_index: new_pos_index, transaction: transaction})
        : await conn.tx(async (tx)=>{return await Group.moveEntry_private({id: id, entry_id: entry_id, new_group_id: new_group_id, new_pos_index: new_pos_index, transaction: tx})})
    }

    private static async moveEntry_private({id, entry_id, new_group_id, new_pos_index, transaction} : Params.Group.moveEntry) : Promise<void>{
        const entries = await Group.getEntries({id: id, flat: false, connection: transaction}) as Entry[]
        const entry_to_move = await Entry.findById({id: entry_id, connection: transaction})

        if(entry_to_move == null)
            throw new Exception("Could not find entry with provided id!", Types.ExceptionType.ParameterError, HttpStatus.NOT_FOUND)

        const exists = await Entry.exists({id: new_group_id, connection: transaction})
        if(!exists)
            throw new Exception("Group to move entry to does not exist!", Types.ExceptionType.ParameterError, HttpStatus.NOT_FOUND)
        
        const found_entry = entries.filter((element)=> element.id === entry_id)
        if(found_entry.length == 0)
                throw new Exception("Entry to be moved is not part of provided group!", Types.ExceptionType.ParameterError, HttpStatus.NOT_FOUND)
        
        
        if(id === new_group_id){
            if(!new_pos_index)
                throw new Exception("New position must be defined when moving inside a group!", Types.ExceptionType.ParameterError, HttpStatus.BAD_REQUEST)
        
            await Group.repositionEntry({id: id, entry_id: entry_id, new_pos_index, transaction: transaction})
            return
        }
                
        await Group.removeEntry({id: id, entry_id: entry_id, transaction: transaction})
        await Group.addEntry({id: new_group_id, entry: entry_to_move, pos_index: new_pos_index, transaction: transaction})
            
    }
    //#endregion


    //#region Subgroup management

    /**
     * Adds a group (subgroup) to another one (supergroup)
     * @param id Unique identifier of group another group should be added to
     * @param group Group to be added to the supergroup
     * @param [pos_index] Position (index) the new subgroup should be positioned to
     * @param [transaction] Transaction object for querying
    */
    static async addGroup({id, group, pos_index, transaction} : Params.Group.addGroup) : Promise<void>{
        return transaction
        ? await Group.addGroup_private({id: id, group: group, pos_index: pos_index, transaction: transaction})
        : await conn.tx(async (tx)=>{return await Group.addGroup_private({id: id, group: group, pos_index: pos_index, transaction: tx})})
    }

    private static async addGroup_private({id, group, pos_index, transaction} : Params.Group.addGroup) : Promise<void>{
        const supergroup = await Group.findById({id: id, connection: transaction})

        if(supergroup == null)
            throw new Exception("Group to add subgroup to not found!", Types.ExceptionType.ParameterError, HttpStatus.BAD_REQUEST)

        const subgroups_count = supergroup!.subgroups.length

        if(pos_index === undefined)
            pos_index = subgroups_count

        if(pos_index < 0 || pos_index > subgroups_count) 
            throw new Exception("Target position invalid!", Types.ExceptionType.ParameterError, HttpStatus.BAD_REQUEST)

        
        for (const subgroup_id of supergroup!.subgroups as number[]){
            const subgroup_pos_index = await Group.getProperty({id: subgroup_id, property_name: "pos_index", connection: transaction})
            
            if(subgroup_pos_index >= pos_index!)
                await Group.setProperty({id: subgroup_id, property_name:"pos_index", new_value: subgroup_pos_index+1, connection: transaction})   
        }
            
        await Group.setProperty({id: group.id, property_name: "supergroup_id", new_value: id, connection: transaction})
        await Group.setProperty({id: group.id, property_name:"pos_index", new_value:pos_index!, connection:transaction})
        
    }
    


    /**
     * Removes a subgroup from its supergroup
     * @param id Unique identifier of group a subgroup should be removed from
     * @param subgroup_id Unique identifier of subgroup that should be removed
     * @param [del] If true, removed group will be deleted completely
     * @param [transaction] Transaction object for querying
    */
    static async removeGroup({id, subgroup_id, del=false, transaction} : Params.Group.removeGroup) : Promise<void>{
       return transaction
       ? await Group.removeGroup_private({id: id, subgroup_id: subgroup_id, del: del, transaction: transaction})
       : await conn.tx(async (tx)=>{return await Group.removeGroup_private({id: id, subgroup_id: subgroup_id, del: del, transaction: tx})})
    }

    private static async removeGroup_private({id, subgroup_id, del, transaction} : Params.Group.removeGroup) : Promise<void>{
        const subgroups = await Group.getSubGroups({id: id, flat: false, connection: transaction}) as Group[]
        const group_to_remove = await Group.findById({id: subgroup_id, connection: transaction})

        if(group_to_remove == null)
            throw new Exception("Unable to find subgroup with provided id!", Types.ExceptionType.ParameterError, HttpStatus.NOT_FOUND)
        
        const found_group = subgroups.filter((element)=> element.id === subgroup_id)
        if(found_group.length == 0)
            throw new Exception("Could not find subgroup in given group!", Types.ExceptionType.ParameterError, HttpStatus.NOT_FOUND)
        
        
        
        for(const subgroup of subgroups){
            if(subgroup.pos_index > group_to_remove.pos_index)
                await Group.setProperty({id: subgroup.id, property_name: "pos_index", new_value: subgroup.pos_index-1, connection: transaction})   
        }

        if(del)
            await Group.deleteById({id: subgroup_id, transaction: transaction})
             
    }
    


    /**
     * Repositions a subgroup inside its supergroup
     * @param id Unique identifier of group a subgroup should be reposition of
     * @param subgroup_id Unique identifier of subgroup that should be repositioned
     * @param new_pos_index Position (index) the subgroup should be positioned to
     * @param [transaction] Transaction object for querying
    */
    static async repositionGroup({id, subgroup_id, new_pos_index, transaction} : Params.Group.repositionGroup) : Promise<void>{
        return transaction
        ? await Group.repositionGroup_private({id: id, subgroup_id: subgroup_id, new_pos_index: new_pos_index, transaction: transaction})
        : await conn.tx(async (tx)=>{return await Group.repositionGroup_private({id: id, subgroup_id: subgroup_id, new_pos_index: new_pos_index, transaction: tx})})
    }

    private static async repositionGroup_private({id, subgroup_id, new_pos_index, transaction} : Params.Group.repositionGroup) : Promise<void>{
        const group_to_move = await Group.findById({id: subgroup_id, connection: transaction})
        if(group_to_move == null)
            throw new Exception("Group to be moved not found!", Types.ExceptionType.ParameterError, HttpStatus.NOT_FOUND)
        
        const subgroups = await Group.getSubGroups({id: id, flat: false, connection: transaction}) as Group[]
        
        if(new_pos_index < 0 || new_pos_index >= subgroups.length)
            throw new Exception("Target position invalid!", Types.ExceptionType.ParameterError, HttpStatus.BAD_REQUEST)

        
        for (const subgroup of subgroups){
            if(group_to_move.pos_index < new_pos_index){
                if(subgroup.pos_index > group_to_move.pos_index && subgroup.pos_index <= new_pos_index)
                    await Group.setProperty({id: subgroup.id, property_name:"pos_index", new_value:subgroup.pos_index-1, connection: transaction})    
            }else{
                if(subgroup.pos_index >= new_pos_index && subgroup.pos_index < group_to_move.pos_index)
                    await Group.setProperty({id: subgroup.id, property_name:"pos_index", new_value:subgroup.pos_index+1, connection: transaction})     
            }
        }
        
        await Group.setProperty({id: subgroup_id, property_name:"pos_index", new_value:new_pos_index, connection: transaction})
        
    }



    /**
     * Moves a subgroup from one supergroup to another       
     * @param id Unique identifier of group a subgroup should be moved FROM
     * @param subgroup_id Unique identifier of subgroupt that should be moved
     * @param new_supergroup_id Unique identifier of group a subgroup should be moved TO
     * @param new_pos_index Position (index) the subgroup should be positioned to in the new supergroup
     * @param [transaction] Transaction object for querying
    */
    static async moveGroup({id, subgroup_id, new_supergroup_id, new_pos_index, transaction} : Params.Group.moveGroup) : Promise<void>{
        return transaction
        ? await Group.moveGroup_private({id: id, subgroup_id: subgroup_id, new_supergroup_id: new_supergroup_id, new_pos_index: new_pos_index, transaction: transaction})
        : await conn.tx(async (tx)=>{return await Group.moveGroup_private({id: id, subgroup_id: subgroup_id, new_supergroup_id: new_supergroup_id, new_pos_index: new_pos_index, transaction: tx})})
    }

    private static async moveGroup_private({id, subgroup_id, new_supergroup_id, new_pos_index, transaction} : Params.Group.moveGroup) : Promise<void>{
        const subgroups = await Group.getSubGroups({id: id, flat: false, connection: transaction}) as Group[]
        const subgroup_to_move = await Group.findById({id: subgroup_id, connection: transaction})

        if(subgroup_to_move == null)
            throw new Exception("Could not find subgroup with provided id!", Types.ExceptionType.ParameterError, HttpStatus.NOT_FOUND)

        const exists = await Group.exists({id: new_supergroup_id, connection: transaction})
        if(!exists)
            throw new Exception("Supergroup to move subgroup to does not exist!", Types.ExceptionType.ParameterError, HttpStatus.NOT_FOUND)
        
        const found_subgroup = subgroups.filter((element)=> element.id === subgroup_id)
        if(found_subgroup.length == 0)
                throw new Exception("Group to be moved is not part of provided group!", Types.ExceptionType.ParameterError, HttpStatus.NOT_FOUND)
        
        
        if(id === new_supergroup_id){
            if(!new_pos_index)
                throw new Exception("New position must be defined when moving inside a group!", Types.ExceptionType.ParameterError, HttpStatus.BAD_REQUEST)
            await Group.repositionGroup({id: id, subgroup_id: subgroup_id, new_pos_index, transaction: transaction})
            return
        }
                
        await Group.removeGroup({id: id, subgroup_id: subgroup_id, transaction: transaction})
        await Group.addGroup({id: new_supergroup_id, group: subgroup_to_move, pos_index: new_pos_index, transaction: transaction})
    }



    /**
     * Fetches the id or full objecct of user that owns the group
     * @param id Unique identifier of group to get owner of
     * @param [flat] If true, only id will be returned
     * @returns User object or user id
    */
    static async getOwner({id, flat=true, connection} : Params.Group.getOwner) : Promise<User|number>{
        return connection
        ? await Group.getOwner_private({id: id, flat: flat, connection: connection})
        : await conn.task(async (task)=>{return await Group.getOwner_private({id: id, flat: flat, connection: task})})
    }

    private static async getOwner_private({id, flat=true, connection} : Params.Group.getOwner) : Promise<User|number>{
        const group = await Group.findById({id: id, connection: connection})

        if(group == null)
            throw new Exception("No group with provided id found!", Types.ExceptionType.ParameterError, HttpStatus.NOT_FOUND)
        
        let supergroup = await Group.findById({id: group.supergroup_id, connection: connection})

        while(supergroup.supergroup_id !== -1){
            supergroup = await Group.findById({id: supergroup.supergroup_id, connection: connection})
        }

        const user_id = (await connection.one(groupQueries.getOwner, [supergroup.id])).id
        return flat ? user_id : await User.findById({id: user_id, connection: connection})
    }

    //#endregion


    //#region Getters & Setter

    /**
     * Sets a new value for a object specific property.
     * @param id Unique identifier of group to change a property from
     * @param property_name Name of property to change value of
     * @param new_value New value for provided property
     * @param [transaction] Transaction object for querying
     */
    static async setProperty({id, property_name, new_value, connection} : Params.setProperty) : Promise<void>{
        return connection
        ? await Group.setProperty_private({id: id, property_name: property_name, new_value: new_value, connection: connection})
        : await conn.task(async (task)=>{return await Group.setProperty_private({id: id, property_name: property_name, new_value: new_value, connection: task})})
    }

    private static async setProperty_private({id, property_name, new_value, connection} : Params.setProperty) : Promise<void>{
        if(!propertyNames.includes(property_name))
            throw new Exception("Invalid property name provided!", Types.ExceptionType.ParameterError, HttpStatus.BAD_REQUEST)
        
        const exists = await Group.exists({id: id, connection: connection})
        if(!exists)
            throw new Exception("Group to change property of not found!", Types.ExceptionType.ParameterError, HttpStatus.NOT_FOUND)

        try{
            const queryData = [id, new_value]
            const queryString = formatString(groupQueries.setProperty as string, property_name)

            await connection.none(queryString, queryData)

        }catch(err: unknown){
            throw new Exception("Failed to change property of group!", Types.ExceptionType.SQLError, HttpStatus.INTERNAL_SERVER_ERROR, err as Error)
        }
    }

    static async getProperty({id, property_name, connection=conn} : Params.getProperty) : Promise<any>{
        try{
            const queryString = formatString(groupQueries.getProperty, property_name)
            const propertyData = await connection.one(queryString, [id])
            return propertyData[property_name]
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