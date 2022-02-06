import express from "express"
import {connection} from "../../db"
import { Group } from "../Wrappers/Group"
import { User } from "../Wrappers/User"
import HttpStatus from 'http-status-codes'  
import { Exception } from "../Utils/Exception"
import { configuration as config } from "../Utils/Configurator"
import { isSupportImage, isValidB64 } from "../Utils/Shared"

export const groupRouter = express.Router()

async function checkGroupAuth({user_id, group_id, tx}): Promise<boolean>{
    
    const isRoot = group_id === await User.getProperty({id: user_id, property_name:["root_id"], connection: tx})
    
    if(isRoot)
        return true
    
    
    const owner_id = await Group.getOwner({id: group_id, flat: true, connection: tx})
    return owner_id === user_id
    
}

groupRouter.get("/:id", async (req,res)=>{
    try{
        const group_id = Number(req.params.id)
        
        await connection.task(async (task)=>{
            
            if (!await checkGroupAuth({user_id: req.auth.id, group_id: group_id, tx: task}))
                return res.status(HttpStatus.FORBIDDEN).send()
            
            const group_data = await Group.findById({id: group_id, connection: task})
            
            //TODO: Filter data, no entries and group and no underscore
            return res.json(group_data)
        })
        
        res.status(HttpStatus.OK).send()
        
    }catch(err: unknown){
        if(err instanceof Exception)
        return res.status(err.responseStatus).send()
        
        console.log(err)
        res.status(HttpStatus.INTERNAL_SERVER_ERROR).send()
    }
})

//Add new group
groupRouter.put("/", async (req, res)=>{
    try{
        await connection.tx(async(tx)=>{
            console.time("PUT Group")
            const groupData: Params.Group.create = {
                name: req.body.name,
                icon: req.body.icon,
                pos_index: req.body.pos_index,
                supergroup_id: req.body.supergroup_id === undefined 
                               ? await User.getProperty({id: req.auth.id, property_name:["root_id"], connection: tx}) 
                               : req.body.supergroup_id,
                transaction: tx
                
            }
            
            
            if (!await checkGroupAuth({user_id: req.auth.id, group_id: groupData.supergroup_id, tx: tx}))
                return res.status(HttpStatus.FORBIDDEN).send()
            
            
            const new_group = await Group.create(groupData)
            
            console.timeEnd("PUT Group")
            return res.status(HttpStatus.CREATED).json(new_group)
        })

        
    }catch(err: unknown){
        console.log(err)
        res.status(HttpStatus.INTERNAL_SERVER_ERROR).send()
    }
    
})

//Delete Group
groupRouter.delete("/:id", async (req, res)=>{
    
    try{
        const group_id = Number(req.params.id)
        
        await connection.tx(async (tx)=>{
            
            if (!await checkGroupAuth({user_id: req.auth.id, group_id: group_id, tx: tx}))
                return res.status(HttpStatus.FORBIDDEN).send()
            
            await Group.deleteById({id: group_id, transaction: tx})
        })
        
        res.status(HttpStatus.OK).send()
        
    }catch(err: unknown){
        if(err instanceof Exception)
        return res.status(err.responseStatus).send()
        
        console.log(err)
        res.status(HttpStatus.INTERNAL_SERVER_ERROR).send()
    }
})


groupRouter.patch("/:id", async (req, res)=>{
    try{
        const group_id = Number(req.params.id)

        await connection.tx(async (tx)=>{
            //Check if group is owned by requesting user & group is not root group
            if (!await checkGroupAuth({user_id: req.auth.id, group_id: group_id, tx: tx}))
                return res.status(HttpStatus.FORBIDDEN).send()

            const keys = Object.keys(req.body)
            for(const key of keys){
                switch(key){
                    
                    case "move":
                        break
                    
                    case "pos_index": {
                        // const supergroup_id = await Group.getProperty({id: group_id, property_name:"supergroup_id", connection: tx})
                        // await Group.repositionGroup({id: supergroup_id, subgroup_id: group_id, new_pos_index: req.body[key], transaction: tx})
                        break
                    }
                    
                    case "name":{
                        const new_name = req.body[key]
                        if(new_name === undefined || (new_name.length <= 0 || new_name.length > config.general.max_group_name_length))
                            return res.status(HttpStatus.BAD_REQUEST).send()

                        await Group.setProperty({id: group_id, property_name: "name", new_value: new_name, connection: tx})
                        break
                    }
                    
                    case "icon":{
                        const new_icon = req.body[key]
                        if(!isValidB64(new_icon))
                            return res.status(HttpStatus.BAD_REQUEST).send()
                        
                        const decoded_bytes = [...Buffer.from(new_icon, 'base64')]
                        
                        if(!isSupportImage(decoded_bytes))
                            return res.status(HttpStatus.BAD_REQUEST).send()
                        
                        await Group.setProperty({id: group_id, property_name: "icon", new_value:new_icon, connection: tx})
                        break
                    }
                }
            }
        })
        return res.status(HttpStatus.OK).send()
        

    }catch(err: unknown){
        if(err instanceof Exception)
            return res.status(err.responseStatus).send()
    }
})

groupRouter.patch("/move/:id", async (req, res)=>{
    try{

        const group_id = Number(req.params.id)

        await connection.tx(async (tx)=>{
            if (!await checkGroupAuth({user_id: req.auth.id, group_id: group_id, tx: tx}))
                return res.status(HttpStatus.FORBIDDEN).send()

            const supergroup_id = await Group.getProperty({id: group_id, property_name:"supergroup_id", connection: tx})
            const moveData: Params.Group.moveGroup = {
                id: supergroup_id,
                subgroup_id: group_id,
                new_supergroup_id: req.body.new_supergroup_id,
                new_pos_index: req.body.new_pos_index,
                transaction: tx
                
            }

            await Group.moveGroup(moveData)
            return res.status(HttpStatus.OK).send()
        })
        
    }catch(err: unknown){
        if(err instanceof Exception)
            res.status(err.responseStatus).send()
        
        res.status(HttpStatus.INTERNAL_SERVER_ERROR).send()
    }
})

//Get all entries of a group
groupRouter.get("/entries/:id", async (req, res)=>{
    try{
        const group_id = Number(req.params.id)
        const entries = await connection.task(async (task)=>{
            if (!await checkGroupAuth({user_id: req.auth.id, group_id: group_id, tx: task}))
                return res.status(HttpStatus.FORBIDDEN).send()
            return await Group.getEntries({id: group_id, flat: false, connection: task})
        })
    
        res.json(entries)
    }catch(err: unknown){
        console.log(err)
        res.status(HttpStatus.INTERNAL_SERVER_ERROR).send()
    }
})