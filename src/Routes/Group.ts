import express from "express"
import {connection} from "../../db"
import { Group } from "../Wrappers/Group"
import { User } from "../Wrappers/User"
import HttpStatus from 'http-status-codes'  
import { Exception } from "../Utils/Exception"

export const groupRouter = express.Router()

//Add new group
groupRouter.put("/", async (req, res)=>{
    try{
        const new_group = await connection.tx(async(tx)=>{
            const groupData: Params.Group.create = {
                name: req.body.name,
                icon: req.body.icon,
                pos_index: req.body.pos_index,
                supergroup_id: req.body.supergroup_id === undefined 
                               ? await User.getProperty({id: req.auth.id, property_name:"root_id", connection: tx}) 
                               : req.body.supergroup_id,
                transaction: tx
                
            }
    
            const new_group = await Group.create(groupData)
            return new_group
        })

        return res.status(HttpStatus.CREATED).json(new_group)
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
            
            const isRoot = group_id === await User.getProperty({id: req.auth.id, property_name:"root_id", connection: tx})
            if(isRoot)
            return res.status(HttpStatus.FORBIDDEN).send()
            
            
            const owner_id = await Group.getOwner({id: group_id, flat: true, connection: tx})
            if(owner_id !== req.auth.id)
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
            const isRoot = group_id === await User.getProperty({id: req.auth.id, property_name:"root_id", connection: tx})
            if(isRoot)
                return res.status(HttpStatus.FORBIDDEN).send()

            const owner_id = await Group.getOwner({id: group_id, flat: true, connection: tx})
            if(owner_id !== req.auth.id)
                return res.status(HttpStatus.FORBIDDEN).send()
        
            const keys = Object.keys(req.body)
            for(const key of keys){
                switch(key){
                    case "move":
                        break
                    case "pos_index": {
                        const supergroup_id = await Group.getProperty({id: group_id, property_name:"supergroup_id", connection: tx})
                        await Group.repositionGroup({id: supergroup_id, subgroup_id: group_id, new_pos_index: req.body[key], transaction: tx})
                        break
                    }
                    case "name":
                        break
                    case "icon":
                        break
                    case "supergroup":
                        break
                }
            }
        })
        return res.status(HttpStatus.OK).send()
        

    }catch(err: unknown){
        if(err instanceof Exception)
            return res.status(err.responseStatus).send()
    }
})

//Get all data
groupRouter.get("/", async (req, res)=>{
    try{
        const data = await connection.task(async (task)=>{
            const root_id = await User.getProperty({id: req.auth.id, property_name: "root_id", connection: task})
            return await Group.findById({id: root_id, full: true,connection: task})
        })
    
        res.json(data)
    }catch(err: unknown){
        console.log(err)
        res.status(HttpStatus.INTERNAL_SERVER_ERROR).send()
    }
})