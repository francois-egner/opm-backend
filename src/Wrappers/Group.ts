
import { connection as conn, groupQueries, } from "../../Sql"
import {  formatString } from "../Utils/Shared"
import { Exception } from "../Utils/Exception"
import HttpStatus from 'http-status-codes'
import { Entry } from "./Entry"

export class Group{

    private _id: number

    private _name: string

    private _pos_index: number

    private _icon: string

    private _supergroup_id: number

    private _owner_id: number

    private _entries: Entry[] | number[] | null = []

    private _subGroups: Group[] | number[] | null = []

    constructor(id: number, name: string, pos_index: number, icon: string, supergroup_id: number, owner_id: number, subGroups?: Group[] | number[] | null, entries?: Entry[] | number[] | null){
        this._id = id
        this._name = name
        this._pos_index = pos_index
        this._icon = icon
        this._supergroup_id = supergroup_id
        if(subGroups)
            this._subGroups = subGroups
        
        if(entries)
            this._entries = entries
        
        this._owner_id = owner_id
    }



    static async create({name, supergroup_id, icon,owner_id, transaction}:Types.Group.Params.create): Promise<Group>{
        //TODO: Parameter validation (owner_id)
        if(supergroup_id !== undefined && !(await Group.exists({id: supergroup_id})))
            throw new Exception("Provided supergroup not valid!", Types.ExceptionType.ParameterError, HttpStatus.NOT_FOUND)

        try{
            const queryObject = transaction ? transaction : conn
            const queryData = [name, icon, supergroup_id, owner_id]

            const groupData = await queryObject.one(groupQueries.create, queryData)

            return new Group(groupData.id, groupData.name, groupData.pos_index, groupData.icon, groupData.supergroup_id, groupData.owner_id)
        }catch(err: unknown){
            throw new Exception("Failed to create new Group!", Types.ExceptionType.SQLError, HttpStatus.INTERNAL_SERVER_ERROR, err as Error)
        }
    }

    static async exists({id}: Types.Group.Params.exists): Promise<boolean>{

        try{
            const queryData = [id]
            const existsData = await conn.one(groupQueries.exists, queryData);
            return existsData.exists;
        }catch(err: unknown){
            throw new Exception("Failed to check for existence!", Types.ExceptionType.SQLError, HttpStatus.INTERNAL_SERVER_ERROR, err as Error)
        }
    }

    static async getSubGroups({id, flat=true}: Types.Group.Params.getSubGroups): Promise<Group[]|number[] | null>{
        const exists = await Group.exists({id: id})
        if(!exists)
            throw new Exception("Group to find subgroups from not found!", Types.ExceptionType.ParameterError, HttpStatus.NOT_FOUND)
        
        try{
            const queryData = [id]
            const groupsData = await conn.manyOrNone(groupQueries.getSubGroups, queryData)

            if(groupsData == null)
                return null
            
            const subGroups: Group[] | number[] = []
            for(const groupData of groupsData)
                subGroups.push(flat ? groupData.id : await Group.findById({id: groupData.id}))

            return subGroups
        }catch(err: unknown){
            throw new Exception("Failed to find subgroups!", Types.ExceptionType.SQLError, HttpStatus.INTERNAL_SERVER_ERROR, err as Error)
        }
    }

    static async getEntries({id, flat=true}: Types.Group.Params.getEntries): Promise<Entry[] | number[] | null>{
        const exists = await Group.exists({id: id})
        if(!exists)
            throw new Exception("Group to find entries of not found!", Types.ExceptionType.ParameterError, HttpStatus.NOT_FOUND)
        
        try{
            const queryData = [id]
            const entriesData = await conn.manyOrNone(groupQueries.getEntries, queryData)

            if(entriesData == null)
                return null
            
            const entries: Entry[] | number[] = []
            for(const entryData of entriesData)
                entries.push(flat ? entryData.id : await Entry.findById({id: entryData.id}))

            return entries
        }catch(err: unknown){
            throw new Exception("Failed to find entries!", Types.ExceptionType.SQLError, HttpStatus.INTERNAL_SERVER_ERROR, err as Error)
        }
    }

    static async findById({id}: Types.Group.Params.findById): Promise<Group|null>{

        try{
            const queryData = [id]
            const groupData= await conn.oneOrNone(groupQueries.findById, queryData)
            if(groupData == null)
                return null

            const subGroups = await Group.getSubGroups({id: id, flat: false})
            const entries = await Group.getEntries({id: id, flat: false})

            return new Group(id, groupData.name, groupData.pos_index, groupData.icon, groupData.supergroup_id, groupData.owner_id, subGroups, entries)
        }catch(err: unknown){
            throw new Exception("Failed to fetch group data!", Types.ExceptionType.SQLError, HttpStatus.INTERNAL_SERVER_ERROR, err as Error)
        }
    }

    static async deleteById({id, transaction}:Types.Group.Params.deleteById): Promise<void>{
        const group = await Group.findById({id: id})
        if(group == null)
            throw new Exception("Group to be deleted does not exist!", Types.ExceptionType.ParameterError, HttpStatus.NOT_FOUND)
        
        try{

            await conn.tx(async (tx)=>{
                transaction = transaction ? transaction : tx

                if(group.supergroup_id !== undefined)
                    await Group.removeGroup({id: group.supergroup_id, subgroup_id: id, transaction: transaction})
                
                const entries_id = await Group.getEntries({id: id, flat: true})

                for(const entry_id of entries_id as number[])
                    await Entry.deleteById({id: entry_id, transaction: transaction})

                const subgroups_id = await Group.getSubGroups({id: id}) as number[]

                for(const subgroup_id of subgroups_id)
                    await Group.deleteById({id: subgroup_id, transaction: transaction})
                
                await transaction!.none(groupQueries.deleteById, [id])

            })
        }catch(err: unknown){
            throw new Exception("Failed to delete group!", Types.ExceptionType.SQLError, HttpStatus.INTERNAL_SERVER_ERROR, err as Error)
        }
    }
    

    //#region Entry management

    static async addEntry({id, entry, pos_index, transaction}: Types.Group.Params.addEntry):Promise<void>{
        const group = await Group.findById({id: id})

        if(group == null)
            throw new Exception("Group to add entry to not found!", Types.ExceptionType.ParameterError, HttpStatus.BAD_REQUEST)

        const entries_count = group!.entries.length

        if(!pos_index)
            pos_index = entries_count

        if(pos_index < 0 || pos_index > entries_count) 
            throw new Exception("Target position invalid!", Types.ExceptionType.ParameterError, HttpStatus.BAD_REQUEST)

        await conn.tx(async (tx)=>{
            transaction = transaction ? transaction : tx
                
            for (const entry of group!.entries as Entry[]){
                if(entry.pos_index >= pos_index!)
                    await Entry.setProperty({id: entry.id, property_name:"pos_index", new_value:entry.pos_index+1, transaction: transaction})   
            }
            
            await Entry.setProperty({id: entry.id, property_name: "group_id", new_value: id, transaction: transaction})
            await Entry.setProperty({id: entry.id, property_name:"pos_index", new_value:pos_index!, transaction:transaction})
        })
    }

    static async removeEntry({id, entry_id, del=false, transaction}: Types.Group.Params.removeEntry): Promise<void>{
        const entries = await Group.getEntries({id: id, flat: false}) as Entry[]
        const entry_to_remove = await Entry.findById({id: entry_id})

        if(entry_to_remove == null)
            throw new Exception("Unable to find Entry with provided id!", Types.ExceptionType.ParameterError, HttpStatus.NOT_FOUND)
        
        const found_entry = entries.filter((element)=> element.id === entry_id)
        if(found_entry.length == 0)
            throw new Exception("Could not find entry in given group!", Types.ExceptionType.ParameterError, HttpStatus.NOT_FOUND)
        
        
        await conn.tx(async (tx)=>{
            transaction = transaction ? transaction : tx

            for(const entry of entries){
                if(entry.pos_index > entry_to_remove.pos_index)
                    await Entry.setProperty({id: entry.id, property_name: "pos_index", new_value: entry.pos_index-1, transaction: transaction})   
            }

            if(del)
                await Entry.deleteById({id: entry_id, transaction: transaction})
        }) 
    }

    static async repositionEntry({id, entry_id, new_pos, transaction}: Types.Group.Params.repositionEntry): Promise<void>{
        const entries = await Group.getEntries({id: id, flat: false}) as Entry[]
        const entry_to_move = await Entry.findById({id: entry_id})

        if(new_pos < 0 || new_pos >= entries.length)
            throw new Exception("Target position invalid!", Types.ExceptionType.ParameterError, HttpStatus.BAD_REQUEST)

        
        if(entry_to_move == null)
            throw new Exception("Entry to be moved not found!", Types.ExceptionType.ParameterError, HttpStatus.NOT_FOUND)
        
        await conn.tx(async (tx)=>{
            transaction = transaction ? transaction : tx

            for (const entry of entries){
                if((entry.pos_index <= new_pos) && (entry.pos_index > entry_to_move.pos_index)){
                    await Entry.setProperty({id: entry.id, property_name:"pos_index", new_value:entry.pos_index-1, transaction: transaction})
                }
            }
            await Entry.setProperty({id: entry_id, property_name:"pos_index", new_value:new_pos, transaction: transaction})
        })
    }
    
    static async moveEntry({id, entry_id, new_group_id, new_pos, transaction}: Types.Group.Params.moveEntry): Promise<void>{
        const entries = await Group.getEntries({id: id, flat: false}) as Entry[]
        const entry_to_move = await Entry.findById({id: entry_id})

        if(entry_to_move == null)
            throw new Exception("Could not find entry with provided id!", Types.ExceptionType.ParameterError, HttpStatus.NOT_FOUND)

        const exists = await Entry.exists({id: new_group_id})
        if(!exists)
            throw new Exception("Group to move entry to does not exist!", Types.ExceptionType.ParameterError, HttpStatus.NOT_FOUND)
        
        const found_entry = entries.filter((element)=> element.id === entry_id)
        if(found_entry.length == 0)
                throw new Exception("Entry to be moved is not part of provided group!", Types.ExceptionType.ParameterError, HttpStatus.NOT_FOUND)
        
        
        await conn.tx(async (tx)=>{

            transaction = transaction ? transaction : tx
            if(id === new_group_id){
                if(!new_pos)
                    throw new Exception("New position must be defined when moving inside a group!", Types.ExceptionType.ParameterError, HttpStatus.BAD_REQUEST)
                await Group.repositionEntry({id: id, entry_id: entry_id, new_pos: new_pos, transaction: transaction})
                return
            }
                
            await Group.removeEntry({id: id, entry_id: entry_id, transaction: transaction})
            await Group.addEntry({id: new_group_id, entry: entry_to_move, pos_index: new_pos, transaction: transaction})
            
        })
    }

    //#endregion

    //#region Subgroup management
    static async addGroup({id, group, pos_index, transaction}: Types.Group.Params.addGroup): Promise<void>{
        const supergroup = await Group.findById({id: id})

        if(supergroup == null)
            throw new Exception("Group to add subgroup to not found!", Types.ExceptionType.ParameterError, HttpStatus.BAD_REQUEST)

        const subgroups_count = supergroup!.subgroups.length

        if(!pos_index)
            pos_index = subgroups_count

        if(pos_index < 0 || pos_index > subgroups_count) 
            throw new Exception("Target position invalid!", Types.ExceptionType.ParameterError, HttpStatus.BAD_REQUEST)

        await conn.tx(async (tx)=>{
            transaction = transaction ? transaction : tx
                
            for (const subgroup of supergroup!.subgroups as Group[]){
                if(subgroup.pos_index >= pos_index!)
                    await Group.setProperty({id: subgroup.id, property_name:"pos_index", new_value:subgroup.pos_index+1, transaction: transaction})   
            }
            
            await Group.setProperty({id: group.id, property_name: "supergroup_id", new_value: id, transaction: transaction})
            await Group.setProperty({id: group.id, property_name:"pos_index", new_value:pos_index!, transaction:transaction})
        })
    }
    
    static async removeGroup({id, subgroup_id, del=false, transaction}: Types.Group.Params.removeGroup): Promise<void>{
        const subgroups = await Group.getSubGroups({id: id, flat: false}) as Group[]
        const group_to_remove = await Group.findById({id: subgroup_id})

        if(group_to_remove == null)
            throw new Exception("Unable to find subgroup with provided id!", Types.ExceptionType.ParameterError, HttpStatus.NOT_FOUND)
        
        const found_group = subgroups.filter((element)=> element.id === subgroup_id)
        if(found_group.length == 0)
            throw new Exception("Could not find subgroup in given group!", Types.ExceptionType.ParameterError, HttpStatus.NOT_FOUND)
        
        
        await conn.tx(async (tx)=>{
            transaction = transaction ? transaction : tx

            for(const subgroup of subgroups){
                if(subgroup.pos_index > group_to_remove.pos_index)
                    await Group.setProperty({id: subgroup.id, property_name: "pos_index", new_value: subgroup.pos_index-1, transaction: transaction})   
            }

            if(del)
                await Group.deleteById({id: subgroup_id, transaction: transaction})
            }) 
    }
    
    static async repositionGroup({id, subgroup_id, new_pos, transaction}: Types.Group.Params.repositionGroup): Promise<void>{
        const subgroups = await Group.getSubGroups({id: id, flat: false}) as Group[]
        const group_to_move = await Group.findById({id: subgroup_id})

        if(new_pos < 0 || new_pos >= subgroups.length)
            throw new Exception("Target position invalid!", Types.ExceptionType.ParameterError, HttpStatus.BAD_REQUEST)

        
        if(group_to_move == null)
            throw new Exception("Group to be moved not found!", Types.ExceptionType.ParameterError, HttpStatus.NOT_FOUND)
        
        await conn.tx(async (tx)=>{
            transaction = transaction ? transaction : tx

            for (const subgroup of subgroups){
                if((subgroup.pos_index <= new_pos) && (subgroup.pos_index > group_to_move.pos_index)){
                    await Group.setProperty({id: subgroup.id, property_name:"pos_index", new_value:subgroup.pos_index-1, transaction: transaction})
                }
            }
            await Group.setProperty({id: subgroup_id, property_name:"pos_index", new_value:new_pos, transaction: transaction})
        })
    }

    static async moveGroup({id, subgroup_id, new_supergroup_id, new_pos, transaction}: Types.Group.Params.moveGroup): Promise<void>{
        const subgroups = await Group.getSubGroups({id: id, flat: false}) as Group[]
        const subgroup_to_move = await Group.findById({id: subgroup_id})

        if(subgroup_to_move == null)
            throw new Exception("Could not find subgroup with provided id!", Types.ExceptionType.ParameterError, HttpStatus.NOT_FOUND)

        const exists = await Group.exists({id: new_supergroup_id})
        if(!exists)
            throw new Exception("Supergroup to move subgroup to does not exist!", Types.ExceptionType.ParameterError, HttpStatus.NOT_FOUND)
        
        const found_subgroup = subgroups.filter((element)=> element.id === subgroup_id)
        if(found_subgroup.length == 0)
                throw new Exception("Group to be moved is not part of provided group!", Types.ExceptionType.ParameterError, HttpStatus.NOT_FOUND)
        
        
        await conn.tx(async (tx)=>{

            transaction = transaction ? transaction : tx
            if(id === new_supergroup_id){
                if(!new_pos)
                    throw new Exception("New position must be defined when moving inside a group!", Types.ExceptionType.ParameterError, HttpStatus.BAD_REQUEST)
                await Group.repositionGroup({id: id, subgroup_id: subgroup_id, new_pos: new_pos, transaction: transaction})
                return
            }
                
            await Group.removeGroup({id: id, subgroup_id: subgroup_id, transaction: transaction})
            await Group.addGroup({id: new_supergroup_id, group: subgroup_to_move, pos_index: new_pos, transaction: transaction})
            
        })
    }
    //#endregion


    //#region Getters & Setter
    static async setProperty({id, property_name, new_value, transaction}: Types.Group.Params.setProperty): Promise<void>{
        const exists = await Group.exists({id: id})
        if(!exists)
            throw new Exception("Group to change property of not found!", Types.ExceptionType.ParameterError, HttpStatus.NOT_FOUND)

        try{
            const queryObject = transaction ? transaction : conn
            const queryData = [id, new_value]
            const queryString = formatString(groupQueries.setProperty as string, property_name)

            await queryObject.none(queryString, queryData)

        }catch(err: unknown){
            throw new Exception("Failed to change property of group!", Types.ExceptionType.SQLError, HttpStatus.INTERNAL_SERVER_ERROR, err as Error)
        }
    }

    get id(): number{
        return this._id
    }

    get subgroups(): Group[]{
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

    get owner_id(): number{
        return this._owner_id
    }
    //#region 
}